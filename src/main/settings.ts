type Settings = {
  outputDir?: string;
};

let storePromise: Promise<any> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const mod = (await (eval(
        'import("electron-store")'
      ) as Promise<any>)) as any;
      const Store = mod.default as unknown as new (opts: any) => any;
      const store = new Store({
        name: "settings",
        defaults: { outputDir: "" },
      });

      return store as {
        get: (key: keyof Settings) => Settings[keyof Settings];
        set: (key: keyof Settings, value: any) => void;
      };
    })();
  }
  return storePromise;
}

export const settings = {
  get: async (key: keyof Settings) => {
    const store = await getStore();
    return store.get(key);
  },
  set: async (key: keyof Settings, value: any) => {
    const store = await getStore();
    store.set(key, value);
  },
};
