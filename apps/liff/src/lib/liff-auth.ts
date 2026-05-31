import liff from '@line/liff';

let _liffId: string | null = null;
let _lineUserId: string | null = null;
let _idToken: string | null = null;
let _isInClient = false;

const NEKOYA_DEFAULT_LIFF_ID = '2010232797-yJ0Qbyzg';

function resolveLiffId(rawUrl: string): string {
  const url = new URL(rawUrl);
  return (
    url.searchParams.get('liffId') ||
    import.meta.env.VITE_DEFAULT_LIFF_ID ||
    import.meta.env.VITE_LIFF_ID ||
    NEKOYA_DEFAULT_LIFF_ID
  );
}

export async function initLiff(): Promise<void> {
  const liffId = resolveLiffId(window.location.href);
  if (!liffId) {
    throw new Error('LIFF ID not found. Set ?liffId=... or VITE_DEFAULT_LIFF_ID.');
  }
  _liffId = liffId;
  await liff.init({ liffId });
  _isInClient = liff.isInClient();
  if (!liff.isLoggedIn()) {
    if (_isInClient) liff.login();
    return;
  }
  const profile = await liff.getProfile();
  _lineUserId = profile.userId;
  // id_token は Worker 側で LINE Login verify API を叩いて caller を確定するために使う。
  _idToken = liff.getIDToken();
}

export function hasLineLogin(): boolean {
  return Boolean(_idToken);
}

export function isInLineClient(): boolean {
  return _isInClient;
}

export function getLiffId(): string {
  if (!_liffId) throw new Error('LIFF not initialized');
  return _liffId;
}

export function getLineUserId(): string {
  if (!_lineUserId) throw new Error('LIFF not initialized');
  return _lineUserId;
}

export function getIdToken(): string {
  if (!_idToken) throw new Error('LIFF not initialized or id_token not available');
  return _idToken;
}
