// Lightweight wrapper around Tauri Updater plugin with graceful fallback

export interface AvailableUpdateHandle {
  version: string;
  notes?: string | null;
  downloadAndInstall: () => Promise<void>;
}

let updaterMod: any | null = null;
let processMod: any | null = null;
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
    console.log("UPDATE CHECK: updater plugin not available, disabling updater.");
    updaterMod = null;
  }
  try {
    // Load process plugin for relaunch functionality
    const pmod = await import('@tauri-apps/plugin-process');
    processMod = pmod;
  } catch (_) {
    console.log("UPDATE CHECK: process plugin not available, restart may not work.");
    processMod = null;
  }
  return updaterMod;
}

export const updaterService = {
  async checkForUpdate(): Promise<AvailableUpdateHandle | null> {
    console.log("UPDATE CHECK: Starting update check...");
    console.log("UPDATE CHECK: PROD mode:", import.meta.env.PROD);
    
    if (!import.meta.env.PROD) {
      console.log("UPDATE CHECK: skipped (not running in production build).");
      return null;
    }

    const mod = await loadUpdater();
    console.log("UPDATE CHECK: Updater module loaded:", !!mod);
    console.log("UPDATE CHECK: check function available:", !!mod?.check);
    
    if (!mod?.check) {
      console.log("UPDATE CHECK: plugin-updater loaded but no check() function, skipping.");
      return null;
    }
    try {
      console.log("UPDATE CHECK: Calling mod.check()...");
      const update = await mod.check();
      console.log("UPDATE CHECK: check() returned:", JSON.stringify(update, null, 2));
      console.log("UPDATE CHECK: update available:", !!update?.available);
      
      // Log detailed signature info if available
      if (update) {
        console.log("UPDATE CHECK: Raw update object keys:", Object.keys(update));
        console.log("UPDATE CHECK: version:", update.version);
        console.log("UPDATE CHECK: currentVersion:", update.currentVersion);
        // Try to access signature if it exists
        if ((update as any).signature) {
          const sig = (update as any).signature;
          console.log("UPDATE CHECK: signature (first 50 chars):", sig?.substring?.(0, 50) || sig);
        }
      }
      
      if (!update || !update.available) {
        console.log("UPDATE CHECK: no update available or update.available is false.");
        return null;
      }
      console.log("UPDATE CHECK: update available", {
        version: update.version,
        currentVersion: update.currentVersion,
        hasBody: !!(update as any).body,
        hasNotes: !!(update as any).notes
      });
      const handle: AvailableUpdateHandle = {
        version: update.version,
        notes: (update as any).body || (update as any).notes || null,
        downloadAndInstall: async () => {
          try {
            if (update.downloadAndInstall) {
              console.log("UPDATE CHECK: calling update.downloadAndInstall()...");
              await update.downloadAndInstall();
            } else if (update.download && update.install) {
              console.log("UPDATE CHECK: calling update.download() then update.install()...");
              await update.download();
              await update.install();
            }
            // After install, restart the app
            console.log("UPDATE CHECK: Installation complete, attempting restart...");
            if (processMod?.restart) {
              await processMod.restart();
            } else {
              console.log("UPDATE CHECK: restart not available, user may need to restart manually.");
            }
          } catch (err) {
            console.error("UPDATE CHECK: Error during download/install:", err);
            throw err;
          }
        }
      };
      return handle;
    } catch (err) {
      console.log("UPDATE CHECK: error while checking for updates", err);
      return null;
    }
  }
};


