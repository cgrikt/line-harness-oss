import { useEffect, useState } from 'react';
import { api, type MenuItem } from '../lib/api.js';
import { nekoyaLocationLabel } from '../lib/nekoya-location.js';

function planLabel(menu: MenuItem) {
  if (menu.name.includes('指名')) return '指名';
  if (menu.name.includes('初回')) return '初回';
  if (menu.name.includes('体入') || menu.name.includes('体験')) return '体入';
  return menu.name.replace(/^プラン:\s*/, '');
}

function priceText(menu: MenuItem) {
  if (menu.name.includes('初回')) return '初回 ¥3,000';
  if (menu.name.includes('指名')) return '60分〜 / 1万円〜';
  if (menu.name.includes('体入') || menu.name.includes('体験')) return '60〜90分ほど';
  return `¥${menu.base_price.toLocaleString()}〜`;
}

function descriptionText(menu: MenuItem) {
  if (menu.name.includes('初回')) {
    return '指名するか迷っている方で、まずは少し話してみてから判断したいという方はこちらから。当日に他の方を指名することも可能です。';
  }
  if (menu.name.includes('指名')) {
    return '僕を指名してくれる方の予約欄です。60分〜、1万円〜。';
  }
  if (menu.name.includes('体入') || menu.name.includes('体験')) {
    return '体験入店として、実際に店内の雰囲気や様子をご覧いただきながら、詳細な条件などをご説明させていただきます。';
  }
  return menu.description ?? '';
}

export default function MenuList({ onSelect }: { onSelect: (m: MenuItem) => void }) {
  const [menus, setMenus] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.menus().then((r) => setMenus(r.menus)).catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!menus) return <div className="text-gray-500">読み込み中...</div>;

  const grouped = new Map<string, MenuItem[]>();
  for (const m of menus) {
    const key = m.category_label ?? 'その他';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">プランを選んでください</h1>
        <p className="mt-1 text-xs text-gray-500">目的に近いものを選んでください。</p>
      </div>
      {[...grouped.entries()].map(([cat, items]) => (
        <section key={cat}>
          <h2 className="mb-2 font-semibold text-gray-700">{cat}</h2>
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m)}
                  className="w-full rounded-lg border p-3 text-left hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">プラン: {planLabel(m)}</div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{nekoyaLocationLabel()}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{descriptionText(m)}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {priceText(m)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
