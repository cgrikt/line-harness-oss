import { getLiffId, isInLineClient } from '../lib/liff-auth.js';

export default function LineOpenGuide({ title = 'LINEで開くと予約できます' }: { title?: string }) {
  const liffId = getLiffId();
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const liffUrl = `https://liff.line.me/${liffId}${currentPath}`;
  const isLine = isInLineClient();

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <section className="w-full space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-green-600">猫屋シキ 公式LINE</p>
          <h1 className="mt-1 text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            予約・キャンセル・日程変更は、本人確認のためLINEアプリ内で進めます。
            下のボタンからLINEで開いてください。
          </p>
        </div>
        <a
          href={liffUrl}
          className="block rounded bg-green-600 py-3 text-center text-sm font-semibold text-white"
        >
          LINEで予約ページを開く
        </a>
        {!isLine && (
          <p className="rounded bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">
            PCや通常ブラウザで開いている場合、LINEログイン画面に進むことがあります。
            その場合はスマホのLINEアプリから開くのが一番確実です。
          </p>
        )}
        <a href="https://vir.jp/nekoya" className="block text-center text-xs text-gray-500 underline">
          プロフィールだけ見る
        </a>
      </section>
    </div>
  );
}
