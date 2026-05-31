import { useEffect, useState } from 'react';
import { api, type BookingHistoryItem } from '../lib/api.js';
import { hasLineLogin } from '../lib/liff-auth.js';
import LineOpenGuide from '../components/LineOpenGuide.js';
import HistoryCard from '../components/HistoryCard.js';

export default function BookingHistory() {
  const [data, setData] = useState<{ upcoming: BookingHistoryItem[]; past: BookingHistoryItem[] } | null>(
    null,
  );
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<BookingHistoryItem | null>(null);

  if (!hasLineLogin()) {
    return <LineOpenGuide title="LINEで開くと予約履歴を確認できます" />;
  }

  async function refresh() {
    setData(await api.me());
  }

  useEffect(() => {
    refresh().catch((e) => setMessage(e instanceof Error ? e.message : String(e)));
  }, []);

  async function cancelBooking(booking: BookingHistoryItem) {
    setCancellingId(booking.id);
    setMessage(null);
    try {
      await api.cancelMyBooking(booking.id);
      await refresh();
      setPendingCancel(null);
      setMessage('キャンセルしました。別の日程で取り直す場合は、下の「予約を取り直す」から進めます。');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'キャンセルできませんでした。');
    } finally {
      setCancellingId(null);
    }
  }

  if (!data) return <div className="p-4 text-gray-500">読み込み中...</div>;
  const list = tab === 'upcoming' ? data.upcoming : data.past;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex border-b">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-2 ${tab === 'upcoming' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          これから ({data.upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 py-2 ${tab === 'past' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          過去 ({data.past.length})
        </button>
      </div>
      {message && <p className="rounded bg-gray-50 p-2 text-sm text-gray-600">{message}</p>}
      {pendingCancel && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold">この予約をキャンセルしますか？</div>
          <p className="mt-1 text-xs leading-relaxed">
            取り直しはキャンセル後に「予約を取り直す」から進めます。迷う場合はLINEでそのまま相談してください。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setPendingCancel(null)}
              className="rounded border border-amber-300 bg-white py-2 text-xs font-semibold text-amber-900"
            >
              やめる
            </button>
            <button
              onClick={() => cancelBooking(pendingCancel)}
              disabled={cancellingId === pendingCancel.id}
              className="rounded bg-amber-700 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {cancellingId === pendingCancel.id ? '取消中...' : 'はい、キャンセル'}
            </button>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <p className="pt-8 text-center text-gray-500">まだ予約がありません。</p>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => (
            <HistoryCard
              key={b.id}
              booking={b}
              onCancel={tab === 'upcoming' ? setPendingCancel : undefined}
              cancelling={cancellingId === b.id}
            />
          ))}
        </ul>
      )}
      <p className="pt-4 text-xs text-gray-500">
        予約済み・リクエスト中の枠は、この画面からキャンセルできます。変更は一度キャンセルしてから取り直してください。
      </p>
      {message?.includes('キャンセルしました') && (
        <a href="/booking" className="mt-3 block rounded bg-green-600 py-3 text-center text-sm font-semibold text-white">
          予約を取り直す
        </a>
      )}
    </div>
  );
}
