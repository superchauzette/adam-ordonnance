type Settings = {
  outputDir?: string;
  templateDir?: string;
  body?: string;
  sendMailsScriptPath?: string;
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
        defaults: { 
          outputDir: "", 
          templateDir: "src/templates",
          body: "Bonjour,\n\nVeuillez trouver ci-joint les ordonnances demandées.\n\nCordialement,",
          sendMailsScriptPath: "src/scripts/send-mails.ps1"
        },
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
