using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Domain.ValueObjects;

namespace RenoveJa.Infrastructure.ConsultationAnamnesis;

/// <summary>
/// Serviço de anamnese estruturada e sugestões clínicas por IA (GPT-4o) durante a consulta.
/// v2: Prompt enriquecido com diagnóstico diferencial, CID-10 validado, medicamentos com
/// interações/contraindicações, exames com código TUSS, classificação de gravidade,
/// orientações ao paciente e critérios de retorno.
/// Atua como copiloto: a decisão final é sempre do médico.
/// </summary>
public class ConsultationAnamnesisService : IConsultationAnamnesisService
{
    private const string ApiBaseUrl = "https://api.openai.com/v1";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false
    };
    private static readonly Regex CidCodeRegex = new(@"\b([A-Z]\d{2}(?:\.\d+)?)\b", RegexOptions.Compiled);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<OpenAIConfig> _config;
    private readonly ILogger<ConsultationAnamnesisService> _logger;
    private readonly IEvidenceSearchService _evidenceSearchService;
    private readonly IAiInteractionLogRepository _aiInteractionLogRepository;

    public ConsultationAnamnesisService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenAIConfig> config,
        ILogger<ConsultationAnamnesisService> logger,
        IEvidenceSearchService evidenceSearchService,
        IAiInteractionLogRepository aiInteractionLogRepository)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
        _evidenceSearchService = evidenceSearchService;
        _aiInteractionLogRepository = aiInteractionLogRepository;
    }

    public async Task<ConsultationAnamnesisResult?> UpdateAnamnesisAndSuggestionsAsync(
        string transcriptSoFar,
        string? previousAnamnesisJson,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[Anamnese IA v2] INICIO transcriptLen={Len} previousAnamnesisLen={PrevLen}",
            transcriptSoFar?.Length ?? 0, previousAnamnesisJson?.Length ?? 0);

        var apiKey = _config.Value?.ApiKey?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("[Anamnese IA v2] ANAMNESE_NAO_OCORRE: OpenAI:ApiKey não configurada.");
            return null;
        }

        if (string.IsNullOrWhiteSpace(transcriptSoFar))
        {
            _logger.LogWarning("[Anamnese IA v2] ANAMNESE_NAO_OCORRE: Transcript vazio ou nulo.");
            return null;
        }

        var systemPrompt = BuildSystemPromptV2();

        var userContent = string.IsNullOrWhiteSpace(previousAnamnesisJson)
            ? $"Transcript da consulta (incluindo identificação de locutor quando disponível):\n\n{transcriptSoFar}"
            : $"Anamnese anterior (mantenha e enriqueça com novas informações do transcript):\n{previousAnamnesisJson}\n\nTranscript atualizado:\n{transcriptSoFar}";

        var requestBody = new
        {
            model = _config.Value?.Model ?? "gpt-4o",
            messages = new object[]
            {
                new { role = "system", content = (object)systemPrompt },
                new { role = "user", content = (object)userContent }
            },
            max_tokens = 4500,
            temperature = 0.12
        };

        var startedAt = DateTime.UtcNow;
        var json = JsonSerializer.Serialize(requestBody, JsonOptions);
        var promptHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json))).ToLowerInvariant();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        client.Timeout = TimeSpan.FromSeconds(50);

        using var requestContent = new StringContent(json, Encoding.UTF8, "application/json");
        _logger.LogInformation("[Anamnese IA v2] Chamando OpenAI: model={Model}",
            _config.Value?.Model ?? "gpt-4o");

        var response = await client.PostAsync($"{ApiBaseUrl}/chat/completions", requestContent, cancellationToken);
        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("[Anamnese IA v2] OpenAI error StatusCode={StatusCode}", response.StatusCode);
            try
            {
                await _aiInteractionLogRepository.LogAsync(AiInteractionLog.Create(
                    serviceName: nameof(ConsultationAnamnesisService),
                    modelName: _config.Value?.Model ?? "gpt-4o",
                    promptHash: promptHash,
                    success: false,
                    durationMs: (long)(DateTime.UtcNow - startedAt).TotalMilliseconds,
                    errorMessage: responseJson.Length > 500 ? responseJson[..500] : responseJson), cancellationToken);
            }
            catch (Exception logEx)
            {
                _logger.LogWarning(logEx, "[Anamnese IA v2] Falha ao gravar log de erro.");
            }
            return null;
        }

        string? content = null;
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var choices = doc.RootElement.GetProperty("choices");
            if (choices.GetArrayLength() > 0)
                content = choices[0].GetProperty("message").GetProperty("content").GetString();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Anamnese IA v2] Falha ao extrair content da resposta OpenAI.");
            return null;
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            _logger.LogWarning("[Anamnese IA v2] OpenAI retornou content vazio.");
            return null;
        }

        var cleaned = CleanJsonResponse(content);
        try
        {
            using var parsed = JsonDocument.Parse(cleaned);
            var root = parsed.RootElement;

            // Build enriched anamnesis JSON for frontend
            var enrichedObj = new Dictionary<string, object>();

            // Copy all anamnesis fields
            if (root.TryGetProperty("anamnesis", out var anaEl) && anaEl.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in anaEl.EnumerateObject())
                    enrichedObj[prop.Name] = prop.Value.GetRawText();
            }

            // Top-level fields (CID validado contra base local ICD/CID-10)
            var cidRaw = root.TryGetProperty("cid_sugerido", out var cidEl) ? cidEl.GetString()?.Trim() ?? "" : "";
            if (!string.IsNullOrEmpty(cidRaw))
            {
                var cidValidado = Cid10Database.IsValid(cidRaw)
                    ? cidRaw
                    : Cid10Database.Search(cidRaw, 1).FirstOrDefault()?.Code ?? cidRaw;
                enrichedObj["cid_sugerido"] = JsonSerializer.Serialize(cidValidado);
                if (Cid10Database.GetDescription(cidValidado) is { } desc)
                    enrichedObj["cid_descricao"] = JsonSerializer.Serialize(desc);
            }
            else
            {
                CopyIfExists(root, enrichedObj, "cid_sugerido");
            }
            CopyIfExists(root, enrichedObj, "confianca_cid");
            CopyArrayIfExists(root, enrichedObj, "alertas_vermelhos");
            CopyArrayIfExists(root, enrichedObj, "diagnostico_diferencial");
            CopyIfExists(root, enrichedObj, "classificacao_gravidade");
            CopyIfExists(root, enrichedObj, "exame_fisico_dirigido");
            CopyArrayIfExists(root, enrichedObj, "orientacoes_paciente");
            CopyArrayIfExists(root, enrichedObj, "criterios_retorno");
            CopyArrayIfExists(root, enrichedObj, "perguntas_sugeridas");
            CopyArrayIfExists(root, enrichedObj, "lacunas_anamnese");

            // Medicamentos and exames
            var hasClinicalContext = HasClinicalContext(root);
            var medicamentosRaw = ParseMedicamentosSugeridosV2(root, hasClinicalContext);
            enrichedObj["medicamentos_sugeridos"] = medicamentosRaw;

            var examesRaw = ParseExamesSugeridosV2(root, hasClinicalContext);
            enrichedObj["exames_sugeridos"] = examesRaw;

            var enrichedJson = "{" + string.Join(",", enrichedObj.Select(kv => $"\"{kv.Key}\":{kv.Value}")) + "}";

            // Extract suggestions list
            var suggestions = ExtractSuggestions(root);

            // Evidências PubMed
            var evidence = await FetchAndTranslateEvidenceAsync(root, apiKey, cancellationToken);

            try
            {
                await _aiInteractionLogRepository.LogAsync(AiInteractionLog.Create(
                    serviceName: nameof(ConsultationAnamnesisService),
                    modelName: _config.Value?.Model ?? "gpt-4o",
                    promptHash: promptHash,
                    success: true,
                    responseSummary: cleaned.Length > 500 ? cleaned[..500] : cleaned,
                    durationMs: (long)(DateTime.UtcNow - startedAt).TotalMilliseconds), cancellationToken);
            }
            catch (Exception logEx)
            {
                _logger.LogWarning(logEx, "[Anamnese IA v2] Falha ao gravar log.");
            }

            _logger.LogInformation("[Anamnese IA v2] SUCESSO: anamnesisLen={Len} suggestions={Count} evidence={EvidCount} durationMs={Ms}",
                enrichedJson.Length, suggestions.Count, evidence.Count, (long)(DateTime.UtcNow - startedAt).TotalMilliseconds);

            return new ConsultationAnamnesisResult(enrichedJson, suggestions, evidence);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Anamnese IA v2] Falha ao parsear JSON de resposta.");
            return null;
        }
    }

    /// <summary>
    /// Prompt v2: muito mais rico em informações clínicas para o médico.
    /// Inclui diagnóstico diferencial, CID validado, medicamentos com interações,
    /// exames com TUSS, classificação de gravidade e orientações.
    /// </summary>
    private static string BuildSystemPromptV2()
    {
        return """
Você é um assistente de apoio à consulta médica de ALTO NÍVEL, atuando como COPILOTO DO MÉDICO na plataforma RenoveJá+ (telemedicina brasileira).
Toda saída é APENAS APOIO À DECISÃO CLÍNICA — a conduta final é exclusivamente do médico.
Conformidade com CFM Resolução 2.299/2021 e normas éticas vigentes.

O transcript pode conter linhas prefixadas com [Médico] ou [Paciente].

Responda em um ÚNICO JSON válido, sem markdown, com EXATAMENTE estes campos:

{
  "anamnesis": {
    "queixa_principal": "Queixa e duração: [o que trouxe o paciente + há quanto tempo]. Seja específico: localização, intensidade (EVA 0-10 se aplicável), caráter da dor, irradiação.",
    "historia_doenca_atual": "Evolução / anamnese: início, fatores de melhora/piora, tratamentos já tentados, cronologia dos eventos. Use formato OPQRST quando aplicável (Onset, Provocation, Quality, Region, Severity, Time).",
    "sintomas": ["Lista de TODOS os sintomas em linguagem clínica objetiva, incluindo sintomas negativos relevantes (ex: 'nega febre', 'nega dispneia')"],
    "revisao_sistemas": "Revisão de sistemas pertinente: cardiovascular, respiratório, gastrointestinal, neurológico, musculoesquelético, psiquiátrico — conforme relevância clínica",
    "medicamentos_em_uso": ["Lista de medicamentos atuais com dose e frequência quando informados. Ex: 'Losartana 50mg 1x/dia'"],
    "alergias": "Alergias conhecidas (medicamentos, alimentos, outros). Se nenhuma: 'NKDA (nega alergias conhecidas)'",
    "antecedentes_pessoais": "Comorbidades, cirurgias, internações, hábitos (tabagismo, etilismo, atividade física)",
    "antecedentes_familiares": "Histórico familiar relevante (DM, HAS, CA, DAC, AVC)",
    "habitos_vida": "Tabagismo (maços/ano), etilismo, drogas, sedentarismo, dieta — quando mencionados",
    "outros": "Qualquer informação adicional relevante não coberta acima"
  },

  "cid_sugerido": "OBRIGATÓRIO quando houver dados — Formato: 'CÓDIGO - Descrição completa'. Use APENAS códigos CID-10 VÁLIDOS (padrão OMS/SUS). Exemplos corretos: 'J06.9 - Infecção aguda das vias aéreas superiores, não especificada', 'M54.5 - Dor lombar baixa', 'K21.0 - Doença do refluxo gastroesofágico com esofagite'. NUNCA invente códigos. Se incerto, use o código mais genérico da subcategoria (ex: .9).",

  "confianca_cid": "alta | media | baixa — baseada na quantidade e qualidade dos dados clínicos disponíveis",

  "diagnostico_diferencial": [
    {
      "hipotese": "Diagnóstico mais provável",
      "cid": "Código CID-10 — descrição",
      "probabilidade": "alta | media | baixa",
      "argumentos_a_favor": "Dados clínicos que suportam esta hipótese",
      "argumentos_contra": "Dados que não se encaixam ou estão ausentes",
      "exames_confirmatorios": "Exames que confirmariam/descartariam esta hipótese"
    }
  ],

  "classificacao_gravidade": "verde | amarelo | laranja | vermelho — Protocolo Manchester simplificado. Verde: não urgente. Amarelo: pouco urgente. Laranja: urgente. Vermelho: emergência.",

  "alertas_vermelhos": ["APENAS se houver base CLARA no transcript. Sinais de alarme que requerem ação IMEDIATA. Formato: 'SINAL — SIGNIFICADO CLÍNICO — AÇÃO SUGERIDA'. Ex: 'Dor torácica com irradiação para MSE + sudorese — Possível SCA — Encaminhar urgência/SAMU'"],

  "exame_fisico_dirigido": "O que o médico deve examinar nesta consulta: sinais vitais relevantes, manobras específicas, pontos de atenção. Ex: 'Ausculta pulmonar (crepitações basais?), FR, SpO2, temperatura. Sinal de Blumberg se dor abdominal.'",

  "medicamentos_sugeridos": [
    {
      "nome": "Nome genérico (DCB) com concentração. Ex: 'Amoxicilina 500mg'. Use SEMPRE o nome genérico oficial brasileiro.",
      "classe_terapeutica": "Classificação farmacológica detalhada. Ex: 'Antibiótico β-lactâmico — Aminopenicilina de amplo espectro'",
      "dose": "Dose por tomada com unidade. Ex: '500mg', '10mg/kg', '1g'",
      "via": "VO | IM | IV | SC | Tópica | Inalatória | Retal | Sublingual | Nasal | Oftálmica",
      "posologia": "Frequência detalhada. Ex: '8/8h por 7 dias', '12/12h antes das refeições', '1x/dia à noite'",
      "duracao": "Tempo de tratamento. Ex: '7 dias', '14 dias', '30 dias', 'uso contínuo', '3 meses com reavaliação'",
      "indicacao": "Justificativa clínica objetiva ligada ao quadro atual",
      "contraindicacoes": "TODAS as contraindicações relevantes. Ex: 'Alergia a penicilinas, mononucleose, insuficiência hepática grave, gestação (cat. X)'",
      "interacoes": "Interações medicamentosas com TODOS os medicamentos que o paciente já usa + interações graves conhecidas",
      "alerta_faixa_etaria": "Ajuste de dose para idosos (>65a), crianças, gestantes/lactantes, nefropatas, hepatopatas. Vazio se não aplicável",
      "alternativa": "Alternativa terapêutica completa. Ex: 'Azitromicina 500mg 1x/dia por 3 dias se alergia a penicilinas'"
    }
  ],

  "exames_sugeridos": [
    {
      "nome": "Nome técnico completo. Ex: 'Hemograma completo com contagem de plaquetas', 'Proteína C-Reativa (PCR) quantitativa'",
      "codigo_tuss": "Código TUSS/CBHPM quando conhecido. Ex: '40304361'. Vazio se não souber. Pesquise o código correto.",
      "descricao": "O que é o exame — objetivo em 1-2 frases",
      "o_que_afere": "O que mede/avalia — específico para ESTE caso. Ex: 'Identifica anemia, leucocitose (infecção), linfocitose (viral), trombocitopenia'",
      "indicacao": "Justificativa clínica detalhada para ESTE paciente específico. Por que este exame é necessário AGORA.",
      "preparo_paciente": "Preparo necessário detalhado. Ex: 'Jejum de 8-12h', 'Suspender metformina 48h antes se com contraste', 'Esvaziar bexiga antes do exame'. Vazio se não precisa",
      "prazo_resultado": "Tempo estimado. Ex: '24-48h', '3-5 dias úteis', '7-10 dias (cultura)'",
      "urgencia": "rotina | urgente — urgente se o resultado pode mudar a conduta imediata"
    }
  ],

  "orientacoes_paciente": ["Orientações que o médico pode compartilhar com o paciente em linguagem acessível. Ex: 'Beber bastante água — pelo menos 2 litros por dia', 'Evitar alimentos gordurosos e cafeína', 'Repouso relativo por 3-5 dias'. 2-5 itens."],

  "criterios_retorno": ["Sinais de alarme para o paciente procurar atendimento antes do retorno. Em linguagem acessível. Ex: 'Se a febre passar de 39°C ou não melhorar em 48h', 'Se tiver falta de ar ou dor no peito'. 2-4 itens."],

  "perguntas_sugeridas": [
    {
      "pergunta": "Pergunta ESPECÍFICA E DIRETA que o médico deveria fazer ao paciente AGORA. Escrita na 2ª pessoa, linguagem natural conversacional. Deve ser a pergunta que MAIS MUDA a conduta neste momento. Ex: 'Essa dor piora quando você respira fundo ou quando tosse?', 'Você está sentindo falta de ar quando faz esforço ou mesmo parado?'",
      "objetivo": "EXATAMENTE o que essa pergunta confirma ou descarta. Ex: 'Diferencia dor pleurítica (sim → investigar pneumonia/TEP) de dor muscular (não → osteomuscular). Muda necessidade de raio-X de tórax.'",
      "hipoteses_afetadas": "Mapa decisório claro: 'Se SIM → favorece J18.9 (Pneumonia), solicitar RX tórax PA/perfil + hemograma. Se NÃO → favorece M54.5 (Lombalgia), AINE + repouso'",
      "prioridade": "alta | media | baixa — alta = RED FLAG ou muda conduta imediata; media = refina entre diagnósticos diferenciais; baixa = complementar/seguimento"
    }
  ],

  "lacunas_anamnese": ["Informações ESSENCIAIS que ainda FALTAM na anamnese e que o médico deveria obter. Diferente de perguntas_sugeridas: aqui é o que está FALTANDO, não perguntas específicas. Ex: 'Não informou alergias medicamentosas', 'Falta história pregressa de cirurgias', 'Não mencionou se está grávida ou amamentando'. 2-5 itens. Array vazio se anamnese estiver completa."],

  "suggestions": ["Até 5 frases em formato clínico para prontuário. Inclua: hipótese diagnóstica principal, diagnósticos diferenciais, conduta geral, orientações de seguimento. Ex: 'HD: J06.9 - IVAS. DD: J03.9 (Amigdalite), J01.9 (Sinusite). Conduta: Analgesia + repouso. Retorno em 7 dias ou se piora.'"]
}

REGRAS SOBRE PERGUNTAS SUGERIDAS (estilo "Akinator clínico"):
- SEMPRE gere 3-6 perguntas, priorizadas por impacto diagnóstico
- As perguntas devem ser SEQUENCIAIS: a mais importante primeiro (a que mais muda a conduta)
- Perguntas devem soar NATURAIS, como o médico falaria em consulta (2ª pessoa, linguagem coloquial médica)
- NÃO repita perguntas sobre informações que JÁ ESTÃO no transcript (o paciente já respondeu)
- Cada pergunta DEVE ter um MAPA DECISÓRIO CLARO: "Se SIM → conduta X. Se NÃO → conduta Y"
- Tipo "árvore de decisão": se o paciente respondeu X, as próximas perguntas refinam nessa direção
- CATEGORIAS de perguntas (use mix):
  * RED FLAGS: perguntas que identificam emergência (sempre prioridade alta)
  * DISCRIMINATÓRIAS: diferenciam entre diagnósticos do diferencial (prioridade alta/média)
  * TEMPORAIS: cronologia, evolução, padrão de sintomas (prioridade média)
  * FUNCIONAIS: impacto na vida diária, limitações (prioridade média)
  * COMPLEMENTARES: hábitos, alergias, medicamentos atuais que faltam (prioridade baixa)
- Exemplos:
  * "Essa dor vai para o braço esquerdo, mandíbula ou costas?" (SCA → SAMU vs DRGE → IBP)
  * "A tosse é seca ou com catarro? Se catarro, que cor: transparente, amarela ou esverdeada?" (viral vs bacteriano → ATB?)
  * "Você está fazendo xixi normal? Quantidade, cor, arde?" (ITU, nefropatia, desidratação)
  * "Está conseguindo comer e beber normalmente? Perdeu peso recentemente?" (gravidade, desidratação, CA)
  * "Alguém da família teve algo parecido recentemente?" (surto viral, exposição)

REGRAS SOBRE LACUNAS:
- Liste APENAS informações clinicamente relevantes que estão faltando
- Priorize: alergias > medicamentos em uso > antecedentes > gestação/amamentação > hábitos
- Se o paciente já deu informação suficiente para uma anamnese completa, retorne array vazio

REGRAS OBRIGATÓRIAS:
1. NUNCA invente informações que não estejam no transcript
2. CID-10: use APENAS códigos válidos da classificação OFICIAL OMS. Use o código MAIS ESPECÍFICO possível (ex: J03.0 em vez de J06.9 se amigdalite estreptocócica). Na dúvida, use .9 (não especificado). SEMPRE inclua a descrição completa após o código.
3. Diagnóstico diferencial: SEMPRE 2-4 hipóteses quando houver dados mínimos (queixa + 1 dado clínico). Inclua o mais provável E o mais grave (mesmo que improvável).
4. Medicamentos: SEMPRE 3-8 medicamentos com TODOS os campos preenchidos. Inclua:
   - Tratamento ETIOLÓGICO (ex: antibiótico se infeccioso)
   - Tratamento SINTOMÁTICO (analgésico, antitérmico, antiemético)
   - Tratamento ADJUVANTE (protetor gástrico se AINE, probiótico se ATB)
   - PROFILAXIA se indicada
   Prefira genéricos (DCB). SEMPRE inclua contraindicações e interações com medicamentos que o paciente já usa.
5. Exames: SEMPRE 3-10 exames com TODOS os campos. Organize por CATEGORIAS:
   - LABORATORIAIS BÁSICOS: hemograma, PCR/VHS, glicemia, ureia, creatinina, eletrólitos, TGO/TGP, EAS
   - LABORATORIAIS ESPECÍFICOS: conforme hipótese (TSH, HbA1c, sorologias, culturas, marcadores tumorais)
   - IMAGEM: RX, USG, TC, RM — conforme indicação clínica
   - FUNCIONAIS: ECG, espirometria, audiometria — conforme indicação
   Inclua TUSS quando souber. Justifique CADA exame para ESTE paciente.
6. Se algum campo não tiver dados, use string vazia "" ou array vazio []
7. Classificação de gravidade: SEMPRE preencha baseado nos dados disponíveis
8. Alertas vermelhos: APENAS quando fundamentados no transcript — nunca suponha
9. Seja OBJETIVO e use terminologia médica adequada
10. Responda APENAS o JSON, sem texto antes ou depois
11. Perguntas sugeridas: SEMPRE 3-6, priorizadas por impacto. NÃO repita o que o paciente já disse. Cada uma com mapa decisório claro.
""";
    }

    // ── Helpers ──

    private static void CopyIfExists(JsonElement root, Dictionary<string, object> dict, string key)
    {
        if (root.TryGetProperty(key, out var el))
            dict[key] = el.GetRawText();
    }

    private static void CopyArrayIfExists(JsonElement root, Dictionary<string, object> dict, string key)
    {
        if (root.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.Array)
            dict[key] = el.GetRawText();
    }

    private static bool HasClinicalContext(JsonElement root)
    {
        if (root.TryGetProperty("cid_sugerido", out var cidCheck) && !string.IsNullOrWhiteSpace(cidCheck.GetString()))
            return true;
        if (root.TryGetProperty("anamnesis", out var anaCheck) && anaCheck.ValueKind == JsonValueKind.Object
            && anaCheck.TryGetProperty("queixa_principal", out var qpAna) && !string.IsNullOrWhiteSpace(qpAna.GetString()))
            return true;
        return false;
    }

    private static List<string> ExtractSuggestions(JsonElement root)
    {
        var suggestions = new List<string>();
        if (root.TryGetProperty("suggestions", out var sugEl) && sugEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in sugEl.EnumerateArray())
            {
                var str = item.ValueKind == JsonValueKind.String ? item.GetString() : item.GetRawText();
                if (!string.IsNullOrWhiteSpace(str))
                    suggestions.Add(str.Trim('"').Trim());
            }
        }

        // Add alerts to suggestions for backwards compat
        if (root.TryGetProperty("alertas_vermelhos", out var alertsEl) && alertsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in alertsEl.EnumerateArray())
            {
                var str = item.ValueKind == JsonValueKind.String ? item.GetString() : item.GetRawText();
                if (!string.IsNullOrWhiteSpace(str))
                    suggestions.Insert(0, $"🚨 {str.Trim('"').Trim()}");
            }
        }

        return suggestions;
    }

    private string ParseMedicamentosSugeridosV2(JsonElement root, bool hasClinicalContext)
    {
        var medsList = new List<Dictionary<string, object>>();
        if (root.TryGetProperty("medicamentos_sugeridos", out var msEl) && msEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in msEl.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object)
                {
                    medsList.Add(new Dictionary<string, object>
                    {
                        ["nome"] = GetStr(item, "nome"),
                        ["classe_terapeutica"] = GetStr(item, "classe_terapeutica"),
                        ["dose"] = GetStr(item, "dose"),
                        ["via"] = GetStr(item, "via"),
                        ["posologia"] = GetStr(item, "posologia"),
                        ["duracao"] = GetStr(item, "duracao"),
                        ["indicacao"] = GetStr(item, "indicacao"),
                        ["contraindicacoes"] = GetStr(item, "contraindicacoes"),
                        ["interacoes"] = GetStr(item, "interacoes"),
                        ["alerta_faixa_etaria"] = GetStr(item, "alerta_faixa_etaria"),
                        ["alternativa"] = GetStr(item, "alternativa")
                    });
                }
                else
                {
                    var str = item.ValueKind == JsonValueKind.String ? item.GetString() : item.GetRawText()?.Trim('"');
                    if (!string.IsNullOrWhiteSpace(str))
                        medsList.Add(new Dictionary<string, object>
                        {
                            ["nome"] = str.Trim(), ["classe_terapeutica"] = "", ["dose"] = "",
                            ["via"] = "", ["posologia"] = "", ["duracao"] = "", ["indicacao"] = "",
                            ["contraindicacoes"] = "", ["interacoes"] = "", ["alerta_faixa_etaria"] = "",
                            ["alternativa"] = ""
                        });
                }
            }
        }

        if (medsList.Count == 0 && hasClinicalContext)
        {
            medsList.Add(new Dictionary<string, object>
            {
                ["nome"] = "Avaliar necessidade de prescrição conforme evolução clínica",
                ["classe_terapeutica"] = "", ["dose"] = "", ["via"] = "", ["posologia"] = "",
                ["duracao"] = "", ["indicacao"] = "", ["contraindicacoes"] = "",
                ["interacoes"] = "", ["alerta_faixa_etaria"] = "", ["alternativa"] = ""
            });
        }

        return medsList.Count == 0 ? "[]" : JsonSerializer.Serialize(medsList, JsonOptions);
    }

    private string ParseExamesSugeridosV2(JsonElement root, bool hasClinicalContext)
    {
        var examsList = new List<Dictionary<string, object>>();
        if (root.TryGetProperty("exames_sugeridos", out var exEl) && exEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in exEl.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object)
                {
                    examsList.Add(new Dictionary<string, object>
                    {
                        ["nome"] = GetStr(item, "nome"),
                        ["codigo_tuss"] = GetStr(item, "codigo_tuss"),
                        ["descricao"] = GetStr(item, "descricao"),
                        ["o_que_afere"] = GetStr(item, "o_que_afere"),
                        ["indicacao"] = GetStr(item, "indicacao"),
                        ["preparo_paciente"] = GetStr(item, "preparo_paciente"),
                        ["prazo_resultado"] = GetStr(item, "prazo_resultado"),
                        ["urgencia"] = GetStr(item, "urgencia")
                    });
                }
                else
                {
                    var str = item.ValueKind == JsonValueKind.String ? item.GetString() : item.GetRawText()?.Trim('"');
                    if (!string.IsNullOrWhiteSpace(str))
                        examsList.Add(new Dictionary<string, object>
                        {
                            ["nome"] = str.Trim(), ["codigo_tuss"] = "", ["descricao"] = "",
                            ["o_que_afere"] = "", ["indicacao"] = "", ["preparo_paciente"] = "",
                            ["prazo_resultado"] = "", ["urgencia"] = "rotina"
                        });
                }
            }
        }

        if (examsList.Count == 0 && hasClinicalContext)
        {
            examsList.Add(new Dictionary<string, object>
            {
                ["nome"] = "Hemograma completo com contagem de plaquetas",
                ["codigo_tuss"] = "40304361",
                ["descricao"] = "Contagem de séries vermelha, branca e plaquetária",
                ["o_que_afere"] = "Anemia, infecção, inflamação, distúrbios hematológicos",
                ["indicacao"] = "Avaliação inicial de infecção ou inflamação",
                ["preparo_paciente"] = "Jejum de 4 horas recomendado",
                ["prazo_resultado"] = "24-48h",
                ["urgencia"] = "rotina"
            });
            examsList.Add(new Dictionary<string, object>
            {
                ["nome"] = "Exames complementares conforme hipótese diagnóstica",
                ["codigo_tuss"] = "",
                ["descricao"] = "Solicitar conforme evolução e hipótese diagnóstica",
                ["o_que_afere"] = "Variável conforme indicação",
                ["indicacao"] = "Complementar investigação conforme quadro clínico",
                ["preparo_paciente"] = "",
                ["prazo_resultado"] = "",
                ["urgencia"] = "rotina"
            });
        }

        return examsList.Count == 0 ? "[]" : JsonSerializer.Serialize(examsList, JsonOptions);
    }

    private static string GetStr(JsonElement el, string prop)
    {
        if (el.TryGetProperty(prop, out var v))
        {
            return v.ValueKind == JsonValueKind.String
                ? (v.GetString() ?? "")
                : v.GetRawText();
        }
        return "";
    }

    private static string CleanJsonResponse(string raw)
    {
        var s = raw.Trim();
        if (s.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            s = s["```json".Length..];
        else if (s.StartsWith("```"))
            s = s["```".Length..];
        if (s.EndsWith("```"))
            s = s[..^3];
        return s.Trim();
    }

    // ── Evidence search (same as v1) ──

    private static List<string> ExtractSearchTerms(JsonElement root)
    {
        var terms = new List<string>();

        if (root.TryGetProperty("cid_sugerido", out var cidEl))
        {
            var cidStr = cidEl.GetString() ?? "";
            var match = CidCodeRegex.Match(cidStr);
            if (match.Success)
                terms.Add(match.Groups[1].Value);
            // Also add the text description for better search
            var descPart = cidStr.Contains('-') ? cidStr.Split('-', 2)[1].Trim() : "";
            if (descPart.Length > 10)
                terms.Add(descPart[..Math.Min(60, descPart.Length)]);
        }

        // Add differential diagnosis terms for richer evidence
        if (root.TryGetProperty("diagnostico_diferencial", out var ddEl) && ddEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var dd in ddEl.EnumerateArray())
            {
                if (dd.TryGetProperty("cid", out var ddCid))
                {
                    var ddCidStr = ddCid.GetString() ?? "";
                    var ddMatch = CidCodeRegex.Match(ddCidStr);
                    if (ddMatch.Success && terms.Count < 5)
                        terms.Add(ddMatch.Groups[1].Value);
                }
            }
        }

        if (root.TryGetProperty("anamnesis", out var anaEl) && anaEl.ValueKind == JsonValueKind.Object)
        {
            if (anaEl.TryGetProperty("queixa_principal", out var qpEl))
            {
                var qp = (qpEl.ValueKind == JsonValueKind.String ? qpEl.GetString() : qpEl.GetRawText())?.Trim('"').Trim() ?? "";
                if (qp.Length > 20)
                    terms.Add(qp[..Math.Min(80, qp.Length)]);
            }
            if (anaEl.TryGetProperty("sintomas", out var sintEl))
            {
                var sint = sintEl.ValueKind == JsonValueKind.String
                    ? sintEl.GetString()?.Trim('"').Trim()
                    : sintEl.ValueKind == JsonValueKind.Array
                        ? string.Join(" ", sintEl.EnumerateArray().Select(e => e.GetString() ?? ""))
                        : "";
                if (!string.IsNullOrWhiteSpace(sint) && sint.Length > 3)
                    terms.Add(sint[..Math.Min(60, sint.Length)]);
            }
        }

        return terms.Distinct().Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
    }

    private async Task<IReadOnlyList<EvidenceItemDto>> FetchAndTranslateEvidenceAsync(
        JsonElement root,
        string apiKey,
        CancellationToken cancellationToken)
    {
        try
        {
            var searchTerms = ExtractSearchTerms(root);
            if (searchTerms.Count == 0)
                return Array.Empty<EvidenceItemDto>();

            var rawEvidence = await _evidenceSearchService.SearchAsync(searchTerms, 16, cancellationToken);
            if (rawEvidence.Count == 0)
                return rawEvidence;

            return await ExtractRelevantEvidenceAsync(rawEvidence, root, apiKey, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Evidências: falha na busca.");
            return Array.Empty<EvidenceItemDto>();
        }
    }

    private static string BuildClinicalContextForPrompt(JsonElement root)
    {
        var parts = new List<string>();
        if (root.TryGetProperty("cid_sugerido", out var cidEl))
        {
            var cid = cidEl.GetString()?.Trim() ?? "";
            if (!string.IsNullOrEmpty(cid))
                parts.Add($"Hipótese diagnóstica (CID): {cid}");
        }
        if (root.TryGetProperty("diagnostico_diferencial", out var ddEl) && ddEl.ValueKind == JsonValueKind.Array)
        {
            var dds = new List<string>();
            foreach (var dd in ddEl.EnumerateArray())
            {
                if (dd.TryGetProperty("hipotese", out var h))
                    dds.Add(h.GetString() ?? "");
            }
            if (dds.Count > 0)
                parts.Add($"Diagnósticos diferenciais: {string.Join("; ", dds)}");
        }
        if (root.TryGetProperty("anamnesis", out var anaEl) && anaEl.ValueKind == JsonValueKind.Object)
        {
            if (anaEl.TryGetProperty("queixa_principal", out var qpEl))
            {
                var qp = (qpEl.ValueKind == JsonValueKind.String ? qpEl.GetString() : qpEl.GetRawText())?.Trim('"').Trim() ?? "";
                if (!string.IsNullOrEmpty(qp))
                    parts.Add($"Queixa principal: {qp}");
            }
            if (anaEl.TryGetProperty("sintomas", out var sintEl))
            {
                var sint = sintEl.ValueKind == JsonValueKind.String
                    ? sintEl.GetString()?.Trim('"').Trim()
                    : sintEl.ValueKind == JsonValueKind.Array
                        ? string.Join(", ", sintEl.EnumerateArray().Select(e => e.GetString() ?? ""))
                        : "";
                if (!string.IsNullOrWhiteSpace(sint))
                    parts.Add($"Sintomas: {sint}");
            }
        }
        return parts.Count > 0 ? string.Join("\n", parts) : "Contexto clínico não especificado.";
    }

    private async Task<IReadOnlyList<EvidenceItemDto>> ExtractRelevantEvidenceAsync(
        IReadOnlyList<EvidenceItemDto> items,
        JsonElement root,
        string apiKey,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
            return items;

        var context = BuildClinicalContextForPrompt(root);
        var articlesBlock = string.Join("\n\n---\n\n",
            items.Select((e, i) => $"[{i}]\nTítulo: {e.Title}\nAbstract: {e.Abstract}"));

        var prompt = """
Você é um assistente de apoio ao diagnóstico médico. O médico precisa de EMBASAMENTO CIENTÍFICO SÓLIDO.

CONTEXTO CLÍNICO DO PACIENTE:
""" + context + """

ARTIGOS (abstracts em inglês):
""" + articlesBlock + """

Para CADA artigo [0], [1], etc.:
1. Selecione 2-4 trechos relevantes (critérios diagnósticos, evidências de tratamento, guidelines)
2. Traduza os trechos para português brasileiro
3. RELEVÂNCIA CLÍNICA (2-4 frases): como este artigo embasa a decisão, nível de evidência, aplicabilidade

Responda APENAS um JSON válido:
[
  { "excerpts": ["trecho1 traduzido", "trecho2"], "clinicalRelevance": "Explicação..." },
  ...
]
Se irrelevante: excerpts: [], clinicalRelevance: "Pouca relevância direta."
Apenas JSON, sem markdown.
""";

        var requestBody = new
        {
            model = _config.Value?.Model ?? "gpt-4o",
            messages = new object[] { new { role = "user", content = (object)prompt } },
            max_tokens = 4000,
            temperature = 0.2
        };

        var json = JsonSerializer.Serialize(requestBody, JsonOptions);
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        client.Timeout = TimeSpan.FromSeconds(45);

        using var requestContent = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{ApiBaseUrl}/chat/completions", requestContent, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return Array.Empty<EvidenceItemDto>();

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            if (string.IsNullOrWhiteSpace(content))
                return Array.Empty<EvidenceItemDto>();

            var cleaned = CleanJsonResponse(content);
            using var arr = JsonDocument.Parse(cleaned);
            var result = new List<EvidenceItemDto>();
            var idx = 0;
            foreach (var el in arr.RootElement.EnumerateArray())
            {
                if (idx >= items.Count) break;
                var item = items[idx];
                var excerpts = new List<string>();
                var relevance = "";

                if (el.TryGetProperty("excerpts", out var exEl) && exEl.ValueKind == JsonValueKind.Array)
                    foreach (var e in exEl.EnumerateArray())
                    {
                        var s = e.GetString()?.Trim();
                        if (!string.IsNullOrEmpty(s)) excerpts.Add(s);
                    }
                if (el.TryGetProperty("clinicalRelevance", out var relEl))
                    relevance = relEl.GetString()?.Trim() ?? "";

                result.Add(new EvidenceItemDto(
                    item.Title, item.Abstract, item.Source,
                    TranslatedAbstract: excerpts.Count > 0 ? string.Join("\n\n", excerpts) : null,
                    RelevantExcerpts: excerpts.Count > 0 ? excerpts : null,
                    ClinicalRelevance: !string.IsNullOrEmpty(relevance) ? relevance : null,
                    Provider: item.Provider, Url: item.Url));
                idx++;
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Evidências: falha ao parsear resposta.");
            return Array.Empty<EvidenceItemDto>();
        }
    }
}
