"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fromIso, monthGrid, todayIso, WEEKDAYS, pad } from "@/lib/calendar/dates";
import { useCalendarStore } from "@/lib/calendar/StoreContext";
import { useRange } from "@/lib/calendar/useRange";
import { useCalendarBase } from "@/lib/calendar/useBase";
import type { ShiftCode } from "@/lib/calendar/types";
import { Chevron } from "./CalendarView";
import styles from "./Shift.module.css";

const BRUSHES: { code: ShiftCode; label: string }[] = [
  { code: "D", label: "데이" },
  { code: "E", label: "이브" },
  { code: "N", label: "나이트" },
];

export default function ShiftEditor() {
  const store = useCalendarStore();
  const router = useRouter();
  const base = useCalendarBase();
  // 근무표는 보통 월말에 다음 달 것이 나오니까, 기본은 다음 달
  const [{ y, m }, setYM] = useState(() => {
    const t = fromIso(todayIso());
    const n = new Date(Date.UTC(t.y, t.m + 1, 1));
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() };
  });
  const [brush, setBrush] = useState<ShiftCode>("D");
  const [edits, setEdits] = useState<Record<string, ShiftCode | null>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const grid = useMemo(() => monthGrid(y, m), [y, m]);
  const from = `${y}-${pad(m + 1)}-01`;
  const to = grid.filter((g) => g.inMonth).at(-1)!.date;
  const data = useRange(store, from, to);
  const member = data.people && [data.people.me, data.people.partner].find((p) => p?.role === "member");

  const saved = useMemo(() => {
    const map: Record<string, ShiftCode> = {};
    for (const s of data.shifts) if (s.user_id === member?.id) map[s.date] = s.code;
    return map;
  }, [data.shifts, member]);

  const current = (date: string): ShiftCode | null => (date in edits ? edits[date] : (saved[date] ?? null));
  const dirty = Object.keys(edits).filter((d) => edits[d] !== (saved[d] ?? null));
  const counts = { D: 0, E: 0, N: 0 } as Record<ShiftCode, number>;
  let workDays = 0;
  for (const g of grid)
    if (g.inMonth) {
      const c = current(g.date);
      if (c) {
        counts[c]++;
        workDays++;
      }
    }
  const daysIn = grid.filter((g) => g.inMonth).length;

  function tap(date: string) {
    const now = current(date);
    setEdits((e) => ({ ...e, [date]: now === brush ? null : brush }));
    setMsg("");
  }

  // 저장 안 한 게 있으면 달 이동 버튼은 잠겨 있음
  function move(delta: number) {
    setYM(({ y, m }) => {
      const t = new Date(Date.UTC(y, m + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });
  }

  async function save() {
    if (!member || !dirty.length) return;
    setBusy(true);
    try {
      await store.saveShifts(
        member.id,
        dirty.map((d) => ({ date: d, code: edits[d] })),
      );
      setEdits({});
      data.reload();
      setMsg(`${m + 1}월 근무표가 캘린더에 들어갔어`);
      setTimeout(() => router.push(base), 900);
    } catch {
      setMsg("저장이 안 됐어. 다시 해줘");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <Link href={base} className={styles.back} aria-label="캘린더로 돌아가기">
          <Chevron dir="left" />
        </Link>
        <div>
          <h1 className={`hand ${styles.title}`}>{data.people?.me.role === "member" ? "내 근무표" : "근무표"}</h1>
          <div className={styles.monthNav}>
            <button onClick={() => move(-1)} aria-label="이전 달" disabled={!!dirty.length}>
              <Chevron dir="left" />
            </button>
            <span>
              {y}년 {m + 1}월
            </span>
            <button onClick={() => move(1)} aria-label="다음 달" disabled={!!dirty.length}>
              <Chevron dir="right" />
            </button>
          </div>
        </div>
      </header>

      <p className={styles.hint}>근무를 고르고 날짜를 눌러줘. 비워둔 날은 오프야.</p>

      <div className={styles.brushes} role="radiogroup" aria-label="근무 종류">
        {BRUSHES.map((b) => (
          <button
            key={b.code}
            role="radio"
            aria-checked={brush === b.code}
            className={`${styles.brush} ${styles[`b${b.code}`]} ${brush === b.code ? styles.brushOn : ""}`}
            onClick={() => setBrush(b.code)}
          >
            <strong>{b.code}</strong>
            <span>{b.label}</span>
            <small>{counts[b.code]}일</small>
          </button>
        ))}
      </div>

      <div className={styles.board}>
        <div className={styles.grid}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`${styles.wd} ${i === 0 ? styles.sun : i === 6 ? styles.sat : ""}`}>
              {w}
            </span>
          ))}
          {grid.map((g) => {
            if (!g.inMonth) return <span key={g.date} />;
            const c = current(g.date);
            return (
              <button
                key={g.date}
                className={`${styles.day} ${c ? styles[`b${c}`] : styles.empty} ${g.weekday === 0 ? styles.sun : g.weekday === 6 ? styles.sat : ""}`}
                onClick={() => tap(g.date)}
                aria-label={`${g.d}일 ${c ? BRUSHES.find((b) => b.code === c)!.label : "오프"}`}
              >
                <span>{g.d}</span>
                <strong>{c ?? ""}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.footer}>
        <span>
          근무 {workDays}일 · 오프 {daysIn - workDays}일
        </span>
        {!!dirty.length && (
          <button className={styles.reset} onClick={() => setEdits({})}>
            되돌리기
          </button>
        )}
      </div>

      <div className={styles.bottom}>
        {msg && (
          <p className={styles.msg} role="status">
            {msg}
          </p>
        )}
        <button className={styles.save} onClick={save} disabled={!dirty.length || busy || !member}>
          {busy ? "저장하는 중…" : dirty.length ? `${m + 1}월 캘린더에 반영 (${dirty.length}일 바뀜)` : "바뀐 날이 없어"}
        </button>
      </div>
    </div>
  );
}
