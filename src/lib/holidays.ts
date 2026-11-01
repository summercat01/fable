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
  if (name === "1월 1일") return "신정";
  if (name === "기독탄신일") return "크리스마스";
  if (name === "부처님 오신 날") return "부처님오신날";
  if (name === "전국동시지방선거") return "지방선거";
  return name;
}

/** 시트에 보여줄 이름 (어색한 공식 명칭만 바꿈) */
function full(name: string): string {
  return name.replace("기독탄신일", "크리스마스");
}

/** 그날 공휴일 [{짧은 이름, 긴 이름}] — 날짜 숫자 빨강 */
export function holidaysOn(date: string): { short: string; full: string }[] {
  return (ALL[date] ?? []).map((n) => ({ short: short(n), full: full(n) }));
}

/** 쉬는 날은 아니지만 달력에 띄우는 날 — 숫자 색은 그대로 */
const SPECIAL: Record<string, string> = {
  "12-24": "크리스마스 이브",
};

export function specialOn(date: string): string[] {
  const s = SPECIAL[date.slice(5)];
  return s ? [s] : [];
}
