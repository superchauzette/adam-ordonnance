# Ordonnance Generator – AI Coding Instructions

Windows-only Electron app for generating medical prescriptions (ordonnances) from Excel data. Uses React + TypeScript, orchestrates Word/Outlook via PowerShell COM automation.

## Architecture

**Strict process boundary**: Main (Node) ↔ IPC ↔ Renderer (React). Renderer NEVER touches filesystem directly.

- `src/main/index.ts`: IPC handlers registry, orchestrates jobs
- `src/main/jobs/`: Business logic (Excel → Word → PDF → Outlook)
  - `generateOrdonnace.ts`: Reads Excel, matches templates via correspondance table, renders `.docx` using docxtemplater, writes to `<outputDir>/<centre_initiateur>/`
- `src/main/preload.ts`: Exposes `window.api` and `window.settingsAPI` to renderer via contextBridge
- `src/renderer/`: React UI with `MemoryRouter` (screens: generate → convert → send)
- `src/scripts/`: PowerShell scripts for Word/Outlook COM automation (NO PowerShell logic in Electron)
- `src/templates/type-ordonance/`: `.docx` templates with docxtemplater placeholders like `{{nom}}`
- Settings: `electron-store` persists `outputDir` across sessions

## Key Patterns

### IPC Flow (ALWAYS follow this)
1. Renderer calls `window.api.methodName(...args)` (typed via `global.d.ts`)
2. `preload.ts` invokes `ipcRenderer.invoke("channel", ...args)`
3. `index.ts` has `ipcMain.handle("channel", async (_, ...args) => { ... })`
4. Returns `{ success: boolean, error?: string, ... }`

Example: [GenerateOrdersScreen.tsx](src/renderer/screens/GenerateOrdersScreen.tsx#L70-L80) → [preload.ts](src/main/preload.ts#L9-L11) → [index.ts](src/main/index.ts#L47-L61)

### Excel → Template Matching Logic
[generateOrdonnace.ts](src/main/jobs/generateOrdonnace.ts#L109-L131) reads two Excel files:
- **Input**: Patient data (Nom, Prénom, Type de pompe, Type de capteur, Centre initiateur, Dlp Pompe)
- **Correspondance**: Maps (typePompe, typeCapteur) → template filename

Matching priority: (pompe + capteur) → (pompe only) → (capteur only) → default `ORDO_Pompe_seule.docx`

### Key Normalization
Excel columns have accents/spaces. [normalizeKey()](src/main/jobs/generateOrdonnace.ts#L142-L150): lowercase, strip diacritics, replace spaces with `_`. Example: `"Date naissance"` → `date_naissance`

### Date Filtering
`Dlp Pompe` can be Excel serial date (number) or string. [Filter logic](src/main/jobs/generateOrdonnace.ts#L184-L200): converts Excel serial (days since 1900-01-01) via `(dlpPompe - 25569) * 86400 * 1000` then checks `date >= from && date <= to`.

### Parallel Rendering
Uses custom `promisePool()` ([generateOrdonnace.ts](src/main/jobs/generateOrdonnace.ts#L61-L78)) for concurrency. Template binaries cached in `TEMPLATE_CACHE` to avoid repeated disk reads.

## Code Style

- **Components**: Named `function` exports (not arrow), typed props with `type` (not `interface`)
- **Forms**: React Hook Form + Zod (`zodResolver`), mode `onChange` for realtime validation
- **CSS**: Tailwind classes only
- **IPC naming**: kebab-case channels (`"select-file"`, `"settings:get"`)
- **Filenames**: Safe via [safeFilename()](src/main/jobs/generateOrdonnace.ts#L137-L144) – replaces forbidden chars, collapses whitespace

## Development Workflow

```bash
npm run dev          # Starts Vite (renderer) + tsc watch (main) + electronmon
npm run build        # Prod build (dist/main + dist/renderer)
npm run lint         # Type-check both main and renderer
```

**Dev mode**: `VITE_DEV_SERVER_URL=http://localhost:5173` triggers hot reload, DevTools auto-open ([index.ts](src/main/index.ts#L18-L21))

## PowerShell Integration (CRITICAL)

**Rule**: Electron does NOT execute PowerShell inline. Main process spawns `powershell.exe` via `child_process` to run scripts in [src/scripts/](src/scripts/).

Example pattern (not yet implemented but intended):
```typescript
// jobs/wordToPdf.ts
import { spawn } from 'child_process';
const ps = spawn('powershell.exe', ['-File', 'src/scripts/word-to-pdf.ps1', '-InputDocx', inputPath, '-OutputPdf', outPath]);
```

[word-to-pdf.ps1](src/scripts/word-to-pdf.ps1): COM automation (`Word.Application`), invisible mode, read-only open, exports as PDF (format 17), robust cleanup with `FinalReleaseComObject`.

## File Output Structure

```
<outputDir>/
  <Centre_initiateur_1>/
    Nom_Prenom.docx
    Nom_Prenom.pdf      (after conversion)
  <Centre_initiateur_2>/
    ...
  logs/                 (planned)
```

Centre folder name from `centre_initiateur` column, sanitized via `safeFilename()`.

## Common Gotchas

1. **Type mismatch**: Add preload methods to [global.d.ts](src/types/global.d.ts) or TS errors in renderer
2. **Path resolution**: Main uses absolute paths (`path.resolve`), renderer gets paths from dialogs
3. **Excel serial dates**: `dlp_pompe` as number needs conversion formula (see Date Filtering above)
4. **Template not found**: Check [type-ordonance/](src/templates/type-ordonance/) folder, verify `correspondance-type-ordo.xlsx` mapping
5. **Settings persistence**: `electron-store` lazy-loads via `eval('import("electron-store")')` for ESM compatibility ([settings.ts](src/main/settings.ts#L10-L13))

## When Adding Features

- **New IPC call**: Update preload → global.d.ts → main handler (all 3 files)
- **New job**: Create `src/main/jobs/<name>.ts`, call from main handler
- **New screen**: Add to [App.tsx](src/renderer/App.tsx) Routes + [SideMenu.tsx](src/renderer/components/SideMenu.tsx)
- **PowerShell task**: Write `.ps1` in [scripts/](src/scripts/), spawn from job, NEVER inline PS logic in .ts

## Target Environment

- **Windows-only** (Word/Outlook COM)
- **Offline-first** (no DB, no cloud)
- **Local files** (Excel input, docx templates, output folders)
- Dev env might be macOS but runtime is Windows
