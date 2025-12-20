param(
  [Parameter(Mandatory=$true)][string]$To,
  [Parameter(Mandatory=$true)][string]$Subject,
  [Parameter(Mandatory=$true)][string]$Body,
  [Parameter(Mandatory=$true)][ValidateSet("draft", "send")][string]$Mode,
  [string[]]$Files
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$p) {
  if ([string]::IsNullOrWhiteSpace($p)) { return $null }

  $clean = $p -replace '[\r\n\t]', ''
  $clean = $clean.Trim()

  if (-not (Test-Path -LiteralPath $clean)) {
    throw "File not found or invalid path: [$clean]"
  }

  return (Resolve-Path -LiteralPath $clean).Path
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
  if (-not [string]::IsNullOrWhiteSpace($Files)) {
    # Split the pipe-separated file list
    $fileArray = $Files -split '\|' | ForEach-Object { $_.Trim() }
    
    foreach ($file in $fileArray) {
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