using Dapper;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório da tabela <c>public.product_prices</c>.
/// Usa SQL direto via Dapper porque os updates precisam tocar o UUID <c>updated_by</c>
/// e timestamps (<c>updated_at = now()</c>) sem re-serializar o registro inteiro.
/// </summary>
public class ProductPriceRepository(PostgresClient db) : IProductPriceRepository
{
    private const string SelectColumns =
        "id, product_key, label, unit, price_cents, currency, active, notes, created_at, updated_at";

    public async Task<List<ProductPriceDto>> GetAllActiveAsync(CancellationToken ct = default)
    {
        const string sql = $"SELECT {SelectColumns} FROM public.product_prices WHERE active = true ORDER BY product_key";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<PriceRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.Select(Map).ToList();
    }

    public async Task<List<ProductPriceDto>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = $"SELECT {SelectColumns} FROM public.product_prices ORDER BY active DESC, product_key";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.QueryAsync<PriceRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.Select(Map).ToList();
    }

    public async Task<ProductPriceDto?> GetByKeyAsync(string productKey, CancellationToken ct = default)
    {
        const string sql = $"SELECT {SelectColumns} FROM public.product_prices WHERE product_key = @key LIMIT 1";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync<PriceRow>(
            new CommandDefinition(sql, new { key = productKey }, cancellationToken: ct));
        return row is null ? null : Map(row);
    }

    public async Task<ProductPriceDto> UpsertAsync(
        string productKey, UpsertProductPriceDto dto, Guid? updatedBy, CancellationToken ct = default)
    {
        // Só altera as linhas existentes — não cria novas product_keys aqui. Novos produtos
        // customizados passam pelo CreateCustomAsync para preservar a lista de seeds canônicos.
        const string sql = $@"
            UPDATE public.product_prices
               SET label       = @label,
                   unit        = @unit,
                   price_cents = @priceCents,
                   currency    = COALESCE(@currency, currency),
                   notes       = @notes,
                   active      = true,
                   updated_at  = now(),
                   updated_by  = @updatedBy
             WHERE product_key = @productKey
             RETURNING {SelectColumns}";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync<PriceRow>(new CommandDefinition(sql, new
        {
            productKey,
            label = dto.Label,
            unit = dto.Unit,
            priceCents = dto.PriceCents,
            currency = dto.Currency,
            notes = dto.Notes,
            updatedBy
        }, cancellationToken: ct))
            ?? throw new InvalidOperationException($"product_key '{productKey}' não encontrado.");
        return Map(row);
    }

    public async Task<ProductPriceDto> CreateCustomAsync(
        CreateCustomProductDto dto, Guid? updatedBy, CancellationToken ct = default)
    {
        const string sql = $@"
            INSERT INTO public.product_prices
                (product_key, label, unit, price_cents, currency, active, notes, updated_by)
            VALUES
                (@productKey, @label, @unit, @priceCents, COALESCE(@currency, 'BRL'), true, @notes, @updatedBy)
            ON CONFLICT (product_key) DO UPDATE
                SET label       = EXCLUDED.label,
                    unit        = EXCLUDED.unit,
                    price_cents = EXCLUDED.price_cents,
                    currency    = EXCLUDED.currency,
                    notes       = EXCLUDED.notes,
                    active      = true,
                    updated_at  = now(),
                    updated_by  = EXCLUDED.updated_by
            RETURNING {SelectColumns}";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var row = await conn.QueryFirstOrDefaultAsync<PriceRow>(new CommandDefinition(sql, new
        {
            productKey = dto.ProductKey,
            label = dto.Label,
            unit = dto.Unit,
            priceCents = dto.PriceCents,
            currency = dto.Currency,
            notes = dto.Notes,
            updatedBy
        }, cancellationToken: ct))
            ?? throw new InvalidOperationException("Falha ao inserir product_price customizado.");
        return Map(row);
    }

    public async Task<bool> DeactivateAsync(string productKey, Guid? updatedBy, CancellationToken ct = default)
    {
        const string sql = @"
            UPDATE public.product_prices
               SET active     = false,
                   updated_at = now(),
                   updated_by = @updatedBy
             WHERE product_key = @productKey AND active = true";
        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(ct);
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { productKey, updatedBy }, cancellationToken: ct));
        return rows > 0;
    }

    private static ProductPriceDto Map(PriceRow r) => new(
        r.Id, r.ProductKey, r.Label, r.Unit, r.PriceCents, r.Currency,
        r.Active, r.Notes, r.CreatedAt, r.UpdatedAt);

    // Dapper mapeia colunas snake_case → propriedades PascalCase via DefaultTypeMap.MatchNamesWithUnderscores (setado em PostgresClient).
    private sealed class PriceRow
    {
        public Guid Id { get; set; }
        public string ProductKey { get; set; } = "";
        public string Label { get; set; } = "";
        public string Unit { get; set; } = "unit";
        public long PriceCents { get; set; }
        public string Currency { get; set; } = "BRL";
        public bool Active { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
