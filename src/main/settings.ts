type Settings = {
  outputDir?: string;
};

let storePromise: Promise<any> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const Store = ((await eval('import("electron-store")')) as Promise<any>)
        .default;
      return new Store<Settings>({
        name: "settings",
        defaults: { outputDir: "" },
      });
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
