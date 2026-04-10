using Npgsql;

// Safety gate: este script fazia `DELETE FROM notifications` sem WHERE, sem
// confirmação e sem dry-run — rodar por engano em prod apagava todas as
// notificações pendentes de pacientes. Agora exige --apply explícito e faz
// dry-run por padrão mostrando o count.

var connStr = args.FirstOrDefault(a => !a.StartsWith("--"))
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? throw new InvalidOperationException(
        "Passe a connection string como argumento ou defina DATABASE_URL");

var apply = args.Contains("--apply");
var olderThanDays = args
    .FirstOrDefault(a => a.StartsWith("--older-than-days="))
    ?.Split('=', 2)[1];

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

string whereClause;
if (int.TryParse(olderThanDays, out var days) && days > 0)
{
    whereClause = $"WHERE created_at < now() - interval '{days} days'";
}
else
{
    whereClause = "";
    Console.WriteLine("⚠️  Nenhum filtro --older-than-days=N informado — alvo: TODAS as notificações.");
}

// Sempre roda COUNT antes — dry-run obrigatório para qualquer invocação.
await using (var countCmd = new NpgsqlCommand(
    $"SELECT COUNT(*) FROM public.notifications {whereClause}", conn))
{
    var count = (long)(await countCmd.ExecuteScalarAsync() ?? 0L);
    Console.WriteLine($"🔎 Seriam removidas: {count} notificações");

    if (!apply)
    {
        Console.WriteLine("ℹ️  Dry-run. Rode novamente com --apply para executar o DELETE.");
        return;
    }

    if (count == 0)
    {
        Console.WriteLine("✅ Nada a remover.");
        return;
    }
}

// Confirmação interativa adicional quando rodando sem filtro (destrutivo total).
if (string.IsNullOrEmpty(whereClause))
{
    Console.Write("❗ Você está prestes a apagar TODAS as notificações. Digite 'DELETE' para confirmar: ");
    var confirm = Console.ReadLine();
    if (confirm != "DELETE")
    {
        Console.WriteLine("❌ Abortado.");
        return;
    }
}

await using var cmd = new NpgsqlCommand(
    $"DELETE FROM public.notifications {whereClause}", conn);
var deleted = await cmd.ExecuteNonQueryAsync();

Console.WriteLine($"✅ Notificações removidas: {deleted}");
