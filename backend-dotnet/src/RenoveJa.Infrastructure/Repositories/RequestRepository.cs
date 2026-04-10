using System.Text.Json;
using Dapper;
using Npgsql;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Models;
using RenoveJa.Infrastructure.Data.Postgres;
using RenoveJa.Infrastructure.Utils;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório de solicitações médicas via db.
/// </summary>
public class RequestRepository(PostgresClient db) : IRequestRepository
{
    private const string TableName = "requests";

    /// <summary>
    /// Obtém uma solicitação pelo ID.
    /// </summary>
    public async Task<MedicalRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await db.GetSingleAsync<RequestModel>(
            TableName,
            filter: $"id=eq.{id}",
            cancellationToken: cancellationToken);

        return model != null ? MapToDomain(model) : null;
    }

    public async Task<MedicalRequest?> GetByShortCodeAsync(string shortCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(shortCode) || shortCode.Length < 8)
            return null;
        var normalized = shortCode.ToLowerInvariant().Trim();
        if (normalized.Length > 12)
            normalized = normalized[..12];
        if (normalized.AsSpan().IndexOfAny("&=.(") >= 0)
            return null;
        var model = await db.GetSingleAsync<RequestModel>(
            TableName,
            filter: $"short_code=eq.{normalized}",
            cancellationToken: cancellationToken);
        return model != null ? MapToDomain(model) : null;
    }

    public async Task<List<MedicalRequest>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"patient_id=eq.{patientId}",
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    /// <summary>
    /// PERF FIX: busca requests ativos (não rejeitados/cancelados) do paciente filtrados por tipo.
    /// Usado pelos cooldowns para evitar carregar TODOS os requests do paciente.
    /// </summary>
    public async Task<List<MedicalRequest>> GetActiveByPatientAndTypeAsync(Guid patientId, RequestType type, CancellationToken cancellationToken = default)
    {
        var typeStr = SnakeCaseHelper.ToSnakeCase(type.ToString());
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"patient_id=eq.{patientId}&request_type=eq.{typeStr}&status=not.in.(rejected,cancelled)",
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetByDoctorIdAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"doctor_id=eq.{doctorId}",
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetByStatusAsync(RequestStatus status, int? limit = null, CancellationToken cancellationToken = default)
    {
        var statusStr = SnakeCaseHelper.ToSnakeCase(status.ToString());
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"status=eq.{statusStr}",
            orderBy: "created_at.asc",
            limit: limit,
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetByStatusPagedAsync(RequestStatus status, int pageSize, int offset, CancellationToken cancellationToken = default)
    {
        if (pageSize <= 0) throw new ArgumentOutOfRangeException(nameof(pageSize));
        if (offset < 0) throw new ArgumentOutOfRangeException(nameof(offset));

        var statusStr = SnakeCaseHelper.ToSnakeCase(status.ToString());
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"status=eq.{statusStr}",
            orderBy: "created_at.asc",
            limit: pageSize,
            offset: offset,
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetByTypeAsync(RequestType type, CancellationToken cancellationToken = default)
    {
        var typeStr = SnakeCaseHelper.ToSnakeCase(type.ToString());
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: $"request_type=eq.{typeStr}",
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    /// <summary>
    /// Retorna solicitações disponíveis na fila para o médico.
    ///
    /// Phase B — ordenação clínica: urgências primeiro, depois FIFO. A coluna
    /// <c>priority</c> é TEXT ('low','normal','high','urgent'), então usamos um
    /// CASE numérico para obter o ranking correto. O índice
    /// <c>idx_requests_priority_created</c> acelera a leitura.
    /// </summary>
    public async Task<List<MedicalRequest>> GetAvailableForQueueAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
SELECT *
  FROM public.requests
 WHERE status IN ('submitted', 'searching_doctor', 'pending', 'analyzing')
   AND (doctor_id IS NULL OR doctor_id = '00000000-0000-0000-0000-000000000000'::uuid)
 ORDER BY
   CASE COALESCE(priority, 'normal')
     WHEN 'urgent' THEN 0
     WHEN 'high'   THEN 1
     WHEN 'normal' THEN 2
     WHEN 'low'    THEN 3
     -- Unexpected/garbage priority values must NEVER jump ahead of real
     -- clinical priorities. Sort them last (99) so they are visible at the
     -- bottom of the queue and can be investigated, instead of being silently
     -- normalized to 'normal'.
     ELSE 99
   END,
   created_at ASC";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);
        var models = await conn.QueryAsync<RequestModel>(
            new CommandDefinition(sql, cancellationToken: cancellationToken));

        return models.Select(MapToDomain).ToList();
    }

    public async Task<(int PendingCount, int InReviewCount, int CompletedCount, decimal TotalEarnings)> GetDoctorStatsAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        // Pendentes: (1) disponíveis para qualquer médico (sem assignment) + (2) deste médico aguardando emissão de documentos
        var pendingUnassignedFilter = "status=in.(submitted,paid,searching_doctor)&or=(doctor_id.is.null,doctor_id.eq.00000000-0000-0000-0000-000000000000)";
        var pendingUnassignedCount = await db.CountAsync(TableName, pendingUnassignedFilter, cancellationToken);
        var pendingPostFilter = $"doctor_id=eq.{doctorId}&status=eq.pending_post_consultation";
        var pendingPostCount = await db.CountAsync(TableName, pendingPostFilter, cancellationToken);
        var pendingCount = pendingUnassignedCount + pendingPostCount;

        // Em análise: atribuídos a este médico em estados ativos (sem pending_post_consultation, que agora é "Pendente")
        var inReviewFilter = $"doctor_id=eq.{doctorId}&status=in.(in_review,approved,consultation_ready,consultation_accepted,in_consultation)";
        var inReviewCount = await db.CountAsync(TableName, inReviewFilter, cancellationToken);

        var completedFilter = $"doctor_id=eq.{doctorId}&status=in.(signed,completed,delivered,consultation_finished)";
        var completedCount = await db.CountAsync(TableName, completedFilter, cancellationToken);

        // BUG FIX: totalEarnings estava fixo em 0m, retornando dado falso aos dashboards.
        // Calcula via SUM(effective_price) dos atendimentos concluídos do médico.
        decimal totalEarnings;
        try
        {
            const string earningsSql = @"
SELECT COALESCE(SUM(effective_price), 0)::numeric
  FROM public.requests
 WHERE doctor_id = @doctorId
   AND status IN ('signed','completed','delivered','consultation_finished')";
            await using var conn = db.CreateConnectionPublic();
            await conn.OpenAsync(cancellationToken);
            totalEarnings = await conn.ExecuteScalarAsync<decimal?>(
                new CommandDefinition(earningsSql, new { doctorId }, cancellationToken: cancellationToken)) ?? 0m;
        }
        catch
        {
            // Coluna effective_price pode não existir em ambientes antigos; preservar comportamento anterior.
            totalEarnings = 0m;
        }

        return (pendingCount, inReviewCount, completedCount, totalEarnings);
    }

    public async Task<List<MedicalRequest>> GetStaleApprovedPendingPaymentAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default)
    {
        var cutoffStr = cutoffUtc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var filter = $"status=eq.approved_pending_payment&updated_at=lt.{cutoffStr}";
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: filter,
            cancellationToken: cancellationToken);
        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetStaleInReviewAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default)
    {
        var cutoffStr = cutoffUtc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var filter = $"status=eq.in_review&updated_at=lt.{cutoffStr}&doctor_id=not.is.null";
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: filter,
            cancellationToken: cancellationToken);
        return models.Select(MapToDomain).ToList();
    }

    public async Task<List<MedicalRequest>> GetPrescriptionsExpiringSoonAsync(DateTime nowUtc, int daysAhead = 7, CancellationToken cancellationToken = default)
    {
        var filter = "request_type=eq.prescription&status=eq.delivered&signed_at=not.is.null";
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: filter,
            cancellationToken: cancellationToken);

        var windowEnd = nowUtc.AddDays(daysAhead);

        return models
            .Where(m =>
            {
                if (!m.SignedAt.HasValue) return false;
                // Usar expires_at real se disponível; senão calcular estimativa
                DateTime validUntil;
                if (m.ExpiresAt.HasValue)
                {
                    validUntil = m.ExpiresAt.Value;
                }
                else
                {
                    var days = m.PrescriptionValidDays ?? 30;
                    validUntil = m.SignedAt.Value.AddDays(days);
                }
                return validUntil >= nowUtc && validUntil <= windowEnd;
            })
            .Select(MapToDomain)
            .ToList();
    }

    public async Task<List<MedicalRequest>> GetUpcomingConsultationsAsync(CancellationToken cancellationToken = default)
    {
        // Consultas aceitas (Paid ou ConsultationReady) que ainda não iniciaram
        var filter = "request_type=eq.consultation&status=in.(paid,consultation_ready)&doctor_id=not.is.null";
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: filter,
            cancellationToken: cancellationToken);
        return models.Select(MapToDomain).ToList();
    }

    public async Task<MedicalRequest> CreateAsync(MedicalRequest request, CancellationToken cancellationToken = default)
    {
        var model = MapToModel(request);
        var created = await db.InsertAsync<RequestModel>(
            TableName,
            model,
            cancellationToken);

        return MapToDomain(created);
    }

    /// <summary>
    /// Claim atômico via `UPDATE ... WHERE doctor_id IS NULL OR = uuid_nil()`.
    /// Se o request já foi reivindicado por outro médico, a query afeta 0
    /// linhas e retornamos false — o caller deve tratar como "race perdida".
    /// Eliminando o fluxo GetById→Check→Update que tinha race em multi-médicos.
    /// </summary>
    public async Task<bool> TryClaimAsync(Guid requestId, Guid doctorUserId, string doctorName, CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE public.requests
   SET doctor_id   = @DoctorId,
       doctor_name = @DoctorName,
       status      = 'in_review',
       claimed_at  = NOW(),
       updated_at  = NOW()
 WHERE id = @RequestId
   AND doctor_id IS NULL
   AND status IN ('submitted','pending','analyzing','searching_doctor')
RETURNING id";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);
        var result = await conn.QueryFirstOrDefaultAsync<Guid?>(
            new CommandDefinition(sql,
                new { RequestId = requestId, DoctorId = doctorUserId, DoctorName = doctorName },
                cancellationToken: cancellationToken));

        return result.HasValue;
    }

    public async Task<List<Guid>> ReleaseStaleClaimsAsync(
        TimeSpan threshold,
        CancellationToken cancellationToken = default)
    {
        const string sql = @"
UPDATE public.requests
   SET doctor_id   = NULL,
       doctor_name = NULL,
       status      = 'submitted',
       claimed_at  = NULL,
       updated_at  = NOW()
 WHERE status = 'in_review'
   AND claimed_at IS NOT NULL
   AND claimed_at < NOW() - (@ThresholdSeconds || ' seconds')::interval
RETURNING id";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);
        var ids = await conn.QueryAsync<Guid>(
            new CommandDefinition(sql,
                new { ThresholdSeconds = ((int)threshold.TotalSeconds).ToString() },
                cancellationToken: cancellationToken));

        return ids.ToList();
    }

    public async Task<MedicalRequest> UpdateAsync(MedicalRequest request, CancellationToken cancellationToken = default)
    {
        var model = MapToModel(request);
        var updatePayload = new RequestUpdatePayload
        {
            PatientId = model.PatientId,
            PatientName = model.PatientName,
            DoctorId = model.DoctorId,
            DoctorName = model.DoctorName,
            RequestType = model.RequestType,
            Status = model.Status,
            PrescriptionType = model.PrescriptionType,
            PrescriptionKind = model.PrescriptionKind,
            Medications = model.Medications,
            PrescriptionImages = model.PrescriptionImages,
            ExamType = model.ExamType,
            Exams = model.Exams,
            ExamImages = model.ExamImages,
            Symptoms = model.Symptoms,
            Notes = model.Notes,
            RejectionReason = model.RejectionReason,
            AccessCode = model.AccessCode,
            SignedAt = model.SignedAt,
            SignedDocumentUrl = model.SignedDocumentUrl,
            SignatureId = model.SignatureId,
            AiSummaryForDoctor = model.AiSummaryForDoctor,
            AiExtractedJson = model.AiExtractedJson,
            AiRiskLevel = model.AiRiskLevel,
            AiUrgency = model.AiUrgency,
            AiReadabilityOk = model.AiReadabilityOk,
            AiMessageToUser = model.AiMessageToUser,
            ConsultationType = model.ConsultationType,
            ContractedMinutes = model.ContractedMinutes,
            ConsultationStartedAt = model.ConsultationStartedAt,
            DoctorCallConnectedAt = model.DoctorCallConnectedAt,
            PatientCallConnectedAt = model.PatientCallConnectedAt,
            UpdatedAt = model.UpdatedAt,
            ExpiresAt = model.ExpiresAt,
            PrescriptionValidDays = model.PrescriptionValidDays,
            RejectionSource = model.RejectionSource,
            AiRejectionReason = model.AiRejectionReason,
            AiRejectedAt = model.AiRejectedAt,
            ReopenedBy = model.ReopenedBy,
            ReopenedAt = model.ReopenedAt,
            ClaimedAt = model.ClaimedAt,
            // Campos de conduta clínica / pós-consulta / triagem — antes estavam
            // ausentes do payload e qualquer mudança era silenciosamente perdida
            // no UPDATE (bug latente encontrado em 2026-04-09 durante fix do
            // fluxo de assinatura em lote). Mantidos em sincronia com MapToModel
            // + RequestModel para evitar divergência futura.
            AutoObservation = model.AutoObservation,
            DoctorConductNotes = model.DoctorConductNotes,
            IncludeConductInPdf = model.IncludeConductInPdf,
            AiConductSuggestion = model.AiConductSuggestion,
            AiSuggestedExams = model.AiSuggestedExams,
            ConductUpdatedAt = model.ConductUpdatedAt,
            ConductUpdatedBy = model.ConductUpdatedBy,
            RequiredSpecialty = model.RequiredSpecialty,
            Priority = model.Priority,
        };
        var updated = await db.UpdateAsync<RequestModel>(
            TableName,
            $"id=eq.{request.Id}",
            updatePayload,
            cancellationToken);

        return MapToDomain(updated);
    }

    private class RequestUpdatePayload
    {
        public Guid PatientId { get; set; }
        public string? PatientName { get; set; }
        public Guid? DoctorId { get; set; }
        public string? DoctorName { get; set; }
        public string RequestType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PrescriptionType { get; set; }
        public string? PrescriptionKind { get; set; }
        public string? Medications { get; set; }
        public string? PrescriptionImages { get; set; }
        public string? ExamType { get; set; }
        public string? Exams { get; set; }
        public string? ExamImages { get; set; }
        public string? Symptoms { get; set; }
        public string? Notes { get; set; }
        public string? RejectionReason { get; set; }
        public string? AccessCode { get; set; }
        public DateTime? SignedAt { get; set; }
        public string? SignedDocumentUrl { get; set; }
        public string? SignatureId { get; set; }
        public string? AiSummaryForDoctor { get; set; }
        public string? AiExtractedJson { get; set; }
        public string? AiRiskLevel { get; set; }
        public string? AiUrgency { get; set; }
        public bool? AiReadabilityOk { get; set; }
        public string? AiMessageToUser { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("consultation_type")]
        public string? ConsultationType { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("contracted_minutes")]
        public int? ContractedMinutes { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("consultation_started_at")]
        public DateTime? ConsultationStartedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("doctor_call_connected_at")]
        public DateTime? DoctorCallConnectedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("patient_call_connected_at")]
        public DateTime? PatientCallConnectedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        // Security fields (migration: document_security)
        [System.Text.Json.Serialization.JsonPropertyName("expires_at")]
        public DateTime? ExpiresAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("prescription_valid_days")]
        public int? PrescriptionValidDays { get; set; }
        // AI rejection tracking fields
        [System.Text.Json.Serialization.JsonPropertyName("rejection_source")]
        public string? RejectionSource { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("ai_rejection_reason")]
        public string? AiRejectionReason { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("ai_rejected_at")]
        public DateTime? AiRejectedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("reopened_by")]
        public Guid? ReopenedBy { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("reopened_at")]
        public DateTime? ReopenedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("claimed_at")]
        public DateTime? ClaimedAt { get; set; }
        // Conduct clínica / anotações pós-consulta — migração do landmine
        // onde mudanças nesses campos eram silenciosamente descartadas.
        [System.Text.Json.Serialization.JsonPropertyName("auto_observation")]
        public string? AutoObservation { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("doctor_conduct_notes")]
        public string? DoctorConductNotes { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("include_conduct_in_pdf")]
        public bool? IncludeConductInPdf { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("ai_conduct_suggestion")]
        public string? AiConductSuggestion { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("ai_suggested_exams")]
        public string? AiSuggestedExams { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("conduct_updated_at")]
        public DateTime? ConductUpdatedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("conduct_updated_by")]
        public Guid? ConductUpdatedBy { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("required_specialty")]
        public string? RequiredSpecialty { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("priority")]
        public string? Priority { get; set; }
    }


    // ── Paginação real no banco ───────────────────────────────────────────────────

    /// <summary>
    /// Pedidos do paciente com paginação real (LIMIT/OFFSET no banco).
    /// </summary>
    public async Task<(List<MedicalRequest> Items, int TotalCount)> GetByPatientIdPagedAsync(
        Guid patientId,
        string? status = null,
        string? type = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var filter = $"patient_id=eq.{patientId}";
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.AsSpan().IndexOfAny("&=.(") >= 0)
                throw new ArgumentException("Invalid status filter value");
            filter += $"&status=eq.{status}";
        }
        if (!string.IsNullOrWhiteSpace(type))
        {
            if (type.AsSpan().IndexOfAny("&=.(") >= 0)
                throw new ArgumentException("Invalid type filter value");
            filter += $"&request_type=eq.{type}";
        }

        var totalCount = await db.CountAsync(TableName, filter, cancellationToken);
        if (totalCount == 0)
            return (new List<MedicalRequest>(), 0);

        // BUG FIX: `page` podia ser 0/negativo, produzindo offset negativo
        // (Postgres responde 22023 "OFFSET must not be negative"). Normaliza antes do cálculo.
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 200) pageSize = 200;
        var offset = (page - 1) * pageSize;
        var models = await db.GetAllAsync<RequestModel>(
            TableName,
            filter: filter,
            orderBy: "created_at.desc",
            limit: pageSize,
            offset: offset,
            cancellationToken: cancellationToken);

        return (models.Select(MapToDomain).ToList(), totalCount);
    }

    /// <summary>
    /// Fila do médico com paginação real via SQL direto (Dapper).
    /// Combina pedidos atribuídos ao médico + disponíveis na fila numa única query.
    ///
    /// FIX: Usa SQL raw em vez de PostgREST filter com or=() aninhado,
    /// que o PostgRestFilterParser não conseguia interpretar corretamente,
    /// resultando em totalCount=0 e lista vazia.
    ///
    /// Mesma lógica que GetByDoctorIdAsync + GetAvailableForQueueAsync (usada pelo mobile via
    /// GetUserRequestsAsync), mas paginada no banco para performance.
    /// </summary>
    public async Task<(List<MedicalRequest> Items, int TotalCount)> GetDoctorQueuePagedAsync(
        Guid doctorId,
        string? status = null,
        string? type = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        // Mesma lógica do mobile: atribuídos ao médico OU disponíveis na fila
        var baseSql = @"FROM public.requests
WHERE (
    doctor_id = @DoctorId
    OR (
        status IN ('submitted', 'searching_doctor', 'pending', 'analyzing')
        AND (doctor_id IS NULL OR doctor_id = '00000000-0000-0000-0000-000000000000')
    )
)";
        var parameters = new DynamicParameters();
        parameters.Add("DoctorId", doctorId);

        // Filtros opcionais — status aceita valor único ("signed") ou lista separada por vírgula ("signed,completed,delivered")
        if (!string.IsNullOrWhiteSpace(status))
        {
            var statuses = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (statuses.Length == 1)
            {
                baseSql += " AND status = @StatusFilter";
                parameters.Add("StatusFilter", statuses[0]);
            }
            else
            {
                baseSql += " AND status = ANY(@StatusFilters)";
                parameters.Add("StatusFilters", statuses);
            }
        }
        if (!string.IsNullOrWhiteSpace(type))
        {
            baseSql += " AND request_type = @TypeFilter";
            parameters.Add("TypeFilter", type);
        }

        // Count
        var countSql = $"SELECT COUNT(*) {baseSql}";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);
        var totalCount = await conn.ExecuteScalarAsync<int>(new CommandDefinition(countSql, parameters, cancellationToken: cancellationToken));

        if (totalCount == 0)
            return (new List<MedicalRequest>(), 0);

        // BUG FIX: evita OFFSET negativo quando page<1 (erro Postgres 22023).
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 200) pageSize = 200;
        // Fetch page
        var offset = (page - 1) * pageSize;
        var dataSql = $"SELECT * {baseSql} ORDER BY created_at DESC LIMIT @Limit OFFSET @Offset";
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        var models = (await conn.QueryAsync<RequestModel>(new CommandDefinition(dataSql, parameters, cancellationToken: cancellationToken))).AsList();

        return (models.Select(MapToDomain).ToList(), totalCount);
    }

    /// <summary>
    /// Lista pedidos rejeitados pela IA, opcionalmente filtrados por especialidade.
    /// Usa SQL direto (Dapper) para suportar ORDER BY ai_rejected_at DESC NULLS LAST.
    /// </summary>
    public async Task<IReadOnlyList<MedicalRequest>> ListAiRejectedBySpecialtyAsync(
        string? specialty,
        int limit,
        CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT *
  FROM public.requests
 WHERE status = 'rejected'
   AND rejection_source = 'ai'
   AND (@Specialty IS NULL OR required_specialty IS NULL OR required_specialty = @Specialty)
 ORDER BY ai_rejected_at DESC NULLS LAST
 LIMIT @Limit";

        var parameters = new DynamicParameters();
        parameters.Add("Specialty", (object?)specialty ?? DBNull.Value);
        parameters.Add("Limit", limit);

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);
        var models = (await conn.QueryAsync<RequestModel>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken))).AsList();

        return models.Select(MapToDomain).ToList();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await db.DeleteAsync(
            TableName,
            $"id=eq.{id}",
            cancellationToken);
    }

    private static MedicalRequest MapToDomain(RequestModel model)
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = model.Id,
            PatientId = model.PatientId,
            PatientName = model.PatientName,
            DoctorId = model.DoctorId,
            DoctorName = model.DoctorName,
            RequestType = model.RequestType,
            Status = SnakeCaseHelper.ToPascalCase(model.Status ?? ""),
            PrescriptionType = model.PrescriptionType,
            Medications = JsonToList(model.Medications),
            PrescriptionImages = JsonToList(model.PrescriptionImages),
            ExamType = model.ExamType,
            Exams = JsonToList(model.Exams),
            ExamImages = JsonToList(model.ExamImages),
            Symptoms = model.Symptoms,
            Notes = model.Notes,
            RejectionReason = model.RejectionReason,
            SignedAt = model.SignedAt,
            SignedDocumentUrl = model.SignedDocumentUrl,
            SignatureId = model.SignatureId,
            CreatedAt = model.CreatedAt,
            UpdatedAt = model.UpdatedAt,
            AiSummaryForDoctor = model.AiSummaryForDoctor,
            AiExtractedJson = model.AiExtractedJson,
            AiRiskLevel = model.AiRiskLevel,
            AiUrgency = model.AiUrgency,
            AiReadabilityOk = model.AiReadabilityOk,
            AiMessageToUser = model.AiMessageToUser,
            AccessCode = model.AccessCode,
            PrescriptionKind = !string.IsNullOrWhiteSpace(model.PrescriptionKind) ? SnakeCaseHelper.ToPascalCase(model.PrescriptionKind) : null,
            ConsultationType = model.ConsultationType,
            ContractedMinutes = model.ContractedMinutes,
            ConsultationStartedAt = model.ConsultationStartedAt,
            DoctorCallConnectedAt = model.DoctorCallConnectedAt,
            PatientCallConnectedAt = model.PatientCallConnectedAt,
            AutoObservation = model.AutoObservation,
            DoctorConductNotes = model.DoctorConductNotes,
            IncludeConductInPdf = model.IncludeConductInPdf,
            AiConductSuggestion = model.AiConductSuggestion,
            AiSuggestedExams = model.AiSuggestedExams,
            ConductUpdatedAt = model.ConductUpdatedAt,
            ConductUpdatedBy = model.ConductUpdatedBy,
            RequiredSpecialty = model.RequiredSpecialty,
            Priority = model.Priority,
            RejectionSource = model.RejectionSource,
            AiRejectionReason = model.AiRejectionReason,
            AiRejectedAt = model.AiRejectedAt,
            ReopenedBy = model.ReopenedBy,
            ReopenedAt = model.ReopenedAt,
            ClaimedAt = model.ClaimedAt,
        };

        return MedicalRequest.Reconstitute(snapshot);
    }

    private static string ToShortCode(Guid id) =>
        id.ToString("N")[..12].ToLowerInvariant();

    private static RequestModel MapToModel(MedicalRequest request)
    {
        return new RequestModel
        {
            Id = request.Id,
            ShortCode = ToShortCode(request.Id),
            PatientId = request.PatientId,
            PatientName = request.PatientName,
            DoctorId = request.DoctorId,
            DoctorName = request.DoctorName,
            RequestType = request.RequestType.ToString().ToLowerInvariant(),
            Status = SnakeCaseHelper.ToSnakeCase(request.Status.ToString()),
            PrescriptionType = request.PrescriptionType?.ToString().ToLowerInvariant(),
            PrescriptionKind = request.PrescriptionKind.HasValue ? SnakeCaseHelper.ToSnakeCase(request.PrescriptionKind.Value.ToString()) : null,
            Medications = ListToJson(request.Medications),
            PrescriptionImages = ListToJson(request.PrescriptionImages),
            ExamType = request.ExamType,
            Exams = ListToJson(request.Exams),
            ExamImages = ListToJson(request.ExamImages),
            Symptoms = request.Symptoms,
            Notes = request.Notes,
            RejectionReason = request.RejectionReason,
            AccessCode = request.AccessCode,
            SignedAt = request.SignedAt,
            SignedDocumentUrl = request.SignedDocumentUrl,
            SignatureId = request.SignatureId,
            AiSummaryForDoctor = request.AiSummaryForDoctor,
            AiExtractedJson = request.AiExtractedJson,
            AiRiskLevel = request.AiRiskLevel,
            AiUrgency = request.AiUrgency,
            AiReadabilityOk = request.AiReadabilityOk,
            AiMessageToUser = request.AiMessageToUser,
            AutoObservation = request.AutoObservation,
            DoctorConductNotes = request.DoctorConductNotes,
            IncludeConductInPdf = request.IncludeConductInPdf,
            AiConductSuggestion = request.AiConductSuggestion,
            AiSuggestedExams = request.AiSuggestedExams,
            ConductUpdatedAt = request.ConductUpdatedAt,
            ConductUpdatedBy = request.ConductUpdatedBy,
            ConsultationType = request.ConsultationType,
            ContractedMinutes = request.ContractedMinutes,
            ConsultationStartedAt = request.ConsultationStartedAt,
            DoctorCallConnectedAt = request.DoctorCallConnectedAt,
            PatientCallConnectedAt = request.PatientCallConnectedAt,
            RequiredSpecialty = request.RequiredSpecialty,
            Priority = request.Priority.ToString().ToLowerInvariant(),
            RejectionSource = request.RejectionSource?.ToString().ToLowerInvariant(),
            AiRejectionReason = request.AiRejectionReason,
            AiRejectedAt = request.AiRejectedAt,
            ReopenedBy = request.ReopenedBy,
            ReopenedAt = request.ReopenedAt,
            ClaimedAt = request.ClaimedAt,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt
        };
    }
    private static string? ListToJson(List<string>? list) => list == null || list.Count == 0 ? null : JsonSerializer.Serialize(list);
    private static List<string> JsonToList(string? json) { if (string.IsNullOrWhiteSpace(json) || json == "null") return new(); try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); } catch { return new(); } }
}
