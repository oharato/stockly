/**
 * Service Worker の登録を解除し、CacheStorage を全消去して強制リロードする
 */
export async function forceClearCacheAndReload(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    }
  } catch (err) {
    console.error("Failed to clear cache:", err);
  } finally {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}
