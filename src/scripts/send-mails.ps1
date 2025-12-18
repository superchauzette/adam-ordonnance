param(
  [string]$ExcelPath = "C:\temp\contacts.xlsx",
  [string]$SheetName = "Sheet1",
  [string]$FromAccountSmtp = "",          # optionnel: forcer le compte expéditeur
  [switch]$DryRun                         # si présent: n'envoie pas, affiche juste
)

# Template du mail (texte). Tu peux aussi le charger d'un fichier .txt si tu préfères.
$BodyTemplate = @"
Bonjour {{FirstName}},

Voici votre commande {{ORDER}} pour un montant de {{AMOUNT}}€.

Cordialement,
Kevin
"@

# --- Helpers ---
function Parse-Vars([string]$s) {
  # "A=1;B=2" -> @{A="1";B="2"}
  $dict = @{}
  if ([string]::IsNullOrWhiteSpace($s)) { return $dict }

  $pairs = $s -split ';' | Where-Object { $_ -match '=' }
  foreach ($p in $pairs) {
    $kv = $p -split '=', 2
    $k = $kv[0].Trim()
    $v = $kv[1].Trim()
    if ($k) { $dict[$k] = $v }
  }
  return $dict
}

function Apply-Template([string]$tpl, [hashtable]$vars) {
  $out = $tpl
  foreach ($k in $vars.Keys) {
    $pattern = [regex]::Escape("{{${k}}}")
    $out = [regex]::Replace($out, $pattern, [string]$vars[$k])
  }
  return $out
}

# --- Read Excel ---
Import-Module ImportExcel -ErrorAction Stop
$rows = Import-Excel -Path $ExcelPath -WorksheetName $SheetName

if (-not $rows -or $rows.Count -eq 0) {
  throw "Aucune ligne trouvée dans $ExcelPath ($SheetName)."
}

# --- Outlook COM ---
try {
  $outlook = New-Object -ComObject Outlook.Application
} catch {
  throw "Impossible de créer l'objet Outlook.Application. Outlook est-il installé et ouvert au moins une fois ?"
}

$namespace = $outlook.GetNamespace("MAPI")

# Optionnel: choisir un compte expéditeur par SMTP
$sendUsingAccount = $null
if (-not [string]::IsNullOrWhiteSpace($FromAccountSmtp)) {
  foreach ($acc in $namespace.Session.Accounts) {
    if ($acc.SmtpAddress -eq $FromAccountSmtp) {
      $sendUsingAccount = $acc
      break
    }
  }
  if (-not $sendUsingAccount) {
    throw "Compte expéditeur introuvable: $FromAccountSmtp"
  }
}

# --- Send loop ---
foreach ($r in $rows) {
  $email = [string]$r.Email
  if ([string]::IsNullOrWhiteSpace($email)) {
    Write-Warning "Ligne ignorée: Email vide."
    continue
  }

  $subject = [string]$r.Subject
  if ([string]::IsNullOrWhiteSpace($subject)) {
    $subject = "Information"
  }

  $vars = Parse-Vars ([string]$r.BodyVars)

  # Ajoute des variables “standard”
  if ($r.PSObject.Properties.Name -contains "FirstName") {
    $vars["FirstName"] = [string]$r.FirstName
  }
  # fallback
  if (-not $vars.ContainsKey("FirstName") -or [string]::IsNullOrWhiteSpace($vars["FirstName"])) {
    $vars["FirstName"] = ""
  }

  $body = Apply-Template $BodyTemplate $vars

  if ($DryRun) {
    Write-Host "---- DRY RUN ----"
    Write-Host "To: $email"
    Write-Host "Subject: $subject"
    Write-Host "Body:`n$body"
    continue
  }

  $mail = $outlook.CreateItem(0)  # 0 = MailItem
  $mail.To = $email
  $mail.Subject = $subject
  $mail.Body = $body

  if ($sendUsingAccount) {
    $mail.SendUsingAccount = $sendUsingAccount
  }

  # Envoi
  $mail.Send()
  Write-Host "Envoyé à $email"
}

Write-Host "Terminé."