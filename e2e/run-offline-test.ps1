# run-offline-test.ps1 — Orchestrates the offline / API-failure Maestro flow.
#
# Steps:
#   1. Enable WiFi and mobile data (clean slate)
#   2. Run the employee login flow so the app has a valid auth session
#   3. Disable WiFi and mobile data via adb
#   4. Run the 01_api_failures.yaml Maestro flow
#   5. Re-enable WiFi and mobile data regardless of test outcome
#
# Requirements:
#   - adb in PATH (Android Debug Bridge)
#   - maestro in PATH
#   - An Android emulator or device connected (adb devices shows it)
#   - EMPLOYEE_USER / EMPLOYEE_PASS set in e2e/.env

param(
  [string]$EnvFile = "$PSScriptRoot\.env"
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# ── 0. Verify prerequisites ───────────────────────────────────────────────────

Write-Step "Checking prerequisites"

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Write-Error "adb not found in PATH. Install Android platform-tools."
}

if (-not (Get-Command maestro -ErrorAction SilentlyContinue)) {
  Write-Error "maestro not found in PATH. Install from https://maestro.mobile.dev"
}

$deviceCount = (adb devices | Select-String -Pattern "device$").Count
if ($deviceCount -eq 0) {
  Write-Error "No Android device/emulator found. Run 'adb devices' to check."
}
Write-Ok "Found $deviceCount connected device(s)"

# ── 1. Ensure network is enabled (clean state) ────────────────────────────────

Write-Step "Enabling WiFi and mobile data"
adb shell svc wifi enable
adb shell svc data enable
Start-Sleep -Seconds 3
Write-Ok "Network enabled"

# ── 2. Login so the app has a valid auth session ──────────────────────────────

Write-Step "Running login flow (network on)"
maestro test "$PSScriptRoot\flows\03_login_employee.yaml" --env-file "$EnvFile"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Login flow failed — check that the emulator is running and the app is installed."
}
Write-Ok "Login flow passed — auth session stored in app"

# ── 3. Disable network ────────────────────────────────────────────────────────

Write-Step "Disabling WiFi and mobile data (simulating offline)"
adb shell svc wifi disable
adb shell svc data disable
Start-Sleep -Seconds 2
Write-Ok "Network disabled"

# ── 4. Run the offline API-failure flow ───────────────────────────────────────

Write-Step "Running 01_api_failures.yaml (network off)"
$testPassed = $true
try {
  maestro test "$PSScriptRoot\flows\01_api_failures.yaml" --env-file "$EnvFile"
  if ($LASTEXITCODE -ne 0) { $testPassed = $false }
} catch {
  $testPassed = $false
  Write-Warn "Flow threw an exception: $_"
}

# ── 5. Re-enable network (always, even on failure) ────────────────────────────

Write-Step "Re-enabling WiFi and mobile data"
adb shell svc wifi enable
adb shell svc data enable
Write-Ok "Network restored"

# ── Result ────────────────────────────────────────────────────────────────────

if ($testPassed) {
  Write-Host "`n[PASS] Offline flow completed successfully." -ForegroundColor Green
  exit 0
} else {
  Write-Host "`n[FAIL] Offline flow reported failures. Check Maestro output above." -ForegroundColor Red
  exit 1
}
