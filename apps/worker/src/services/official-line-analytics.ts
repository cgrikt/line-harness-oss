export type OfficialLineAnalyticsInput = {
  accountId: string;
  from?: string | null;
  to?: string | null;
};

export type OfficialLineAnalyticsSummary = {
  friendAddCount: number;
  giftSurveyResponseCount: number;
  bookingStartCount: number;
  bookingCompleteCount: number;
  bookingAbandonedCount: number;
  bookingAbandonedReminderSentCount: number;
  trialConsultationCount: number;
  designationBookingCount: number;
  xReferralCount: number;
};

type CountRow = { count?: number; event_type?: string; friendAddCount?: number; xReferralCount?: number };

function dateClause(alias: string, input: OfficialLineAnalyticsInput, binds: unknown[]) {
  const clauses: string[] = [];
  if (input.from) {
    clauses.push(`${alias}.created_at >= ?`);
    binds.push(input.from);
  }
  if (input.to) {
    clauses.push(`${alias}.created_at <= ?`);
    binds.push(input.to.length === 10 ? `${input.to}T23:59:59.999Z` : input.to);
  }
  return clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
}

function asCount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function conversionMetricKey(eventType: string): keyof OfficialLineAnalyticsSummary | null {
  if (eventType === 'booking_started') return 'bookingStartCount';
  if (eventType === 'booking_completed') return 'bookingCompleteCount';
  if (eventType === 'booking_abandoned_reminder_sent') return 'bookingAbandonedReminderSentCount';
  if (['gift_survey_response', 'survey_response', 'nekoya_gift_survey_response'].includes(eventType)) return 'giftSurveyResponseCount';
  if (['trial_consultation', 'recruiting_consultation', 'booking_intent_recruiting'].includes(eventType)) return 'trialConsultationCount';
  if (['designation_booking', 'booking_intent_designation'].includes(eventType)) return 'designationBookingCount';
  return null;
}

export async function summarizeOfficialLineAnalytics(
  db: D1Database,
  input: OfficialLineAnalyticsInput,
): Promise<OfficialLineAnalyticsSummary> {
  const accountFilter = `(f.line_account_id = ? OR f.line_account_id IN (SELECT id FROM line_accounts WHERE channel_id = ?))`;
  const friendBinds: unknown[] = [input.accountId, input.accountId];
  const friendDateClause = dateClause('f', input, friendBinds);
  const friendRow = await db
    .prepare(`SELECT COUNT(*) AS friendAddCount FROM friends f WHERE ${accountFilter}${friendDateClause}`)
    .bind(...friendBinds)
    .first<CountRow>();

  const conversionBinds: unknown[] = [input.accountId, input.accountId];
  const conversionDateClause = dateClause('ce', input, conversionBinds);
  const conversionRows = await db
    .prepare(
      `SELECT cp.event_type AS event_type, COUNT(*) AS count
         FROM conversion_events ce
         INNER JOIN conversion_points cp ON cp.id = ce.conversion_point_id
         INNER JOIN friends f ON f.id = ce.friend_id
        WHERE ${accountFilter}${conversionDateClause}
        GROUP BY cp.event_type`,
    )
    .bind(...conversionBinds)
    .all<CountRow>();

  const abandonedBinds: unknown[] = [input.accountId, input.accountId];
  const abandonedDateClause = dateClause('ce', input, abandonedBinds);
  const abandonedRow = await db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM conversion_events ce
         INNER JOIN conversion_points cp ON cp.id = ce.conversion_point_id
         INNER JOIN friends f ON f.id = ce.friend_id
        WHERE ${accountFilter}${abandonedDateClause}
          AND cp.event_type = 'booking_started'
          AND NOT EXISTS (
            SELECT 1
              FROM conversion_events done
              INNER JOIN conversion_points done_cp ON done_cp.id = done.conversion_point_id
             WHERE done.friend_id = ce.friend_id
               AND done_cp.event_type = 'booking_completed'
               AND (
                 json_extract(done.metadata, '$.start_event_id') = ce.id
                 OR done.created_at >= ce.created_at
               )
          )`,
    )
    .bind(...abandonedBinds)
    .first<CountRow>();

  const xBinds: unknown[] = [input.accountId, input.accountId];
  const xDateClause = dateClause('rt', input, xBinds);
  const xRow = await db
    .prepare(
      `SELECT COUNT(*) AS xReferralCount
         FROM ref_tracking rt
         INNER JOIN friends f ON f.id = rt.friend_id
        WHERE ${accountFilter}${xDateClause}
          AND (
            lower(rt.ref_code) LIKE '%x%'
            OR lower(coalesce(rt.source_url, '')) LIKE '%x.com%'
            OR lower(coalesce(rt.source_url, '')) LIKE '%twitter.com%'
          )`,
    )
    .bind(...xBinds)
    .first<CountRow>();

  const xClickBinds: unknown[] = [];
  const xClickDateClause = dateClause('lc', input, xClickBinds);
  const xClickRow = await db
    .prepare(
      `SELECT COUNT(*) AS xReferralCount
         FROM link_clicks lc
         INNER JOIN tracked_links tl ON tl.id = lc.tracked_link_id
        WHERE (
            tl.id = 'nekoya-sns-x'
            OR lower(tl.name) LIKE '%猫屋%x%'
            OR lower(tl.original_url) LIKE '%x.com%'
            OR lower(tl.original_url) LIKE '%twitter.com%'
          )${xClickDateClause}`,
    )
    .bind(...xClickBinds)
    .first<CountRow>();

  const summary: OfficialLineAnalyticsSummary = {
    friendAddCount: asCount(friendRow?.friendAddCount),
    giftSurveyResponseCount: 0,
    bookingStartCount: 0,
    bookingCompleteCount: 0,
    bookingAbandonedCount: asCount(abandonedRow?.count),
    bookingAbandonedReminderSentCount: 0,
    trialConsultationCount: 0,
    designationBookingCount: 0,
    xReferralCount: asCount(xRow?.xReferralCount) + asCount(xClickRow?.xReferralCount),
  };

  for (const row of conversionRows.results ?? []) {
    const key = conversionMetricKey(String(row.event_type ?? ''));
    if (key) summary[key] += asCount(row.count);
  }
  return summary;
}
