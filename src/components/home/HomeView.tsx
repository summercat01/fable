"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { COUPLE, anniversariesOn, dday, nextHundred } from "@/lib/couple";
import { addDays, daysBetween, fromIso, prettyDate, todayIso } from "@/lib/calendar/dates";
import { holidaysOn } from "@/lib/holidays";
import { useCalendarStore } from "@/lib/calendar/StoreContext";
import { useRange } from "@/lib/calendar/useRange";
import { useGameStore } from "@/lib/game/GameContext";
import type { CalEvent, ShiftCode } from "@/lib/calendar/types";
import styles from "./Home.module.css";

const SHIFT: Record<ShiftCode, string> = { D: "데이", E: "이브닝", N: "나이트" };
const AHEAD = 14; // 다가오는 날: 2주
const FREE_AHEAD = 35; // 둘 다 비는 날 찾는 범위

type Row = { key: string; kind: "anniv" | "holiday" | "us" | "w" | "h" | "shift"; label: string; title: string; shift?: ShiftCode };

export default function HomeView() {
  const store = useCalendarStore();
  const game = useGameStore();
  const base = usePathname().startsWith("/demo") ? "/demo" : "";
  const today = todayIso();
  const to = addDays(today, FREE_AHEAD);
  const data = useRange(store, today, to);
  const [inbox, setInbox] = useState(0);

  // 상대가 먼저 보낸 질문 수 (있을 때만 보여줌)
  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([game.meId(), game.threads()])
        .then(([id, ts]) => alive && setInbox(ts.filter((t) => t.startedBy !== id && !t.mine).length))
        .catch(() => {});
    void load();
    const off = game.subscribe(load);
    return () => {
      alive = false;
      off();
    };
  }, [game]);

  const me = data.people?.me;
  const meIsAdmin = me?.role !== "member";
  const partnerId = data.people?.partner?.id;
  const memberId = meIsAdmin ? partnerId : me?.id;

  const v = (() => {
    const evOn = (d: string) => data.events.filter((e) => e.date <= d && e.end_date >= d);
    const shiftOn = (d: string) => data.shifts.find((s) => s.user_id === memberId && s.date === d)?.code;
    const who = (e: CalEvent): Row["kind"] => (e.scope === "together" ? "us" : e.created_by === me?.id ? (meIsAdmin ? "w" : "h") : meIsAdmin ? "h" : "w");
    const whoLabel = (e: CalEvent) => (e.scope === "together" ? "함께" : e.created_by === me?.id ? "내 일정" : "상대 일정");
    const birthday = (d: string) => {
      const md = d.slice(5);
      if (md === COUPLE.myBirthday) return meIsAdmin ? "내 생일" : "상대 생일";
      if (md === COUPLE.herBirthday) return meIsAdmin ? "상대 생일" : "내 생일";
      return null;
    };
    const specials = (d: string): Row[] => {
      const { y, m, d: dd } = fromIso(d);
      const out: Row[] = holidaysOn(d)
        .filter((h) => h.span !== "mid" && h.span !== "end")
        .map((h) => ({ key: `h${d}${h.short}`, kind: "holiday", label: "공휴일", title: h.short }));
      for (const a of anniversariesOn(y, m, dd))
        out.push({ key: `a${d}${a}`, kind: "anniv", label: "기념일", title: a === "생일" ? birthday(d) ?? a : a });
      return out;
    };

    // 오늘
    const todayRows: Row[] = [...specials(today)];
    for (const e of evOn(today)) todayRows.push({ key: e.id, kind: who(e), label: whoLabel(e), title: e.title });
    const sh = shiftOn(today);
    if (sh) todayRows.push({ key: "shift", kind: "shift", label: meIsAdmin ? "상대 근무" : "내 근무", title: SHIFT[sh], shift: sh });

    // 다가오는 날: 기념일·생일·같이 하는 일정 (공휴일·각자 일정은 캘린더에서)
    const upcoming: { date: string; row: Row }[] = [];
    for (let i = 1; i <= AHEAD && upcoming.length < 4; i++) {
      const d = addDays(today, i);
      for (const r of specials(d)) if (r.kind === "anniv") upcoming.push({ date: d, row: r });
      for (const e of data.events)
        if (e.scope === "together" && e.date === d) upcoming.push({ date: d, row: { key: e.id, kind: "us", label: "함께", title: e.title } });
    }

    // 다음 둘 다 비는 날: 근무표가 들어간 달만 (안 들어간 달은 다 비어 보이니까)
    const shiftMonths = new Set(data.shifts.filter((s) => s.user_id === memberId).map((s) => s.date.slice(0, 7)));
    let free: string | null = null;
    if (memberId)
      for (let i = 1; i <= FREE_AHEAD; i++) {
        const d = addDays(today, i);
        if (!shiftMonths.has(d.slice(0, 7))) continue;
        if (!shiftOn(d) && !evOn(d).length) {
          free = d;
          break;
        }
      }
    return { todayRows, upcoming: upcoming.slice(0, 4), free };
  })();

  const now = new Date();
  const { target, left } = nextHundred(now);
  const targetDate = addDays(COUPLE.startDate, target - 1);

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <span className={`hand ${styles.dday}`}>D+{dday(now)}</span>
        <span className={styles.next}>
          {target}일까지 {left}일 · {fromIso(targetDate).y !== fromIso(today).y ? `${fromIso(targetDate).y}년 ` : ""}
          {Number(targetDate.slice(5, 7))}월 {Number(targetDate.slice(8))}일
        </span>
      </header>

      {data.error && <p className={styles.error}>{data.error}</p>}

      <Link href={`${base}/calendar`} className={styles.card}>
        <span className={styles.cardHead}>
          <span className={styles.cardTitle}>오늘</span>
          <span className={styles.cardSub}>{prettyDate(today)}</span>
        </span>
        {data.loading && !data.people ? (
          <span className={styles.muted}>불러오는 중…</span>
        ) : v.todayRows.length ? (
          v.todayRows.map((r) => (
            <span key={r.key} className={styles.row}>
              <span className={`${styles.bar} ${r.shift ? styles[`shift${r.shift}`] : styles[`k_${r.kind}`]}`} />
              <span className={styles.rowLabel}>{r.label}</span>
              <span className={styles.rowTitle}>{r.title}</span>
            </span>
          ))
        ) : (
          <span className={styles.muted}>오늘은 비어 있어</span>
        )}
      </Link>

      {v.upcoming.length > 0 && (
        <Link href={`${base}/calendar`} className={styles.card}>
          <span className={styles.cardHead}>
            <span className={styles.cardTitle}>다가오는 날</span>
          </span>
          {v.upcoming.map(({ date, row }) => (
            <span key={row.key} className={styles.row}>
              <span className={`${styles.bar} ${styles[`k_${row.kind}`]}`} />
              <span className={styles.rowDate}>
                {Number(date.slice(5, 7))}/{Number(date.slice(8))}
              </span>
              <span className={styles.rowTitle}>{row.title}</span>
              <span className={styles.left}>D-{daysBetween(today, date)}</span>
            </span>
          ))}
        </Link>
      )}

      {v.free && (
        <Link href={`${base}/wish?date=${v.free}`} className={styles.line}>
          <span>
            다음 둘 다 비는 날 <strong>{prettyDate(v.free)}</strong>
          </span>
          <span className={styles.go}>위시에서 고르기 ›</span>
        </Link>
      )}

      {inbox > 0 && (
        <Link href={`${base}/game`} className={styles.line}>
          <span>
            답할 질문 <strong>{inbox}개</strong>
          </span>
          <span className={styles.go}>›</span>
        </Link>
      )}
    </div>
  );
}
