import { todayKst } from "@/lib/couple";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const pad = (n: number) => String(n).padStart(2, "0");

/** UTC 자정 타임스탬프 → YYYY-MM-DD */
export function iso(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromIso(s: string): { y: number; m: number; d: number; t: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d, t: Date.UTC(y, m - 1, d) };
}

export function todayIso(): string {
  return iso(todayKst());
}

export type GridDay = { date: string; y: number; m: number; d: number; inMonth: boolean; weekday: number };

/** 그 달을 덮는 주 단위 칸 (5주 또는 6주) */
export function monthGrid(y: number, m: number): GridDay[] {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const weeks = Math.ceil((first + daysIn) / 7);
  const out: GridDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const t = Date.UTC(y, m, 1 - first + i);
    const dt = new Date(t);
    out.push({
      date: iso(t),
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth(),
      d: dt.getUTCDate(),
      inMonth: dt.getUTCMonth() === m,
      weekday: i % 7,
    });
  }
  return out;
}

export function weekdayOf(date: string): string {
  return WEEKDAYS[new Date(fromIso(date).t).getUTCDay()];
}

export function prettyDate(date: string): string {
  const { m, d } = fromIso(date);
  return `${m + 1}월 ${d}일 (${weekdayOf(date)})`;
}
