# Plan: Configurable Template Directory Setting

Add a persistent "template directory" setting accessible via a new Parameters screen, allowing users to customize where the app loads `.docx` templates instead of hardcoding `src/templates`.

## Steps

1. **Extend settings infrastructure** — Add `templateDir?: string` to Settings type in [settings.ts](src/main/settings.ts#L1-L3), update `defaults` to include `templateDir: "src/templates"`, and extend both `settings:get` and `settings:set` IPC handlers in [index.ts](src/main/index.ts) to recognize the new key.

2. **Create ParametresScreen** — New file `src/renderer/screens/ParametresScreen.tsx` with a form containing [FolderPicker](src/renderer/components/FolderPicker.tsx) for `templateDir`, loading values from `window.settingsAPI.get()` on mount and persisting changes via `window.settingsAPI.set()`.

3. **Wire up navigation** — Add `/parametres` route to [App.tsx](src/renderer/App.tsx) and append a "Paramètres" menu item (gear icon) to [SideMenu.tsx](src/renderer/components/SideMenu.tsx).

4. **Consume setting in generation job** — Update [generateOrdonnances()](src/main/jobs/generateOrdonnace.ts#L109) to accept `templateDir: string` parameter, replace hardcoded `"src/templates"` (lines 166-167) with this parameter, and modify the IPC handler in [index.ts](src/main/index.ts) to fetch `templateDir` from settings before calling the job.


## Further Considerations

1. **Validation strategy** — Should ParametresScreen validate that the selected folder contains `.docx` files and `correspondance-type-ordo.xlsx` on selection, or defer validation to generation time with clearer error messages?

2. **Migration path** — Existing installs have no `templateDir` set; should the app auto-detect bundled templates in `app.asar` or prompt users on first launch?

## Implementation Details

### Files to Create
- `src/renderer/screens/ParametresScreen.tsx`

### Files to Modify
- `src/main/settings.ts` — Add `templateDir` to Settings type and defaults
- `src/main/index.ts` — Extend IPC handlers for settings:get/set, update generateOrdonnances handler to fetch and pass templateDir
- `src/main/jobs/generateOrdonnace.ts` — Add templateDir parameter, replace hardcoded paths
- `src/renderer/App.tsx` — Add /parametres route
- `src/renderer/components/SideMenu.tsx` — Add Paramètres menu item
- `src/renderer/screens/GenerateOrdersScreen.tsx` — Remove outputDir picker (optional)

### Key Patterns to Follow

**IPC Flow:**
```typescript
// preload.ts already exposes settingsAPI
window.settingsAPI.get("templateDir")
window.settingsAPI.set("templateDir", path)

// index.ts handlers already support any key
ipcMain.handle("settings:get", ...) // works for templateDir
ipcMain.handle("settings:set", ...) // works for templateDir
```

**ParametresScreen Pattern:**
```typescript
export function ParametresScreen() {
  const [templateDir, setTemplateDir] = useState("");

  useEffect(() => {
    // Load settings on mount
   
    window.settingsAPI.get("templateDir").then(setTemplateDir);
  }, []);

  
  const handleTemplateDirChange = async (path: string) => {
    setTemplateDir(path);
    await window.settingsAPI.set("templateDir", path);
  };

  return (
    <div className="space-y-6">
      <FolderPicker
        label="Dossier des templates"
        value={templateDir}
        onChange={handleTemplateDirChange}
      />
    </div>
  );
}
```

**Template Consumption:**
```typescript
// In generateOrdonnace.ts
export async function generateOrdonnances(
  inputFile: string,
  outputDir: string,
  dateFrom?: string,
  dateTo?: string,
  templateDir: string = "src/templates"
) {
  
  const correspondanceFile = path.resolve(templateDir, "../correspondance-type-ordo.xlsx");
  // ... rest of function uses templateDir variable
}

// In index.ts handler
ipcMain.handle("generateOrdonnances", async (
  _, inputFile, outputDir, dateFrom?, dateTo?
) => {
  const templateDir = (await settings.get("templateDir")) || "src/templates";
  return await generateOrdonnances(inputFile, outputDir, dateFrom, dateTo, templateDir);
});
```
