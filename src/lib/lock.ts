// 이 기기 전용 앱 잠금 (4자리 PIN / 지문)
// 로그인 세션과 별개로, 폰을 남이 만졌을 때 바로 못 열게 하는 용도.
// PIN은 원문 대신 솔트를 넣은 해시로만 이 기기에 저장.

const KEY = "fable.lock.v1";
const UNLOCKED_AT = "fable.lock.unlockedAt";
export const RELOCK_AFTER_MS = 60_000; // 앱을 1분 넘게 벗어났다 오면 다시 잠금

type LockData = {
  salt: string;
  hash: string;
  credentialId?: string; // 지문(WebAuthn) 등록했을 때
};

function read(): LockData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LockData) : null;
  } catch {
    return null;
  }
}

function write(d: LockData | null) {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장 못 해도 앱은 계속 쓰게 둠
  }
}

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64(salt), iterations: 150_000 },
    key,
    256,
  );
  return b64(bits);
}

export function hasPin(): boolean {
  return read() !== null;
}

export function hasFingerprint(): boolean {
  return !!read()?.credentialId;
}

export async function setPin(pin: string) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  write({ salt, hash: await hashPin(pin, salt) });
}

export async function checkPin(pin: string): Promise<boolean> {
  const d = read();
  if (!d) return false;
  return (await hashPin(pin, d.salt)) === d.hash;
}

export function clearLock() {
  write(null);
  try {
    sessionStorage.removeItem(UNLOCKED_AT);
  } catch {}
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_AT, String(Date.now()));
  } catch {}
}

/** 지금 잠금 화면을 보여줘야 하는지 */
export function needsUnlock(): boolean {
  if (!hasPin()) return false;
  try {
    const t = Number(sessionStorage.getItem(UNLOCKED_AT) || 0);
    return !t || Date.now() - t > RELOCK_AFTER_MS;
  } catch {
    return true;
  }
}

/** 앱을 쓰는 동안 잠금 타이머를 계속 미룸 */
export function touch() {
  if (!hasPin()) return;
  try {
    if (sessionStorage.getItem(UNLOCKED_AT)) sessionStorage.setItem(UNLOCKED_AT, String(Date.now()));
  } catch {}
}

// ── 지문 (안드로이드 크롬의 화면 잠금 인증 = 지문) ──
export async function fingerprintAvailable(): Promise<boolean> {
  try {
    return (
      typeof PublicKeyCredential !== "undefined" &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export async function registerFingerprint(name: string): Promise<boolean> {
  const d = read();
  if (!d) return false;
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Fable" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name, displayName: name },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "discouraged",
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    write({ ...d, credentialId: b64(cred.rawId) });
    return true;
  } catch {
    return false;
  }
}

export async function unlockWithFingerprint(): Promise<boolean> {
  const id = read()?.credentialId;
  if (!id) return false;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: unb64(id) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!res;
  } catch {
    return false;
  }
}

export function removeFingerprint() {
  const d = read();
  if (d) write({ salt: d.salt, hash: d.hash });
}
