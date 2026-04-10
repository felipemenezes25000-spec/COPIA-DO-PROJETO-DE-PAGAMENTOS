using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Endpoints para o assistente de triagem Dra. Renova.
/// IA usada apenas para enriquecer mensagens — nunca define nada. Médico sempre decide.
/// </summary>
[ApiController]
[Route("api/triage")]
[Authorize]
public class TriageController(ITriageEnrichmentService enrichmentService) : ControllerBase
{
    /// <summary>
    /// Enriquece uma mensagem de triagem com IA (personalização de tom).
    /// A IA NUNCA altera o significado — apenas torna mais acolhedor.
    /// Retorna null se: chave crítica (não enriquece), API indisponível ou timeout.
    /// </summary>
    // Limites de tamanho para evitar abuso do endpoint de IA (DoS e custos).
    private const int MaxContextLength = 4000;
    private const int MaxRuleTextLength = 2000;
    private const int MaxSymptomsLength = 2000;
    private const int MaxArrayItems = 50;
    private const int MaxArrayItemLength = 500;

    [HttpPost("enrich")]
    public async Task<IActionResult> Enrich([FromBody] TriageEnrichRequest? request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Context) || string.IsNullOrWhiteSpace(request.RuleText))
            return BadRequest(new { error = "context e ruleText são obrigatórios." });

        // BUG FIX: validação de tamanho — payloads gigantes eram enviados direto para a IA,
        // causando custos imprevisíveis e possível DoS/prompt injection.
        if (request.Context.Length > MaxContextLength)
            return BadRequest(new { error = $"context excede {MaxContextLength} caracteres." });
        if (request.RuleText.Length > MaxRuleTextLength)
            return BadRequest(new { error = $"ruleText excede {MaxRuleTextLength} caracteres." });
        if (!string.IsNullOrEmpty(request.Symptoms) && request.Symptoms.Length > MaxSymptomsLength)
            return BadRequest(new { error = $"symptoms excede {MaxSymptomsLength} caracteres." });

        static bool IsValidArray(string[]? arr)
            => arr == null || (arr.Length <= MaxArrayItems && arr.All(s => s == null || s.Length <= MaxArrayItemLength));

        if (!IsValidArray(request.Exams))
            return BadRequest(new { error = $"exams excede {MaxArrayItems} itens ou {MaxArrayItemLength} caracteres por item." });
        if (!IsValidArray(request.RecentMedications))
            return BadRequest(new { error = $"recentMedications excede {MaxArrayItems} itens ou {MaxArrayItemLength} caracteres por item." });

        var input = new TriageEnrichmentInput(
            request.Context,
            request.Step ?? "idle",
            request.RuleKey,
            request.RuleText.Trim(),
            request.PrescriptionType,
            request.ExamType,
            request.Exams,
            request.Symptoms,
            request.TotalRequests,
            request.RecentPrescriptionCount,
            request.RecentExamCount,
            request.LastPrescriptionDaysAgo,
            request.LastExamDaysAgo,
            request.PatientAge,
            request.RecentMedications);

        var result = await enrichmentService.EnrichAsync(input, cancellationToken);
        if (result == null)
            return Ok(new { text = (string?)null, isPersonalized = false });

        return Ok(new { text = result.Text, isPersonalized = result.IsPersonalized });
    }
}

public record TriageEnrichRequest(
    string Context,
    string? Step,
    string? RuleKey,
    string RuleText,
    string? PrescriptionType,
    string? ExamType,
    string[]? Exams,
    string? Symptoms,
    int? TotalRequests,
    int? RecentPrescriptionCount,
    int? RecentExamCount,
    int? LastPrescriptionDaysAgo,
    int? LastExamDaysAgo,
    int? PatientAge,
    string[]? RecentMedications);
