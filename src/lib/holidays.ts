import { y2026, y2027 } from "@hyunbinseo/holidays-kr/all";

// 우주항공청 월력요항 기준 공휴일. 다음 해 발표(보통 6월)가 나오면
// `npm i @hyunbinseo/holidays-kr@latest` 하고 여기에 연도만 추가
const YEARS: Record<string, readonly string[]>[] = [y2026, y2027];

// ── 아직 발표 안 된 해: 규칙으로 계산한 예상 (scripts/predict_holidays 참고) ──
// 음력(설·추석·부처님 오신 날) + 대체공휴일 규칙으로 계산. 같은 규칙으로 2026·2027 공식 발표와 100% 일치 확인함
// 2028-10-03은 추석·개천절이 겹쳐서 대체가 이틀(5·6일)로 계산됨 → 실제 발표에서 하루로 나올 수도 있음
// 공식 발표가 나오면 위 YEARS로 옮기고 여기서 지우기
const p2028: Record<string, string[]> = {
  "2028-01-01": [
    "1월 1일"
  ],
  "2028-01-26": [
    "설날 전날"
  ],
  "2028-01-27": [
    "설날"
  ],
  "2028-01-28": [
    "설날 다음 날"
  ],
  "2028-03-01": [
    "3ㆍ1절"
  ],
  "2028-04-12": [
    "국회의원선거"
  ],
  "2028-05-01": [
    "노동절"
  ],
  "2028-05-02": [
    "부처님 오신 날"
  ],
  "2028-05-05": [
    "어린이날"
  ],
  "2028-06-06": [
    "현충일"
  ],
  "2028-07-17": [
    "제헌절"
  ],
  "2028-08-15": [
    "광복절"
  ],
  "2028-10-02": [
    "추석 전날"
  ],
  "2028-10-03": [
    "개천절",
    "추석"
  ],
  "2028-10-04": [
    "추석 다음 날"
  ],
  "2028-10-05": [
    "대체공휴일(추석)"
  ],
  "2028-10-06": [
    "대체공휴일(개천절)"
  ],
  "2028-10-09": [
    "한글날"
  ],
  "2028-12-25": [
    "기독탄신일"
  ]
};
const p2029: Record<string, string[]> = {
  "2029-01-01": [
    "1월 1일"
  ],
  "2029-02-12": [
    "설날 전날"
  ],
  "2029-02-13": [
    "설날"
  ],
  "2029-02-14": [
    "설날 다음 날"
  ],
  "2029-03-01": [
    "3ㆍ1절"
  ],
  "2029-05-01": [
    "노동절"
  ],
  "2029-05-05": [
    "어린이날"
  ],
  "2029-05-07": [
    "대체공휴일(어린이날)"
  ],
  "2029-05-20": [
    "부처님 오신 날"
  ],
  "2029-05-21": [
    "대체공휴일(부처님 오신 날)"
  ],
  "2029-06-06": [
    "현충일"
  ],
  "2029-07-17": [
    "제헌절"
  ],
  "2029-08-15": [
    "광복절"
  ],
  "2029-09-21": [
    "추석 전날"
  ],
  "2029-09-22": [
    "추석"
  ],
  "2029-09-23": [
    "추석 다음 날"
  ],
  "2029-09-24": [
    "대체공휴일(추석)"
  ],
  "2029-10-03": [
    "개천절"
  ],
  "2029-10-09": [
    "한글날"
  ],
  "2029-12-25": [
    "기독탄신일"
  ]
};

const PREDICTED: Record<string, readonly string[]>[] = [p2028, p2029];
const PREDICTED_YEARS = new Set(PREDICTED.flatMap((p) => Object.keys(p).map((k) => k.slice(0, 4))));

const ALL: Record<string, readonly string[]> = Object.assign({}, ...PREDICTED, ...YEARS);

/** 달력 칸에 들어갈 짧은 이름 */
function short(name: string): string {
  if (name.startsWith("대체공휴일")) return "대체공휴일";
  if (name.includes("설날")) return "설날";
  if (name.includes("추석")) return "추석";
  if (name === "1월 1일") return "새해 첫날";
  if (name === "기독탄신일") return "크리스마스";
  if (name === "부처님 오신 날") return "부처님오신날";
  if (name === "전국동시지방선거") return "지방선거";
  if (name === "국회의원선거") return "총선";
  return name;
}

/** 시트에 보여줄 이름 (어색한 공식 명칭만 바꿈) */
function full(name: string): string {
  return name.replace("기독탄신일", "크리스마스").replace(/^1월 1일$/, "새해 첫날");
}

/** 공식 발표 전이라 계산으로 넣은 해인지 */
export function isPredicted(date: string): boolean {
  return PREDICTED_YEARS.has(date.slice(0, 4));
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
    return { short: sh, full: full(n) + (isPredicted(date) ? " (예상)" : ""), span, from };
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
