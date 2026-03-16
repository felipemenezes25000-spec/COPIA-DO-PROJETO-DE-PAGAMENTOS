using Npgsql;

var connStr = args.Length > 0
    ? args[0]
    : Environment.GetEnvironmentVariable("DATABASE_URL")
      ?? throw new InvalidOperationException("Passe a connection string como argumento ou defina DATABASE_URL");

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

await using var cmd = new NpgsqlCommand("DELETE FROM public.notifications", conn);
var deleted = await cmd.ExecuteNonQueryAsync();

Console.WriteLine($"Notificações removidas: {deleted}");
