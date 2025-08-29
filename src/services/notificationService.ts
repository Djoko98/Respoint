/* Cross-platform notification helper: prefers Tauri plugin, falls back to Web Notification */

let tauriNotification: any = null;
let loaded = false;

const loadTauriNotification = async () => {
  if (loaded) return tauriNotification;
  loaded = true;
  try {
    // Dynamically import to avoid bundling issues in web
    const mod = await import('@tauri-apps/plugin-notification');
    tauriNotification = mod;
  } catch (_) {
    tauriNotification = null;
  }
  return tauriNotification;
};

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    await loadTauriNotification();
    try {
      if (tauriNotification?.isPermissionGranted) {
        const granted = await tauriNotification.isPermissionGranted();
        if (granted) return true;
        if (tauriNotification?.requestPermission) {
          const res = await tauriNotification.requestPermission();
          return res === 'granted';
        }
      }
    } catch (e) {
      // ignore and fallback
    }
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
    }
    return false;
  },

  async send(title: string, body: string) {
    await loadTauriNotification();
    // Try Tauri plugin first
    try {
      if (tauriNotification?.sendNotification) {
        await tauriNotification.sendNotification({ title, body });
        return;
      }
    } catch (_) {
      // ignore
    }

    // Fallback to Web Notifications
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
};


