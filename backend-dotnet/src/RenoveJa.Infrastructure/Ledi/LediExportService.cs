using System.Text;
using System.Xml;
using System.Xml.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Helpers;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities.Sus;
using RenoveJa.Infrastructure.Ledi.Models;

namespace RenoveJa.Infrastructure.Ledi;

/// <summary>
/// Implementação do serviço LEDI — geração de fichas XML e envio ao PEC e-SUS APS.
/// Compatível com LEDI APS 7.3.7 / PEC 5.4.29+.
/// Ref: https://integracao.esusaps.bridge.ufsc.tech
/// </summary>
public class LediExportService : ILediExportService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly LediConfig _config;
    private readonly ILogger<LediExportService> _logger;

    public LediExportService(
        IHttpClientFactory httpClientFactory,
        IOptions<LediConfig> config,
        ILogger<LediExportService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config.Value;
        _logger = logger;
    }

    // ══════════════════════════════════════════════════════════════
    // VALIDAÇÃO
    // ══════════════════════════════════════════════════════════════

    public LediValidationResult ValidarAtendimento(
        AtendimentoAps atendimento, Cidadao cidadao,
        ProfissionalSus profissional, UnidadeSaude unidade)
    {
        var errors = new List<string>();

        // Cidadão
        if (string.IsNullOrWhiteSpace(cidadao.NomeCompleto))
            errors.Add("Nome do cidadão é obrigatório.");
        if (string.IsNullOrWhiteSpace(cidadao.Cns) && string.IsNullOrWhiteSpace(cidadao.Cpf))
            errors.Add("CNS ou CPF do cidadão é obrigatório.");
        if (!string.IsNullOrWhiteSpace(cidadao.Cns) && !CnsValidator.IsValid(cidadao.Cns))
            errors.Add($"CNS do cidadão inválido: {cidadao.Cns}");

        // Profissional
        if (string.IsNullOrWhiteSpace(profissional.Cns))
            errors.Add("CNS do profissional é obrigatório para ficha LEDI.");
        if (!string.IsNullOrWhiteSpace(profissional.Cns) && !CnsValidator.IsValid(profissional.Cns))
            errors.Add($"CNS do profissional inválido: {profissional.Cns}");
        if (string.IsNullOrWhiteSpace(profissional.Cbo))
            errors.Add("CBO do profissional é obrigatório.");
        if (!string.IsNullOrWhiteSpace(profissional.Cbo) && !CboValidator.IsValidFormat(profissional.Cbo))
            errors.Add($"CBO do profissional com formato inválido: {profissional.Cbo}");
        if (!string.IsNullOrWhiteSpace(profissional.Cbo) && !CboValidator.IsAllowedForFicha(profissional.Cbo, "atendimento_individual"))
            errors.Add($"CBO {profissional.Cbo} não é permitido para ficha de Atendimento Individual.");

        // Unidade
        if (string.IsNullOrWhiteSpace(unidade.Cnes))
            errors.Add("CNES da unidade é obrigatório.");

        return errors.Count == 0
            ? LediValidationResult.Ok()
            : new LediValidationResult(false, errors);
    }

    // ══════════════════════════════════════════════════════════════
    // MAPPER: Dados internos → Fichas LEDI XML
    // ══════════════════════════════════════════════════════════════

    public Task<LediFileResult> GerarFichaCadastroIndividualAsync(
        Cidadao cidadao, ProfissionalSus profissional, CancellationToken ct = default)
    {
        try
        {
            var ficha = new FichaCadastroIndividual
            {
                UuidFicha = Guid.NewGuid().ToString(),
                Header = BuildHeader(profissional, cidadao.CreatedAt),
                Cidadao = new IdentificacaoCidadao
                {
                    Nome = cidadao.NomeCompleto,
                    DataNascimento = cidadao.DataNascimento?.ToString("yyyy-MM-dd"),
                    Sexo = MapSexo(cidadao.Sexo),
                    Cpf = CleanCpf(cidadao.Cpf),
                    Cns = cidadao.Cns?.Replace(" ", ""),
                    NomeMae = cidadao.NomeMae,
                    Telefone = cidadao.Telefone,
                    Email = cidadao.Email,
                    Microarea = cidadao.Microarea,
                },
            };

            var xml = SerializeToXml(ficha);
            var fileName = $"{ficha.UuidFicha}.esus";

            return Task.FromResult(new LediFileResult(true, ficha.UuidFicha, xml, fileName, null));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar ficha de cadastro individual para cidadão {CidadaoId}", cidadao.Id);
            return Task.FromResult(new LediFileResult(false, null, null, null, ex.Message));
        }
    }

    public Task<LediFileResult> GerarFichaAtendimentoIndividualAsync(
        AtendimentoAps atendimento, Cidadao cidadao,
        ProfissionalSus profissional, UnidadeSaude unidade, CancellationToken ct = default)
    {
        try
        {
            // Parse PA: "120/80" → sistólica=120, diastólica=80
            ParsePressaoArterial(atendimento.PressaoArterial, out var paSist, out var paDiast);

            var ficha = new FichaAtendimentoIndividual
            {
                UuidFicha = Guid.NewGuid().ToString(),
                Header = BuildHeader(profissional, atendimento.DataAtendimento, unidade),
                NumeroProntuario = atendimento.Id.ToString("N")[..8],
                CnsCidadao = cidadao.Cns?.Replace(" ", ""),
                CpfCidadao = CleanCpf(cidadao.Cpf),
                DataNascimento = cidadao.DataNascimento?.ToString("yyyy-MM-dd"),
                Sexo = MapSexo(cidadao.Sexo),
                Turno = DetectTurno(atendimento.DataAtendimento),

                // Sinais vitais
                Peso = atendimento.Peso,
                Altura = atendimento.Altura,
                PaSistolica = paSist,
                PaDiastolica = paDiast,
                Temperatura = atendimento.Temperatura,
                FrequenciaCardiaca = atendimento.FrequenciaCardiaca,
                FrequenciaRespiratoria = atendimento.FrequenciaRespiratoria,
                SaturacaoO2 = atendimento.SaturacaoO2,
                Glicemia = atendimento.Glicemia,

                // SOAP
                Subjetivo = atendimento.Subjetivo,
                Objetivo = atendimento.Objetivo,
                Avaliacao = atendimento.Avaliacao,
                Plano = atendimento.Plano,

                // CID / CIAP
                Cids = BuildCidList(atendimento.Cid10Principal, atendimento.Cid10Secundario),
                ProblemasCiap = !string.IsNullOrWhiteSpace(atendimento.Ciap2)
                    ? new List<string> { atendimento.Ciap2.Trim() }
                    : null,
            };

            var xml = SerializeToXml(ficha);
            var fileName = $"{ficha.UuidFicha}.esus";

            return Task.FromResult(new LediFileResult(true, ficha.UuidFicha, xml, fileName, null));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar ficha de atendimento individual {AtendimentoId}", atendimento.Id);
            return Task.FromResult(new LediFileResult(false, null, null, null, ex.Message));
        }
    }

    // ══════════════════════════════════════════════════════════════
    // ENVIO ao PEC
    // ══════════════════════════════════════════════════════════════

    /// <summary>
    /// Envia arquivo .esus ao PEC via POST /api/v1/recebimento/ficha.
    /// Ref: https://integracao.esusaps.bridge.ufsc.tech/ledi/api.html
    /// </summary>
    public async Task<LediSendResult> EnviarParaPecAsync(byte[] fileContent, string fileName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_config.PecBaseUrl))
        {
            _logger.LogWarning("LEDI: PecBaseUrl não configurada — envio desabilitado.");
            return new LediSendResult(false, null, 0, "PEC URL não configurada. Configure Ledi__PecBaseUrl.", null);
        }

        var uuid = Path.GetFileNameWithoutExtension(fileName);
        var url = $"{_config.PecBaseUrl.TrimEnd('/')}/api/v1/recebimento/ficha";

        for (int attempt = 1; attempt <= _config.MaxRetries; attempt++)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("LediPec");
                client.Timeout = TimeSpan.FromSeconds(_config.TimeoutSeconds);

                // Auth header
                if (!string.IsNullOrWhiteSpace(_config.PecAuthToken))
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _config.PecAuthToken);
                else if (!string.IsNullOrWhiteSpace(_config.PecUsername) && !string.IsNullOrWhiteSpace(_config.PecPassword))
                {
                    var creds = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_config.PecUsername}:{_config.PecPassword}"));
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", creds);
                }

                using var content = new MultipartFormDataContent();
                using var stream = new ByteArrayContent(fileContent);
                stream.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
                content.Add(stream, "ficha", fileName);

                var response = await client.PostAsync(url, content, ct);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("LEDI: Ficha {Uuid} enviada com sucesso ao PEC (tentativa {Attempt})", uuid, attempt);
                    return new LediSendResult(true, uuid, (int)response.StatusCode, null, null);
                }

                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("LEDI: Erro ao enviar ficha {Uuid} — HTTP {Status}: {Body} (tentativa {Attempt}/{Max})",
                    uuid, (int)response.StatusCode, errorBody, attempt, _config.MaxRetries);

                if (attempt == _config.MaxRetries)
                    return new LediSendResult(false, uuid, (int)response.StatusCode, errorBody, response.StatusCode.ToString());
            }
            catch (Exception ex) when (attempt < _config.MaxRetries)
            {
                _logger.LogWarning(ex, "LEDI: Exceção ao enviar ficha {Uuid} (tentativa {Attempt}/{Max})", uuid, attempt, _config.MaxRetries);
                await Task.Delay(1000 * attempt, ct); // backoff
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LEDI: Falha definitiva ao enviar ficha {Uuid}", uuid);
                return new LediSendResult(false, uuid, 0, ex.Message, "EXCEPTION");
            }
        }

        return new LediSendResult(false, uuid, 0, "Max retries exceeded", "MAX_RETRIES");
    }

    /// <summary>
    /// Exporta em lote todos os atendimentos não exportados.
    /// </summary>
    public Task<LediExportBatchResult> ExportarLoteAsync(CancellationToken ct = default)
    {
        // TODO: buscar atendimentos onde ExportadoEsus=false, gerar fichas, enviar
        // Placeholder — o service real fará query no repository
        _logger.LogInformation("LEDI: ExportarLoteAsync chamado — implementação completa requer ISusRepository.");
        return Task.FromResult(new LediExportBatchResult(0, 0, 0, new List<string> { "Batch export requer ISusRepository. Use exportação individual por enquanto." }));
    }

    public Task<LediExportStatus> GetStatusAsync(CancellationToken ct = default)
    {
        // TODO: query real no banco
        return Task.FromResult(new LediExportStatus(0, 0, null));
    }

    // ══════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════

    private HeaderTransport BuildHeader(ProfissionalSus profissional, DateTime dataAtendimento, UnidadeSaude? unidade = null)
    {
        return new HeaderTransport
        {
            ProfissionalCns = profissional.Cns?.Replace(" ", "") ?? "",
            CboCodigo = profissional.Cbo?.Replace(".", "").Replace("-", "") ?? "",
            Cnes = unidade?.Cnes ?? "",
            DataAtendimento = dataAtendimento.ToString("yyyy-MM-dd"),
            CodigoIbge = "3525904", // Jundiaí — parametrizar depois
        };
    }

    private static int? MapSexo(string? sexo) => sexo?.ToUpperInvariant() switch
    {
        "M" => 0,
        "F" => 1,
        "I" => null,
        _ => null,
    };

    private static int DetectTurno(DateTime dt)
    {
        var hour = dt.Hour;
        if (hour < 12) return 1; // Manhã
        if (hour < 18) return 2; // Tarde
        return 3; // Noite
    }

    private static string? CleanCpf(string? cpf)
        => cpf?.Replace(".", "").Replace("-", "").Replace(" ", "").Trim();

    private static void ParsePressaoArterial(string? pa, out int? sistolica, out int? diastolica)
    {
        sistolica = null;
        diastolica = null;
        if (string.IsNullOrWhiteSpace(pa)) return;

        var parts = pa.Split('/', 'x', 'X');
        if (parts.Length == 2)
        {
            if (int.TryParse(parts[0].Trim(), out var s)) sistolica = s;
            if (int.TryParse(parts[1].Trim(), out var d)) diastolica = d;
        }
    }

    private static List<string>? BuildCidList(string? cid1, string? cid2)
    {
        var list = new List<string>();
        if (!string.IsNullOrWhiteSpace(cid1)) list.Add(cid1.Trim());
        if (!string.IsNullOrWhiteSpace(cid2)) list.Add(cid2.Trim());
        return list.Count > 0 ? list : null;
    }

    private static byte[] SerializeToXml<T>(T obj) where T : class
    {
        var serializer = new XmlSerializer(typeof(T));
        var settings = new XmlWriterSettings
        {
            Encoding = Encoding.UTF8,
            Indent = true,
            OmitXmlDeclaration = false,
        };

        using var ms = new MemoryStream();
        using var writer = XmlWriter.Create(ms, settings);
        serializer.Serialize(writer, obj);
        return ms.ToArray();
    }
}
