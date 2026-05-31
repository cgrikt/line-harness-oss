import { describe, expect, test } from 'vitest';
import {
  processAbandonedBookingStarts,
  recordBookingFunnelEvent,
} from './booking-abandonment.js';

function stmt(result: unknown) {
  return {
    bind: (..._args: unknown[]) => ({
      first: async () => (Array.isArray(result) ? result[0] ?? null : result),
      all: async () => ({ results: Array.isArray(result) ? result : [] }),
      run: async () => ({ meta: { changes: 1 } }),
    }),
  };
}

describe('booking abandonment funnel events', () => {
  test('records booking_started with a stable conversion point before a request exists', async () => {
    const prepared: string[] = [];
    const binds: unknown[][] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        return {
          bind: (...args: unknown[]) => {
            binds.push(args);
            return {
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => ({ meta: { changes: 1 } }),
            };
          },
        };
      },
    } as unknown as D1Database;

    const eventId = await recordBookingFunnelEvent(db, {
      friendId: 'friend-1',
      eventType: 'booking_started',
      metadata: { menu_id: 'menu-1', source: 'liff_booking' },
      now: new Date('2026-05-31T10:00:00.000Z'),
    });

    expect(eventId).toMatch(/^booking_started_/);
    expect(prepared.some((sql) => sql.includes('INSERT OR IGNORE INTO conversion_points'))).toBe(true);
    expect(prepared.some((sql) => sql.includes('INSERT INTO conversion_events'))).toBe(true);
    expect(binds.flat()).toContain('booking_started');
    expect(JSON.stringify(binds.flat())).toContain('menu-1');
  });

  test('sends one abandoned-booking reminder and records a sent event to prevent duplicates', async () => {
    const inserted: unknown[][] = [];
    const dueRows = [
      {
        event_id: 'start-1',
        friend_id: 'friend-1',
        created_at: '2026-05-31T09:00:00.000Z',
        metadata: JSON.stringify({ menu_id: 'menu-1', source: 'liff_booking' }),
        line_user_id: 'U123',
        channel_access_token: 'token',
      },
    ];
    const db = {
      prepare(sql: string) {
        if (sql.includes('booking_started') && sql.includes('booking_completed')) return stmt(dueRows);
        return {
          bind: (...args: unknown[]) => {
            inserted.push(args);
            return {
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => ({ meta: { changes: 1 } }),
            };
          },
        };
      },
    } as unknown as D1Database;
    const sent: unknown[] = [];

    const result = await processAbandonedBookingStarts(db, {
      now: new Date('2026-05-31T10:00:00.000Z'),
      thresholdMinutes: 30,
      bookingUrl: 'https://liff.example.com/booking',
      sender: async (message) => sent.push(message),
    });

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0])).toContain('予約');
    expect(inserted.flat()).toContain('booking_abandoned_reminder_sent');
    expect(JSON.stringify(inserted.flat())).toContain('start-1');
  });
});
