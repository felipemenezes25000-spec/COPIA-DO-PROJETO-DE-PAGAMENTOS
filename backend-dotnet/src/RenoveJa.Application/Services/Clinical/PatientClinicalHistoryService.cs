using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Application.Services.Clinical;

/// <summary>
/// Implementação de <see cref="IPatientClinicalHistoryService"/>.
///
/// Responsabilidade única: a partir do doctorId/patientId, montar a estrutura
/// <see cref="PatientClinicalHistoryResult"/> navegando em IRequestService.
/// Não chama IClinicalSummaryService nem repositórios de notas — essas preocupações
/// permanecem no controller (o objetivo da Phase D é extrair o agrupamento de dados,
/// não mover a orquestração inteira).
/// </summary>
public class PatientClinicalHistoryService(
    IRequestService requestService,
    ILogger<PatientClinicalHistoryService> logger)
    : IPatientClinicalHistoryService
{
    public async Task<PatientClinicalHistoryResult> BuildAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        var requests = await requestService.GetPatientRequestsAsync(doctorId, patientId, cancellationToken);
        var profile = await requestService.GetPatientProfileForDoctorAsync(doctorId, patientId, cancellationToken);

        if (requests.Count == 0)
        {
            if (string.IsNullOrWhiteSpace(profile?.Name))
            {
                logger.LogWarning(
                    "PatientClinicalHistory: nome do paciente indisponível (profile.Name nulo) para patientId={PatientId}, doctorId={DoctorId}. Usando fallback 'Paciente'.",
                    patientId, doctorId);
            }
            return new PatientClinicalHistoryResult(
                IsEmpty: true,
                PatientName: profile?.Name ?? "Paciente",
                BirthDate: profile?.BirthDate,
                Gender: profile?.Gender,
                Allergies: Array.Empty<string>(),
                Consultations: Array.Empty<ClinicalSummaryConsultation>(),
                Prescriptions: Array.Empty<ClinicalSummaryPrescription>(),
                Exams: Array.Empty<ClinicalSummaryExam>());
        }

        var patientName = profile?.Name ?? requests[0].PatientName ?? "Paciente";
        if (string.IsNullOrWhiteSpace(profile?.Name) && string.IsNullOrWhiteSpace(requests[0].PatientName))
        {
            logger.LogWarning(
                "PatientClinicalHistory: nome do paciente indisponível (profile e request sem nome) para patientId={PatientId}, doctorId={DoctorId}. Usando fallback 'Paciente'.",
                patientId, doctorId);
        }

        var allergies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in requests.Where(x => x.RequestType == "consultation" && !string.IsNullOrWhiteSpace(x.ConsultationAnamnesis)))
        {
            TryExtractAllergies(r.ConsultationAnamnesis!, allergies);
        }

        var consultations = requests
            .Where(r => r.RequestType == "consultation")
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ClinicalSummaryConsultation(
                r.CreatedAt,
                r.Symptoms,
                ExtractCid(r.ConsultationAnamnesis),
                r.DoctorConductNotes ?? r.AiConductSuggestion,
                ExtractAnamnesisSnippet(r.ConsultationAnamnesis)))
            .ToList();

        var prescriptions = requests
            .Where(r => r.RequestType == "prescription")
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ClinicalSummaryPrescription(
                r.CreatedAt,
                r.PrescriptionType ?? "simples",
                r.Medications ?? new List<string>(),
                r.Notes))
            .ToList();

        var exams = requests
            .Where(r => r.RequestType == "exam")
            .OrderBy(r => r.CreatedAt)
            .Select(r => new ClinicalSummaryExam(
                r.CreatedAt,
                r.ExamType,
                r.Exams ?? new List<string>(),
                r.Symptoms,
                r.Notes))
            .ToList();

        return new PatientClinicalHistoryResult(
            IsEmpty: false,
            PatientName: patientName,
            BirthDate: profile?.BirthDate,
            Gender: profile?.Gender,
            Allergies: allergies.ToList(),
            Consultations: consultations,
            Prescriptions: prescriptions,
            Exams: exams);
    }

    public string BuildFallbackSummary(PatientClinicalHistoryResult history)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Resumo do prontuário — {history.PatientName}");
        if (history.BirthDate.HasValue)
        {
            var age = DateTime.Today.Year - history.BirthDate.Value.Year;
            if (DateTime.Today < history.BirthDate.Value.AddYears(age)) age--;
            if (age >= 0)
                sb.AppendLine($"Idade: {age} anos");
        }
        if (history.Allergies.Count > 0)
            sb.AppendLine($"Alergias: {string.Join(", ", history.Allergies)}");
        sb.AppendLine();

        if (history.Consultations.Count > 0)
        {
            sb.AppendLine("Consultas:");
            foreach (var c in history.Consultations)
            {
                sb.AppendLine($"• {c.Date:dd/MM/yyyy}: {c.Symptoms ?? "—"}");
                if (!string.IsNullOrWhiteSpace(c.Cid)) sb.AppendLine($"  CID: {c.Cid}");
                if (!string.IsNullOrWhiteSpace(c.Conduct)) sb.AppendLine($"  Conduta: {c.Conduct}");
            }
            sb.AppendLine();
        }

        if (history.Prescriptions.Count > 0)
        {
            sb.AppendLine("Receitas:");
            foreach (var p in history.Prescriptions)
                sb.AppendLine($"• {p.Date:dd/MM/yyyy} ({p.Type}): {string.Join(", ", p.Medications)}");
            sb.AppendLine();
        }

        if (history.Exams.Count > 0)
        {
            sb.AppendLine("Exames:");
            foreach (var e in history.Exams)
                sb.AppendLine($"• {e.Date:dd/MM/yyyy}: {string.Join(", ", e.Exams)}");
        }

        return sb.ToString().Trim();
    }

    private static void TryExtractAllergies(string json, HashSet<string> acc)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("alergias", out var a)) return;

            if (a.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in a.EnumerateArray())
                {
                    var v = item.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(v)) acc.Add(v);
                }
            }
            else if (a.ValueKind == JsonValueKind.String)
            {
                var v = a.GetString()?.Trim();
                if (!string.IsNullOrEmpty(v)) acc.Add(v);
            }
        }
        catch { /* ignore malformed anamnesis JSON */ } // TODO(logging): inject ILogger to log malformed JSON warnings
    }

    private static string? ExtractAnamnesisSnippet(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var parts = new List<string>();
            foreach (var key in new[] { "queixa_principal", "historia_doenca_atual", "medicamentos_em_uso" })
            {
                if (doc.RootElement.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String)
                {
                    var v = p.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(v)) parts.Add(v);
                }
            }
            return parts.Count > 0 ? string.Join("; ", parts) : null;
        }
        catch { return null; } // TODO(logging): inject ILogger to log malformed JSON warnings
    }

    private static string? ExtractCid(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var key in new[] { "cid_sugerido", "cid", "cidPrincipal" })
            {
                if (doc.RootElement.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String)
                {
                    var v = p.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(v)) return v;
                }
            }
        }
        catch { /* ignore */ }
        return null;
    }
}
