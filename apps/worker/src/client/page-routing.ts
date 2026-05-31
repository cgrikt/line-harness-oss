export type LiffPage = 'book' | 'salon-book' | 'event' | 'event-me' | 'form' | string | null;

export function resolveDefaultLiffId(rawUrl: string, buildTimeDefault?: string, deploymentFallback?: string): string {
  const url = new URL(rawUrl);
  return url.searchParams.get('liffId') || buildTimeDefault || deploymentFallback || '';
}

export function resolveLiffPage(rawUrl: string): LiffPage {
  const url = new URL(rawUrl);
  const explicitPage = url.searchParams.get('page');
  if (explicitPage) return explicitPage;

  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  if (path === 'book') return 'book';
  if (path === 'booking' || path.startsWith('booking/')) return 'salon-book';
  if (path === 'bookings' || path.startsWith('bookings/')) return 'salon-book';
  return null;
}
