import { useMemo } from 'react';
import { addDays, formatJp } from '../lib/datetime.js';
import { isRegularClosedDay, nekoyaDateTags } from '../lib/nekoya-location.js';

export interface WeekCalendarProps {
  byDate: Record<string, string[]>;
  weekStart: string;
  onPick: (slot: { date: string; start: string }) => void;
  selectedDate?: string;
  selectedStart?: string;
}

const SLOT_MIN = 30;
const DEFAULT_ROWS = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00'];

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function WeekCalendar({
  byDate,
  weekStart,
  onPick,
  selectedDate,
  selectedStart,
}: WeekCalendarProps) {
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const rows = useMemo(() => {
    const set = new Set<number>();
    for (const d of dates) for (const t of byDate[d] ?? []) set.add(toMin(t));
    if (set.size === 0) return DEFAULT_ROWS;
    const min = Math.min(...set);
    const max = Math.max(...set);
    const arr: string[] = [];
    for (let m = min; m <= max; m += SLOT_MIN) arr.push(fromMin(m));
    return arr;
  }, [byDate, dates]);

  const todayJst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <div className="grid min-w-[620px] text-center" style={{ gridTemplateColumns: '44px repeat(7, minmax(0, 1fr))' }}>
        <div className="border-b bg-gray-50" />
        {dates.map((d) => {
          const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
          const isToday = d === todayJst;
          return (
            <div key={d} className="border-b bg-gray-50 px-1 py-2">
              <div className="text-[10px] font-medium text-gray-500">{'日月火水木金土'[dow]}</div>
              <div className={`mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-green-500 text-white' : 'text-gray-800'}`}>
                {Number(d.slice(8))}
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {nekoyaDateTags(d).map((tag) => (
                  <span key={tag.label} className={`rounded-full px-1.5 py-0.5 text-[9px] ${tag.className}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {rows.map((t) => {
          const isHour = t.endsWith(':00');
          return (
            <div key={t} style={{ display: 'contents' }}>
              <div className="flex items-start justify-center border-r text-[10px] text-gray-400" style={{ height: 38, borderTop: isHour ? '1px solid #e5e7eb' : '1px dashed #f3f4f6' }}>
                {isHour ? t : ''}
              </div>
              {dates.map((d) => {
                const available = (byDate[d] ?? []).includes(t);
                const closed = isRegularClosedDay(d);
                const isSelected = available && selectedDate === d && selectedStart === t;
                return (
                  <div key={`${d}-${t}`} className="border-r p-0.5" style={{ height: 38, borderTop: isHour ? '1px solid #e5e7eb' : '1px dashed #f3f4f6' }}>
                    {closed ? (
                      <div className="flex h-full items-center justify-center rounded-md bg-gray-50 text-[10px] text-gray-300">休</div>
                    ) : available ? (
                      <button
                        onClick={() => onPick({ date: d, start: t })}
                        className="h-full w-full rounded-md text-[11px] font-bold tabular-nums active:scale-95"
                        style={{
                          background: isSelected ? '#06C755' : '#ecfdf5',
                          border: isSelected ? '1.5px solid #06C755' : '1px solid #86efac',
                          color: isSelected ? '#fff' : '#047857',
                        }}
                        aria-label={`${formatJp(d)} ${t}`}
                      >
                        {isSelected ? '✓' : t}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
