import { describe, expect, test } from 'vitest';
import { renderNotificationText } from './booking-notifier.js';

const ctx = {
  menuName: 'プラン: 指名',
  staffName: '猫屋シキ',
  startsAtJst: '2026-05-10 21:00',
  hoursBefore: 24,
};

describe('renderNotificationText', () => {
  test('受付通知は担当欄と返信待ち文言を出さない', () => {
    const text = renderNotificationText('requested', ctx);
    expect(text).toContain('予約リクエストを受け付けました');
    expect(text).toContain('プラン: 指名');
    expect(text).toContain('2026-05-10 21:00');
    expect(text).not.toContain('担当:');
    expect(text).not.toContain('お店からの返信をお待ちください');
  });
  test('承認通知はキャンセル導線を案内する', () => {
    const text = renderNotificationText('approved', ctx);
    expect(text).toContain('予約が入りました');
    expect(text).toContain('変更・キャンセルは予約履歴からできます');
  });
  test('拒否', () => {
    expect(renderNotificationText('rejected', ctx)).toContain('お取りできませんでした');
  });
  test('期限切れ', () => {
    expect(renderNotificationText('expired', ctx)).toContain('期限切れ');
  });
  test('前日同時刻リマインダ', () => {
    const text = renderNotificationText('day_before', ctx);
    expect(text).toContain('明日の同じ時間帯になりました');
    expect(text).toContain('2026-05-10 21:00');
  });
  test('当日 N 時間前', () => {
    const t = renderNotificationText('hours_before', ctx);
    expect(t).toContain('ご予約まであと 24 時間');
  });
});
