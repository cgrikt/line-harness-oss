export function nekoyaLocationLabel(): string {
  return '名古屋中心';
}

export function nekoyaLocationNote(): string {
  return '通常は名古屋中心です。新宿でのご相談は火曜のみ個別に調整します。';
}

export function nekoyaDateTags(date: string): Array<{ label: string; className: string }> {
  const closed = isRegularClosedDay(date);
  if (closed) return [{ label: '定休', className: 'bg-gray-100 text-gray-500' }];
  return [
    { label: '名古屋中心', className: 'bg-emerald-50 text-emerald-700' },
  ];
}

export function isRegularClosedDay(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek === 2) return true;
  const next = new Date(d);
  next.setUTCDate(d.getUTCDate() + 1);
  return next.getUTCDate() === 1;
}
