###
# Envoyer directement
#.\send-mails.ps1 -To "test@example.com" -Subject "Test" -Body "Bonjour" -Files @("C:\file1.pdf", "C:\file2.docx") -Mode "send"
# Créer un brouillon
#.\send-mails.ps1 -To "test@example.com" -Subject "Test" -Body "Bonjour" -Files @("C:\file1.pdf") -Mode "draft"

param(
  [Parameter(Mandatory=$true)][string]$To,
  [Parameter(Mandatory=$true)][string]$Subject,
  [Parameter(Mandatory=$true)][string]$Body,
  [Parameter(Mandatory=$false)][string[]]$Files = @(),
  [Parameter(Mandatory=$true)][ValidateSet("draft", "send")][string]$Mode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$p) {
  if ([string]::IsNullOrWhiteSpace($p)) { return $null }
  if (-not (Test-Path -LiteralPath $p)) {
    throw "File not found: $p"
  }
  return (Resolve-Path -LiteralPath $p).Path
}

$outlook = $null
$mail = $null

try {
  # Create Outlook Application object
  $outlook = New-Object -ComObject Outlook.Application
  
  # Create a new mail item (0 = olMailItem)
  $mail = $outlook.CreateItem(0)
  
  # Set recipients
  $mail.To = $To
  
  # Set subject and body
  $mail.Subject = $Subject
  $mail.Body = $Body
  
  # Attach files if provided
  if ($Files -and $Files.Length -gt 0) {
    foreach ($file in $Files) {
      if (-not [string]::IsNullOrWhiteSpace($file)) {
        $fullPath = Resolve-FullPath $file
        if ($fullPath) {
          # 1 = olByValue (embed file), position is ignored for mail items
          $mail.Attachments.Add($fullPath, 1) | Out-Null
        }
      }
    }
  }
  
  # Depending on mode, send or save as draft
  if ($Mode -eq "send") {
    $mail.Send()
    Write-Output "Email sent to: $To"
  } else {
    # Save as draft (will appear in Drafts folder)
    $mail.Save()
    Write-Output "Email saved as draft for: $To"
  }
}
catch {
  Write-Error "Error processing email: $_"
  throw
}
finally {
  # Cleanup COM objects
  if ($mail -ne $null) {
    try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($mail) | Out-Null } catch {}
  }
  
  if ($outlook -ne $null) {
    try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($outlook) | Out-Null } catch {}
  }
  
  # Force COM cleanup
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
