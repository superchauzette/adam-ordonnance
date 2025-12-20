param(
  [Parameter(Mandatory=$true)][string]$InputDocx,
  [Parameter(Mandatory=$true)][string]$OutputPdf,
  [int]$TimeoutSeconds = 60,
  [switch]$KillOrphanWinword
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$p) {
  return (Resolve-Path -LiteralPath $p).Path
}

$inputPath = Resolve-FullPath $InputDocx
$outDir = Split-Path -Parent $OutputPdf
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outputPath = (Resolve-Path -LiteralPath $outDir).Path + "\" + (Split-Path -Leaf $OutputPdf)

$word = $null
$doc  = $null
$startedAt = Get-Date

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0 # wdAlertsNone

  # Open read-only, no conversion prompts
  $doc = $word.Documents.Open($inputPath, $false, $true)

  # 17 = wdExportFormatPDF
  $doc.ExportAsFixedFormat($outputPath, 17)

  if (-not (Test-Path -LiteralPath $outputPath)) {
    throw "PDF not created: $outputPath"
  }
}
finally {
  # Close doc
  if ($doc -ne $null) {
    try { $doc.Close($false) | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) | Out-Null } catch {}
  }

  # Quit Word
  if ($word -ne $null) {
    try { $word.Quit() | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null } catch {}
  }

  # Force COM cleanup
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()

  # Optional: kill orphan WINWORD if we suspect a stuck instance
  if ($KillOrphanWinword) {
    $elapsed = (Get-Date) - $startedAt
    if ($elapsed.TotalSeconds -gt $TimeoutSeconds) {
      Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
  }
}

# Output the PDF path for the caller
Write-Output $outputPath