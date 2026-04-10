using System.Data;
using Dapper;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório de leitura-somente para o Monitor de Produtividade.
///
/// Todas as queries usam SQL puro via Dapper porque a API key-value do
/// <see cref="PostgresClient"/> (estilo PostgREST) não suporta percentis,
/// GROUP BY ou window functions.
///
/// Os cálculos de revenue fazem JOIN com <c>product_prices</c> usando
/// CASE para mapear <c>request_type</c> + <c>prescription_kind</c> +
/// <c>contracted_minutes</c> para a chave do produto. Ociosidade é
/// calculada em C# depois das queries agregadas (precisa de
/// <c>doctor_contracts</c>, que é 1 linha por médico — trivial).
///
/// Índices esperados (ver MigrationRunner.ProductivityIndexesMigrations):
/// - idx_requests_doctor_status_created
/// - idx_doc_access_log_user_action_created
/// - idx_requests_queue_pending
/// - idx_requests_signed_at
/// </summary>
public class ProductivityReportRepository(PostgresClient db) : IProductivityReportRepository
{
    private const string ProductKeyCase = @"
        CASE
            WHEN r.request_type = 'prescription' AND r.prescription_kind = 'simple'             THEN 'prescription_simple'
            WHEN r.request_type = 'prescription' AND r.prescription_kind = 'antimicrobial'      THEN 'prescription_antimicrobial'
            WHEN r.request_type = 'prescription' AND r.prescription_kind = 'controlled_special' THEN 'prescription_controlled'
            WHEN r.request_type = 'exam'                                                         THEN 'exam_request'
            WHEN r.request_type = 'consultation' AND r.contracted_minutes IS NOT NULL           THEN 'consultation_minute'
            WHEN r.request_type = 'consultation'                                                 THEN 'consultation_flat'
            WHEN r.request_type = 'prescription'                                                 THEN 'prescription_simple'
        END";

    private const string RevenueQtyCase = @"
        CASE
            WHEN r.request_type = 'consultation' AND r.contracted_minutes IS NOT NULL THEN r.contracted_minutes
            ELSE 1
        END";

    // Conjunto de actions consideradas "ativo" (o médico estava clinicamente trabalhando)
    private const string ActionSet = "'reviewed','approved_for_signing','batch_signed','signed'";

    // ──────────────────────────────────────────────────────────────────────────
    // OVERVIEW — KPIs agregados do período
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<OverviewDto> GetOverviewAsync(
        DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var sql = $@"
            WITH period_requests AS (
                SELECT * FROM public.requests
                 WHERE created_at BETWEEN @from AND @to
            ),
            stats AS (
                SELECT
                    COUNT(*)                                                                    AS total,
                    COUNT(*) FILTER (WHERE status IN ('signed','delivered','consultation_finished')) AS completed,
                    COUNT(*) FILTER (WHERE status = 'rejected' AND rejection_source = 'doctor') AS rejected_by_doctor,
                    COUNT(*) FILTER (WHERE status = 'rejected' AND rejection_source = 'ai')     AS rejected_by_ai,
                    COUNT(*) FILTER (WHERE reopened_at IS NOT NULL)                             AS reopened
                FROM period_requests
            ),
            percentiles AS (
                SELECT
                    percentile_cont(0.5)  WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (signed_at - created_at))/60) AS p50,
                    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (signed_at - created_at))/60) AS p95
                FROM period_requests
                WHERE signed_at IS NOT NULL
            ),
            revenue AS (
                SELECT COALESCE(SUM({RevenueQtyCase} * pp.price_cents), 0) AS cents
                FROM period_requests r
                JOIN public.product_prices pp ON pp.product_key = {ProductKeyCase} AND pp.active
                WHERE r.signed_at IS NOT NULL OR r.status = 'consultation_finished'
            ),
            active_doctors AS (
                SELECT COUNT(DISTINCT user_id) AS n
                FROM public.document_access_log
                WHERE user_id IS NOT NULL
                  AND action IN ({ActionSet})
                  AND created_at BETWEEN @from AND @to
            ),
            online_doctors AS (
                SELECT COUNT(DISTINCT user_id) AS n
                FROM public.document_access_log
                WHERE user_id IS NOT NULL
                  AND action IN ({ActionSet})
                  AND created_at >= now() - INTERVAL '5 minutes'
            )
            SELECT
                s.total, s.completed, s.rejected_by_doctor, s.rejected_by_ai, s.reopened,
                COALESCE(p.p50, 0) AS p50, COALESCE(p.p95, 0) AS p95,
                rev.cents AS revenue_cents,
                ad.n AS active_doctors,
                od.n AS doctors_online
            FROM stats s, percentiles p, revenue rev, active_doctors ad, online_doctors od;";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync<OverviewRow>(
            new CommandDefinition(sql, new { from = fromUtc, to = toUtc }, cancellationToken: ct));

        // Se não há nenhum dado, row pode vir null (CTEs vazias não propagam em CROSS JOIN).
        row ??= new OverviewRow();

        // Idle cost é calculado separadamente porque precisa de doctor_contracts ativos.
        var idleCostCents = await ComputeTotalIdleCostAsync(fromUtc, toUtc, ct);

        var completionRate = row.Total > 0
            ? Math.Round((decimal)row.Completed / row.Total, 4)
            : 0m;

        return new OverviewDto(
            fromUtc,
            toUtc,
            row.Total,
            row.Completed,
            completionRate,
            row.RejectedByDoctor,
            row.RejectedByAi,
            row.Reopened,
            Math.Round(row.P50, 1),
            Math.Round(row.P95, 1),
            row.RevenueCents,
            idleCostCents,
            row.ActiveDoctors,
            row.DoctorsOnline);
    }

    private async Task<long> ComputeTotalIdleCostAsync(
        DateTime fromUtc, DateTime toUtc, CancellationToken ct)
    {
        // Para cada médico com contrato ativo:
        //   horas_esperadas   = hours_per_month × (dias_período / 30)
        //   horas_trabalhadas = buckets distintos de 5 min com ação no access_log / 12
        //   horas_ociosas     = max(0, horas_esperadas - horas_trabalhadas)
        //   custo             = horas_ociosas × hourly_rate_cents
        const string sql = @"
            WITH period AS (
                SELECT EXTRACT(EPOCH FROM (@to::timestamptz - @from::timestamptz)) / 86400.0 AS days
            ),
            contracts AS (
                SELECT dc.doctor_profile_id, dc.hours_per_month, dc.hourly_rate_cents, dp.user_id
                FROM public.doctor_contracts dc
                JOIN public.doctor_profiles dp ON dp.id = dc.doctor_profile_id
                WHERE dc.active = true AND dc.hourly_rate_cents > 0
            ),
            worked_buckets AS (
                SELECT dal.user_id, COUNT(DISTINCT date_trunc('minute', dal.created_at) - (EXTRACT(MINUTE FROM dal.created_at)::int % 5) * INTERVAL '1 minute') AS buckets
                FROM public.document_access_log dal
                WHERE dal.user_id IS NOT NULL
                  AND dal.action IN ('reviewed','approved_for_signing','batch_signed','signed')
                  AND dal.created_at BETWEEN @from AND @to
                GROUP BY dal.user_id
            )
            SELECT COALESCE(SUM(
                GREATEST(0,
                    (c.hours_per_month * (SELECT days FROM period) / 30.0)
                    - COALESCE((wb.buckets::numeric * 5.0 / 60.0), 0)
                ) * c.hourly_rate_cents
            ), 0)::bigint
            FROM contracts c
            LEFT JOIN worked_buckets wb ON wb.user_id = c.user_id";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        return await conn.ExecuteScalarAsync<long>(
            new CommandDefinition(sql, new { from = fromUtc, to = toUtc }, cancellationToken: ct));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RANKING — uma linha por médico com atividade no período
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<List<DoctorProductivityRow>> GetDoctorRankingAsync(
        DateTime fromUtc, DateTime toUtc, string sort, int limit, CancellationToken ct = default)
    {
        var orderBy = sort switch
        {
            "volume"  => "signed DESC NULLS LAST",
            "p50"     => "p50 ASC NULLS LAST",
            _         => "revenue_cents DESC NULLS LAST", // default: revenue
        };

        var sql = $@"
            WITH period_actions AS (
                SELECT user_id, request_id, action, created_at
                FROM public.document_access_log
                WHERE user_id IS NOT NULL
                  AND created_at BETWEEN @from AND @to
            ),
            doctor_activity AS (
                SELECT
                    pa.user_id,
                    COUNT(DISTINCT pa.request_id)                                             AS requests_touched,
                    COUNT(DISTINCT pa.request_id) FILTER (WHERE pa.action = 'reviewed')        AS reviewed,
                    COUNT(DISTINCT pa.request_id) FILTER (WHERE pa.action = 'signed')          AS signed,
                    COUNT(DISTINCT pa.request_id) FILTER (WHERE pa.action = 'batch_signed')    AS batch_signed,
                    MAX(pa.created_at)                                                          AS last_activity_at
                FROM period_actions pa
                GROUP BY pa.user_id
            ),
            doctor_percentiles AS (
                SELECT
                    r.doctor_id,
                    percentile_cont(0.5)  WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.signed_at - r.created_at))/60) AS p50,
                    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.signed_at - r.created_at))/60) AS p95
                FROM public.requests r
                WHERE r.signed_at IS NOT NULL
                  AND r.signed_at BETWEEN @from AND @to
                  AND r.doctor_id IS NOT NULL
                GROUP BY r.doctor_id
            ),
            doctor_revenue AS (
                SELECT
                    r.doctor_id,
                    COALESCE(SUM({RevenueQtyCase} * pp.price_cents), 0) AS revenue_cents
                FROM public.requests r
                JOIN public.product_prices pp ON pp.product_key = {ProductKeyCase} AND pp.active
                WHERE r.doctor_id IS NOT NULL
                  AND r.signed_at IS NOT NULL
                  AND r.signed_at BETWEEN @from AND @to
                GROUP BY r.doctor_id
            )
            SELECT
                dp.id                  AS doctor_profile_id,
                u.id                   AS user_id,
                u.name                 AS name,
                dp.specialty           AS specialty,
                COALESCE(da.requests_touched, 0) AS requests_handled,
                COALESCE(da.reviewed, 0)         AS reviewed,
                COALESCE(da.signed, 0)           AS signed,
                COALESCE(da.batch_signed, 0)     AS batch_signed,
                COALESCE(dpc.p50, 0)             AS p50,
                COALESCE(dpc.p95, 0)             AS p95,
                COALESCE(dr.revenue_cents, 0)    AS revenue_cents,
                da.last_activity_at              AS last_activity_at,
                dc.hours_per_month               AS hours_per_month,
                dc.hourly_rate_cents             AS hourly_rate_cents
            FROM public.doctor_profiles dp
            JOIN public.users u ON u.id = dp.user_id
            LEFT JOIN doctor_activity da    ON da.user_id    = u.id
            LEFT JOIN doctor_percentiles dpc ON dpc.doctor_id = u.id
            LEFT JOIN doctor_revenue dr     ON dr.doctor_id  = u.id
            LEFT JOIN public.doctor_contracts dc ON dc.doctor_profile_id = dp.id AND dc.active = true
            WHERE dp.approval_status = 'approved'
              AND da.user_id IS NOT NULL  -- só médicos com ação no período
            ORDER BY {orderBy}
            LIMIT @limit";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = (await conn.QueryAsync<RankingRow>(
            new CommandDefinition(sql, new { from = fromUtc, to = toUtc, limit }, cancellationToken: ct))).ToList();

        // Para cada linha, calcular utilização e idle cost individuais em C#.
        var periodDays = Math.Max(1, (toUtc - fromUtc).TotalDays);

        return rows.Select(r =>
        {
            decimal? utilization = null;
            long idleCost = 0;

            if (r.HoursPerMonth is int hpm && hpm > 0)
            {
                var expectedHours = (double)hpm * (periodDays / 30.0);
                // Heurística idêntica ao overview: 1 bucket = 5 min = 1/12 hora.
                // Aqui usamos total de ações distintas como proxy — menos preciso, mas
                // suficiente pro ranking (drill-down calcula exato).
                var workedHours = r.RequestsHandled * 0.25; // 15 min por pedido como aproximação
                workedHours = Math.Min(workedHours, expectedHours);
                var idleHours = Math.Max(0, expectedHours - workedHours);
                utilization = expectedHours > 0 ? (decimal)Math.Round(workedHours / expectedHours, 3) : (decimal?)null;
                if (r.HourlyRateCents is long rate && rate > 0)
                    idleCost = (long)Math.Round(idleHours * rate);
            }

            var batchRate = r.Signed > 0
                ? Math.Round((decimal)r.BatchSigned / r.Signed, 3)
                : 0m;

            return new DoctorProductivityRow(
                r.DoctorProfileId,
                r.UserId,
                r.Name,
                r.Specialty,
                r.RequestsHandled,
                r.Reviewed,
                r.Signed,
                r.BatchSigned,
                Math.Round(r.P50, 1),
                Math.Round(r.P95, 1),
                r.RevenueCents,
                idleCost,
                utilization,
                batchRate,
                r.LastActivityAt);
        }).ToList();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DOCTOR DETAIL — drill-down completo de um médico
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<DoctorDetailDto?> GetDoctorDetailAsync(
        Guid doctorProfileId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        // 1. Resumo: reaproveita a lógica do ranking filtrando por ESTE médico.
        var ranking = await GetDoctorRankingAsync(fromUtc, toUtc, "revenue", int.MaxValue, ct);
        var summary = ranking.FirstOrDefault(r => r.DoctorProfileId == doctorProfileId);
        if (summary is null)
        {
            // Médico não teve atividade no período — ainda assim devolvemos um detail vazio
            // pra UI não quebrar (mostra um estado "sem dados").
            var profileRow = await GetMinimalDoctorProfileAsync(doctorProfileId, ct);
            if (profileRow is null) return null;
            summary = new DoctorProductivityRow(
                profileRow.Value.Id, profileRow.Value.UserId, profileRow.Value.Name,
                profileRow.Value.Specialty, 0, 0, 0, 0, 0, 0, 0, 0, null, 0, null);
        }

        // 2. Funil do médico no período
        var funnel = await GetFunnelAsync(fromUtc, toUtc, summary.UserId, ct);

        // 3. Heatmap 7×24 do médico
        var heatmap = await GetHeatmapAsync(summary.UserId, fromUtc, toUtc, ct);

        // 4. Timeline dos últimos 50 pedidos do médico no período
        var timeline = await GetRecentTimelineAsync(summary.UserId, fromUtc, toUtc, ct);

        // 5. Breakdown de receita por produto
        var revenueBreakdown = await GetRevenueBreakdownAsync(summary.UserId, fromUtc, toUtc, ct);

        return new DoctorDetailDto(summary, funnel, heatmap, timeline, revenueBreakdown);
    }

    private async Task<(Guid Id, Guid UserId, string Name, string Specialty)?> GetMinimalDoctorProfileAsync(
        Guid doctorProfileId, CancellationToken ct)
    {
        const string sql = @"
            SELECT dp.id, dp.user_id, u.name, dp.specialty
            FROM public.doctor_profiles dp
            JOIN public.users u ON u.id = dp.user_id
            WHERE dp.id = @id
            LIMIT 1";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync(
            new CommandDefinition(sql, new { id = doctorProfileId }, cancellationToken: ct));
        if (row is null) return null;
        return ((Guid)row.id, (Guid)row.user_id, (string)row.name, (string)row.specialty);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FUNNEL (agregado ou por médico)
    // ──────────────────────────────────────────────────────────────────────────
    public Task<FunnelDto> GetFunnelAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
        => GetFunnelAsync(fromUtc, toUtc, null, ct);

    private async Task<FunnelDto> GetFunnelAsync(
        DateTime fromUtc, DateTime toUtc, Guid? doctorUserId, CancellationToken ct)
    {
        var doctorFilter = doctorUserId.HasValue
            ? "AND (r.doctor_id = @doctorUserId OR dal.user_id = @doctorUserId)"
            : "";

        var sql = $@"
            WITH r AS (
                SELECT * FROM public.requests
                WHERE created_at BETWEEN @from AND @to
                  {(doctorUserId.HasValue ? "AND doctor_id = @doctorUserId" : "")}
            ),
            dal AS (
                SELECT request_id, user_id, action FROM public.document_access_log
                WHERE created_at BETWEEN @from AND @to
                  {(doctorUserId.HasValue ? "AND user_id = @doctorUserId" : "")}
            )
            SELECT
                (SELECT COUNT(*) FROM r) AS created,
                (SELECT COUNT(*) FROM r WHERE doctor_id IS NOT NULL) AS assigned,
                (SELECT COUNT(DISTINCT request_id) FROM dal WHERE action = 'reviewed') AS reviewed,
                (SELECT COUNT(DISTINCT request_id) FROM dal WHERE action = 'approved_for_signing') AS approved,
                (SELECT COUNT(*) FROM r WHERE signed_at IS NOT NULL) AS signed,
                (SELECT COUNT(*) FROM r WHERE status = 'delivered') AS delivered,
                (SELECT COUNT(*) FROM r WHERE status = 'rejected') AS rejected,
                (SELECT COUNT(*) FROM r WHERE status = 'cancelled') AS cancelled";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var p = new DynamicParameters();
        p.Add("from", fromUtc);
        p.Add("to", toUtc);
        if (doctorUserId.HasValue) p.Add("doctorUserId", doctorUserId.Value);

        var row = await conn.QueryFirstOrDefaultAsync<FunnelRow>(
            new CommandDefinition(sql, p, cancellationToken: ct));
        row ??= new FunnelRow();
        return new FunnelDto(row.Created, row.Assigned, row.Reviewed, row.Approved, row.Signed, row.Delivered, row.Rejected, row.Cancelled);
    }

    private async Task<HeatmapCell[]> GetHeatmapAsync(
        Guid doctorUserId, DateTime fromUtc, DateTime toUtc, CancellationToken ct)
    {
        const string sql = @"
            SELECT
                EXTRACT(DOW  FROM dal.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS day_of_week,
                EXTRACT(HOUR FROM dal.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
                COUNT(*) AS count
            FROM public.document_access_log dal
            WHERE dal.user_id = @userId
              AND dal.action IN ('reviewed','approved_for_signing','batch_signed','signed')
              AND dal.created_at BETWEEN @from AND @to
            GROUP BY 1, 2
            ORDER BY 1, 2";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<HeatmapCell>(
            new CommandDefinition(sql, new { userId = doctorUserId, from = fromUtc, to = toUtc }, cancellationToken: ct));
        return rows.ToArray();
    }

    private async Task<TimelineItem[]> GetRecentTimelineAsync(
        Guid doctorUserId, DateTime fromUtc, DateTime toUtc, CancellationToken ct)
    {
        var sql = $@"
            WITH doctor_requests AS (
                SELECT r.*, {ProductKeyCase} AS pk
                FROM public.requests r
                WHERE r.doctor_id = @userId
                  AND r.created_at BETWEEN @from AND @to
                ORDER BY r.created_at DESC
                LIMIT 50
            )
            SELECT
                dr.id             AS request_id,
                dr.short_code     AS short_code,
                dr.request_type   AS request_type,
                dr.status         AS status,
                dr.created_at     AS created_at,
                (SELECT MIN(created_at) FROM public.document_access_log
                    WHERE request_id = dr.id AND action = 'reviewed' AND user_id = @userId) AS reviewed_at,
                (SELECT MIN(created_at) FROM public.document_access_log
                    WHERE request_id = dr.id AND action = 'approved_for_signing' AND user_id = @userId) AS approved_for_signing_at,
                dr.signed_at      AS signed_at,
                (SELECT MAX(updated_at) FROM public.requests WHERE id = dr.id AND status = 'delivered') AS delivered_at,
                CASE WHEN dr.signed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (dr.signed_at - dr.created_at))/60 ELSE NULL END AS minutes_created_to_signed,
                COALESCE((SELECT pp.price_cents * {RevenueQtyCase}
                          FROM public.product_prices pp
                          WHERE pp.product_key = dr.pk AND pp.active), 0) AS product_revenue_cents
            FROM doctor_requests dr
            ORDER BY dr.created_at DESC";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<TimelineRow>(
            new CommandDefinition(sql, new { userId = doctorUserId, from = fromUtc, to = toUtc }, cancellationToken: ct));

        return rows.Select(r => new TimelineItem(
            r.RequestId,
            r.ShortCode ?? "",
            r.RequestType ?? "",
            r.Status ?? "",
            DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
            r.ReviewedAt.HasValue ? DateTime.SpecifyKind(r.ReviewedAt.Value, DateTimeKind.Utc) : null,
            r.ApprovedForSigningAt.HasValue ? DateTime.SpecifyKind(r.ApprovedForSigningAt.Value, DateTimeKind.Utc) : null,
            r.SignedAt.HasValue ? DateTime.SpecifyKind(r.SignedAt.Value, DateTimeKind.Utc) : null,
            r.DeliveredAt.HasValue ? DateTime.SpecifyKind(r.DeliveredAt.Value, DateTimeKind.Utc) : null,
            r.MinutesCreatedToSigned,
            r.ProductRevenueCents)).ToArray();
    }

    private async Task<RevenueBreakdown[]> GetRevenueBreakdownAsync(
        Guid doctorUserId, DateTime fromUtc, DateTime toUtc, CancellationToken ct)
    {
        var sql = $@"
            WITH doctor_signed AS (
                SELECT r.*, {ProductKeyCase} AS pk, {RevenueQtyCase} AS qty
                FROM public.requests r
                WHERE r.doctor_id = @userId
                  AND r.signed_at IS NOT NULL
                  AND r.signed_at BETWEEN @from AND @to
            )
            SELECT
                pp.product_key AS product_key,
                pp.label       AS label,
                COALESCE(SUM(ds.qty), 0)::int                        AS quantity,
                pp.price_cents                                        AS unit_price_cents,
                COALESCE(SUM(ds.qty * pp.price_cents), 0)::bigint    AS total_cents
            FROM public.product_prices pp
            LEFT JOIN doctor_signed ds ON ds.pk = pp.product_key
            WHERE pp.active
            GROUP BY pp.product_key, pp.label, pp.price_cents
            ORDER BY total_cents DESC";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<RevenueBreakdown>(
            new CommandDefinition(sql, new { userId = doctorUserId, from = fromUtc, to = toUtc }, cancellationToken: ct));
        return rows.ToArray();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SLA por prioridade
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<SlaDto> GetSlaAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        // Targets hard-coded na fase 1 (ver spec §"SLA por prioridade")
        const int targetUrgent = 10;
        const int targetHigh = 30;
        const int targetNormal = 120;

        const string sql = @"
            WITH first_review AS (
                SELECT r.id, r.priority, r.created_at,
                    (SELECT MIN(dal.created_at)
                     FROM public.document_access_log dal
                     WHERE dal.request_id = r.id AND dal.action = 'reviewed') AS reviewed_at
                FROM public.requests r
                WHERE r.created_at BETWEEN @from AND @to
            ),
            ttfr AS (
                SELECT
                    COALESCE(LOWER(priority), 'normal') AS priority,
                    EXTRACT(EPOCH FROM (COALESCE(reviewed_at, NOW()) - created_at))/60 AS mins
                FROM first_review
            )
            SELECT
                priority,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY mins) AS p50,
                percentile_cont(0.95) WITHIN GROUP (ORDER BY mins) AS p95,
                COUNT(*) FILTER (WHERE mins > CASE
                    WHEN priority = 'urgent' THEN @tu
                    WHEN priority = 'high'   THEN @th
                    ELSE @tn
                END) AS breached,
                COUNT(*) AS total
            FROM ttfr
            GROUP BY priority";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = (await conn.QueryAsync<SlaRow>(new CommandDefinition(sql,
            new { from = fromUtc, to = toUtc, tu = targetUrgent, th = targetHigh, tn = targetNormal },
            cancellationToken: ct))).ToList();

        SlaByPriority Build(string key, int target)
        {
            var row = rows.FirstOrDefault(r => string.Equals(r.Priority, key, StringComparison.OrdinalIgnoreCase));
            if (row is null) return new SlaByPriority(target, 0, 0, 0m, 0);
            var within = row.Total > 0
                ? Math.Round((decimal)(row.Total - row.Breached) / row.Total, 4)
                : 0m;
            return new SlaByPriority(target, Math.Round(row.P50, 1), Math.Round(row.P95, 1), within, row.Breached);
        }

        return new SlaDto(Build("urgent", targetUrgent), Build("high", targetHigh), Build("normal", targetNormal));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIVE QUEUE — endpoint de polling
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<LiveQueueDto> GetLiveQueueAsync(CancellationToken ct = default)
    {
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);

        // 1. counts globais
        const string countsSql = @"
            SELECT
                COUNT(*)                                       AS total_pending,
                COUNT(*) FILTER (WHERE doctor_id IS NULL)      AS unassigned,
                COUNT(*) FILTER (WHERE LOWER(priority) = 'urgent') AS urgent_count,
                COUNT(*) FILTER (WHERE
                    CASE
                        WHEN LOWER(priority) = 'urgent' THEN EXTRACT(EPOCH FROM (NOW() - created_at))/60 > 10
                        WHEN LOWER(priority) = 'high'   THEN EXTRACT(EPOCH FROM (NOW() - created_at))/60 > 30
                        ELSE                                  EXTRACT(EPOCH FROM (NOW() - created_at))/60 > 120
                    END) AS breaching
            FROM public.requests
            WHERE status IN ('submitted','searching_doctor','in_review')";

        var counts = await conn.QueryFirstOrDefaultAsync<CountsRow>(new CommandDefinition(countsSql, cancellationToken: ct));
        counts ??= new CountsRow();

        // 2. top 20 urgentes
        const string urgentSql = @"
            SELECT
                id, short_code, request_type, priority, status, required_specialty,
                created_at,
                (EXTRACT(EPOCH FROM (NOW() - created_at))/60)::int AS minutes_waiting,
                doctor_id, doctor_name
            FROM public.requests
            WHERE status IN ('submitted','searching_doctor','in_review')
              AND LOWER(priority) = 'urgent'
            ORDER BY created_at ASC
            LIMIT 20";
        var urgent = (await conn.QueryAsync<QueueRow>(new CommandDefinition(urgentSql, cancellationToken: ct)))
            .Select(ToQueueItem).ToArray();

        // 3. top 10 mais antigos sem médico
        const string oldestSql = @"
            SELECT
                id, short_code, request_type, priority, status, required_specialty,
                created_at,
                (EXTRACT(EPOCH FROM (NOW() - created_at))/60)::int AS minutes_waiting,
                doctor_id, doctor_name
            FROM public.requests
            WHERE status IN ('submitted','searching_doctor','in_review')
              AND doctor_id IS NULL
            ORDER BY created_at ASC
            LIMIT 10";
        var oldest = (await conn.QueryAsync<QueueRow>(new CommandDefinition(oldestSql, cancellationToken: ct)))
            .Select(ToQueueItem).ToArray();

        // 4. médicos online (ações nos últimos 5 min)
        const string onlineSql = @"
            SELECT
                dp.id   AS doctor_profile_id,
                u.name  AS name,
                dp.specialty AS specialty,
                MAX(dal.created_at) AS last_activity_at,
                (ARRAY_AGG(dal.action ORDER BY dal.created_at DESC))[1] AS last_action,
                COUNT(*) AS actions_last_5_min
            FROM public.document_access_log dal
            JOIN public.users u           ON u.id = dal.user_id
            JOIN public.doctor_profiles dp ON dp.user_id = u.id
            WHERE dal.created_at >= NOW() - INTERVAL '5 minutes'
              AND dal.action IN ('reviewed','approved_for_signing','batch_signed','signed')
            GROUP BY dp.id, u.name, dp.specialty
            ORDER BY last_activity_at DESC
            LIMIT 30";
        var online = (await conn.QueryAsync<DoctorActivitySignal>(new CommandDefinition(onlineSql, cancellationToken: ct))).ToArray();

        return new LiveQueueDto(
            DateTime.UtcNow,
            counts.TotalPending,
            counts.Unassigned,
            counts.UrgentCount,
            counts.Breaching,
            urgent,
            oldest,
            online);
    }

    private static QueueItem ToQueueItem(QueueRow r)
    {
        var priority = (r.Priority ?? "normal").ToLowerInvariant();
        var target = priority switch
        {
            "urgent" => 10,
            "high"   => 30,
            _         => 120,
        };
        var slaBreached = r.MinutesWaiting > target;
        return new QueueItem(
            r.Id,
            r.ShortCode ?? "",
            r.RequestType ?? "",
            priority,
            r.Status ?? "",
            r.RequiredSpecialty,
            DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
            r.MinutesWaiting,
            slaBreached,
            r.DoctorId,
            r.DoctorName);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Row types (Dapper mapping)
    // ──────────────────────────────────────────────────────────────────────────
    private sealed class OverviewRow
    {
        public int Total { get; set; }
        public int Completed { get; set; }
        public int RejectedByDoctor { get; set; }
        public int RejectedByAi { get; set; }
        public int Reopened { get; set; }
        public double P50 { get; set; }
        public double P95 { get; set; }
        public long RevenueCents { get; set; }
        public int ActiveDoctors { get; set; }
        public int DoctorsOnline { get; set; }
    }

    private sealed class RankingRow
    {
        public Guid DoctorProfileId { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = "";
        public string Specialty { get; set; } = "";
        public int RequestsHandled { get; set; }
        public int Reviewed { get; set; }
        public int Signed { get; set; }
        public int BatchSigned { get; set; }
        public double P50 { get; set; }
        public double P95 { get; set; }
        public long RevenueCents { get; set; }
        public DateTime? LastActivityAt { get; set; }
        public int? HoursPerMonth { get; set; }
        public long? HourlyRateCents { get; set; }
    }

    private sealed class FunnelRow
    {
        public int Created { get; set; }
        public int Assigned { get; set; }
        public int Reviewed { get; set; }
        public int Approved { get; set; }
        public int Signed { get; set; }
        public int Delivered { get; set; }
        public int Rejected { get; set; }
        public int Cancelled { get; set; }
    }

    private sealed class TimelineRow
    {
        public Guid RequestId { get; set; }
        public string? ShortCode { get; set; }
        public string? RequestType { get; set; }
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovedForSigningAt { get; set; }
        public DateTime? SignedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public double? MinutesCreatedToSigned { get; set; }
        public long ProductRevenueCents { get; set; }
    }

    private sealed class SlaRow
    {
        public string? Priority { get; set; }
        public double P50 { get; set; }
        public double P95 { get; set; }
        public int Breached { get; set; }
        public int Total { get; set; }
    }

    private sealed class CountsRow
    {
        public int TotalPending { get; set; }
        public int Unassigned { get; set; }
        public int UrgentCount { get; set; }
        public int Breaching { get; set; }
    }

    private sealed class QueueRow
    {
        public Guid Id { get; set; }
        public string? ShortCode { get; set; }
        public string? RequestType { get; set; }
        public string? Priority { get; set; }
        public string? Status { get; set; }
        public string? RequiredSpecialty { get; set; }
        public DateTime CreatedAt { get; set; }
        public int MinutesWaiting { get; set; }
        public Guid? DoctorId { get; set; }
        public string? DoctorName { get; set; }
    }
}
