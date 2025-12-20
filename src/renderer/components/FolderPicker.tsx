type FolderPickerProps = {
  label: string;
  value: string;
  onChange: (path: string) => void;
  buttonLabel?: string;
  placeholder?: string;
  error?: string;
};

export function FolderPicker({
  label,
  value,
  onChange,
  buttonLabel = "Parcourir…",
  placeholder = "Aucun dossier sélectionné",
  error,
}: FolderPickerProps) {
  const handlePick = async () => {
    const folderPath = await window.api.selectOutputFolder();
    if (folderPath) {
      onChange(folderPath);
    }
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={value}
          readOnly
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 
            text-sm truncate cursor-default"
        />
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
          onClick={handlePick}
        >
          {buttonLabel}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </label>
  );
}
