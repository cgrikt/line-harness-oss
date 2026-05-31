import { isRegularClosedDay } from './availability.js';

export type NekoyaSurveyAnswers = Record<string, unknown>;

export type NekoyaTagDefinition = {
  id: string;
  name: string;
  color: string;
};

export type NekoyaBookingValidationInput = {
  menuName: string;
  price: number;
  startJstDate: string;
  startJstHHMM: string;
  customerNote?: string | null;
};

export type NekoyaBookingValidationResult =
  | { ok: true; normalizedPrice: number }
  | { ok: false; error: 'customer_note_not_allowed' | 'regular_holiday' | 'outside_booking_window' };

const NEKOYA_MIN_PRICE = 10_000;
const NEKOYA_FIRST_PRICE = 3_000;
const NEKOYA_START_MINUTES = 21 * 60;
const NEKOYA_END_MINUTES = 24 * 60;
const NEKOYA_FIRST_LATEST_START_MINUTES = 23 * 60;

function includesText(value: unknown, needle: string): boolean {
  if (Array.isArray(value)) return value.some((item) => includesText(item, needle));
  return String(value ?? '').includes(needle);
}

function hhmmToMinutes(hhmm: string) {
  const [hourText, minuteText] = hhmm.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function normalizeNekoyaBookingMenuForLiff(menu: { name: string; base_price?: number | null; price?: number | null }) {
  const sourcePrice = Number(menu.base_price ?? menu.price ?? 0);
  const isFirst = menu.name.includes('初回');
  const displayName = menu.name.includes('体入') || menu.name.includes('体験')
    ? '１時間の体験入店'
    : menu.name.includes('指名')
      ? '指名予約'
      : '来店予約';
  return {
    displayName,
    minPrice: isFirst ? NEKOYA_FIRST_PRICE : NEKOYA_MIN_PRICE,
    displayPrice: isFirst ? NEKOYA_FIRST_PRICE : Math.max(sourcePrice, NEKOYA_MIN_PRICE),
    copy: isFirst
      ? '初回プランでのご来店受付は23時までとなっております。火曜・末日は定休日です。'
      : '予約は最低1万円、21:00〜24:00で受け付けます。火曜・末日は定休日です。',
  };
}

export function isNekoyaBookingSlotAllowedForMenu(menuName: string, startJstHHMM: string): boolean {
  const minutes = hhmmToMinutes(startJstHHMM);
  if (minutes === null || minutes < NEKOYA_START_MINUTES || minutes > NEKOYA_END_MINUTES) return false;
  if (menuName.includes('初回') && minutes > NEKOYA_FIRST_LATEST_START_MINUTES) return false;
  return true;
}

export function validateNekoyaBookingRequest(input: NekoyaBookingValidationInput): NekoyaBookingValidationResult {
  if (input.customerNote && input.customerNote.trim()) return { ok: false, error: 'customer_note_not_allowed' };
  if (isRegularClosedDay(input.startJstDate)) return { ok: false, error: 'regular_holiday' };
  if (!isNekoyaBookingSlotAllowedForMenu(input.menuName, input.startJstHHMM)) {
    return { ok: false, error: 'outside_booking_window' };
  }
  if (input.menuName.includes('初回')) return { ok: true, normalizedPrice: NEKOYA_FIRST_PRICE };
  return { ok: true, normalizedPrice: Math.max(input.price, NEKOYA_MIN_PRICE) };
}

export function deriveNekoyaSurveyTagDefinitions(answers: NekoyaSurveyAnswers): NekoyaTagDefinition[] {
  const tags: NekoyaTagDefinition[] = [];
  const push = (tag: NekoyaTagDefinition) => {
    if (!tags.some((item) => item.id === tag.id)) tags.push(tag);
  };

  if (includesText(answers.met_before, 'ない')) {
    push({ id: 'nekoya.survey.met_before.no', name: '猫屋アンケート: 初対面', color: '#38BDF8' });
  } else if (includesText(answers.met_before, 'ある')) {
    push({ id: 'nekoya.survey.met_before.yes', name: '猫屋アンケート: 来店/接点あり', color: '#22C55E' });
  }

  if (includesText(answers.desired_mood, '話しやすさ') || includesText(answers.desired_mood, '落ち着き')) {
    push({ id: 'nekoya.survey.mood.calm', name: '猫屋アンケート: 落ち着き重視', color: '#60A5FA' });
  } else if (includesText(answers.desired_mood, '盛り上がり') || includesText(answers.desired_mood, 'ワイワイ')) {
    push({ id: 'nekoya.survey.mood.party', name: '猫屋アンケート: 盛り上がり重視', color: '#F97316' });
  } else if (includesText(answers.desired_mood, 'ビジュ') || includesText(answers.desired_mood, 'ルックス')) {
    push({ id: 'nekoya.survey.mood.visual', name: '猫屋アンケート: ビジュ重視', color: '#EC4899' });
  }

  if (includesText(answers.budget, '10万円以上')) {
    push({ id: 'nekoya.survey.budget.high', name: '猫屋アンケート: 予算10万円以上', color: '#A855F7' });
  }

  const intentText = [answers.intent, answers.purpose, answers.recruiting_intent, answers.desired_action].map((value) => String(value ?? '')).join(' ');
  if (intentText.includes('体験入店') || intentText.includes('体入') || intentText.includes('求人')) {
    push({ id: 'nekoya.survey.intent.recruiting', name: '猫屋アンケート: 体入/求人CTA', color: '#F59E0B' });
  } else if (intentText.includes('予約') || intentText.includes('会')) {
    push({ id: 'nekoya.survey.intent.booking', name: '猫屋アンケート: 来店予約CTA', color: '#06C755' });
  }

  return tags;
}

function flexButton(label: string, action: Record<string, unknown>) {
  return { type: 'button', style: 'primary', color: '#111827', action: { label, ...action } };
}

export function buildNekoyaSurveyCtaMessage(answers: NekoyaSurveyAnswers) {
  const isRecruiting = deriveNekoyaSurveyTagDefinitions(answers).some((tag) => tag.id === 'nekoya.survey.intent.recruiting');
  const primary = isRecruiting
    ? { label: '体験入店の日程を見る', text: '会ってみる' }
    : { label: '会える日を見る', text: '会ってみる' };
  return {
    type: 'flex',
    altText: '猫屋シキ: 回答に合わせた次の入口',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#111827',
        paddingAll: '18px',
        contents: [{ type: 'text', text: '回答ありがとうございます', color: '#ffffff', weight: 'bold', size: 'lg', wrap: true }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          { type: 'text', text: isRecruiting ? '体験入店の相談に進めます。まず日程だけ確認でも大丈夫です。' : '希望に近い案内に寄せます。まず予定の確認だけでも大丈夫です。', size: 'sm', wrap: true, color: '#374151' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '18px',
        contents: [
          flexButton(primary.label, { type: 'message', text: primary.text }),
          flexButton('プロフィールを見る', { type: 'message', text: '近況をのぞく' }),
        ],
      },
    },
  };
}

export function isNekoyaSurveyAnswers(answers: NekoyaSurveyAnswers) {
  return 'desired_mood' in answers || 'met_before' in answers || 'budget' in answers || 'recruiting_intent' in answers;
}
