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

  const detail: WebNotificationFallbackPayload = {
    id: createFallbackId(),
    title,
    body,
  };

  try {
    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(
        new window.CustomEvent<WebNotificationFallbackPayload>(WEB_NOTIFICATION_FALLBACK_EVENT, {
          detail,
        })
      );
      return;
    }

    if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
      const legacyEvent = document.createEvent('CustomEvent');
      legacyEvent.initCustomEvent(WEB_NOTIFICATION_FALLBACK_EVENT, false, false, detail);
      window.dispatchEvent(legacyEvent);
      return;
    }
  } catch {
    // Keep fail-safe if browser event APIs are partially unavailable.
  }

  try {
    console.warn('[web-notification-fallback] Failed to dispatch fallback event', { title, body });
  } catch {
    // no-op
  }
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
