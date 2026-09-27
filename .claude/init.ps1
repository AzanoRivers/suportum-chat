# Harness Init - Suportum
# Verifica el estado del harness antes de comenzar una sesion

$base = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== Suportum Harness Status ===" -ForegroundColor Cyan

# 1. Verificar feature_list.json
$featureListPath = Join-Path $PSScriptRoot "feature_list.json"
if (-not (Test-Path $featureListPath)) {
    Write-Host "[ERROR] .claude/feature_list.json no encontrado" -ForegroundColor Red
    exit 1
}

$data = Get-Content $featureListPath -Raw | ConvertFrom-Json

# El schema real es { backend_features: [...], frontend_features: [...] }, no un array plano "features".
$allFeatures = @()
if ($data.backend_features) { $allFeatures += $data.backend_features }
if ($data.frontend_features) { $allFeatures += $data.frontend_features }

if ($allFeatures.Count -eq 0) {
    Write-Host "[ERROR] feature_list.json no tiene backend_features ni frontend_features" -ForegroundColor Red
    exit 1
}

# 2. Detectar features in_progress (across ambos arrays)
$inProgress = @($allFeatures | Where-Object { $_.status -eq "in_progress" })
if ($inProgress.Count -gt 1) {
    Write-Host "[ERROR] Multiples features en in_progress, resolver antes de continuar:" -ForegroundColor Red
    $inProgress | ForEach-Object { Write-Host "  - $($_.id): $($_.name)" -ForegroundColor Yellow }
    exit 1
}

# 3. Mostrar estado de features (backend y frontend por separado)
Write-Host "`nBackend:" -ForegroundColor White
$data.backend_features | ForEach-Object {
    $color = switch ($_.status) {
        "done"        { "Green" }
        "in_progress" { "Yellow" }
        "planned"     { "Gray" }
        "pending"     { "Gray" }
        default       { "White" }
    }
    $icon = switch ($_.status) {
        "done"        { "[x]" }
        "in_progress" { "[>]" }
        "planned"     { "[ ]" }
        "pending"     { "[ ]" }
        default       { "[?]" }
    }
    Write-Host "  $icon $($_.id): $($_.name)" -ForegroundColor $color
}

Write-Host "`nFrontend:" -ForegroundColor White
$data.frontend_features | ForEach-Object {
    $color = switch ($_.status) {
        "done"        { "Green" }
        "in_progress" { "Yellow" }
        "planned"     { "Gray" }
        "pending"     { "Gray" }
        default       { "White" }
    }
    $icon = switch ($_.status) {
        "done"        { "[x]" }
        "in_progress" { "[>]" }
        "planned"     { "[ ]" }
        "pending"     { "[ ]" }
        default       { "[?]" }
    }
    Write-Host "  $icon $($_.id): $($_.name)" -ForegroundColor $color
}

# 4. Identificar proxima feature pending/planned (dependencias resueltas)
$doneIds = @($allFeatures | Where-Object { $_.status -eq "done" }).id
$nextCandidates = $allFeatures | Where-Object {
    ($_.status -eq "pending" -or $_.status -eq "planned") -and
    (
        (-not $_.depends_on) -or
        (@($_.depends_on | Where-Object { $_ -notin $doneIds }).Count -eq 0)
    )
}

if ($inProgress.Count -eq 1) {
    Write-Host "`nFeature activa: $($inProgress[0].id): $($inProgress[0].name)" -ForegroundColor Yellow
    Write-Host "  Spec: $($inProgress[0].file)" -ForegroundColor DarkGray
} elseif ($nextCandidates.Count -gt 0) {
    Write-Host "`nFeatures disponibles para arrancar (dependencias resueltas):" -ForegroundColor Cyan
    $nextCandidates | ForEach-Object {
        Write-Host "  $($_.id): $($_.name)" -ForegroundColor White
        Write-Host "    Spec: $($_.file)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n[OK] Todas las features registradas estan en done." -ForegroundColor Green
}

# Verificar archivos de agentes
Write-Host "`nAgentes:" -ForegroundColor White
@("orchestrer.md", "implementer.md", "reviewer.md", "reviewer-light.md", "team-uiux.md", "team-logic.md") | ForEach-Object {
    $path = Join-Path $PSScriptRoot "agents\$_"
    if (Test-Path $path) {
        Write-Host "  [x] .claude/agents/$_" -ForegroundColor Green
    } else {
        Write-Host "  [ ] .claude/agents/$_ FALTA" -ForegroundColor Red
    }
}

# Verificar directorio de skills (estructura correcta: <nombre>/SKILL.md)
Write-Host "`nSkills (agentskills.io):" -ForegroundColor White
$skillsPath = Join-Path $PSScriptRoot "skills"
$skillDirs = Get-ChildItem $skillsPath -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }
$skillCount = $skillDirs.Count

if ($skillCount -gt 0) {
    Write-Host "  $skillCount skill(s) disponible(s):" -ForegroundColor Green
    $skillDirs | ForEach-Object { Write-Host "    x $($_.Name)" -ForegroundColor DarkGray }
} else {
    Write-Host "  [!] Sin skills. Estructura: .claude/skills/<nombre>/SKILL.md" -ForegroundColor Yellow
    Write-Host "  [TIP] Ver https://agentskills.io o .claude/skills/README.md" -ForegroundColor DarkGray
}

Write-Host "`n=== Harness OK, listo para iniciar sesion ===`n" -ForegroundColor Cyan
