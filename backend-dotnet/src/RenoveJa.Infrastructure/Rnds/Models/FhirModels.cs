using System.Text.Json.Serialization;

namespace RenoveJa.Infrastructure.Rnds.Models;

/// <summary>
/// Modelos FHIR R4 para integração com a RNDS.
/// Profiles brasileiros: http://www.saude.gov.br/fhir/r4/StructureDefinition/
/// 
/// Ref: https://rnds-guia.saude.gov.br/docs/ria-rotina/mc-ria-r/
/// Ref: https://simplifier.net/redenacionaldedadosemsaude
/// </summary>

// ══════════════════════════════════════════════════════════════
// Bundle — contêiner de recursos FHIR
// ══════════════════════════════════════════════════════════════

public class FhirBundle
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Bundle";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "document";

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = DateTimeOffset.Now.ToString("yyyy-MM-ddTHH:mm:sszzz");

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("identifier")]
    public FhirIdentifier? Identifier { get; set; }

    [JsonPropertyName("entry")]
    public List<FhirBundleEntry> Entry { get; set; } = new();
}

public class FhirBundleEntry
{
    [JsonPropertyName("fullUrl")]
    public string FullUrl { get; set; } = string.Empty;

    [JsonPropertyName("resource")]
    public object Resource { get; set; } = null!;
}

public class FhirMeta
{
    [JsonPropertyName("lastUpdated")]
    public string? LastUpdated { get; set; }

    [JsonPropertyName("profile")]
    public List<string>? Profile { get; set; }
}

public class FhirIdentifier
{
    [JsonPropertyName("system")]
    public string System { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}

// ══════════════════════════════════════════════════════════════
// Composition — documento clínico (registro de atendimento)
// Profile: BRRegistroAtendimentoClinico
// ══════════════════════════════════════════════════════════════

public class FhirComposition
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Composition";

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "final";

    [JsonPropertyName("type")]
    public FhirCodeableConcept Type { get; set; } = new();

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("encounter")]
    public FhirReference? Encounter { get; set; }

    [JsonPropertyName("date")]
    public string? Date { get; set; }

    [JsonPropertyName("author")]
    public List<FhirReference>? Author { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("section")]
    public List<FhirCompositionSection>? Section { get; set; }
}

public class FhirCompositionSection
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("text")]
    public FhirNarrative? Text { get; set; }

    [JsonPropertyName("entry")]
    public List<FhirReference>? Entry { get; set; }
}

public class FhirNarrative
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "generated";

    [JsonPropertyName("div")]
    public string Div { get; set; } = string.Empty;
}

// ══════════════════════════════════════════════════════════════
// Encounter — contexto do atendimento
// Profile: BRContatoAssistencial
// ══════════════════════════════════════════════════════════════

public class FhirEncounter
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Encounter";

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "finished";

    [JsonPropertyName("class")]
    public FhirCoding Class { get; set; } = new()
    {
        System = "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        Code = "AMB",
        Display = "ambulatory"
    };

    [JsonPropertyName("type")]
    public List<FhirCodeableConcept>? Type { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("participant")]
    public List<FhirEncounterParticipant>? Participant { get; set; }

    [JsonPropertyName("period")]
    public FhirPeriod? Period { get; set; }

    [JsonPropertyName("serviceProvider")]
    public FhirReference? ServiceProvider { get; set; }
}

public class FhirEncounterParticipant
{
    [JsonPropertyName("type")]
    public List<FhirCodeableConcept>? Type { get; set; }

    [JsonPropertyName("individual")]
    public FhirReference? Individual { get; set; }
}

public class FhirPeriod
{
    [JsonPropertyName("start")]
    public string? Start { get; set; }

    [JsonPropertyName("end")]
    public string? End { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Condition — diagnóstico/problema (CID-10/CIAP-2)
// Profile: BRDiagnostico
// ══════════════════════════════════════════════════════════════

public class FhirCondition
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Condition";

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("clinicalStatus")]
    public FhirCodeableConcept? ClinicalStatus { get; set; }

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept? Code { get; set; }

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("note")]
    public List<FhirAnnotation>? Note { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Observation — sinais vitais, resultados
// Profile: BRObservacaoDescritiva
// ══════════════════════════════════════════════════════════════

public class FhirObservation
{
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = "Observation";

    [JsonPropertyName("meta")]
    public FhirMeta? Meta { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "final";

    [JsonPropertyName("category")]
    public List<FhirCodeableConcept>? Category { get; set; }

    [JsonPropertyName("code")]
    public FhirCodeableConcept Code { get; set; } = new();

    [JsonPropertyName("subject")]
    public FhirReference? Subject { get; set; }

    [JsonPropertyName("valueQuantity")]
    public FhirQuantity? ValueQuantity { get; set; }

    [JsonPropertyName("valueString")]
    public string? ValueString { get; set; }

    [JsonPropertyName("effectiveDateTime")]
    public string? EffectiveDateTime { get; set; }

    [JsonPropertyName("component")]
    public List<FhirObservationComponent>? Component { get; set; }
}

public class FhirObservationComponent
{
    [JsonPropertyName("code")]
    public FhirCodeableConcept Code { get; set; } = new();

    [JsonPropertyName("valueQuantity")]
    public FhirQuantity? ValueQuantity { get; set; }
}

public class FhirQuantity
{
    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Shared FHIR types
// ══════════════════════════════════════════════════════════════

public class FhirReference
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }

    [JsonPropertyName("identifier")]
    public FhirIdentifier? Identifier { get; set; }

    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

public class FhirCodeableConcept
{
    [JsonPropertyName("coding")]
    public List<FhirCoding>? Coding { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public class FhirCoding
{
    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("display")]
    public string? Display { get; set; }
}

public class FhirAnnotation
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

// ══════════════════════════════════════════════════════════════
// Brazilian FHIR profiles / systems constants
// ══════════════════════════════════════════════════════════════

public static class BrFhirProfiles
{
    // Structure definitions
    public const string RegistroAtendimentoClinico = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRRegistroAtendimentoClinico-1.0";
    public const string ContatoAssistencial = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRContatoAssistencial-1.0";
    public const string Diagnostico = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDiagnostico";
    public const string ObservacaoDescritiva = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRObservacaoDescritiva-1.0";
    public const string ResultadoExameLab = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRResultadoExameLaboratorial-1.1";
    public const string RegistroImunobiologico = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRRegistroImunobiologicoAdministradoRotina";
    public const string ImunobiologicoAdministrado = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRImunobiologicoAdministrado-2.0";
    public const string SumarioAlta = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRSumarioAlta-1.0";
    public const string DispensacaoMedicamento = "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDispensacaoMedicamento";

    // Naming systems
    public const string NamingSystemBase = "http://www.saude.gov.br/fhir/r4/NamingSystem/BRRNDS-";
    public const string CnsPaciente = "http://www.saude.gov.br/fhir/r4/NamingSystem/cns";
    public const string CpfPaciente = "http://www.saude.gov.br/fhir/r4/NamingSystem/cpf";
    public const string Cnes = "http://www.saude.gov.br/fhir/r4/NamingSystem/cnes";
    public const string Cbo = "http://www.saude.gov.br/fhir/r4/NamingSystem/cbo";

    // Code systems
    public const string Cid10 = "http://www.saude.gov.br/fhir/r4/CodeSystem/BRCID10";
    public const string Ciap2 = "http://www.saude.gov.br/fhir/r4/CodeSystem/BRCIAP2";
    public const string TipoDocumento = "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento";
    public const string Loinc = "http://loinc.org";
}
