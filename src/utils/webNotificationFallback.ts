export const WEB_NOTIFICATION_FALLBACK_EVENT = 'slow-to-pro:web-notification-fallback';

export interface WebNotificationFallbackPayload {
  id: string;
  title: string;
  body: string;
}

function canUseWindow(): boolean {
  return typeof window !== 'undefined';
}

function createFallbackId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emitWebNotificationFallback(title: string, body: string): void {
  if (!canUseWindow()) return;

  window.dispatchEvent(
    new CustomEvent<WebNotificationFallbackPayload>(WEB_NOTIFICATION_FALLBACK_EVENT, {
      detail: {
        id: createFallbackId(),
        title,
        body,
      },
    })
  );
}

export function subscribeWebNotificationFallback(
  listener: (payload: WebNotificationFallbackPayload) => void
): () => void {
  if (!canUseWindow()) return () => {};

  const handler = (event: Event) => {
    const payload = (event as CustomEvent<WebNotificationFallbackPayload>).detail;
    if (payload) {
      listener(payload);
    }
  };

  window.addEventListener(WEB_NOTIFICATION_FALLBACK_EVENT, handler);
  return () => window.removeEventListener(WEB_NOTIFICATION_FALLBACK_EVENT, handler);
}
