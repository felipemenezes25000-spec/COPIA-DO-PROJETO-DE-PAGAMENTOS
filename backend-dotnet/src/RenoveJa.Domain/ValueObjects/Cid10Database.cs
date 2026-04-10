namespace RenoveJa.Domain.ValueObjects;

/// <summary>
/// Base de dados estática dos CID-10 mais usados em atenção primária e telemedicina brasileira.
/// Fonte: Tabela CID-10 da OMS, filtrada para os ~200 mais frequentes.
/// Uso: validação de CID sugerido pela IA, autocomplete no frontend.
/// </summary>
public static class Cid10Database
{
    private static readonly Dictionary<string, string> Codes = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Capítulo I: Doenças Infecciosas e Parasitárias (A00-B99) ──
        ["A09"] = "Diarreia e gastroenterite de origem infecciosa presumível",
        ["A09.0"] = "Outra gastroenterite e colite de origem infecciosa",
        ["A15"] = "Tuberculose respiratória, com confirmação bacteriológica e histológica",
        ["A49.9"] = "Infecção bacteriana não especificada",
        ["A90"] = "Dengue [dengue clássico]",
        ["A91"] = "Febre hemorrágica devida ao vírus do dengue",
        ["B00.9"] = "Infecção pelo vírus do herpes simples, não especificada",
        ["B01.9"] = "Varicela sem complicação",
        ["B02.9"] = "Herpes zoster sem complicação",
        ["B34.9"] = "Infecção viral não especificada",
        ["B35.1"] = "Tinha das unhas",
        ["B35.3"] = "Tinha do pé",
        ["B35.4"] = "Tinha do corpo",
        ["B36.0"] = "Pitiríase versicolor",
        ["B37.0"] = "Estomatite por Candida",
        ["B37.3"] = "Candidíase da vulva e da vagina",
        ["B77.9"] = "Ascaridíase não especificada",
        ["B82.9"] = "Parasitose intestinal não especificada",

        // ── Capítulo II: Neoplasias (C00-D48) ──
        ["D22.9"] = "Nevo melanocítico, não especificado",
        ["D25.9"] = "Leiomioma do útero, não especificado",

        // ── Capítulo III: Sangue e Imunidade (D50-D89) ──
        ["D50.9"] = "Anemia por deficiência de ferro não especificada",
        ["D50.0"] = "Anemia por deficiência de ferro secundária a perda de sangue (crônica)",
        ["D64.9"] = "Anemia não especificada",

        // ── Capítulo IV: Endócrinas, Nutricionais e Metabólicas (E00-E90) ──
        ["E03.9"] = "Hipotireoidismo não especificado",
        ["E04.9"] = "Bócio não-tóxico, não especificado",
        ["E05.9"] = "Tireotoxicose não especificada",
        ["E10"] = "Diabetes mellitus insulino-dependente",
        ["E10.9"] = "Diabetes mellitus insulino-dependente sem complicações",
        ["E11"] = "Diabetes mellitus não-insulino-dependente",
        ["E11.9"] = "Diabetes mellitus não-insulino-dependente sem complicações",
        ["E11.2"] = "Diabetes mellitus não-insulino-dependente com complicações renais",
        ["E11.5"] = "Diabetes mellitus não-insulino-dependente com complicações circulatórias periféricas",
        ["E14.9"] = "Diabetes mellitus não especificado sem complicações",
        ["E28.2"] = "Síndrome do ovário policístico",
        ["E55.9"] = "Deficiência de vitamina D não especificada",
        ["E61.1"] = "Deficiência de ferro",
        ["E66.0"] = "Obesidade devida a excesso de calorias",
        ["E66.9"] = "Obesidade não especificada",
        ["E78.0"] = "Hipercolesterolemia pura",
        ["E78.1"] = "Hipertrigliceridemia pura",
        ["E78.2"] = "Hiperlipidemia mista",
        ["E78.5"] = "Hiperlipidemia não especificada",
        ["E79.0"] = "Hiperuricemia sem sinais de artrite inflamatória e de doença tofácea",
        ["E87.6"] = "Hipopotassemia",

        // ── Capítulo V: Transtornos Mentais (F00-F99) ──
        ["F10.2"] = "Transtornos mentais e comportamentais devidos ao uso de álcool - síndrome de dependência",
        ["F17.2"] = "Transtornos mentais e comportamentais devidos ao uso de fumo - síndrome de dependência",
        ["F20.9"] = "Esquizofrenia não especificada",
        ["F31.9"] = "Transtorno afetivo bipolar, não especificado",
        ["F32.0"] = "Episódio depressivo leve",
        ["F32.1"] = "Episódio depressivo moderado",
        ["F32.2"] = "Episódio depressivo grave sem sintomas psicóticos",
        ["F32.9"] = "Episódio depressivo não especificado",
        ["F33.0"] = "Transtorno depressivo recorrente, episódio atual leve",
        ["F33.1"] = "Transtorno depressivo recorrente, episódio atual moderado",
        ["F33.9"] = "Transtorno depressivo recorrente sem especificação",
        ["F40.0"] = "Agorafobia",
        ["F40.1"] = "Fobias sociais",
        ["F41.0"] = "Transtorno de pânico [ansiedade paroxística episódica]",
        ["F41.1"] = "Ansiedade generalizada",
        ["F41.2"] = "Transtorno misto ansioso e depressivo",
        ["F41.9"] = "Transtorno ansioso não especificado",
        ["F42"] = "Transtorno obsessivo-compulsivo",
        ["F43.0"] = "Reação aguda ao estresse",
        ["F43.1"] = "Estado de estresse pós-traumático",
        ["F43.2"] = "Transtornos de adaptação",
        ["F45.0"] = "Transtorno de somatização",
        ["F51.0"] = "Insônia não-orgânica",
        ["F90.0"] = "Distúrbios da atividade e da atenção (TDAH)",

        // ── Capítulo VI: Sistema Nervoso (G00-G99) ──
        ["G40.9"] = "Epilepsia não especificada",
        ["G43.0"] = "Enxaqueca sem aura [enxaqueca comum]",
        ["G43.1"] = "Enxaqueca com aura [enxaqueca clássica]",
        ["G43.9"] = "Enxaqueca sem especificação",
        ["G44.2"] = "Cefaleia tensional",
        ["G47.0"] = "Distúrbios do início e da manutenção do sono [insônias]",
        ["G47.3"] = "Apneia de sono",
        ["G51.0"] = "Paralisia de Bell",
        ["G54.1"] = "Transtornos do plexo lombossacro",
        ["G56.0"] = "Síndrome do túnel do carpo",

        // ── Capítulo VII: Olho e Anexos (H00-H59) ──
        ["H10.9"] = "Conjuntivite não especificada",
        ["H10.1"] = "Conjuntivite aguda atópica",
        ["H52.1"] = "Miopia",
        ["H52.4"] = "Presbiopia",
        ["H66.9"] = "Otite média não especificada",

        // ── Capítulo VIII: Ouvido (H60-H95) ──
        ["H60.9"] = "Otite externa não especificada",
        ["H61.2"] = "Cerume impactado",
        ["H65.9"] = "Otite média não-supurativa não especificada",
        ["H81.1"] = "Vertigem paroxística benigna",
        ["H93.1"] = "Zumbido",

        // ── Capítulo IX: Aparelho Circulatório (I00-I99) ──
        ["I10"] = "Hipertensão essencial (primária)",
        ["I11.9"] = "Doença cardíaca hipertensiva sem insuficiência cardíaca (congestiva)",
        ["I20.9"] = "Angina pectoris, não especificada",
        ["I25.1"] = "Doença aterosclerótica do coração",
        ["I42.0"] = "Cardiomiopatia dilatada",
        ["I48"] = "Flutter e fibrilação atrial",
        ["I49.9"] = "Arritmia cardíaca não especificada",
        ["I50.9"] = "Insuficiência cardíaca não especificada",
        ["I63.9"] = "Infarto cerebral não especificado",
        ["I64"] = "Acidente vascular cerebral, não especificado como hemorrágico ou isquêmico",
        ["I73.9"] = "Doença vascular periférica não especificada",
        ["I80.2"] = "Flebite e tromboflebite de outros vasos profundos dos membros inferiores",
        ["I83.9"] = "Varizes dos membros inferiores sem úlcera ou inflamação",
        ["I84.9"] = "Hemorroidas não especificadas sem complicação",

        // ── Capítulo X: Aparelho Respiratório (J00-J99) ──
        ["J00"] = "Nasofaringite aguda [resfriado comum]",
        ["J01.9"] = "Sinusite aguda não especificada",
        ["J02.9"] = "Faringite aguda não especificada",
        ["J03.9"] = "Amigdalite aguda não especificada",
        ["J04.0"] = "Laringite aguda",
        ["J06.9"] = "Infecção aguda das vias aéreas superiores não especificada",
        ["J11.1"] = "Influenza [gripe] devida a vírus não identificado, com outras manifestações respiratórias",
        ["J15.9"] = "Pneumonia bacteriana não especificada",
        ["J18.9"] = "Pneumonia não especificada",
        ["J20.9"] = "Bronquite aguda não especificada",
        ["J30.1"] = "Rinite alérgica devida a pólen",
        ["J30.4"] = "Rinite alérgica não especificada",
        ["J31.0"] = "Rinite crônica",
        ["J32.9"] = "Sinusite crônica não especificada",
        ["J34.2"] = "Desvio do septo nasal",
        ["J40"] = "Bronquite não especificada como aguda ou crônica",
        ["J42"] = "Bronquite crônica não especificada",
        ["J44.1"] = "Doença pulmonar obstrutiva crônica com exacerbação aguda, não especificada",
        ["J44.9"] = "Doença pulmonar obstrutiva crônica não especificada",
        ["J45.0"] = "Asma predominantemente alérgica",
        ["J45.9"] = "Asma não especificada",

        // ── Capítulo XI: Aparelho Digestivo (K00-K93) ──
        ["K04.7"] = "Abscesso periapical sem fístula",
        ["K08.1"] = "Perda de dentes devida a acidente, extração ou doença periodontal local",
        ["K21.0"] = "Doença do refluxo gastroesofágico com esofagite",
        ["K21.9"] = "Doença do refluxo gastroesofágico sem esofagite",
        ["K25.9"] = "Úlcera gástrica sem hemorragia ou perfuração, não especificada como aguda ou crônica",
        ["K29.7"] = "Gastrite não especificada",
        ["K30"] = "Dispepsia",
        ["K35.8"] = "Apendicite aguda, outra e a não especificada",
        ["K40.9"] = "Hérnia inguinal unilateral ou não especificada, sem obstrução ou gangrena",
        ["K44.9"] = "Hérnia diafragmática sem obstrução ou gangrena",
        ["K52.9"] = "Gastroenterite e colite não-infecciosas, não especificadas",
        ["K57.3"] = "Doença diverticular do intestino grosso sem perfuração ou abscesso",
        ["K58.9"] = "Síndrome do intestino irritável sem diarreia",
        ["K59.0"] = "Constipação",
        ["K76.0"] = "Degeneração gordurosa do fígado não classificada em outra parte",
        ["K80.2"] = "Calculose da vesícula biliar sem colecistite",

        // ── Capítulo XII: Pele e Tecido Subcutâneo (L00-L99) ──
        ["L01.0"] = "Impetigo [qualquer organismo] [qualquer local]",
        ["L02.9"] = "Abscesso cutâneo, furúnculo e carbúnculo, de localização não especificada",
        ["L08.9"] = "Infecção localizada da pele e do tecido subcutâneo, não especificada",
        ["L20.9"] = "Dermatite atópica, não especificada",
        ["L23.9"] = "Dermatite alérgica de contato, causa não especificada",
        ["L25.9"] = "Dermatite de contato não especificada, causa não especificada",
        ["L30.9"] = "Dermatite não especificada",
        ["L40.0"] = "Psoríase vulgar",
        ["L50.9"] = "Urticária não especificada",
        ["L60.0"] = "Unha encravada",
        ["L65.9"] = "Alopecia não-cicatricial, não especificada",
        ["L70.0"] = "Acne vulgar",
        ["L72.0"] = "Cisto epidérmico",
        ["L82"] = "Ceratose seborreica",

        // ── Capítulo XIII: Sistema Osteomuscular (M00-M99) ──
        ["M06.9"] = "Artrite reumatoide não especificada",
        ["M10.9"] = "Gota não especificada",
        ["M15.9"] = "Poliartrose não especificada",
        ["M17.9"] = "Gonartrose não especificada",
        ["M19.9"] = "Artrose não especificada",
        ["M25.5"] = "Dor articular",
        ["M47.9"] = "Espondilose não especificada",
        ["M50.1"] = "Transtorno de disco cervical com radiculopatia",
        ["M51.1"] = "Transtornos de discos lombares e de outros discos intervertebrais com radiculopatia",
        ["M54.2"] = "Cervicalgia",
        ["M54.4"] = "Lumbago com ciática",
        ["M54.5"] = "Dor lombar baixa",
        ["M54.9"] = "Dorsalgia não especificada",
        ["M62.8"] = "Outros transtornos especificados dos músculos",
        ["M65.9"] = "Sinovite e tenossinovite não especificadas",
        ["M67.4"] = "Ganglion",
        ["M72.2"] = "Fibromatose da fáscia plantar [Fasciíte plantar]",
        ["M75.1"] = "Síndrome do manguito rotador",
        ["M75.5"] = "Bursite do ombro",
        ["M77.1"] = "Epicondilite lateral",
        ["M79.1"] = "Mialgia",
        ["M79.3"] = "Paniculite não especificada",
        ["M79.6"] = "Dor em membro",
        ["M81.9"] = "Osteoporose não especificada",

        // ── Capítulo XIV: Aparelho Geniturinário (N00-N99) ──
        ["N10"] = "Nefrite túbulo-intersticial aguda [Pielonefrite aguda]",
        ["N18.9"] = "Insuficiência renal crônica não especificada",
        ["N20.0"] = "Cálculo do rim",
        ["N23"] = "Cólica renal não especificada",
        ["N30.0"] = "Cistite aguda",
        ["N30.9"] = "Cistite não especificada",
        ["N39.0"] = "Infecção do trato urinário de localização não especificada",
        ["N40"] = "Hiperplasia da próstata",
        ["N41.0"] = "Prostatite aguda",
        ["N48.1"] = "Balanopostite",
        ["N71.9"] = "Doença inflamatória do útero, não especificada",
        ["N72"] = "Doença inflamatória do colo do útero",
        ["N73.0"] = "Parametrite e celulite pélvica agudas",
        ["N76.0"] = "Vaginite aguda",
        ["N77.1"] = "Vaginite em doenças infecciosas e parasitárias classificadas em outra parte",
        ["N80.9"] = "Endometriose não especificada",
        ["N91.2"] = "Amenorreia não especificada",
        ["N92.0"] = "Menstruação excessiva e frequente com ciclo regular",
        ["N92.1"] = "Menstruação excessiva e frequente com ciclo irregular",
        ["N94.6"] = "Dismenorreia não especificada",
        ["N95.1"] = "Estados da menopausa e do climatério feminino",

        // ── Capítulo XV: Gravidez (O00-O99) ──
        ["O80"] = "Parto único espontâneo",

        // ── Capítulo XVIII: Sintomas e Sinais (R00-R99) ──
        ["R00.0"] = "Taquicardia não especificada",
        ["R00.2"] = "Palpitações",
        ["R05"] = "Tosse",
        ["R06.0"] = "Dispneia",
        ["R07.4"] = "Dor torácica não especificada",
        ["R10.4"] = "Outras dores abdominais e as não especificadas",
        ["R11"] = "Náusea e vômitos",
        ["R19.4"] = "Alterações do hábito intestinal",
        ["R21"] = "Eritema e outras erupções cutâneas não-especificadas",
        ["R25.2"] = "Cãibra e espasmo",
        ["R42"] = "Tontura e instabilidade",
        ["R50.9"] = "Febre não especificada",
        ["R51"] = "Cefaleia",
        ["R53"] = "Mal-estar e fadiga",
        ["R56.0"] = "Convulsões febris",
        ["R63.4"] = "Perda de peso anormal",
        ["R73.0"] = "Anomalias da tolerância à glicose",

        // ── Capítulo XIX: Lesões e Envenenamentos (S00-T98) ──
        ["S61.0"] = "Ferimento dos dedos sem lesão da unha",
        ["S80.0"] = "Contusão do joelho",
        ["S93.4"] = "Entorse e distensão do tornozelo",
        ["T14.0"] = "Traumatismo superficial de região não especificada do corpo",
        ["T78.4"] = "Alergia não especificada",

        // ── Capítulo XXI: Fatores que Influenciam (Z00-Z99) ──
        ["Z00.0"] = "Exame médico geral",
        ["Z01.4"] = "Exame ginecológico (geral) (de rotina)",
        ["Z12.3"] = "Exame especial de rastreamento de neoplasia de mama",
        ["Z30.0"] = "Aconselhamento e orientação gerais sobre contracepção",
        ["Z71.1"] = "Pessoa com medo de queixa para a qual não foi feito diagnóstico",
        ["Z72.0"] = "Uso do tabaco",
        ["Z76.0"] = "Emissão de receitas de repetição",
    };

    /// <summary>Verifica se um código CID-10 é válido.</summary>
    public static bool IsValid(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Codes.ContainsKey(code.Trim().ToUpperInvariant());

    /// <summary>Retorna a descrição do código CID-10, ou null se inválido.</summary>
    public static string? GetDescription(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Codes.TryGetValue(code.Trim().ToUpperInvariant(), out var desc) ? desc : null;

    /// <summary>
    /// Busca códigos CID-10 por termo (código ou descrição).
    /// Retorna até maxResults resultados ordenados por relevância.
    /// </summary>
    public static IReadOnlyList<Cid10Entry> Search(string term, int maxResults = 10)
    {
        if (string.IsNullOrWhiteSpace(term) || term.Length < 2)
            return Array.Empty<Cid10Entry>();

        var normalizedTerm = term.Trim().ToUpperInvariant();
        var results = new List<(Cid10Entry entry, int score)>();

        foreach (var (code, description) in Codes)
        {
            var score = 0;
            var upperCode = code.ToUpperInvariant();
            var upperDesc = description.ToUpperInvariant();

            // Exact code match
            if (upperCode == normalizedTerm) score = 100;
            // Code starts with term
            else if (upperCode.StartsWith(normalizedTerm)) score = 80;
            // Description contains term
            else if (upperDesc.Contains(normalizedTerm)) score = 60;
            // Partial word match in description
            else
            {
                var words = normalizedTerm.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var matchedWords = words.Count(w => upperDesc.Contains(w));
                if (matchedWords > 0)
                    score = 20 + (matchedWords * 15);
            }

            if (score > 0)
                results.Add((new Cid10Entry(code, description), score));
        }

        return results
            .OrderByDescending(r => r.score)
            .ThenBy(r => r.entry.Code)
            .Take(maxResults)
            .Select(r => r.entry)
            .ToList();
    }

    /// <summary>Retorna todos os códigos disponíveis (para export/cache).</summary>
    public static IReadOnlyDictionary<string, string> GetAll() => Codes;
}

/// <summary>Entrada de CID-10 para resultados de busca.</summary>
public record Cid10Entry(string Code, string Description);
