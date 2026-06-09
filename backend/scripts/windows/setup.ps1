# =============================================================================
# setup.ps1 -- One-time environment setup (Windows / PowerShell)
#
# Usage:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # only first time
#   .\scripts\windows\setup.ps1
#
# What it does:
#   1. Checks Python 3.9+
#   2. Creates the virtualenv and installs dependencies
#   3. Copies .env.example to .env if .env does not exist
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Always run from backend/ (2 levels up from this script)
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

$VenvDir      = ".venv"
$Requirements = "requirements.txt"
$HashFile     = ".requirements.hash"
$EnvFile      = ".env"
$EnvExample   = ".env.example"

function Write-Info { param($msg) Write-Host "[suportum:setup]" -ForegroundColor Green -NoNewline; Write-Host " $msg" }
function Write-Warn { param($msg) Write-Host "[suportum:setup]" -ForegroundColor Yellow -NoNewline; Write-Host " $msg" }
function Write-Err  { param($msg) Write-Host "[suportum:setup] $msg" -ForegroundColor Red; exit 1 }

# -- Check Python 3.9+ --------------------------------------------------------
Write-Info "Checking Python 3.9+..."

$pythonCmd = $null
foreach ($cmd in @("python3.9", "python3", "python")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $version = & $cmd --version 2>&1
        if ($version -match "Python 3\.([9]|[1-9]\d+)") {
            $pythonCmd = $cmd
            break
        }
    }
}

if (-not $pythonCmd) {
    Write-Err "Python 3.9+ not found. Download it at https://www.python.org/downloads/"
}
Write-Info "Using: $pythonCmd ($( & $pythonCmd --version))"

# -- Create virtualenv --------------------------------------------------------
if (Test-Path $VenvDir) {
    Write-Warn "Virtualenv '$VenvDir' already exists. Skipping creation."
} else {
    Write-Info "Creating virtualenv in $VenvDir..."
    & $pythonCmd -m venv $VenvDir
    Write-Info "Virtualenv created."
}

# -- Activate virtualenv ------------------------------------------------------
$activateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
if (-not (Test-Path $activateScript)) {
    Write-Err "Activation script not found: $activateScript"
}
& $activateScript

# -- Install dependencies -----------------------------------------------------
Write-Info "Upgrading pip..."
python -m pip install --upgrade pip --quiet

Write-Info "Installing dependencies from $Requirements..."
pip install -r $Requirements

$hash = (Get-FileHash $Requirements -Algorithm SHA256).Hash
$hash | Set-Content $HashFile
Write-Info "Requirements hash saved to $HashFile"

# -- Configure .env -----------------------------------------------------------
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Warn ".env created from .env.example -- update the values before starting."
    } else {
        Write-Warn "$EnvExample not found. Create .env manually."
    }
} else {
    Write-Info ".env already exists. Not overwritten."
}

# -- Done ---------------------------------------------------------------------
Write-Info "Setup complete. Next steps:"
Write-Host ""
Write-Host "  1. Edit .env with your real values"
Write-Host "  2. Start the local dev server:"
Write-Host "     .venv\Scripts\uvicorn.exe app.main:socket_app --reload --port 8001"
Write-Host "  3. For future updates: .\scripts\windows\deploy.ps1"
Write-Host ""
