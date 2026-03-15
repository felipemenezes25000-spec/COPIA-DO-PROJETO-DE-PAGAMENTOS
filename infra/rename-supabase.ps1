# Renaming completo: Supabase -> Postgres em todos os repositórios
# Este script faz replace em todos os arquivos .cs do backend

$basePath = "C:\Users\renat\source\repos\ola-jamal\backend-dotnet"
$count = 0

# Encontrar todos os .cs files
$files = Get-ChildItem -Path $basePath -Recurse -Include "*.cs" -ErrorAction SilentlyContinue

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (!$content) { continue }
    
    $original = $content
    
    # Skip os proprios arquivos SupabaseClient.cs, SupabaseConfig.cs, SupabaseMigrationRunner.cs, SupabaseStorageService.cs
    # Esses precisam de tratamento especial
    $fileName = $file.Name
    if ($fileName -eq "SupabaseClient.cs" -and $file.Directory.Name -eq "Supabase") { continue }
    if ($fileName -eq "SupabaseConfig.cs") { continue }
    if ($fileName -eq "SupabaseMigrationRunner.cs") { continue }
    if ($fileName -eq "SupabaseStorageService.cs") { continue }
    if ($fileName -eq "SupabaseClient.ORIGINAL.cs.bak") { continue }
    if ($fileName -eq "SupabaseToNpgsqlAdapter.cs") { continue }
    if ($fileName -eq "PostgresClient.cs") { continue }
    if ($fileName -eq "DatabaseConfig.cs") { continue }
    if ($fileName -eq "PostgRestFilterParser.cs") { continue }
    
    # Replace using statements
    $content = $content -replace 'using RenoveJa\.Infrastructure\.Data\.Supabase;', 'using RenoveJa.Infrastructure.Data.Postgres;'
    
    # Replace class references in constructor injection
    $content = $content -replace 'SupabaseClient supabase\)', 'PostgresClient db)'
    $content = $content -replace 'SupabaseClient supabase,', 'PostgresClient db,'
    $content = $content -replace 'SupabaseClient supabaseClient,', 'PostgresClient db,'
    $content = $content -replace 'SupabaseClient supabaseClient\)', 'PostgresClient db)'
    
    # Replace variable usage (supabase. -> db.)
    $content = $content -replace '(?<![A-Za-z])supabase\.', 'db.'
    $content = $content -replace '(?<![A-Za-z])supabaseClient\.', 'db.'
    
    # Replace in comments
    $content = $content -replace 'SupabaseClient', 'PostgresClient'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $count++
        Write-Host "  Updated: $($file.FullName.Replace($basePath, ''))" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== $count files updated ===" -ForegroundColor Cyan
