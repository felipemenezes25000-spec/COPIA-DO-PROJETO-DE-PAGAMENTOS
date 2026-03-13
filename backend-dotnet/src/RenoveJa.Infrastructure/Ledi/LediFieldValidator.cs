using RenoveJa.Application.Helpers;
using RenoveJa.Domain.Entities.Sus;

namespace RenoveJa.Infrastructure.Ledi;

/// <summary>
/// Validações LEDI 7.3.7 — regras oficiais de campos obrigatórios por tipo de ficha.
/// Ref: https://integracao.esusaps.bridge.ufsc.tech/pdf.html
/// </summary>
public static class LediFieldValidator
{
    /// <summary>
    /// Valida campos para Ficha de Cadastro Individual.
    /// </summary>
    public static List<string> ValidarCadastroIndividual(Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade)
    {
        var errors = new List<string>();

        // Header obrigatório
        ValidateHeader(profissional, unidade, errors);

        // Cidadão
        if (string.IsNullOrWhiteSpace(cidadao.NomeCompleto))
            errors.Add("LEDI: nomeCidadao é obrigatório.");
        if (cidadao.NomeCompleto?.Length < 3)
            errors.Add("LEDI: nomeCidadao deve ter pelo menos 3 caracteres.");
        if (cidadao.DataNascimento == null)
            errors.Add("LEDI: dataNascimentoCidadao é obrigatório.");
        if (string.IsNullOrWhiteSpace(cidadao.Sexo))
            errors.Add("LEDI: sexoCidadao é obrigatório.");
        if (cidadao.Sexo != null && cidadao.Sexo != "M" && cidadao.Sexo != "F" && cidadao.Sexo != "I")
            errors.Add("LEDI: sexoCidadao deve ser M, F ou I.");

        // CNS ou CPF obrigatório
        var hasCns = !string.IsNullOrWhiteSpace(cidadao.Cns);
        var hasCpf = !string.IsNullOrWhiteSpace(cidadao.Cpf);
        if (!hasCns && !hasCpf)
            errors.Add("LEDI: CNS ou CPF do cidadão é obrigatório.");
        if (hasCns && !CnsValidator.IsValid(cidadao.Cns))
            errors.Add($"LEDI: CNS inválido ({cidadao.Cns}). Deve ter 15 dígitos, início 1/2/7/8/9, módulo 11.");

        // Nome da mãe
        if (string.IsNullOrWhiteSpace(cidadao.NomeMae))
            errors.Add("LEDI: nomeMaeCidadao é obrigatório para Cadastro Individual.");

        return errors;
    }

    /// <summary>
    /// Valida campos para Ficha de Atendimento Individual.
    /// </summary>
    public static List<string> ValidarAtendimentoIndividual(
        AtendimentoAps atendimento, Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade)
    {
        var errors = new List<string>();

        ValidateHeader(profissional, unidade, errors);

        // Cidadão
        if (string.IsNullOrWhiteSpace(cidadao.Cns) && string.IsNullOrWhiteSpace(cidadao.Cpf))
            errors.Add("LEDI: CNS ou CPF do cidadão é obrigatório.");
        if (!string.IsNullOrWhiteSpace(cidadao.Cns) && !CnsValidator.IsValid(cidadao.Cns))
            errors.Add($"LEDI: CNS do cidadão inválido ({cidadao.Cns}).");
        if (cidadao.DataNascimento == null)
            errors.Add("LEDI: Data de nascimento do cidadão é obrigatória.");

        // CBO deve ser permitido para atendimento individual
        if (!string.IsNullOrWhiteSpace(profissional.Cbo) && !CboValidator.IsAllowedForFicha(profissional.Cbo, "atendimento_individual"))
            errors.Add($"LEDI: CBO {profissional.Cbo} não é permitido para Atendimento Individual.");

        // Sinais vitais — PA parsing
        if (!string.IsNullOrWhiteSpace(atendimento.PressaoArterial))
        {
            var parts = atendimento.PressaoArterial.Split('/', 'x', 'X');
            if (parts.Length != 2)
                errors.Add("LEDI: Pressão arterial deve estar no formato 'sistólica/diastólica' (ex: 120/80).");
        }

        // Temperatura range
        if (atendimento.Temperatura.HasValue && (atendimento.Temperatura < 30 || atendimento.Temperatura > 45))
            errors.Add("LEDI: Temperatura fora do range aceitável (30-45°C).");

        // FC range
        if (atendimento.FrequenciaCardiaca.HasValue && (atendimento.FrequenciaCardiaca < 20 || atendimento.FrequenciaCardiaca > 300))
            errors.Add("LEDI: Frequência cardíaca fora do range (20-300 bpm).");

        // Peso range
        if (atendimento.Peso.HasValue && (atendimento.Peso < 0.5m || atendimento.Peso > 400))
            errors.Add("LEDI: Peso fora do range (0.5-400 kg).");

        // Altura range
        if (atendimento.Altura.HasValue && (atendimento.Altura < 0.2m || atendimento.Altura > 2.8m))
            errors.Add("LEDI: Altura fora do range (0.2-2.8 m).");

        // CID-10 formato
        if (!string.IsNullOrWhiteSpace(atendimento.Cid10Principal))
        {
            var cid = atendimento.Cid10Principal.Trim();
            if (cid.Length < 3 || !char.IsLetter(cid[0]))
                errors.Add($"LEDI: CID-10 '{cid}' formato inválido. Esperado: letra + dígitos (ex: J06.9).");
        }

        return errors;
    }

    /// <summary>
    /// Valida campos para Ficha de Vacinação.
    /// </summary>
    public static List<string> ValidarVacinacao(Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade,
        string imunobiologico, string dose, string lote)
    {
        var errors = new List<string>();

        ValidateHeader(profissional, unidade, errors);

        if (string.IsNullOrWhiteSpace(cidadao.Cns) && string.IsNullOrWhiteSpace(cidadao.Cpf))
            errors.Add("LEDI: CNS ou CPF do cidadão é obrigatório para vacinação.");
        if (cidadao.DataNascimento == null)
            errors.Add("LEDI: Data de nascimento é obrigatória para vacinação.");
        if (string.IsNullOrWhiteSpace(imunobiologico))
            errors.Add("LEDI: Código do imunobiológico é obrigatório.");
        if (string.IsNullOrWhiteSpace(dose))
            errors.Add("LEDI: Dose é obrigatória (1ªD, 2ªD, 3ªD, REF, DU).");
        if (string.IsNullOrWhiteSpace(lote))
            errors.Add("LEDI: Lote da vacina é obrigatório.");

        return errors;
    }

    /// <summary>
    /// Valida campos para Ficha de Visita Domiciliar.
    /// </summary>
    public static List<string> ValidarVisitaDomiciliar(Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade)
    {
        var errors = new List<string>();

        ValidateHeader(profissional, unidade, errors);

        if (string.IsNullOrWhiteSpace(cidadao.Cns) && string.IsNullOrWhiteSpace(cidadao.Cpf))
            errors.Add("LEDI: CNS ou CPF do cidadão é obrigatório.");
        if (cidadao.DataNascimento == null)
            errors.Add("LEDI: Data de nascimento é obrigatória.");

        // CBO para visita domiciliar — aceita nível médio (ACS)
        if (!string.IsNullOrWhiteSpace(profissional.Cbo) && !CboValidator.IsAllowedForFicha(profissional.Cbo, "visita_domiciliar"))
            errors.Add($"LEDI: CBO {profissional.Cbo} não é permitido para Visita Domiciliar.");

        return errors;
    }

    // ── Helper: validação do header ──

    private static void ValidateHeader(ProfissionalSus profissional, UnidadeSaude unidade, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(profissional.Cns))
            errors.Add("LEDI: CNS do profissional é obrigatório no header.");
        if (!string.IsNullOrWhiteSpace(profissional.Cns) && !CnsValidator.IsValid(profissional.Cns))
            errors.Add($"LEDI: CNS do profissional inválido ({profissional.Cns}).");
        if (string.IsNullOrWhiteSpace(profissional.Cbo))
            errors.Add("LEDI: CBO do profissional é obrigatório no header.");
        if (!string.IsNullOrWhiteSpace(profissional.Cbo) && !CboValidator.IsValidFormat(profissional.Cbo))
            errors.Add($"LEDI: CBO formato inválido ({profissional.Cbo}). Esperado: 6 dígitos.");
        if (string.IsNullOrWhiteSpace(unidade.Cnes))
            errors.Add("LEDI: CNES da unidade é obrigatório no header.");
        if (!string.IsNullOrWhiteSpace(unidade.Cnes) && unidade.Cnes.Replace(" ", "").Length != 7)
            errors.Add($"LEDI: CNES deve ter 7 dígitos ({unidade.Cnes}).");
    }
}
