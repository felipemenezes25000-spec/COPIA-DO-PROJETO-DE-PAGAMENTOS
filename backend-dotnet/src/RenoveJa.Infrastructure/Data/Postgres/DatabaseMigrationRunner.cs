using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Data.Supabase;

// O SupabaseMigrationRunner.cs original continua funcionando.
// Esta classe fornece compatibilidade com o novo DatabaseConfig.
// A RunAsync no original lê de SupabaseConfig.DatabaseUrl.
// Para usar o novo config, registre DatabaseConfig no DI e
// o SupabaseConfig.DatabaseUrl será populado a partir dele.
