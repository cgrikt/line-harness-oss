import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MenuList from '../components/MenuList.js';
import DateTimePicker from '../components/DateTimePicker.js';
import Confirm from '../components/Confirm.js';
import Done from '../components/Done.js';
import { api, type MenuItem, type StaffItem } from '../lib/api.js';
import { hasLineLogin } from '../lib/liff-auth.js';
import LineOpenGuide from '../components/LineOpenGuide.js';

type Step = 'menu' | 'datetime' | 'confirm' | 'done';

export default function Booking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isPeek = params.get('mode') === 'peek';

  const [step, setStep] = useState<Step>('menu');
  const [menu, setMenu] = useState<MenuItem | null>(null);
  const [staff, setStaff] = useState<StaffItem | null>(null);
  const [slot, setSlot] = useState<{ date: string; start: string } | null>(null);
  const [startEventId, setStartEventId] = useState<string | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  if (!hasLineLogin()) {
    return <LineOpenGuide title="LINEで開くと予約できます" />;
  }

  function exitPeekToBooking() {
    const next = new URLSearchParams(params);
    next.delete('mode');
    navigate({ pathname: '/booking', search: next.toString() }, { replace: true });
    setStep('confirm');
  }

  async function selectMenu(m: MenuItem) {
    setMenu(m);
    setStaff(null);
    setSlot(null);
    setStaffError(null);
    setLoadingStaff(true);
    try {
      const res = await api.staffOf(m.id);
      const first = res.staff[0];
      if (!first) {
        setStaffError('このプランはまだ受付準備中です。LINEで直接送ってください。');
        setStep('menu');
        return;
      }
      setStaff(first);
      api.startBooking({ menu_id: m.id, staff_id: first.id, source: 'liff_booking' })
        .then((res) => setStartEventId(res.start_event_id))
        .catch((err) => console.warn('[booking] start event failed:', err));
      setStep('datetime');
    } catch (e) {
      setStaffError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingStaff(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md p-4 pb-12">
      {step === 'menu' && (
        <>
          <MenuList onSelect={selectMenu} />
          {loadingStaff && <p className="mt-3 text-sm text-gray-500">空き枠を準備中...</p>}
          {staffError && <p className="mt-3 text-sm text-red-600">{staffError}</p>}
        </>
      )}
      {step === 'datetime' && menu && staff && (
        <DateTimePicker
          menuId={menu.id}
          staffId={staff.id}
          ctaLabel={isPeek ? '空き状況の確認モードです' : '日時を選ぶと確認画面に進みます'}
          onSelect={(picked) => {
            setSlot(picked);
            if (!isPeek) setStep('confirm');
          }}
          onBack={() => setStep('menu')}
        />
      )}
      {step === 'datetime' && isPeek && slot && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4">
          <p className="mb-2 text-sm text-gray-600">
            選択中: {slot.date} {slot.start}
          </p>
          <p className="mb-3 text-xs text-gray-500">
            24時からの受付もあります。
          </p>
          <button
            onClick={exitPeekToBooking}
            className="w-full rounded bg-green-600 py-3 font-semibold text-white"
          >
            この時間で予約に進む
          </button>
        </div>
      )}
      {step === 'confirm' && menu && staff && slot && (
        <Confirm
          menu={menu}
          staff={staff}
          slot={slot}
          startEventId={startEventId}
          onSubmitted={() => setStep('done')}
          onBack={() => setStep('datetime')}
        />
      )}
      {step === 'done' && <Done />}
    </div>
  );
}
