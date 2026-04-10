using RenoveJa.Domain.Entities.Sus;
using RenoveJa.Infrastructure.Rnds.Models;

namespace RenoveJa.Infrastructure.Rnds;

/// <summary>
/// Mapper: dados internos do RenoveJá → Bundle FHIR R4 com profiles brasileiros para RNDS.
/// 
/// Documentos suportados:
/// - Registro de Atendimento Clínico (BRRegistroAtendimentoClinico)
/// - Contém: Composition + Encounter + Condition + Observation (sinais vitais)
/// 
/// Ref: https://rnds-guia.saude.gov.br
/// Ref: https://simplifier.net/redenacionaldedadosemsaude
/// </summary>
public static class RndsFhirMapper
{
    /// <summary>
    /// Converte um atendimento APS em Bundle FHIR R4 para envio à RNDS.
    /// </summary>
    public static FhirBundle MapAtendimentoToBundle(
        AtendimentoAps atendimento,
        Cidadao cidadao,
        ProfissionalSus profissional,
        UnidadeSaude unidade,
        string identificadorSolicitante)
    {
        var bundleId = Guid.NewGuid().ToString();
        var now = DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:sszzz");

        // ── Build FHIR resources ──
        var composition = BuildComposition(atendimento, cidadao, profissional, now);
        var encounter = BuildEncounter(atendimento, cidadao, profissional, unidade, now);
        var conditions = BuildConditions(atendimento, cidadao);
        var observations = BuildVitalSignsObservations(atendimento, cidadao, now);

        // ── Assemble Bundle ──
        var bundle = new FhirBundle
        {
            Type = "document",
            Timestamp = now,
            Meta = new FhirMeta { LastUpdated = now },
            Identifier = new FhirIdentifier
            {
                System = $"{BrFhirProfiles.NamingSystemBase}{identificadorSolicitante}",
                Value = bundleId,
            },
            Entry = new List<FhirBundleEntry>()
        };

        // Entry 0: Composition (obrigatório como primeiro entry)
        bundle.Entry.Add(new FhirBundleEntry
        {
            FullUrl = "urn:uuid:transient-0",
            Resource = composition,
        });

        // Entry 1: Encounter
        bundle.Entry.Add(new FhirBundleEntry
        {
            FullUrl = "urn:uuid:transient-1",
            Resource = encounter,
        });

        // Entries 2+: Conditions (CID-10)
        int idx = 2;
        foreach (var condition in conditions)
        {
            bundle.Entry.Add(new FhirBundleEntry
            {
                FullUrl = $"urn:uuid:transient-{idx++}",
                Resource = condition,
            });
        }

        // Entries N+: Observations (vital signs)
        foreach (var obs in observations)
        {
            bundle.Entry.Add(new FhirBundleEntry
            {
                FullUrl = $"urn:uuid:transient-{idx++}",
                Resource = obs,
            });
        }

        return bundle;
    }

    // ══════════════════════════════════════════════════════════════

    private static FhirComposition BuildComposition(
        AtendimentoAps atendimento, Cidadao cidadao, ProfissionalSus profissional, string date)
    {
        var sections = new List<FhirCompositionSection>();

        // Seção: Motivo do contato (Subjetivo)
        if (!string.IsNullOrWhiteSpace(atendimento.Subjetivo))
        {
            sections.Add(new FhirCompositionSection
            {
                Title = "Motivo do contato",
                Text = new FhirNarrative
                {
                    Status = "generated",
                    Div = $"<div xmlns=\"http://www.w3.org/1999/xhtml\">{EscapeHtml(atendimento.Subjetivo)}</div>"
                }
            });
        }

        // Seção: Observações (Objetivo + Avaliação)
        var obsText = string.Join("\n\n",
            new[] { atendimento.Objetivo, atendimento.Avaliacao }
            .Where(s => !string.IsNullOrWhiteSpace(s)));
        if (!string.IsNullOrEmpty(obsText))
        {
            sections.Add(new FhirCompositionSection
            {
                Title = "Observações",
                Text = new FhirNarrative
                {
                    Status = "generated",
                    Div = $"<div xmlns=\"http://www.w3.org/1999/xhtml\">{EscapeHtml(obsText)}</div>"
                }
            });
        }

        // Seção: Plano
        if (!string.IsNullOrWhiteSpace(atendimento.Plano))
        {
            sections.Add(new FhirCompositionSection
            {
                Title = "Plano de cuidado",
                Text = new FhirNarrative
                {
                    Status = "generated",
                    Div = $"<div xmlns=\"http://www.w3.org/1999/xhtml\">{EscapeHtml(atendimento.Plano)}</div>"
                }
            });
        }

        return new FhirComposition
        {
            Meta = new FhirMeta
            {
                Profile = new List<string> { BrFhirProfiles.RegistroAtendimentoClinico }
            },
            Status = "final",
            Type = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = BrFhirProfiles.TipoDocumento, Code = "SA", Display = "Sumário de Alta" }
                }
            },
            Subject = MakePatientReference(cidadao),
            Encounter = new FhirReference { Reference = "urn:uuid:transient-1" },
            Date = date,
            Author = new List<FhirReference>
            {
                new()
                {
                    Identifier = new FhirIdentifier
                    {
                        System = BrFhirProfiles.CnsPaciente,
                        Value = profissional.Cns?.Replace(" ", "") ?? ""
                    },
                    Display = profissional.NomeCompleto
                }
            },
            Title = "Registro de Atendimento Clínico",
            Section = sections,
        };
    }

    private static FhirEncounter BuildEncounter(
        AtendimentoAps atendimento, Cidadao cidadao, ProfissionalSus profissional,
        UnidadeSaude unidade, string date)
    {
        return new FhirEncounter
        {
            Meta = new FhirMeta
            {
                Profile = new List<string> { BrFhirProfiles.ContatoAssistencial }
            },
            Status = "finished",
            Class = new FhirCoding
            {
                System = "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                Code = "AMB",
                Display = "ambulatory"
            },
            Subject = MakePatientReference(cidadao),
            Participant = new List<FhirEncounterParticipant>
            {
                new()
                {
                    Individual = new FhirReference
                    {
                        Identifier = new FhirIdentifier
                        {
                            System = BrFhirProfiles.CnsPaciente,
                            Value = profissional.Cns?.Replace(" ", "") ?? ""
                        },
                        Display = profissional.NomeCompleto
                    }
                }
            },
            Period = new FhirPeriod
            {
                Start = atendimento.DataAtendimento.ToString("yyyy-MM-ddTHH:mm:sszzz"),
                End = date,
            },
            ServiceProvider = new FhirReference
            {
                Identifier = new FhirIdentifier
                {
                    System = BrFhirProfiles.Cnes,
                    Value = unidade.Cnes
                },
                Display = unidade.Nome
            }
        };
    }

    private static List<FhirCondition> BuildConditions(AtendimentoAps atendimento, Cidadao cidadao)
    {
        var conditions = new List<FhirCondition>();

        if (!string.IsNullOrWhiteSpace(atendimento.Cid10Principal))
        {
            conditions.Add(new FhirCondition
            {
                Meta = new FhirMeta { Profile = new List<string> { BrFhirProfiles.Diagnostico } },
                ClinicalStatus = new FhirCodeableConcept
                {
                    Coding = new List<FhirCoding>
                    {
                        new() { System = "http://terminology.hl7.org/CodeSystem/condition-clinical", Code = "active" }
                    }
                },
                Category = new List<FhirCodeableConcept>
                {
                    new()
                    {
                        Coding = new List<FhirCoding>
                        {
                            new() { System = "http://terminology.hl7.org/CodeSystem/condition-category", Code = "encounter-diagnosis" }
                        }
                    }
                },
                Code = new FhirCodeableConcept
                {
                    Coding = new List<FhirCoding>
                    {
                        new() { System = BrFhirProfiles.Cid10, Code = atendimento.Cid10Principal.Trim() }
                    }
                },
                Subject = MakePatientReference(cidadao),
            });
        }

        return conditions;
    }

    private static List<FhirObservation> BuildVitalSignsObservations(AtendimentoAps atendimento, Cidadao cidadao, string date)
    {
        var observations = new List<FhirObservation>();
        var subject = MakePatientReference(cidadao);

        // Blood pressure (component-based)
        if (!string.IsNullOrWhiteSpace(atendimento.PressaoArterial))
        {
            var parts = atendimento.PressaoArterial.Split('/', 'x', 'X');
            if (parts.Length == 2 && int.TryParse(parts[0].Trim(), out var sys) && int.TryParse(parts[1].Trim(), out var dia))
            {
                observations.Add(new FhirObservation
                {
                    Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = BrFhirProfiles.Loinc, Code = "85354-9", Display = "Blood pressure panel" } } },
                    Subject = subject,
                    EffectiveDateTime = date,
                    Component = new List<FhirObservationComponent>
                    {
                        new() { Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = BrFhirProfiles.Loinc, Code = "8480-6", Display = "Systolic" } } }, ValueQuantity = new FhirQuantity { Value = sys, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" } },
                        new() { Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = BrFhirProfiles.Loinc, Code = "8462-4", Display = "Diastolic" } } }, ValueQuantity = new FhirQuantity { Value = dia, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" } },
                    }
                });
            }
        }

        // Temperature
        if (atendimento.Temperatura.HasValue)
            observations.Add(MakeSimpleObservation("8310-5", "Body temperature", atendimento.Temperatura.Value, "Cel", "°C", subject, date));

        // Heart rate
        if (atendimento.FrequenciaCardiaca.HasValue)
            observations.Add(MakeSimpleObservation("8867-4", "Heart rate", atendimento.FrequenciaCardiaca.Value, "/min", "bpm", subject, date));

        // Respiratory rate
        if (atendimento.FrequenciaRespiratoria.HasValue)
            observations.Add(MakeSimpleObservation("9279-1", "Respiratory rate", atendimento.FrequenciaRespiratoria.Value, "/min", "rpm", subject, date));

        // Weight
        if (atendimento.Peso.HasValue)
            observations.Add(MakeSimpleObservation("29463-7", "Body weight", atendimento.Peso.Value, "kg", "kg", subject, date));

        // Height
        if (atendimento.Altura.HasValue)
            observations.Add(MakeSimpleObservation("8302-2", "Body height", atendimento.Altura.Value, "m", "m", subject, date));

        // O2 saturation
        if (atendimento.SaturacaoO2.HasValue)
            observations.Add(MakeSimpleObservation("2708-6", "Oxygen saturation", atendimento.SaturacaoO2.Value, "%", "%", subject, date));

        // Blood glucose
        if (atendimento.Glicemia.HasValue)
            observations.Add(MakeSimpleObservation("15074-8", "Glucose", atendimento.Glicemia.Value, "mg/dL", "mg/dL", subject, date));

        return observations;
    }

    // ── Helpers ──

    private static FhirReference MakePatientReference(Cidadao cidadao)
    {
        var hasCns = !string.IsNullOrWhiteSpace(cidadao.Cns);
        return new FhirReference
        {
            Identifier = new FhirIdentifier
            {
                System = hasCns ? BrFhirProfiles.CnsPaciente : BrFhirProfiles.CpfPaciente,
                Value = hasCns
                    ? cidadao.Cns!.Replace(" ", "")
                    : cidadao.Cpf?.Replace(".", "").Replace("-", "").Replace(" ", "") ?? ""
            },
            Display = cidadao.NomeCompleto,
        };
    }

    private static FhirObservation MakeSimpleObservation(
        string loincCode, string display, decimal value, string ucumCode, string unit,
        FhirReference subject, string date)
    {
        return new FhirObservation
        {
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = BrFhirProfiles.Loinc, Code = loincCode, Display = display } }
            },
            Subject = subject,
            EffectiveDateTime = date,
            ValueQuantity = new FhirQuantity
            {
                Value = Math.Round(value, 2),
                Unit = unit,
                System = "http://unitsofmeasure.org",
                Code = ucumCode,
            }
        };
    }

    private static string EscapeHtml(string text)
        => text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
