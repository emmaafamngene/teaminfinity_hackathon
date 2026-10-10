param(
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef = 'xtjhomifqgftegvapfew',
  [string]$SenderEmail = 'emmanuelcash.x@gmail.com'
)

$ErrorActionPreference = 'Stop'
# Supabase Management API: https://supabase.com/docs/guides/auth/auth-smtp
# Credentials are entered interactively; nothing is saved to disk or printed.
function Read-SecretText([string]$Prompt) {
  $secureValue = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureValue.Dispose()
  }
}

$smtpPassword = $null
$managementToken = $null
$requestBody = $null
$headers = $null
try {
  if ($SenderEmail -notmatch '^[^\s@]+@gmail\.com$') {
    throw 'Use the Gmail account that generated the App Password.'
  }
  Write-Host "Configure Gmail SMTP for Supabase project $ProjectRef using $SenderEmail."
  Write-Host 'Create a Google App Password at https://myaccount.google.com/apppasswords'
  $smtpPassword = (Read-SecretText 'Gmail App Password (not your Google or Campus Connect password)') -replace '\s', ''
  if ($smtpPassword -notmatch '^[a-zA-Z]{16}$') { throw 'Expected a 16-letter Google App Password.' }
  Write-Host 'Create a Supabase personal access token at https://supabase.com/dashboard/account/tokens'
  $managementToken = Read-SecretText 'Supabase personal access token'
  if ([string]::IsNullOrWhiteSpace($managementToken)) { throw 'A Supabase management token is required.' }
  $headers = @{ Authorization = "Bearer $managementToken" }
  $configUrl = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
  # Only SMTP fields change. Email confirmation and other StudyBud Auth settings stay intact.
  $requestBody = @{
    smtp_host = 'smtp.gmail.com'
    smtp_port = '587'
    smtp_user = $SenderEmail
    smtp_pass = $smtpPassword
    smtp_admin_email = $SenderEmail
    smtp_sender_name = 'Campus Connect'
  } | ConvertTo-Json
  $null = Invoke-RestMethod -Uri $configUrl -Method Patch -Headers $headers -ContentType 'application/json' -Body $requestBody -TimeoutSec 30
  $verified = Invoke-RestMethod -Uri $configUrl -Method Get -Headers $headers -TimeoutSec 30
  if ($verified.smtp_host -ne 'smtp.gmail.com' -or $verified.smtp_user -ne $SenderEmail -or $verified.smtp_admin_email -ne $SenderEmail) {
    throw 'The saved SMTP settings did not match. Check the Supabase dashboard.'
  }
  $verified = $null
  Write-Host 'SMTP settings saved and verified. Request one confirmation email to test delivery.'
  Write-Host 'You can revoke the Supabase personal access token now. Keep the Gmail App Password active for email delivery.'
} catch {
  # API response bodies are deliberately omitted because they may contain secrets.
  Write-Host 'SMTP setup did not finish. Check your App Password, Supabase token and project permissions in the dashboards.'
  exit 1
} finally {
  $smtpPassword = $null
  $managementToken = $null
  $requestBody = $null
  $headers = $null
}
