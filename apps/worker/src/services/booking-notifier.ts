import { LineClient } from '@line-crm/line-sdk';

export type NotificationKind =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'day_before'
  | 'hours_before';

export interface NotificationContext {
  menuName: string;
  staffName: string;
  startsAtJst: string; // 例: "2026-05-10 14:00"
  hoursBefore: number;
}

export function renderNotificationText(
  kind: NotificationKind,
  ctx: NotificationContext,
): string {
  const detail = `\nプラン: ${ctx.menuName.replace(/^プラン:\s*/, '')}\n日時: ${ctx.startsAtJst}`;
  switch (kind) {
    case 'requested':
      return `予約リクエストを受け付けました。${detail}\n\n前日の同じ時間帯にもLINEでお知らせします。`;
    case 'approved':
      return `予約が入りました。${detail}\n\n変更・キャンセルは予約履歴からできます。`;
    case 'rejected':
      return `申し訳ありません、ご希望の枠でお取りできませんでした。\n別の日時で再度お試しください。`;
    case 'expired':
      return `予約リクエストが 24 時間返信が無かったため、期限切れになりました。${detail}`;
    case 'day_before':
      return `明日の同じ時間帯になりました。ご予定の確認です。${detail}`;
    case 'hours_before':
      return `ご予約まであと ${ctx.hoursBefore} 時間です。${detail}`;
  }
}

export interface SendNotificationParams {
  channelAccessToken: string;
  toLineUserId: string;
  kind: NotificationKind;
  ctx: NotificationContext;
}

export async function sendBookingNotification(params: SendNotificationParams): Promise<void> {
  const text = renderNotificationText(params.kind, params.ctx);
  const client = new LineClient(params.channelAccessToken);
  await client.pushMessage(params.toLineUserId, [{ type: 'text', text }]);
}

export type BookingNotificationSender = (params: SendNotificationParams) => Promise<void>;
