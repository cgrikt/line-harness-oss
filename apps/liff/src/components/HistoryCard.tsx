import type { BookingHistoryItem } from '../lib/api.js';
import { utcToJstDisplay } from '../lib/datetime.js';
import { nekoyaLocationLabel } from '../lib/nekoya-location.js';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  requested: { label: 'リクエスト中', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '予約済み', color: 'bg-green-100 text-green-800' },
  rejected: { label: '不可', color: 'bg-gray-100 text-gray-600' },
  expired: { label: '期限切れ', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'キャンセル', color: 'bg-gray-100 text-gray-600' },
  completed: { label: '完了', color: 'bg-blue-100 text-blue-800' },
  no_show: { label: '無断キャンセル', color: 'bg-red-100 text-red-800' },
};

function planLabel(name: string) {
  if (name.includes('指名')) return '指名';
  if (name.includes('初回')) return '初回';
  if (name.includes('体入') || name.includes('体験')) return '体入';
  return name.replace(/^プラン:\s*/, '');
}

export default function HistoryCard({
  booking,
  onCancel,
  cancelling,
}: {
  booking: BookingHistoryItem;
  onCancel?: (booking: BookingHistoryItem) => void;
  cancelling?: boolean;
}) {
  const meta = STATUS_LABEL[booking.status] ?? { label: booking.status, color: 'bg-gray-100' };
  const cancellable = onCancel && ['requested', 'confirmed'].includes(booking.status);
  return (
    <li className="flex items-start gap-3 rounded border p-3">
      <img
        src={booking.profile_image_url || '/shiki-avatar.png'}
        alt="猫屋シキ"
        className="h-12 w-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="font-medium">プラン: {planLabel(booking.menu_name)}</div>
        <div className="text-sm text-gray-600">{nekoyaLocationLabel()}</div>
        <div className="text-sm text-gray-600">{utcToJstDisplay(booking.starts_at)}</div>
        {cancellable && (
          <button
            onClick={() => onCancel?.(booking)}
            disabled={cancelling}
            className="mt-2 rounded border px-3 py-1 text-xs text-gray-600 disabled:opacity-50"
          >
            {cancelling ? '取消中...' : 'キャンセルする'}
          </button>
        )}
      </div>
      <span className={`h-fit rounded px-2 py-1 text-xs ${meta.color}`}>{meta.label}</span>
    </li>
  );
}
