using RenoveJa.Infrastructure.Data.Supabase;
using RenoveJa.Infrastructure.Data.Npgsql;
using Microsoft.Extensions.Options;

namespace RenoveJa.Infrastructure.Data;

/// <summary>
/// Adapter that makes NpgsqlDataClient work as a SupabaseClient replacement.
/// All repositories receive SupabaseClient via DI — this class extends it
/// and delegates all calls to NpgsqlDataClient.
/// 
/// Usage in DI: services.AddScoped&lt;SupabaseClient, SupabaseToNpgsqlAdapter&gt;();
/// </summary>
public class SupabaseToNpgsqlAdapter : SupabaseClient
{
    private readonly NpgsqlDataClient _npgsql;

    /// <summary>
    /// The base SupabaseClient constructor requires HttpClient + IOptions&lt;SupabaseConfig&gt;.
    /// We pass a dummy HttpClient since we won't use HTTP at all.
    /// </summary>
    public SupabaseToNpgsqlAdapter(NpgsqlDataClient npgsql, IOptions<SupabaseConfig> supabaseConfig)
        : base(CreateDummyHttpClient(), supabaseConfig)
    {
        _npgsql = npgsql;
    }

    private static HttpClient CreateDummyHttpClient()
    {
        // This HttpClient will never be used — all calls go through NpgsqlDataClient
        return new HttpClient { BaseAddress = new Uri("http://localhost") };
    }

    // Override all public methods to delegate to NpgsqlDataClient

    public new async Task<List<T>> GetAllAsync<T>(
        string table, string? select = "*", string? filter = null,
        string? orderBy = null, int? limit = null, int? offset = null,
        CancellationToken cancellationToken = default)
        => await _npgsql.GetAllAsync<T>(table, select, filter, orderBy, limit, offset, cancellationToken);

    public new async Task<int> CountAsync(
        string table, string? filter = null, CancellationToken cancellationToken = default)
        => await _npgsql.CountAsync(table, filter, cancellationToken);

    public new async Task<T?> GetSingleAsync<T>(
        string table, string? select = "*", string? filter = null,
        CancellationToken cancellationToken = default)
        => await _npgsql.GetSingleAsync<T>(table, select, filter, cancellationToken);

    public new async Task<T> InsertAsync<T>(
        string table, object data, CancellationToken cancellationToken = default)
        => await _npgsql.InsertAsync<T>(table, data, cancellationToken);

    public new async Task<T> UpdateAsync<T>(
        string table, string filter, object data, CancellationToken cancellationToken = default)
        => await _npgsql.UpdateAsync<T>(table, filter, data, cancellationToken);

    public new async Task UpsertAsync(
        string table, object data, CancellationToken cancellationToken = default)
        => await _npgsql.UpsertAsync(table, data, cancellationToken);

    public new async Task DeleteAsync(
        string table, string filter, CancellationToken cancellationToken = default)
        => await _npgsql.DeleteAsync(table, filter, cancellationToken);
}
