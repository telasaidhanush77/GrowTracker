# GrowTracker E2E — Create test manager account
#
# Prerequisites:
#   1. Go to Supabase Dashboard → Project Settings → API
#   2. Copy the "service_role" key (NOT the anon key)
#   3. Run: .\e2e\setup-manager-account.ps1 -ServiceRoleKey "eyJ..."
#
# This script:
#   - Creates auth user e2e.manager@growtracker.test with TestPass123!
#   - Updates the auto-created employee profile to role='manager'

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey,
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    [string]$ManagerEmail = "e2e.manager@growtracker.test",
    [string]$ManagerPassword = "TestPass123!"
)

$headers = @{
    "apikey"        = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type"  = "application/json"
}

Write-Host "Creating auth user $ManagerEmail ..."

$body = @{
    email         = $ManagerEmail
    password      = $ManagerPassword
    email_confirm = $true
} | ConvertTo-Json

try {
    $user = Invoke-RestMethod -Method Post `
        -Uri "$SupabaseUrl/auth/v1/admin/users" `
        -Headers $headers `
        -Body $body
    Write-Host "Auth user created: $($user.id)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        # User already exists — look it up
        Write-Host "User already exists. Looking up ID..."
        $existing = Invoke-RestMethod -Method Get `
            -Uri "$SupabaseUrl/rest/v1/profiles?email=eq.$ManagerEmail&select=id,role" `
            -Headers $headers
        if ($existing.Count -eq 0) {
            Write-Error "Could not find existing user. Check the email and try again."
            exit 1
        }
        $user = @{ id = $existing[0].id }
        Write-Host "Found existing user: $($user.id) (role: $($existing[0].role))"
    } else {
        Write-Error "Failed to create user: $_"
        exit 1
    }
}

Write-Host "Updating profile role to 'manager' ..."

$patchBody = @{ role = "manager" } | ConvertTo-Json

Invoke-RestMethod -Method Patch `
    -Uri "$SupabaseUrl/rest/v1/profiles?id=eq.$($user.id)" `
    -Headers ($headers + @{ "Prefer" = "return=representation" }) `
    -Body $patchBody | Out-Null

Write-Host "Done! Manager account ready:"
Write-Host "  Email:    $ManagerEmail"
Write-Host "  Password: $ManagerPassword"
Write-Host ""
Write-Host "Run the manager tests:"
Write-Host '  maestro.bat test -e "MANAGER_USER=e2e.manager@growtracker.test" -e "MANAGER_PASS=TestPass123!" e2e\auth\04_login_manager.yaml'
Write-Host '  maestro.bat test -e "MANAGER_USER=e2e.manager@growtracker.test" -e "MANAGER_PASS=TestPass123!" e2e\flows\02_manager_dashboard.yaml'
