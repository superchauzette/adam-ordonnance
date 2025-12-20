import { useState, useEffect } from "react";

export function useOutputDir() {
  const [outputDir, setOutputDir] = useState("");

  useEffect(() => {
    (async () => {
      const saved = await window.settingsAPI.get("outputDir");
      if (typeof saved === "string") setOutputDir(saved);
    })();
  }, []);

  const save = async (next: string) => {
    setOutputDir(next);
    await window.settingsAPI.set("outputDir", next);
  };

  return { outputDir, save };
}
