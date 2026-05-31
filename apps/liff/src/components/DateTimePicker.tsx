import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { jstToday, addDays, formatJp } from '../lib/datetime.js';
import { isRegularClosedDay, nekoyaDateTags } from '../lib/nekoya-location.js';
import WeekCalendar from './WeekCalendar.js';

export default function DateTimePicker({
  menuId,
  staffId,
  ctaLabel,
  onSelect,
  onBack,
}: {
  menuId: string;
  staffId: string;
  ctaLabel: string;
  onSelect: (s: { date: string; start: string }) => void;
  onBack: () => void;
}) {
  const [from] = useState(jstToday());
  const [to] = useState(addDays(jstToday(), 13));
  const [byDate, setByDate] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<{ date: string; start: string } | null>(null);

  useEffect(() => {
    api
      .availability(menuId, staffId, from, to)
      .then((r) => {
        const slots = r.by_staff[0]?.slots ?? [];
        const grouped: Record<string, string[]> = {};
        for (const s of slots) (grouped[s.date] ??= []).push(s.start);
        setByDate(grouped);
      })
      .catch((e) => setError(String(e)));
  }, [menuId, staffId, from, to]);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(from, i)), [from]);

  function pick(slot: { date: string; start: string }) {
    setSelected(slot);
    onSelect(slot);
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!byDate) return <div className="text-gray-500">空き枠を取得中...</div>;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-gray-500">← 戻る</button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">日時を選んでください</h1>
          <p className="text-xs text-gray-500">{ctaLabel}</p>
          <p className="text-xs text-gray-500">受付は21:00〜24:00。24時からの受付もあります。</p>
        </div>
        <div className="flex shrink-0 rounded-full bg-gray-100 p-1 text-xs">
          <button
            onClick={() => setView('list')}
            className={`rounded-full px-3 py-1 ${view === 'list' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'}`}
          >
            リスト
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`rounded-full px-3 py-1 ${view === 'calendar' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'}`}
          >
            カレンダー
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="space-y-3">
          <WeekCalendar
            byDate={byDate}
            weekStart={from}
            onPick={pick}
            selectedDate={selected?.date}
            selectedStart={selected?.start}
          />
          <WeekCalendar
            byDate={byDate}
            weekStart={addDays(from, 7)}
            onPick={pick}
            selectedDate={selected?.date}
            selectedStart={selected?.start}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => {
            const times = byDate[date] ?? [];
            const closed = isRegularClosedDay(date);
            return (
              <section key={date} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{formatJp(date)}</h2>
                  <div className="flex flex-wrap justify-end gap-1">
                    {nekoyaDateTags(date).map((tag) => (
                      <span key={tag.label} className={`rounded-full px-2 py-1 text-xs ${tag.className}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
                {closed ? (
                  <p className="text-sm text-gray-500">この日はお休みです。</p>
                ) : times.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {times.map((t) => {
                      const isSelected = selected?.date === date && selected?.start === t;
                      return (
                        <button
                          key={t}
                          onClick={() => pick({ date, start: t })}
                          aria-pressed={isSelected}
                          className={`rounded border py-2 text-sm font-medium transition ${
                            isSelected
                              ? 'border-green-700 bg-green-600 text-white shadow-sm'
                              : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">空きなし</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
