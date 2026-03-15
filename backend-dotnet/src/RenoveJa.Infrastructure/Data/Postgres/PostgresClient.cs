using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using Microsoft.Extensions.Options;
using Npgsql;
using RenoveJa.Infrastructure.Data.Npgsql;

namespace RenoveJa.Infrastructure.Data.Postgres;

/// <summary>
/// Cliente de acesso a dados PostgreSQL via Npgsql/Dapper.
/// Conecta diretamente ao RDS PostgreSQL na AWS.
/// </summary>
public class PostgresClient
{
    private readonly string _connectionString;
    private readonly JsonSerializerOptions _jsonOptions;

    public PostgresClient(IOptions<DatabaseConfig> config)
    {
        _connectionString = config.Value.ConnectionString ?? "";
        if (string.IsNullOrWhiteSpace(_connectionString))
            _connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") ?? "";
        if (string.IsNullOrWhiteSpace(_connectionString))
            throw new InvalidOperationException("Database connection string not configured. Set DatabaseConfig:ConnectionString or ConnectionStrings__DefaultConnection.");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            WriteIndented = false,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    private NpgsqlConnection CreateConnection() => new(_connectionString);

    public async Task<List<T>> GetAllAsync<T>(
        string table, string? select = "*", string? filter = null,
        string? orderBy = null, int? limit = null, int? offset = null,
        CancellationToken cancellationToken = default)
    {
        var (whereClause, parameters) = PostgRestFilterParser.Parse(filter);
        var orderSql = PostgRestFilterParser.ParseOrderBy(orderBy);
        var columns = ParseSelect(select);
        var sql = $"SELECT {columns} FROM public.{SanitizeTable(table)}{whereClause}{orderSql}";
        if (limit.HasValue && limit.Value > 0) sql += $" LIMIT {limit.Value}";
        if (offset.HasValue && offset.Value > 0) sql += $" OFFSET {offset.Value}";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        return (await conn.QueryAsync<T>(new CommandDefinition(sql, new DynamicParameters(parameters), cancellationToken: cancellationToken))).AsList();
    }

    public async Task<int> CountAsync(string table, string? filter = null, CancellationToken cancellationToken = default)
    {
        var (whereClause, parameters) = PostgRestFilterParser.Parse(filter);
        var sql = $"SELECT COUNT(*) FROM public.{SanitizeTable(table)}{whereClause}";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, new DynamicParameters(parameters), cancellationToken: cancellationToken));
    }

    public async Task<T?> GetSingleAsync<T>(string table, string? select = "*", string? filter = null, CancellationToken cancellationToken = default)
    {
        var (whereClause, parameters) = PostgRestFilterParser.Parse(filter);
        var sql = $"SELECT {ParseSelect(select)} FROM public.{SanitizeTable(table)}{whereClause} LIMIT 1";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        return await conn.QueryFirstOrDefaultAsync<T>(new CommandDefinition(sql, new DynamicParameters(parameters), cancellationToken: cancellationToken));
    }

    public async Task<T> InsertAsync<T>(string table, object data, CancellationToken cancellationToken = default)
    {
        var tableName = SanitizeTable(table);
        var (columns, paramNames, paramDict) = BuildInsertParams(data);
        var sql = $"INSERT INTO public.{tableName} ({columns}) VALUES ({paramNames}) RETURNING *";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        var result = await conn.QueryFirstOrDefaultAsync<T>(new CommandDefinition(sql, new DynamicParameters(paramDict), cancellationToken: cancellationToken));
        return result ?? throw new InvalidOperationException($"Insert failed: no data returned. Table: {tableName}");
    }

    public async Task<T> UpdateAsync<T>(string table, string filter, object data, CancellationToken cancellationToken = default)
    {
        var tableName = SanitizeTable(table);
        var (setClauses, setParams) = BuildUpdateParams(data);
        var (whereClause, whereParams) = PostgRestFilterParser.Parse(filter, setParams.Count);
        foreach (var kv in whereParams) setParams[kv.Key] = kv.Value;
        var sql = $"UPDATE public.{tableName} SET {setClauses}{whereClause} RETURNING *";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        return (await conn.QueryFirstOrDefaultAsync<T>(new CommandDefinition(sql, new DynamicParameters(setParams), cancellationToken: cancellationToken)))!;
    }

    public async Task UpsertAsync(string table, object data, CancellationToken cancellationToken = default)
    {
        var tableName = SanitizeTable(table);
        var (columns, paramNames, paramDict) = BuildInsertParams(data);
        var updateClauses = string.Join(", ", columns.Split(", ").Where(c => c != "id").Select(c => $"{c} = EXCLUDED.{c}"));
        var sql = string.IsNullOrEmpty(updateClauses)
            ? $"INSERT INTO public.{tableName} ({columns}) VALUES ({paramNames}) ON CONFLICT (id) DO NOTHING"
            : $"INSERT INTO public.{tableName} ({columns}) VALUES ({paramNames}) ON CONFLICT (id) DO UPDATE SET {updateClauses}";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await conn.ExecuteAsync(new CommandDefinition(sql, new DynamicParameters(paramDict), cancellationToken: cancellationToken));
    }

    public async Task DeleteAsync(string table, string filter, CancellationToken cancellationToken = default)
    {
        var (whereClause, parameters) = PostgRestFilterParser.Parse(filter);
        var sql = $"DELETE FROM public.{SanitizeTable(table)}{whereClause}";
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await conn.ExecuteAsync(new CommandDefinition(sql, new DynamicParameters(parameters), cancellationToken: cancellationToken));
    }

    private static string SanitizeTable(string table) => new(table.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
    private static string ParseSelect(string? select) => string.IsNullOrWhiteSpace(select) || select == "*" ? "*" : select.Contains('(') ? "*" : select;

    private (string columns, string paramNames, Dictionary<string, object?> parameters) BuildInsertParams(object data)
    {
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, _jsonOptions) ?? new();
        var cols = new List<string>(); var pnames = new List<string>(); var parameters = new Dictionary<string, object?>(); var i = 0;
        foreach (var kv in dict) { cols.Add(kv.Key); pnames.Add($"@ins{i}"); parameters[$"ins{i}"] = ConvertValue(kv.Value); i++; }
        return (string.Join(", ", cols), string.Join(", ", pnames), parameters);
    }

    private (string setClauses, Dictionary<string, object?> parameters) BuildUpdateParams(object data)
    {
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, _jsonOptions) ?? new();
        var clauses = new List<string>(); var parameters = new Dictionary<string, object?>(); var i = 0;
        foreach (var kv in dict) { if (kv.Key.Equals("id", StringComparison.OrdinalIgnoreCase)) continue; clauses.Add($"{kv.Key} = @set{i}"); parameters[$"set{i}"] = ConvertValue(kv.Value); i++; }
        return (string.Join(", ", clauses), parameters);
    }

    private static object? ConvertValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Null => null,
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Number => element.TryGetInt32(out var i32) ? i32 : element.TryGetInt64(out var i64) ? i64 : element.TryGetDecimal(out var dec) ? dec : element.GetDouble(),
        JsonValueKind.String => ParseStringValue(element.GetString()),
        JsonValueKind.Array or JsonValueKind.Object => element.GetRawText(),
        _ => element.GetRawText()
    };

    private static object? ParseStringValue(string? str)
    {
        if (str == null) return null;
        if (Guid.TryParse(str, out var guid)) return guid;
        if (DateTime.TryParse(str, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)) return dt;
        return str;
    }
}
