import { useState, useEffect } from "react";

export function useSetting(key: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    (async () => {
      const saved = await window.settingsAPI.get(key);
      if (typeof saved === "string") setValue(saved);
    })();
  }, []);

  const save = async (next: string) => {
    setValue(next);
    await window.settingsAPI.set(key, next);
  };

  return { value, save };
}
