export type BookingFunnelEventType =
  | 'booking_started'
  | 'booking_completed'
  | 'booking_abandoned_reminder_sent';

export interface RecordBookingFunnelEventParams {
  friendId: string;
  eventType: BookingFunnelEventType;
  metadata?: Record<string, unknown>;
  now?: Date;
}

export interface AbandonedBookingReminderMessage {
  channelAccessToken: string;
  toLineUserId: string;
  text: string;
  bookingUrl: string;
  startEventId: string;
}

export interface ProcessAbandonedBookingStartsParams {
  now: Date;
  thresholdMinutes: number;
  bookingUrl: string;
  sender: (message: AbandonedBookingReminderMessage) => Promise<void>;
}

interface AbandonedStartRow {
  event_id: string;
  friend_id: string;
  created_at: string;
  metadata: string | null;
  line_user_id: string;
  channel_access_token: string;
}

function pointName(eventType: BookingFunnelEventType): string {
  if (eventType === 'booking_started') return '予約開始';
  if (eventType === 'booking_completed') return '予約完了';
  return '予約未完了リマインド送信';
}

function eventId(eventType: BookingFunnelEventType): string {
  return `${eventType}_${crypto.randomUUID()}`;
}

export async function recordBookingFunnelEvent(
  db: D1Database,
  params: RecordBookingFunnelEventParams,
): Promise<string> {
  const id = eventId(params.eventType);
  const nowIso = (params.now ?? new Date()).toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO conversion_points (id, name, event_type, value, created_at)
       VALUES (?, ?, ?, NULL, ?)`,
    )
    .bind(params.eventType, pointName(params.eventType), params.eventType, nowIso)
    .run();
  await db
    .prepare(
      `INSERT INTO conversion_events
        (id, conversion_point_id, friend_id, user_id, affiliate_code, metadata, created_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
    )
    .bind(id, params.eventType, params.friendId, JSON.stringify(params.metadata ?? {}), nowIso)
    .run();
  return id;
}

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function buildReminderText(): string {
  return [
    '予約ページを途中まで見てくれてありがとう。',
    '日時やプランで迷っていたら、このまま続きから確認できます。',
    '無理に決めなくて大丈夫なので、会えそうな時間だけ見てみてください。',
  ].join('\n');
}

export async function processAbandonedBookingStarts(
  db: D1Database,
  params: ProcessAbandonedBookingStartsParams,
): Promise<{ sent: number; failed: number }> {
  const cutoff = new Date(params.now.getTime() - params.thresholdMinutes * 60_000).toISOString();
  const rows = await db
    .prepare(
      `SELECT ce.id AS event_id,
              ce.friend_id,
              ce.created_at,
              ce.metadata,
              f.line_user_id,
              la.channel_access_token
         FROM conversion_events ce
         INNER JOIN conversion_points cp ON cp.id = ce.conversion_point_id
         INNER JOIN friends f ON f.id = ce.friend_id
         INNER JOIN line_accounts la ON la.id = f.line_account_id
        WHERE cp.event_type = 'booking_started'
          AND ce.created_at <= ?
          AND f.is_following = 1
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
          )
          AND NOT EXISTS (
            SELECT 1
              FROM conversion_events sent
              INNER JOIN conversion_points sent_cp ON sent_cp.id = sent.conversion_point_id
             WHERE sent.friend_id = ce.friend_id
               AND sent_cp.event_type = 'booking_abandoned_reminder_sent'
               AND json_extract(sent.metadata, '$.start_event_id') = ce.id
          )
        ORDER BY ce.created_at ASC
        LIMIT 100`,
    )
    .bind(cutoff)
    .all<AbandonedStartRow>();

  let sent = 0;
  let failed = 0;
  for (const row of rows.results) {
    try {
      await params.sender({
        channelAccessToken: row.channel_access_token,
        toLineUserId: row.line_user_id,
        text: buildReminderText(),
        bookingUrl: params.bookingUrl,
        startEventId: row.event_id,
      });
      await recordBookingFunnelEvent(db, {
        friendId: row.friend_id,
        eventType: 'booking_abandoned_reminder_sent',
        metadata: {
          ...parseMetadata(row.metadata),
          start_event_id: row.event_id,
          reminder_kind: 'abandoned_booking',
        },
        now: params.now,
      });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
