import { useState } from 'react';
import { api, type MenuItem, type StaffItem } from '../lib/api.js';
import { jstStartsAtIso } from '../lib/datetime.js';
import { nekoyaLocationLabel, nekoyaLocationNote } from '../lib/nekoya-location.js';

export default function Confirm({
  menu,
  staff,
  slot,
  onSubmitted,
  onBack,
}: {
  menu: MenuItem;
  staff: StaffItem;
  slot: { date: string; start: string };
  onSubmitted: () => void;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() => crypto.randomUUID());

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.createRequest(
        {
          menu_id: menu.id,
          staff_id: staff.id,
          starts_at: jstStartsAtIso(slot.date, slot.start),
        },
        idemKey,
      );
      onSubmitted();
    } catch (e) {
      const err = e as { status?: number; body?: { error?: string } };
      if (err.status === 409 && err.body?.error === 'slot_conflict') {
        setError('この時間枠は他の方の予約と重なりました。日時を選び直してください。');
      } else {
        setError('予約リクエストの送信に失敗しました。時間をおいて再度お試しください。');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500">← 戻る</button>
      <div className="rounded-2xl border bg-white p-4">
        <h1 className="text-xl font-bold">内容のご確認</h1>
        <p className="mt-1 text-xs text-gray-500">予約はリクエスト受付です。確認後にLINEでお知らせします。</p>
      </div>
      <dl className="space-y-2 rounded border p-4 text-sm">
        <Row label="プラン" value={displayPlanName(menu.name)} />
        <Row label="日時" value={`${slot.date} ${slot.start}`} />
        <Row label="所要" value={durationGuidance(menu.name, staff.duration_minutes)} />
        <Row label="出勤場所" value={nekoyaLocationLabel()} />
      </dl>
      <div className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
        <p>{bookingNote(menu.name)}</p>
        <p className="mt-1">{nekoyaLocationNote()}</p>
        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="font-semibold text-gray-700">料金目安</div>
          <ul className="mt-1 space-y-1">
            <li>初回: ¥3,000</li>
            <li>指名: 60分〜 / ¥10,000〜</li>
            <li>体入: 無料</li>
          </ul>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? '送信中...' : '予約をリクエスト'}
      </button>
    </div>
  );
}

function displayPlanName(menuName: string) {
  if (menuName.includes('指名')) return '指名';
  if (menuName.includes('初回')) return '初回';
  if (menuName.includes('体入') || menuName.includes('体験')) return '体入';
  return menuName.replace(/^プラン:\s*/, '');
}

function durationGuidance(menuName: string, fallbackMinutes: number) {
  if (menuName.includes('体入') || menuName.includes('体験')) return '60〜90 分ほど';
  return `${fallbackMinutes} 分`;
}

function bookingNote(menuName: string) {
  if (menuName.includes('初回')) {
    return '初回プランでのご来店受付は23時までとなっております。火曜・末日は定休日です。確認が必要な内容はLINEの会話で調整します。';
  }
  return '予約は最低1万円、21:00〜24:00で受け付けます。火曜・末日は定休日です。確認が必要な内容はLINEの会話で調整します。';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
