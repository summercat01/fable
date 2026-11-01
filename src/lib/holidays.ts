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
  if (name === "기독탄신일") return "성탄절";
  if (name === "부처님 오신 날") return "부처님오신날";
  if (name === "전국동시지방선거") return "지방선거";
  return name;
}

/** 그날 공휴일 [{짧은 이름, 원래 이름}] */
export function holidaysOn(date: string): { short: string; full: string }[] {
  return (ALL[date] ?? []).map((full) => ({ short: short(full), full }));
}
