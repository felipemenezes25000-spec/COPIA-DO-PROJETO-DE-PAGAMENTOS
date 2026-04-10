using System.Xml.Serialization;

namespace RenoveJa.Infrastructure.Ledi.Models;

/// <summary>
/// Modelo XML da Ficha de Cadastro Individual — LEDI APS 7.3.7.
/// Ref: integracao.esusaps.bridge.ufsc.tech/ledi/cadastro-individual.html
/// </summary>
[XmlRoot("cadastroIndividual")]
public class FichaCadastroIndividual
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("identificacaoUsuarioCidadao")]
    public IdentificacaoCidadao Cidadao { get; set; } = new();

    [XmlElement("informacoesSocioDemograficas")]
    public InformacoesSocioDemograficas? SocioDemograficas { get; set; }

    [XmlElement("condicoesDeSaude")]
    public CondicoesSaude? Condicoes { get; set; }
}

/// <summary>
/// Modelo XML da Ficha de Atendimento Individual — LEDI APS 7.3.7.
/// Ref: integracao.esusaps.bridge.ufsc.tech/ledi/atendimento-individual.html
/// </summary>
[XmlRoot("fichaAtendimentoIndividual")]
public class FichaAtendimentoIndividual
{
    [XmlElement("uuidFicha")]
    public string UuidFicha { get; set; } = Guid.NewGuid().ToString();

    [XmlElement("headerTransport")]
    public HeaderTransport Header { get; set; } = new();

    [XmlElement("numProntuario")]
    public string? NumeroProntuario { get; set; }

    [XmlElement("cnsCidadao")]
    public string? CnsCidadao { get; set; }

    [XmlElement("cpfCidadao")]
    public string? CpfCidadao { get; set; }

    [XmlElement("dtNascimento")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexo")]
    public int? Sexo { get; set; }

    [XmlElement("localDeAtendimento")]
    public int LocalAtendimento { get; set; } = 1; // 1 = UBS

    [XmlElement("turno")]
    public int Turno { get; set; } = 1; // 1 = Manhã, 2 = Tarde, 3 = Noite

    [XmlElement("tipoAtendimento")]
    public int TipoAtendimento { get; set; } = 2; // 2 = Consulta agendada

    [XmlElement("pesoKg")]
    public decimal? Peso { get; set; }

    [XmlElement("alturaM")]
    public decimal? Altura { get; set; }

    [XmlElement("pressaoArterialSistolica")]
    public int? PaSistolica { get; set; }

    [XmlElement("pressaoArterialDiastolica")]
    public int? PaDiastolica { get; set; }

    [XmlElement("temperatura")]
    public decimal? Temperatura { get; set; }

    [XmlElement("frequenciaCardiaca")]
    public int? FrequenciaCardiaca { get; set; }

    [XmlElement("frequenciaRespiratoria")]
    public int? FrequenciaRespiratoria { get; set; }

    [XmlElement("saturacaoO2")]
    public int? SaturacaoO2 { get; set; }

    [XmlElement("glicemia")]
    public decimal? Glicemia { get; set; }

    [XmlElement("evolucaoSubjetivo")]
    public string? Subjetivo { get; set; }

    [XmlElement("evolucaoObjetivo")]
    public string? Objetivo { get; set; }

    [XmlElement("evolucaoAvaliacao")]
    public string? Avaliacao { get; set; }

    [XmlElement("evolucaoPlano")]
    public string? Plano { get; set; }

    [XmlArray("problemaCondicaoAvaliada")]
    [XmlArrayItem("ciap")]
    public List<string>? ProblemasCiap { get; set; }

    [XmlArray("cid")]
    [XmlArrayItem("codigo")]
    public List<string>? Cids { get; set; }

    [XmlArray("procedimentosRealizados")]
    [XmlArrayItem("coProced")]
    public List<string>? Procedimentos { get; set; }

    [XmlElement("condutaDesfecho")]
    public int CondutaDesfecho { get; set; } = 1; // 1 = Retorno consulta agendada

    [XmlElement("encaminhamento")]
    public string? Encaminhamento { get; set; }
}

// ── Componentes compartilhados ──

public class HeaderTransport
{
    [XmlElement("profissionalCNS")]
    public string ProfissionalCns { get; set; } = string.Empty;

    [XmlElement("cboCodigo_2002")]
    public string CboCodigo { get; set; } = string.Empty;

    [XmlElement("cnes")]
    public string Cnes { get; set; } = string.Empty;

    [XmlElement("ine")]
    public string? Ine { get; set; }

    [XmlElement("dataAtendimento")]
    public string DataAtendimento { get; set; } = string.Empty;

    [XmlElement("codigoIbgeMunicipio")]
    public string CodigoIbge { get; set; } = "3525904"; // Jundiaí
}

public class IdentificacaoCidadao
{
    [XmlElement("nomeCidadao")]
    public string Nome { get; set; } = string.Empty;

    [XmlElement("nomeSocialCidadao")]
    public string? NomeSocial { get; set; }

    [XmlElement("dataNascimentoCidadao")]
    public string? DataNascimento { get; set; }

    [XmlElement("sexoCidadao")]
    public int? Sexo { get; set; }

    [XmlElement("cpfCidadao")]
    public string? Cpf { get; set; }

    [XmlElement("cnsCidadao")]
    public string? Cns { get; set; }

    [XmlElement("nomeMaeCidadao")]
    public string? NomeMae { get; set; }

    [XmlElement("telefoneCelular")]
    public string? Telefone { get; set; }

    [XmlElement("emailCidadao")]
    public string? Email { get; set; }

    [XmlElement("microarea")]
    public string? Microarea { get; set; }

    [XmlElement("cnsResponsavelFamiliar")]
    public string? CnsResponsavelFamiliar { get; set; }
}

public class InformacoesSocioDemograficas
{
    [XmlElement("nacionalidadeCidadao")]
    public int Nacionalidade { get; set; } = 1; // 1 = Brasileiro

    [XmlElement("codigoIbgeMunicipioNascimento")]
    public string? MunicipioNascimento { get; set; }
}

public class CondicoesSaude
{
    [XmlElement("statusEhGestante")]
    public bool? Gestante { get; set; }

    [XmlElement("statusEhFumante")]
    public bool? Fumante { get; set; }

    [XmlElement("statusTemDiabetes")]
    public bool? Diabetes { get; set; }

    [XmlElement("statusTemHipertensaoArterial")]
    public bool? Hipertensao { get; set; }
}
