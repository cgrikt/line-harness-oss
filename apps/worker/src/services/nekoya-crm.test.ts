import { describe, expect, test } from 'vitest';
import {
  buildNekoyaSurveyCtaMessage,
  deriveNekoyaSurveyTagDefinitions,
  normalizeNekoyaBookingMenuForLiff,
  isNekoyaBookingSlotAllowedForMenu,
  validateNekoyaBookingRequest,
} from './nekoya-crm.js';

describe('Nekoya official LINE CRM rules', () => {
  test('locks LIFF booking copy and reservation rules for Nekoya Shiki', () => {
    expect(normalizeNekoyaBookingMenuForLiff({ name: '初回相談・来店予約', base_price: 3000 })).toMatchObject({
      displayName: '来店予約',
      minPrice: 3000,
      displayPrice: 3000,
      copy: expect.stringContaining('初回プランでのご来店受付は23時まで'),
    });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-02', startJstHHMM: '21:00', customerNote: '髪型相談' })).toEqual({ ok: false, error: 'customer_note_not_allowed' });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-02', startJstHHMM: '21:00' })).toEqual({ ok: false, error: 'regular_holiday' });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-30', startJstHHMM: '21:00' })).toEqual({ ok: false, error: 'regular_holiday' });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-03', startJstHHMM: '20:00' })).toEqual({ ok: false, error: 'outside_booking_window' });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-03', startJstHHMM: '24:30' })).toEqual({ ok: false, error: 'outside_booking_window' });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-03', startJstHHMM: '23:00' })).toEqual({ ok: true, normalizedPrice: 3000 });
    expect(validateNekoyaBookingRequest({ menuName: '初回相談・来店予約', price: 3000, startJstDate: '2026-06-03', startJstHHMM: '23:30' })).toEqual({ ok: false, error: 'outside_booking_window' });
    expect(isNekoyaBookingSlotAllowedForMenu('初回相談・来店予約', '24:00')).toBe(false);
    expect(isNekoyaBookingSlotAllowedForMenu('指名', '24:00')).toBe(true);
  });

  test('derives tags from gift survey answers and chooses CTA', () => {
    const answers = {
      met_before: 'ない',
      desired_mood: '話しやすさ/落ち着き/相談しやすさ',
      budget: '10万円以上',
      intent: '体験入店が可能な日程を知りたい',
    };
    expect(deriveNekoyaSurveyTagDefinitions(answers).map((tag) => tag.id)).toEqual([
      'nekoya.survey.met_before.no',
      'nekoya.survey.mood.calm',
      'nekoya.survey.budget.high',
      'nekoya.survey.intent.recruiting',
    ]);
    const cta = buildNekoyaSurveyCtaMessage(answers);
    expect(cta.altText).toBe('猫屋シキ: 回答に合わせた次の入口');
    expect(JSON.stringify(cta)).toContain('体験入店の日程を見る');
    expect(JSON.stringify(cta)).toContain('会ってみる');
  });
});
