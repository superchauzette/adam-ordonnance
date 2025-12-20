type FilePickerProps = {
  label: string;
  value: string;
  onChange: (path: string) => void;
  buttonLabel?: string;
  placeholder?: string;
  error?: string;
};

export function FilePicker({
  label,
  value,
  onChange,
  buttonLabel = "Choisir un fichier",
  placeholder = "Aucun fichier sélectionné",
  error,
}: FilePickerProps) {
  const fileName = value ? value.split(/[\\/]/).pop() || value : "";

  const handlePick = async () => {
    const filePath = await window.api.selectFile();
    if (filePath) {
      onChange(filePath);
    }
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex gap-3 items-center">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
          onClick={handlePick}
        >
          {buttonLabel}
        </button>
        <span className="text-sm text-slate-500 truncate" title={value}>
          {fileName || placeholder}
        </span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </label>
  );
}
