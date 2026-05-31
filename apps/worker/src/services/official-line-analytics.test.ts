import { describe, expect, test } from 'vitest';
import { summarizeOfficialLineAnalytics } from './official-line-analytics.js';

function stmt(result: unknown) {
  return {
    bind: () => ({
      first: async () => result,
      all: async () => ({ results: Array.isArray(result) ? result : [] }),
    }),
  };
}

describe('official LINE analytics summary', () => {
  test('aggregates friend, booking, abandoned reminder, and X referral counts', async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        if (sql.includes('FROM friends') && sql.includes('friendAddCount')) return stmt({ friendAddCount: 40 });
        if (sql.includes('FROM conversion_events') && sql.includes('GROUP BY cp.event_type')) return stmt([
          { event_type: 'booking_started', count: 20 },
          { event_type: 'booking_completed', count: 8 },
          { event_type: 'booking_abandoned_reminder_sent', count: 5 },
          { event_type: 'gift_survey_response', count: 12 },
          { event_type: 'trial_consultation', count: 3 },
          { event_type: 'designation_booking', count: 2 },
        ]);
        if (sql.includes('FROM conversion_events') && sql.includes('NOT EXISTS')) return stmt({ count: 12 });
        if (sql.includes('FROM ref_tracking') && sql.includes('xReferralCount')) return stmt({ xReferralCount: 17 });
        if (sql.includes('FROM link_clicks') && sql.includes('xReferralCount')) return stmt({ xReferralCount: 4 });
        throw new Error(`unexpected SQL: ${sql}`);
      },
    } as unknown as D1Database;

    const summary = await summarizeOfficialLineAnalytics(db, {
      accountId: 'acct-1',
      from: '2026-05-01',
      to: '2026-05-31',
    });

    expect(summary).toMatchObject({
      friendAddCount: 40,
      giftSurveyResponseCount: 12,
      bookingStartCount: 20,
      bookingCompleteCount: 8,
      bookingAbandonedCount: 12,
      bookingAbandonedReminderSentCount: 5,
      trialConsultationCount: 3,
      designationBookingCount: 2,
      xReferralCount: 21,
    });
    expect(prepared.join('\n')).toContain('line_account_id = ?');
    expect(prepared.join('\n')).toContain('SELECT id FROM line_accounts WHERE channel_id = ?');
  });
});
