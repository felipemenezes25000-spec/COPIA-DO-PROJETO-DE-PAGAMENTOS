namespace RenoveJa.Infrastructure.Data.Supabase;

/// <summary>
/// Configuração de conexão com o banco de dados PostgreSQL.
/// Mantém o nome "SupabaseConfig" para compatibilidade com DI existente.
/// </summary>
public class SupabaseConfig
{
    /// <summary>
    /// URL base do Supabase (legado — mantido para SupabaseStorageService em dev local).
    /// Em produção, não é necessário.
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Chave de serviço (legado — mantido para SupabaseStorageService em dev local).
    /// Em produção, não é necessário.
    /// </summary>
    public string ServiceKey { get; set; } = string.Empty;

    /// <summary>
    /// Connection string do PostgreSQL (RDS ou local).
    /// Este é o campo principal — usado pelo SupabaseClient (Npgsql/Dapper).
    /// </summary>
    public string? DatabaseUrl { get; set; }
}
