namespace RenoveJa.Application.DTOs.Sus;

// ── Unidade de Saúde ─────────────────────────────────────────
public record UnidadeSaudeDto(
    Guid Id, string Nome, string Cnes, string? Tipo, string? Telefone, string? Email,
    string? Logradouro, string? Numero, string? Bairro, string? Cidade, string? Estado, string? Cep,
    bool Ativo, DateTime CreatedAt);

public record CreateUnidadeSaudeRequest(
    string Nome, string Cnes, string? Tipo, string? Telefone, string? Email,
    string? Logradouro, string? Numero, string? Bairro, string? Cidade, string? Estado, string? Cep);

public record UpdateUnidadeSaudeRequest(
    string Nome, string Cnes, string? Tipo, string? Telefone, string? Email,
    string? Logradouro, string? Numero, string? Bairro, string? Cidade, string? Estado, string? Cep);

// ── Cidadão ──────────────────────────────────────────────────
public record CidadaoDto(
    Guid Id, string NomeCompleto, string? Cpf, string? Cns, DateTime? DataNascimento,
    string? Sexo, string? Telefone, string? Email, string? NomeMae, string? NomePai,
    string? Logradouro, string? Numero, string? Complemento, string? Bairro,
    string? Cidade, string? Estado, string? Cep, string? Microarea, string? CodigoFamilia,
    Guid? UnidadeSaudeId, string? UnidadeSaudeNome, bool Ativo, DateTime CreatedAt);

public record CreateCidadaoRequest(
    string NomeCompleto, string? Cpf, string? Cns, DateTime? DataNascimento,
    string? Sexo, string? Telefone, string? Email, string? NomeMae, string? NomePai,
    string? Logradouro, string? Numero, string? Complemento, string? Bairro,
    string? Cidade, string? Estado, string? Cep, string? Microarea, string? CodigoFamilia,
    Guid? UnidadeSaudeId);

public record UpdateCidadaoRequest(
    string NomeCompleto, string? Cpf, string? Cns, DateTime? DataNascimento,
    string? Sexo, string? Telefone, string? Email, string? NomeMae, string? NomePai,
    string? Logradouro, string? Numero, string? Complemento, string? Bairro,
    string? Cidade, string? Estado, string? Cep, string? Microarea, string? CodigoFamilia,
    Guid? UnidadeSaudeId);

// ── Profissional SUS ─────────────────────────────────────────
public record ProfissionalSusDto(
    Guid Id, string NomeCompleto, string? Cpf, string? Cns, string? Cbo,
    string? ConselhoNumero, string? ConselhoUf, string? ConselhoTipo,
    string? Especialidade, string? Telefone, string? Email,
    Guid UnidadeSaudeId, string? UnidadeSaudeNome, Guid? UserId, bool Ativo, DateTime CreatedAt);

public record CreateProfissionalSusRequest(
    string NomeCompleto, string? Cpf, string? Cns, string? Cbo,
    string? ConselhoNumero, string? ConselhoUf, string? ConselhoTipo,
    string? Especialidade, string? Telefone, string? Email,
    Guid UnidadeSaudeId, Guid? UserId);

// ── Agenda UBS ───────────────────────────────────────────────
public record AgendaUbsDto(
    Guid Id, Guid CidadaoId, string? CidadaoNome, Guid ProfissionalId, string? ProfissionalNome,
    Guid UnidadeSaudeId, DateTime DataHora, string Status, string? TipoAtendimento,
    string? Observacoes, DateTime? CheckInAt, DateTime? ChamadaAt, DateTime? InicioAt, DateTime? FimAt,
    DateTime CreatedAt);

public record CreateAgendaRequest(
    Guid CidadaoId, Guid ProfissionalId, Guid UnidadeSaudeId,
    DateTime DataHora, string? TipoAtendimento, string? Observacoes);

// ── Atendimento APS ──────────────────────────────────────────
public record AtendimentoApsDto(
    Guid Id, Guid CidadaoId, string? CidadaoNome, Guid ProfissionalId, string? ProfissionalNome,
    Guid UnidadeSaudeId, Guid? AgendaId,
    string? Subjetivo, string? Objetivo, string? Avaliacao, string? Plano,
    string? PressaoArterial, decimal? Temperatura, int? FrequenciaCardiaca, int? FrequenciaRespiratoria,
    decimal? Peso, decimal? Altura, decimal? Imc, int? SaturacaoO2, decimal? Glicemia,
    string? Cid10Principal, string? Cid10Secundario, string? Ciap2,
    string? TipoAtendimento, string? Procedimentos,
    string? Encaminhamento, string? Observacoes,
    bool ExportadoEsus, DateTime DataAtendimento, DateTime CreatedAt,
    List<PrescricaoApsDto>? Prescricoes);

public record CreateAtendimentoRequest(
    Guid CidadaoId, Guid ProfissionalId, Guid UnidadeSaudeId, Guid? AgendaId,
    string? Subjetivo, string? Objetivo, string? Avaliacao, string? Plano,
    string? PressaoArterial, decimal? Temperatura, int? FrequenciaCardiaca, int? FrequenciaRespiratoria,
    decimal? Peso, decimal? Altura, int? SaturacaoO2, decimal? Glicemia,
    string? Cid10Principal, string? Cid10Secundario, string? Ciap2,
    string? TipoAtendimento, string? Procedimentos,
    string? Encaminhamento, string? Observacoes,
    List<CreatePrescricaoApsRequest>? Prescricoes);

// ── Prescrição APS ───────────────────────────────────────────
public record PrescricaoApsDto(
    Guid Id, string Medicamento, string? Posologia, string? Dose, string? Frequencia,
    string? Duracao, string? ViaAdministracao, string? Orientacoes,
    int Quantidade, bool UsoContinuo, DateTime CreatedAt);

public record CreatePrescricaoApsRequest(
    string Medicamento, string? Posologia, string? Dose, string? Frequencia,
    string? Duracao, string? ViaAdministracao, string? Orientacoes,
    int Quantidade = 1, bool UsoContinuo = false);

// ── Relatórios ───────────────────────────────────────────────
public record RelatorioProducaoDto(
    int TotalAtendimentos, int TotalCidadaos, int TotalProfissionais,
    List<ProducaoPorUnidadeDto> PorUnidade, List<ProducaoPorProfissionalDto> PorProfissional);

public record ProducaoPorUnidadeDto(Guid UnidadeSaudeId, string Nome, int Total);
public record ProducaoPorProfissionalDto(Guid ProfissionalId, string Nome, int Total);

// ── Exportação e-SUS ─────────────────────────────────────────
public record ExportacaoSusDto(
    int TotalPendentes, int TotalExportados, DateTime? UltimaExportacao);

public record ExportacaoResultDto(int Exportados, int Erros, List<string>? Mensagens);
