const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/** Register the service worker and subscribe to push notifications for the logged-in user.
 *  Safe to call multiple times — no-ops if already subscribed or permission denied. */
export async function registerPushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // 1. Fetch VAPID public key from server
    const keyRes = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
    if (!keyRes.ok) return;
    const { key } = await keyRes.json();
    if (!key) return;

    // 2. Register / get existing service worker
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // 3. Check existing subscription
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — send to server in case it was cleared from DB
      await sendSubscriptionToServer(existing);
      return;
    }

    // 4. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // 5. Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await sendSubscriptionToServer(subscription);
  } catch {
    // Non-critical — push notifications are optional
  }
}

async function sendSubscriptionToServer(sub: PushSubscription): Promise<void> {
  await fetch(`${BACKEND_URL}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sub.toJSON()),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/** Listen for navigation requests from the service worker (notification click). */
export function listenForPushNavigate(navigate: (url: string) => void): () => void {
  if (!("serviceWorker" in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "NAVIGATE") navigate(event.data.url);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
