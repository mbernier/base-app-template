// Cookie-free analytics using localStorage

const ANON_ID_KEY = 'base_app_anon_id';
const SESSION_ID_KEY = 'base_app_session_id';

// Get or create anonymous ID (persists across sessions)
export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

// Get or create session ID (new per browser session)
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// Track page visit
export async function trackPageVisit(path: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const data = {
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    path,
    referrer: document.referrer || null,
    queryParams: Object.fromEntries(new URLSearchParams(window.location.search)),
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'page_visit', data }),
    });
  } catch {
    // Silently fail - analytics shouldn't break the app
  }
}

// Track event
export async function trackEvent(
  eventType: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const data = {
    anonymousId: getAnonymousId(),
    eventType,
    properties,
  };

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'event', data }),
    });
  } catch {
    // Silently fail
  }
}
