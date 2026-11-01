import { y2026, y2027 } from "@hyunbinseo/holidays-kr/all";

// 우주항공청 월력요항 기준 공휴일. 다음 해 발표(보통 6월)가 나오면
// `npm i @hyunbinseo/holidays-kr@latest` 하고 여기에 연도만 추가
const YEARS: Record<string, readonly string[]>[] = [y2026, y2027];
const ALL: Record<string, readonly string[]> = Object.assign({}, ...YEARS);

/** 달력 칸에 들어갈 짧은 이름 */
function short(name: string): string {
  if (name.startsWith("대체공휴일")) return "대체공휴일";
  if (name.includes("설날")) return "설날";
  if (name.includes("추석")) return "추석";
  if (name === "1월 1일") return "새해 첫날";
  if (name === "기독탄신일") return "크리스마스";
  if (name === "부처님 오신 날") return "부처님오신날";
  if (name === "전국동시지방선거") return "지방선거";
  return name;
}

/** 시트에 보여줄 이름 (어색한 공식 명칭만 바꿈) */
function full(name: string): string {
  return name.replace("기독탄신일", "크리스마스").replace(/^1월 1일$/, "새해 첫날");
}

const DAY = 86400000;
const shift = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
};
const shortsOn = (date: string) => (ALL[date] ?? []).map(short);

export type Holiday = {
  short: string;
  full: string;
  /** 설날·추석처럼 같은 이름이 이어지면 하나의 띠로 */
  span?: "start" | "mid" | "end";
  /** 이어진 묶음의 첫날 (묶음 구분용) */
  from: string;
};

/** 그날 공휴일 — 날짜 숫자 빨강 */
export function holidaysOn(date: string): Holiday[] {
  return (ALL[date] ?? []).map((n) => {
    const sh = short(n);
    const prev = shortsOn(shift(date, -1)).includes(sh);
    const next = shortsOn(shift(date, 1)).includes(sh);
    let from = date;
    while (shortsOn(shift(from, -1)).includes(sh)) from = shift(from, -1);
    const span = prev && next ? "mid" : prev ? "end" : next ? "start" : undefined;
    return { short: sh, full: full(n), span, from };
  });
}

/** 쉬는 날은 아니지만 달력에 띄우는 날 — 숫자 색은 그대로 */
const SPECIAL: Record<string, string> = {
  "12-24": "크리스마스 이브",
};

export function specialOn(date: string): string[] {
  const s = SPECIAL[date.slice(5)];
  return s ? [s] : [];
}
