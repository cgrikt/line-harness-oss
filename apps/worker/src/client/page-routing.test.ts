import { describe, expect, it } from 'vitest';
import { resolveDefaultLiffId, resolveLiffPage } from './page-routing.js';

describe('resolveLiffPage', () => {
  it('routes /booking to the salon booking flow so rich-menu reservation URLs do not fall through', () => {
    expect(resolveLiffPage('https://line-harness.nekoya.workers.dev/booking')).toBe('salon-book');
    expect(resolveLiffPage('https://line-harness.nekoya.workers.dev/booking/history')).toBe('salon-book');
  });

  it('keeps the legacy /book path on the calendar booking flow', () => {
    expect(resolveLiffPage('https://line-harness.nekoya.workers.dev/book')).toBe('book');
  });

  it('keeps explicit page query parameters as the primary router', () => {
    expect(resolveLiffPage('https://line-harness.nekoya.workers.dev/?page=salon-book')).toBe('salon-book');
    expect(resolveLiffPage('https://line-harness.nekoya.workers.dev/booking?page=form')).toBe('form');
  });
});

describe('resolveDefaultLiffId', () => {
  it('uses explicit liffId first, then build-time env, then deployment fallback', () => {
    expect(resolveDefaultLiffId('https://line-harness.nekoya.workers.dev/booking?liffId=query-id', 'env-id', 'fallback-id')).toBe('query-id');
    expect(resolveDefaultLiffId('https://line-harness.nekoya.workers.dev/booking', 'env-id', 'fallback-id')).toBe('env-id');
    expect(resolveDefaultLiffId('https://line-harness.nekoya.workers.dev/booking', '', 'fallback-id')).toBe('fallback-id');
  });
});
