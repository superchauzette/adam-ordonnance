# Ordonnance Generator (Electron)

## Arborescence cible

- `src/main/` : process principal (Node/TS). Point d'entrée `ipc.ts`, orchestre les jobs et route l'IPC.
- `src/main/jobs/` : tâches métier côté Node.
  - `generateOrders.ts` : lecture Excel → génération Word.
  - `convertToPdf.ts` : déclenchement PowerShell pour conversion PDF.
  - `prepareDrafts.ts` : déclenchement PowerShell pour brouillons Outlook.
- `src/main/services/` : services techniques réutilisables.
  - `excel.ts` (lecture Excel), `fs.ts` (IO), `logger.ts`, `psRunner.ts` (child_process PowerShell), `wordTemplating.ts` (fusion modèles), `validate.ts` (validation inputs).
- `src/renderer/` : UI React.
  - `screens/` : écrans `GenerateScreen.tsx`, `ConvertScreen.tsx`, `SendDraftsScreen.tsx`.
  - `components/`, `state/` : composants partagés et store.
- `src/scripts/` : PowerShell (`Convert-WordToPdf.ps1`, `Create-OutlookDrafts.ps1`). Pas de logique PS dans Electron.
- `src/templates/` : modèles `orders/` (docx), `mail/` (docx corps de mail).
- `src/out/<centre-initiateur>/` : sorties et logs par centre.
  - `word/`, `pdf/`, `logs/`.

## Contraintes à respecter

- Renderer sans accès direct au système de fichiers : toute IO passe par IPC → main → services.
- Node orchestre PowerShell via `psRunner` (child_process). Aucune logique PS dans Electron.
- Offline-first : pas de cloud, pas de base de données.
- Doit supporter Word/Outlook déjà ouverts (scripts robustes/idempotents).
- Windows-only, local only.

## Pipelines

1. `generateOrders` (Node) : Excel → Word via `wordTemplating`.
2. `convertToPdf` (PowerShell) : Word → PDF headless.
3. `prepareDrafts` (PowerShell) : compose et attache PDF/Word dans Outlook (brouillons).

## Stack

- Electron
- Node.js (TypeScript)
- React (renderer)
- PowerShell (Word + Outlook automation)
- Windows only
- Local only (no DB, Excel + folders)

## Features

1. Generate Word prescriptions from Excel
2. Convert Word to PDF via Word COM (headless)
3. Create Outlook email drafts with attachments

## Constraints

- No cloud
- No database
- Must work offline
- Must be robust to Word/Outlook already open

## Code style

- composant avec function
- formulaire avec React Hook Form
- named export
- typage des props avec type et pas de interface
- utilise tailwind pour le css

## Architecture rules

- PowerShell scripts live in /scripts
- No PowerShell logic inside Electron
- Node orchestrates PowerShell via child_process
- Renderer never accesses filesystem directly
- All IO goes through IPC

## Pipelines

1. generateOrders (Node)
2. convertToPdf (PowerShell)
3. prepareDrafts (PowerShell)
