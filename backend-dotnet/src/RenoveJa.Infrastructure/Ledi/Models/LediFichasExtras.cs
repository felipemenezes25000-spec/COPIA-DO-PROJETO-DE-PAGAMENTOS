using System.Xml.Serialization;

namespace RenoveJa.Infrastructure.Ledi.Models;

// ══════════════════════════════════════════════════════════════
// Ficha de Cadastro Domiciliar e Territorial — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("cadastroDomiciliar")]
public class FichaCadastroDomiciliar
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("enderecoLocalPermanencia")]
    public EnderecoDomiciliar Endereco { get; set; } = new();

    [XmlElement("tipoDeImovel")]
    public int TipoImovel { get; set; } = 1; // 1=Domicílio

    [XmlElement("condicaoMoradia")]
    public CondicaoMoradia? Moradia { get; set; }

    [XmlArray("familias")]
    [XmlArrayItem("familia")]
    public List<FamiliaDomiciliar> Familias { get; set; } = new();

    [XmlElement("stFichaAtualizada")]
    public bool FichaAtualizada { get; set; } = true;
}

public class EnderecoDomiciliar
{
    [XmlElement("tipologradouroNumeroDne")]
    public string? TipoLogradouro { get; set; }

    [XmlElement("nomeLogradouro")]
    public string? Logradouro { get; set; }

    [XmlElement("numero")]
    public string? Numero { get; set; }

    [XmlElement("complemento")]
    public string? Complemento { get; set; }

    [XmlElement("bairro")]
    public string? Bairro { get; set; }

    [XmlElement("cep")]
    public string? Cep { get; set; }

    [XmlElement("codigoIbgeMunicipio")]
    public string CodigoIbge { get; set; } = "3525904"; // Jundiaí

    [XmlElement("microarea")]
    public string? Microarea { get; set; }
}

public class CondicaoMoradia
{
    [XmlElement("tipoDomicilio")]
    public int? TipoDomicilio { get; set; } // 1=Casa, 2=Apartamento, etc.

    [XmlElement("qtdComodos")]
    public int? QuantidadeComodos { get; set; }

    [XmlElement("tipoAcessoDomicilio")]
    public int? TipoAcesso { get; set; }

    [XmlElement("abastecimentoAgua")]
    public int? AbastecimentoAgua { get; set; }

    [XmlElement("tratamentoAguaDomicilio")]
    public int? TratamentoAgua { get; set; }

    [XmlElement("destinoLixo")]
    public int? DestinoLixo { get; set; }

    [XmlElement("formaEscoamentoBanheiro")]
    public int? Esgotamento { get; set; }

    [XmlElement("materialPredominante")]
    public int? MaterialParedes { get; set; }

    [XmlElement("localizacao")]
    public int? Localizacao { get; set; } // 1=Urbana, 2=Rural
}

public class FamiliaDomiciliar
{
    [XmlElement("numeroProntuarioFamiliar")]
    public string? NumeroProntuario { get; set; }

    [XmlElement("cnsCidadaoResponsavel")]
    public string? CnsResponsavel { get; set; }

    [XmlElement("dataNascimentoResponsavel")]
    public string? DataNascimentoResponsavel { get; set; }

    [XmlElement("rendaFamiliar")]
    public int? RendaFamiliar { get; set; }

    [XmlElement("numeroDeMembros")]
    public int? NumeroMembros { get; set; }

    [XmlElement("resideDesde")]
    public string? ResideDesde { get; set; }

    [XmlElement("stMudouSe")]
    public bool? Mudou { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Ficha de Procedimentos — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("fichaProcedimentos")]
public class FichaProcedimentos
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlArray("atendimentosProcedimentos")]
    [XmlArrayItem("atendimentoProcedimento")]
    public List<ProcedimentoItem> Procedimentos { get; set; } = new();
}

public class ProcedimentoItem
{
    [XmlElement("cnsCidadao")]
    public string? CnsCidadao { get; set; }

    [XmlElement("cpfCidadao")]
    public string? CpfCidadao { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("localAtendimento")]
    public int LocalAtendimento { get; set; } = 1;

    [XmlElement("turno")]
    public int Turno { get; set; } = 1;

    [XmlArray("procedimentos")]
    [XmlArrayItem("coProced")]
    public List<string> CodigosProcedimento { get; set; } = new();

    [XmlElement("numProntuario")]
    public string? NumeroProntuario { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Ficha de Visita Domiciliar e Territorial — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("fichaVisitaDomiciliarTerritorial")]
public class FichaVisitaDomiciliar
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("cnsCidadao")]
    public string? CnsCidadao { get; set; }

    [XmlElement("cpfCidadao")]
    public string? CpfCidadao { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("turno")]
    public int Turno { get; set; } = 1;

    [XmlElement("tipoVisita")]
    public int TipoVisita { get; set; } = 1; // 1=Periódica, 2=Busca ativa, etc.

    [XmlElement("motivoVisita")]
    public int MotivoVisita { get; set; } = 1;

    [XmlElement("desfecho")]
    public int Desfecho { get; set; } = 1; // 1=Visita realizada

    [XmlElement("microarea")]
    public string? Microarea { get; set; }

    [XmlElement("stVisitaCompartilhada")]
    public bool VisitaCompartilhada { get; set; }

    [XmlElement("pesoAcompanhamentoNutricional")]
    public decimal? Peso { get; set; }

    [XmlElement("alturaAcompanhamentoNutricional")]
    public decimal? Altura { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Ficha de Vacinação — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("fichaVacinacao")]
public class FichaVacinacao
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("cnsCidadao")]
    public string? CnsCidadao { get; set; }

    [XmlElement("cpfCidadao")]
    public string? CpfCidadao { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("turno")]
    public int Turno { get; set; } = 1;

    [XmlElement("localAtendimento")]
    public int LocalAtendimento { get; set; } = 1;

    [XmlElement("stGestante")]
    public bool? Gestante { get; set; }

    [XmlElement("stPuerpera")]
    public bool? Puerpera { get; set; }

    [XmlElement("stViajante")]
    public bool? Viajante { get; set; }

    [XmlElement("stComunicantesHanseniase")]
    public bool? ComunicanteHanseniase { get; set; }

    [XmlArray("vacinas")]
    [XmlArrayItem("vacina")]
    public List<VacinaAplicada> Vacinas { get; set; } = new();
}

public class VacinaAplicada
{
    [XmlElement("imunobiologico")]
    public string CodigoImunobiologico { get; set; } = string.Empty;

    [XmlElement("estrategiaVacinacao")]
    public int EstrategiaVacinacao { get; set; } = 1; // 1=Rotina

    [XmlElement("dose")]
    public string Dose { get; set; } = string.Empty; // 1ªD, 2ªD, 3ªD, REF, DU

    [XmlElement("lote")]
    public string Lote { get; set; } = string.Empty;

    [XmlElement("fabricante")]
    public string? Fabricante { get; set; }

    [XmlElement("dataAplicacao")]
    public string DataAplicacao { get; set; } = string.Empty;

    [XmlElement("grupoAtendimento")]
    public int? GrupoAtendimento { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Ficha de Atendimento Odontológico Individual — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("fichaAtendimentoOdontologicoIndividual")]
public class FichaAtendimentoOdontologico
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("cnsCidadao")]
    public string? CnsCidadao { get; set; }

    [XmlElement("cpfCidadao")]
    public string? CpfCidadao { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("localAtendimento")]
    public int LocalAtendimento { get; set; } = 1;

    [XmlElement("turno")]
    public int Turno { get; set; } = 1;

    [XmlElement("tipoAtendimento")]
    public int TipoAtendimento { get; set; } = 2;

    [XmlElement("tipoConsulta")]
    public int? TipoConsulta { get; set; } // 1=Programada, 2=Urgência, etc.

    [XmlElement("stVigilanciaSaudeBucal")]
    public bool? VigilanciaSaudeBucal { get; set; }

    [XmlArray("procedimentosRealizados")]
    [XmlArrayItem("coProced")]
    public List<string>? Procedimentos { get; set; }

    [XmlArray("fornecimento")]
    [XmlArrayItem("item")]
    public List<string>? Fornecimento { get; set; } // Escova, creme dental, etc.

    [XmlElement("condutaDesfecho")]
    public int CondutaDesfecho { get; set; } = 1;
}

// ══════════════════════════════════════════════════════════════
// Ficha de Atividade Coletiva — LEDI APS 7.3.7
// ══════════════════════════════════════════════════════════════

[XmlRoot("fichaAtividadeColetiva")]
public class FichaAtividadeColetiva
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("tipoAtividade")]
    public int TipoAtividade { get; set; } // 1=Educação saúde, 2=Atendimento grupo, etc.

    [XmlElement("temas")]
    public string? Temas { get; set; }

    [XmlElement("publicoAlvo")]
    public string? PublicoAlvo { get; set; }

    [XmlElement("localAtividade")]
    public string? LocalAtividade { get; set; }

    [XmlElement("turno")]
    public int Turno { get; set; } = 1;

    [XmlElement("numParticipantes")]
    public int NumeroParticipantes { get; set; }

    [XmlElement("numAvaliacoesAlteradas")]
    public int? AvaliacoesAlteradas { get; set; }

    [XmlArray("profissionais")]
    [XmlArrayItem("profissional")]
    public List<ProfissionalAtividade> Profissionais { get; set; } = new();

    [XmlArray("participantes")]
    [XmlArrayItem("participante")]
    public List<ParticipanteAtividade>? Participantes { get; set; }

    [XmlElement("stPSE")]
    public bool? ProgramaSaudeEscola { get; set; }
}

public class ProfissionalAtividade
{
    [XmlElement("cns")]
    public string Cns { get; set; } = string.Empty;

    [XmlElement("cbo")]
    public string Cbo { get; set; } = string.Empty;
}

public class ParticipanteAtividade
{
    [XmlElement("cnsCidadao")]
    public string? Cns { get; set; }

    [XmlElement("cpfCidadao")]
    public string? Cpf { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("pesoAcompanhamentoNutricional")]
    public decimal? Peso { get; set; }

    [XmlElement("alturaAcompanhamentoNutricional")]
    public decimal? Altura { get; set; }

    [XmlElement("stAbandonouGrupo")]
    public bool? AbandonouGrupo { get; set; }
}
