import { Link, useLocation } from 'react-router-dom';

const LOCATION_GUIDANCE = [
  {
    label: '名古屋',
    area: '愛知・名古屋',
    address: '栄4-3-15 丸美観光ビル 4F',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%A0%844-3-15%20%E4%B8%B8%E7%BE%8E%E8%A6%B3%E5%85%89%E3%83%93%E3%83%AB4F',
  },
];

export default function Done() {
  const { search } = useLocation();
  return (
    <div className="space-y-4 pt-12 text-center">
      <h1 className="text-2xl font-bold">リクエストを送信しました</h1>
      <p className="text-gray-600">
        内容は予約履歴から確認できます。
        <br />
        前日の同じ時間帯にもLINEでお知らせします。
      </p>

      <section className="rounded-2xl border bg-white p-4 text-left shadow-sm" aria-label="出勤場所の住所とマップ">
        <div className="text-center">
          <h2 className="text-base font-bold">出勤場所</h2>
          <p className="mt-1 text-xs text-gray-500">スクショしやすいように、名古屋の住所とマップをまとめています。新宿でのご相談は火曜のみ個別に調整します。</p>
        </div>
        <div className="mt-3 space-y-3">
          {LOCATION_GUIDANCE.map((location) => (
            <div key={location.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">{location.label}</div>
                  <div className="text-xs text-gray-500">{location.area}</div>
                </div>
                <a
                  href={location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white"
                >
                  マップ
                </a>
              </div>
              <p className="mt-2 break-keep text-sm font-medium leading-6 text-gray-800">{location.address}</p>
            </div>
          ))}
        </div>
      </section>

      <Link to={{ pathname: '/booking/history', search }} className="inline-block text-blue-600 underline">
        予約履歴を見る
      </Link>
    </div>
  );
}
