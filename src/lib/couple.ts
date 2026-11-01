// 우리 날짜. 나중에 설정 화면이 생기면 DB(couple_settings)에서 읽어오게 바꿀 예정
export const COUPLE = {
  startDate: "2026-10-27", // 사귄 날
  myBirthday: "11-09", // 관리자(파랑)
  herBirthday: "04-22", // 상대(주황)
} as const;

const DAY = 86_400_000;

/** 한국 시간 기준 오늘 (UTC 자정 타임스탬프로) */
export function todayKst(now = new Date()): number {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
}

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 사귄 날 = D+1 */
export function dayNumber(dateUtc: number): number {
  return Math.round((dateUtc - utc(COUPLE.startDate)) / DAY) + 1;
}

export function dday(now = new Date()): number {
  return dayNumber(todayKst(now));
}

/** 그날의 기념일 이름들 (사귄 날, 100일 단위, 주년, 생일) */
export function anniversariesOn(y: number, m: number, d: number): string[] {
  const out: string[] = [];
  const n = dayNumber(Date.UTC(y, m, d));
  const [sy, sm, sd] = COUPLE.startDate.split("-").map(Number);
  if (n === 1) out.push("사귄 날");
  else if (n > 0 && n % 100 === 0) out.push(`${n}일`);
  if (m === sm - 1 && d === sd && y > sy) out.push(`${y - sy}주년`);
  const [mbm, mbd] = COUPLE.myBirthday.split("-").map(Number);
  const [hbm, hbd] = COUPLE.herBirthday.split("-").map(Number);
  if (m === mbm - 1 && d === mbd) out.push("생일");
  if (m === hbm - 1 && d === hbd) out.push("생일");
  return out;
}

/** 다음 100일 단위까지 남은 날 */
export function nextHundred(now = new Date()): { target: number; left: number } {
  const n = dday(now);
  const target = Math.ceil(n / 100) * 100 || 100;
  return { target, left: target - n };
}
