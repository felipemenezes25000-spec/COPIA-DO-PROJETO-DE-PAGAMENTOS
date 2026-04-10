using System.Data;
using Dapper;
using NpgsqlTypes;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório da tabela <c>public.doctor_contracts</c>. Um médico tem no
/// máximo um contrato ativo por vez; o upsert desativa o contrato ativo
/// anterior e cria outro. O campo <c>availability_window</c> é JSONB bruto
/// (formato definido no frontend) e tratado como texto na camada .NET —
/// o Postgres valida a estrutura.
/// </summary>
public class DoctorContractRepository(PostgresClient db) : IDoctorContractRepository
{
    private const string SelectColumns = @"
        c.id, c.doctor_profile_id, c.hours_per_month, c.hourly_rate_cents,
        c.currency, c.availability_window::text AS availability_window_json,
        c.starts_at, c.ends_at, c.active, c.notes, c.created_at, c.updated_at,
        u.name AS doctor_name";

    private const string SelectJoin = @"
        FROM public.doctor_contracts c
        LEFT JOIN public.doctor_profiles dp ON dp.id = c.doctor_profile_id
        LEFT JOIN public.users u           ON u.id  = dp.user_id";

    public async Task<DoctorContractDto?> GetActiveByDoctorAsync(Guid doctorProfileId, CancellationToken ct = default)
    {
        var sql = $@"SELECT {SelectColumns}
                     {SelectJoin}
                     WHERE c.doctor_profile_id = @id AND c.active = true
                     ORDER BY c.created_at DESC
                     LIMIT 1";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync<ContractRow>(
            new CommandDefinition(sql, new { id = doctorProfileId }, cancellationToken: ct));
        return row is null ? null : Map(row);
    }

    public async Task<List<DoctorContractDto>> GetAllActiveAsync(CancellationToken ct = default)
    {
        var sql = $@"SELECT {SelectColumns}
                     {SelectJoin}
                     WHERE c.active = true
                     ORDER BY u.name NULLS LAST";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<ContractRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.Select(Map).ToList();
    }

    public async Task<DoctorContractDto> UpsertAsync(
        Guid doctorProfileId, UpsertDoctorContractDto dto, Guid? updatedBy, CancellationToken ct = default)
    {
        // Estratégia: desativa contratos anteriores e insere um novo. Mantém
        // histórico completo na tabela (quem quiser ver contratos antigos
        // consulta active = false). Simples e evita race entre UPDATE + INSERT.
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        try
        {
            await conn.ExecuteAsync(new CommandDefinition(
                @"UPDATE public.doctor_contracts
                     SET active = false, updated_at = now(), updated_by = @updatedBy
                   WHERE doctor_profile_id = @id AND active = true",
                new { id = doctorProfileId, updatedBy },
                transaction: tx, cancellationToken: ct));

            // Availability window entra como jsonb via parâmetro tipado; NULL se string vazia.
            var windowParam = new DynamicParameters();
            windowParam.Add("id", doctorProfileId);
            windowParam.Add("hoursPerMonth", dto.HoursPerMonth);
            windowParam.Add("hourlyRateCents", dto.HourlyRateCents);
            windowParam.Add("currency", string.IsNullOrWhiteSpace(dto.Currency) ? "BRL" : dto.Currency);
            windowParam.Add("window", string.IsNullOrWhiteSpace(dto.AvailabilityWindowJson)
                ? (object?)DBNull.Value
                : dto.AvailabilityWindowJson, DbType.String);
            windowParam.Add("startsAt", dto.StartsAt.Date);
            windowParam.Add("endsAt", dto.EndsAt?.Date);
            windowParam.Add("notes", dto.Notes);
            windowParam.Add("updatedBy", updatedBy);

            var row = await conn.QueryFirstOrDefaultAsync<ContractRow>(new CommandDefinition($@"
                WITH inserted AS (
                    INSERT INTO public.doctor_contracts
                        (doctor_profile_id, hours_per_month, hourly_rate_cents, currency,
                         availability_window, starts_at, ends_at, active, notes, created_by, updated_by)
                    VALUES
                        (@id, @hoursPerMonth, @hourlyRateCents, @currency,
                         CASE WHEN @window IS NULL THEN NULL::jsonb ELSE @window::jsonb END,
                         @startsAt, @endsAt, true, @notes, @updatedBy, @updatedBy)
                    RETURNING id, doctor_profile_id, hours_per_month, hourly_rate_cents,
                              currency, availability_window::text AS availability_window_json,
                              starts_at, ends_at, active, notes, created_at, updated_at
                )
                SELECT i.*, u.name AS doctor_name
                  FROM inserted i
                  LEFT JOIN public.doctor_profiles dp ON dp.id = i.doctor_profile_id
                  LEFT JOIN public.users u            ON u.id  = dp.user_id",
                windowParam, transaction: tx, cancellationToken: ct));

            if (row is null)
                throw new InvalidOperationException("Falha ao inserir doctor_contract.");

            await tx.CommitAsync(ct);
            return Map(row);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<bool> DeactivateAsync(Guid doctorProfileId, Guid? updatedBy, CancellationToken ct = default)
    {
        const string sql = @"
            UPDATE public.doctor_contracts
               SET active = false, updated_at = now(), updated_by = @updatedBy
             WHERE doctor_profile_id = @id AND active = true";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { id = doctorProfileId, updatedBy }, cancellationToken: ct));
        return rows > 0;
    }

    private static DoctorContractDto Map(ContractRow r) => new(
        r.Id,
        r.DoctorProfileId,
        r.DoctorName,
        r.HoursPerMonth,
        r.HourlyRateCents,
        r.Currency,
        r.AvailabilityWindowJson,
        DateTime.SpecifyKind(r.StartsAt, DateTimeKind.Utc),
        r.EndsAt.HasValue ? DateTime.SpecifyKind(r.EndsAt.Value, DateTimeKind.Utc) : null,
        r.Active,
        r.Notes,
        r.CreatedAt,
        r.UpdatedAt);

    private sealed class ContractRow
    {
        public Guid Id { get; set; }
        public Guid DoctorProfileId { get; set; }
        public int HoursPerMonth { get; set; }
        public long HourlyRateCents { get; set; }
        public string Currency { get; set; } = "BRL";
        public string? AvailabilityWindowJson { get; set; }
        public DateTime StartsAt { get; set; }
        public DateTime? EndsAt { get; set; }
        public bool Active { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? DoctorName { get; set; }
    }
}
