// Lightweight wrapper around Tauri Updater plugin with graceful fallback

export interface AvailableUpdateHandle {
  version: string;
  notes?: string | null;
  downloadAndInstall: () => Promise<void>;
}

let updaterMod: any | null = null;
let loaded = false;

async function loadUpdater(): Promise<any | null> {
  if (loaded) return updaterMod;
  loaded = true;
  try {
    // Dynamically import to avoid bundling issues on web/dev without Tauri context
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const mod = await import('@tauri-apps/plugin-updater');
    updaterMod = mod;
  } catch (_) {
    updaterMod = null;
  }
  return updaterMod;
}

export const updaterService = {
  async checkForUpdate(): Promise<AvailableUpdateHandle | null> {
    const mod = await loadUpdater();
    if (!mod?.check) return null;
    try {
      const update = await mod.check();
      if (!update) return null;
      const handle: AvailableUpdateHandle = {
        version: update.version,
        notes: (update as any).body || (update as any).notes || null,
        downloadAndInstall: async () => {
          if (update.downloadAndInstall) {
            await update.downloadAndInstall();
          } else if (update.download && update.install) {
            await update.download();
            await update.install();
          }
        }
      };
      return handle;
    } catch {
      return null;
    }
  }
};


