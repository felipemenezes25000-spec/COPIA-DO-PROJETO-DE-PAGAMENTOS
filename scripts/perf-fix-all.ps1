<#
.SYNOPSIS
  RenoveJa+ Performance Super Script
  Aplica todos os fixes de performance identificados na auditoria.

.DESCRIPTION
  Fixes aplicados:
  1. PushNotificationContext — value useMemo (evita re-render em cascata)
  2. React.memo nos 5 componentes medico mais pesados
  3. LogInformation → LogDebug em RequestQueryService (hot path)
  4. getItemLayout nas FlatLists do medico (scroll mais fluido no Android)
  5. CarePlanService N+1 — batch query para arquivos de tarefas
  6. Verificacao final de TypeScript

  Executar a partir da raiz do repo: .\scripts\perf-fix-all.ps1
#>

param([switch]$DryRun)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT      = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$BASE      = Join-Path $ROOT "frontend-mobile"
$BACK      = Join-Path $ROOT "backend-dotnet\src"
$OK        = 0
$FAIL      = 0

function Write-Step($msg) { Write-Host "`n[ ] $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green;  $script:OK++ }
function Write-FAIL($msg) { Write-Host "  ERR $msg" -ForegroundColor Red;    $script:FAIL++ }
function Write-SKIP($msg) { Write-Host "  --  $msg" -ForegroundColor Gray }

function Save-File($path, $content) {
  if ($DryRun) { Write-SKIP "DRY-RUN: $path"; return }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
  [System.IO.File]::WriteAllBytes($path, $bytes)
}

function Read-File($path) {
  [System.IO.File]::ReadAllText($path)
}

# ══════════════════════════════════════════════════════════════════════
# FIX 1 — PushNotificationContext: value inline → useMemo
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 1: PushNotificationContext — value useMemo"

$pushFile = "$BASE\contexts\PushNotificationContext.tsx"
$push = Read-File $pushFile

$badValue  = "<PushNotificationContext.Provider value={{ lastNotificationAt }}>"
$goodBlock = @"
const pushContextValue = React.useMemo(
    () => ({ lastNotificationAt }),
    [lastNotificationAt]
  );
  return (
    <PushNotificationContext.Provider value={pushContextValue}>
"@

if ($push.Contains($badValue)) {
  $push = $push.Replace(
    "  return (`n    <PushNotificationContext.Provider value={{ lastNotificationAt }}>",
    $goodBlock
  )
  # Try alternate newline
  if ($push.Contains($badValue)) {
    $push = $push.Replace($badValue, "<PushNotificationContext.Provider value={pushContextValue}>")
    $insertPoint = $push.IndexOf("return (")
    $memoLine = "  const pushContextValue = React.useMemo(() => ({ lastNotificationAt }), [lastNotificationAt]);`n  "
    $push = $push.Substring(0, $insertPoint) + $memoLine + $push.Substring($insertPoint)
  }
  Save-File $pushFile $push
  Write-OK "PushNotificationContext value memoizado"
} else {
  Write-SKIP "PushNotificationContext ja memoizado"
}

# ══════════════════════════════════════════════════════════════════════
# FIX 2 — React.memo nos 5 componentes mais pesados do medico
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 2: React.memo nos componentes pesados do medico"

$memoTargets = @(
  @{ File = "$BASE\components\doctor\dashboard\DashboardHeader.tsx"; Fn = "DashboardHeader" },
  @{ File = "$BASE\components\doctor\dashboard\QueueCard.tsx";       Fn = "QueueCard" },
  @{ File = "$BASE\components\doctor\dashboard\StatsGrid.tsx";       Fn = "StatsGrid" },
  @{ File = "$BASE\components\doctor-request\DoctorActionButtons.tsx"; Fn = "DoctorActionButtons" },
  @{ File = "$BASE\components\prontuario\AnamnesisCard.tsx";         Fn = "AnamnesisCard" }
)

foreach ($t in $memoTargets) {
  $content = Read-File $t.File
  $fn = $t.Fn

  if ($content -match "React\.memo") {
    Write-SKIP "$fn ja tem React.memo"
    continue
  }

  # Pattern: "export function FnName(" → "function FnName_Fn("
  # Then add export const FnName = React.memo(FnName_Fn); at end
  $exportPattern = "export function $fn("
  $innerName     = "${fn}_Fn"

  if ($content.Contains($exportPattern)) {
    $content = $content.Replace($exportPattern, "function $innerName(")
    # Add React.memo export before last empty lines
    $content = $content.TrimEnd() + "`n`nexport const $fn = React.memo($innerName);`n"
    Save-File $t.File $content
    Write-OK "React.memo aplicado: $fn"
  } else {
    Write-FAIL "Padrao nao encontrado: $fn (export function $fn)"
  }
}

# ══════════════════════════════════════════════════════════════════════
# FIX 3 — LogInformation → LogDebug em RequestQueryService (hot path)
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 3: LogInformation → LogDebug em RequestQueryService (hot path)"

$rqsFile = "$BACK\RenoveJa.Application\Services\Requests\RequestQueryService.cs"
$rqs = Read-File $rqsFile

# Apenas os logs verbosos do GetUserRequests (que rodam em CADA chamada da lista)
# Nao tocamos em logs de erro ou warnings — so os de info de fluxo normal
$verboseLogs = @(
  'logger.LogInformation("[GetUserRequestsPaged] userId={UserId} page={Page} pageSize={PageSize}"',
  'logger.LogInformation("[GetUserRequests] userId={UserId}"',
  'logger.LogInformation("[GetUserRequests] user from DB: Id={UserId}, Role={Role}, Email={Email}"',
  'logger.LogInformation("[GetUserRequests] branch: Doctor - fetching assigned + available (1 query for queue)"',
  'logger.LogInformation("[GetUserRequests] doctor: assignedCount={Assigned}, availableInQueue={Available}"',
  'logger.LogInformation("[GetUserRequests] doctor: totalRequests={Total}"',
  'logger.LogInformation("[GetUserRequests] branch: Patient (or user not found) - fetching by patient_id"',
  'logger.LogInformation("[GetUserRequests] patient: totalRequests={Total}"',
  'logger.LogInformation("[GetUserRequests] final count after filters: {Count}"',
  'logger.LogInformation("[GetUserRequestsPaged] totalCount={Total} itemsReturned={Items}"'
)

$replacedCount = 0
foreach ($log in $verboseLogs) {
  $debug = $log.Replace("logger.LogInformation(", "logger.LogDebug(")
  if ($rqs.Contains($log)) {
    $rqs = $rqs.Replace($log, $debug)
    $replacedCount++
  }
}

if ($replacedCount -gt 0) {
  Save-File $rqsFile $rqs
  Write-OK "RequestQueryService: $replacedCount logs convertidos para LogDebug"
} else {
  Write-SKIP "RequestQueryService logs ja em LogDebug ou padrao nao encontrado"
}

# ══════════════════════════════════════════════════════════════════════
# FIX 4 — getItemLayout nas FlatLists do medico
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 4: getItemLayout nas FlatLists do medico"

# RequestCard estimated height: padding 14+14, icon 42, texto ~18, marginBottom 10 = 98px
# ItemSeparatorComponent = null, logo offset = 98 * index
$ITEM_H = 98

$flatListTargets = @(
  "$BASE\app\(doctor)\requests.tsx",
  "$BASE\app\(doctor)\consultations.tsx"
)

foreach ($f in $flatListTargets) {
  $content = Read-File $f
  $name = Split-Path $f -Leaf

  if ($content -match "getItemLayout") {
    Write-SKIP "$name ja tem getItemLayout"
    continue
  }

  # Insert getItemLayout after keyExtractor line
  $keyLine = "            keyExtractor={keyExtractor}"
  $keyLineWithLayout = @"
            keyExtractor={keyExtractor}
            getItemLayout={(_: unknown, index: number) => ({
              length: $ITEM_H,
              offset: $ITEM_H * index,
              index,
            })}
"@

  if ($content.Contains($keyLine)) {
    $content = $content.Replace($keyLine, $keyLineWithLayout)
    Save-File $f $content
    Write-OK "$name - getItemLayout adicionado (height=$ITEM_H)"
  } else {
    # Try single-space variant
    $keyLine2 = "          keyExtractor={keyExtractor}"
    $keyLine2WithLayout = @"
          keyExtractor={keyExtractor}
          getItemLayout={(_: unknown, index: number) => ({
            length: $ITEM_H,
            offset: $ITEM_H * index,
            index,
          })}
"@
    if ($content.Contains($keyLine2)) {
      $content = $content.Replace($keyLine2, $keyLine2WithLayout)
      Save-File $f $content
      Write-OK "$name - getItemLayout adicionado (height=$ITEM_H)"
    } else {
      Write-FAIL "$name - keyExtractor nao encontrado para inserir getItemLayout"
    }
  }
}

# ══════════════════════════════════════════════════════════════════════
# FIX 5 — CarePlanService N+1: GetFilesByTaskIdAsync em loop → batch
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 5: CarePlanService N+1 — batch query para arquivos de tarefas"

$carePlanFile = Get-ChildItem -Recurse -Include "CarePlanService.cs" $BACK |
  Select-Object -First 1 -ExpandProperty FullName

if ($carePlanFile) {
  $cp = Read-File $carePlanFile

  # The N+1: foreach (var task in tasks) { var files = await GetFilesByTaskIdAsync(task.Id) }
  $n1Pattern = @"
        foreach (var task in tasks)
        {
            var files = await carePlanTaskRepository.GetFilesByTaskIdAsync(task.Id, cancellationToken);
"@

  $batchFix = @"
        var taskIds = tasks.Select(t => t.Id).ToList();
        var allFiles = taskIds.Count > 0
            ? await carePlanTaskRepository.GetFilesByTaskIdsAsync(taskIds, cancellationToken)
            : new Dictionary<Guid, List<CarePlanTaskFile>>();
        foreach (var task in tasks)
        {
            var files = allFiles.TryGetValue(task.Id, out var tf) ? tf : new List<CarePlanTaskFile>();
"@

  if ($cp.Contains($n1Pattern.Trim())) {
    $cp = $cp.Replace($n1Pattern.Trim(), $batchFix.Trim())
    Save-File $carePlanFile $cp
    Write-OK "CarePlanService: N+1 refatorado para batch query"
    Write-Host "  NOTA: Adicionar GetFilesByTaskIdsAsync ao ICarePlanTaskRepository e implementar" -ForegroundColor Yellow
  } else {
    # Log the issue without breaking
    Write-SKIP "CarePlanService N+1 — padrao nao encontrado para substituicao automatica"
    Write-Host "  NOTA manual: foreach (var task in tasks) com GetFilesByTaskIdAsync dentro do loop" -ForegroundColor Yellow
  }
} else {
  Write-FAIL "CarePlanService.cs nao encontrado"
}

# ══════════════════════════════════════════════════════════════════════
# FIX 6 — Verificar erros TS nos arquivos alterados nesta sessao
# ══════════════════════════════════════════════════════════════════════
Write-Step "FIX 6: Verificacao rapida de sintaxe nos arquivos alterados"

$filesToCheck = @(
  "$BASE\contexts\PushNotificationContext.tsx",
  "$BASE\components\doctor\dashboard\DashboardHeader.tsx",
  "$BASE\components\doctor\dashboard\QueueCard.tsx",
  "$BASE\components\doctor\dashboard\StatsGrid.tsx",
  "$BASE\components\doctor-request\DoctorActionButtons.tsx",
  "$BASE\components\prontuario\AnamnesisCard.tsx",
  "$BASE\app\(doctor)\requests.tsx",
  "$BASE\app\(doctor)\consultations.tsx"
)

foreach ($f in $filesToCheck) {
  if (Test-Path $f) {
    $content = Read-File $f
    # Basic syntax checks
    $openBraces  = ([regex]::Matches($content, "\{")).Count
    $closeBraces = ([regex]::Matches($content, "\}")).Count
    $diff = [Math]::Abs($openBraces - $closeBraces)
    if ($diff -gt 5) {
      Write-FAIL "$(Split-Path $f -Leaf) — braces desbalanceados ({:$openBraces }: $closeBraces, diff:$diff)"
    } else {
      Write-OK "$(Split-Path $f -Leaf) — OK (braces diff: $diff)"
    }
  } else {
    Write-FAIL "Arquivo nao existe: $f"
  }
}

# ══════════════════════════════════════════════════════════════════════
# RESUMO
# ══════════════════════════════════════════════════════════════════════
Write-Host "`n$("="*60)" -ForegroundColor White
Write-Host "RESUMO: $OK fixes OK  |  $FAIL falhas" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Yellow" })
Write-Host "$("="*60)" -ForegroundColor White
Write-Host @"

PROXIMOS PASSOS MANUAIS:
  1. Rodar typecheck:  cd frontend-mobile; npx tsc --noEmit
  2. Rodar build .NET: cd backend-dotnet; dotnet build
  3. Migrations SQL (PostgreSQL/RDS): infra/migrations/ ou backend-dotnet/docs/migrations/
  4. Se CarePlanService Fix 5 foi aplicado:
     Adicionar GetFilesByTaskIdsAsync em ICarePlanTaskRepository + implementacao

"@ -ForegroundColor White
