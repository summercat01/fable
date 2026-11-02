"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { anniversariesOn } from "@/lib/couple";
import { holidaysOn, specialOn } from "@/lib/holidays";
import { monthGrid, todayIso, WEEKDAYS, fromIso, addDays } from "@/lib/calendar/dates";
import { useCalendarStore } from "@/lib/calendar/StoreContext";
import { useRange } from "@/lib/calendar/useRange";
import { useCalendarBase } from "@/lib/calendar/useBase";
import type { CalEvent, Profile, ShiftCode } from "@/lib/calendar/types";
import DdayBadge from "@/components/DdayBadge";
import DaySheet from "./DaySheet";
import AddSheet from "./AddSheet";
import styles from "./Calendar.module.css";

type Filter = { her: boolean; me: boolean; us: boolean };
export type Item = {
  key: string;
  kind: "holiday" | "special" | "anniv" | "us" | "w" | "h";
  /** 시트에 보여줄 긴 이름 (공휴일) */
  full?: string;
  /** 이어진 공휴일 묶음의 첫날 (레인 순서용) */
  from?: string;
  title: string;
  event?: CalEvent;
  /** 여러 날 일정에서 이 칸의 위치 */
  span?: "start" | "mid" | "end";
};

/** 사람 색: 관리자(admin) 파랑, 상대(member) 주황. 보는 폰과 상관없이 같은 색 */
export const kindOf = (e: CalEvent, people: Profile[]): Item["kind"] =>
  e.scope === "together" ? "us" : people.find((p) => p.id === e.created_by)?.role === "member" ? "h" : "w";

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  D: "데이 07:00–15:00",
  E: "이브닝 15:00–23:00",
  N: "나이트 23:00–07:00",
};

export default function CalendarView() {
  const store = useCalendarStore();
  const base = useCalendarBase();
  const today = todayIso();
  const [{ y, m }, setYM] = useState(() => {
    const t = fromIso(today);
    return { y: t.y, m: t.m };
  });
  const [filter, setFilter] = useState<Filter>({ her: true, me: true, us: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"closed" | "half" | "full">("closed");
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [slide, setSlide] = useState<"" | "next" | "prev">("");

  const grid = useMemo(() => monthGrid(y, m), [y, m]);
  const from = grid[0].date;
  const to = grid[grid.length - 1].date;
  const neighbors = useMemo(
    () =>
      [-1, 1].map((d): [string, string] => {
        const t = new Date(Date.UTC(y, m + d, 1));
        const g = monthGrid(t.getUTCFullYear(), t.getUTCMonth());
        return [g[0].date, g[g.length - 1].date];
      }),
    [y, m],
  );
  const data = useRange(store, from, to, neighbors);

  const people = useMemo(
    () => (data.people ? [data.people.me, data.people.partner].filter(Boolean) : []) as Profile[],
    [data.people],
  );
  const meIsAdmin = data.people?.me.role !== "member";
  const member = people.find((p) => p.role === "member");

  // 날짜별로 묶기
  const byDate = useMemo(() => {
    const items = new Map<string, Item[]>();
    const shift = new Map<string, ShiftCode>();
    for (const s of data.shifts) if (s.user_id === member?.id) shift.set(s.date, s.code);
    for (const e of data.events) {
      const k = kindOf(e, people);
      const last = e.end_date ?? e.date;
      for (let d = e.date; d <= last; d = addDays(d, 1)) {
        const span = e.date === last ? undefined : d === e.date ? "start" : d === last ? "end" : "mid";
        const list = items.get(d) ?? [];
        list.push({ key: e.id, kind: k, title: e.title, event: e, span });
        items.set(d, list);
      }
    }
    return { items, shift };
  }, [data.events, data.shifts, people, member]);

  function itemsFor(date: string): Item[] {
    const { y: yy, m: mm, d } = fromIso(date);
    const anniv: Item[] = [
      ...holidaysOn(date).map(
        (h): Item => ({ key: `h-${h.short}-${h.from}`, kind: "holiday", title: h.short, full: h.full, span: h.span, from: h.from }),
      ),
      ...specialOn(date).map((t): Item => ({ key: `sp-${t}`, kind: "special", title: t })),
      ...anniversariesOn(yy, mm, d).map((t): Item => ({ key: `a-${t}`, kind: "anniv", title: t })),
    ];
    const ev = (byDate.items.get(date) ?? []).filter(
      (i) => (i.kind === "us" && filter.us) || (i.kind === "w" && filter.me) || (i.kind === "h" && filter.her),
    );
    // 여러 날 일정은 위쪽에 고정해서 칸끼리 이어져 보이게
    const order = { holiday: -1, special: -1, anniv: 0, us: 1, w: 2, h: 3 };
    const multi = (i: Item) => (i.span ? 0 : 1);
    return [...anniv, ...ev].sort(
      (a, b) =>
        (a.span ? -2 : order[a.kind] <= 0 ? -1 : multi(a)) - (b.span ? -2 : order[b.kind] <= 0 ? -1 : multi(b)) ||
        (a.event?.date ?? "").localeCompare(b.event?.date ?? "") ||
        order[a.kind] - order[b.kind],
    );
  }

  const isFree = (date: string) =>
    filter.her &&
    filter.me &&
    !byDate.shift.get(date) &&
    !(byDate.items.get(date) ?? []).length &&
    date >= today &&
    !!member;

  function move(delta: number) {
    setYM(({ y, m }) => {
      const t = new Date(Date.UTC(y, m + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });
    setSheet("closed");
    setSelected(null);
    setSlide(delta > 0 ? "next" : "prev");
  }

  // 오늘 있는 달로 돌아가기 (제목 옆 '오늘' 버튼, 또는 아래 캘린더 탭 한 번 더 누르기)
  const now = fromIso(today);
  const isThisMonth = y === now.y && m === now.m;
  const goToday = () => {
    if (y === now.y && m === now.m) return;
    const back = y * 12 + m > now.y * 12 + now.m;
    setYM({ y: now.y, m: now.m });
    setSheet("closed");
    setSelected(null);
    setSlide(back ? "prev" : "next");
  };
  const goTodayRef = useRef(goToday);
  useEffect(() => {
    goTodayRef.current = goToday;
  });
  useEffect(() => {
    const f = () => goTodayRef.current();
    window.addEventListener("fable:today", f);
    return () => window.removeEventListener("fable:today", f);
  }, []);

  // 달력을 좌우로 밀어서 달 넘기기
  const touch = useRef({ x: 0, y: 0, dir: "" as "" | "h" | "v", swiped: false });
  const [dragX, setDragX] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, dir: "", swiped: false };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (!touch.current.dir && Math.hypot(dx, dy) > 10) touch.current.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    if (touch.current.dir === "h") setDragX(dx * 0.5);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (touch.current.dir === "h") {
      touch.current.swiped = true;
      if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
    }
    setDragX(0);
  };
  // 민 다음에 날짜가 눌린 걸로 처리되지 않게
  const onClickCapture = (e: React.MouseEvent) => {
    if (touch.current.swiped) {
      e.stopPropagation();
      e.preventDefault();
      touch.current.swiped = false;
    }
  };

  function pick(date: string, inMonth: boolean) {
    if (!inMonth) {
      // 앞뒤 달 칸을 누르면 그 달로 넘어감
      move(date < `${y}-${String(m + 1).padStart(2, "0")}-01` ? -1 : 1);
      return;
    }
    setSelected(date);
    if (sheet === "closed") setSheet("half");
  }

  const chips: { key: keyof Filter; label: string; color: string }[] = [
    { key: "me", label: meIsAdmin ? "내" : "상대", color: "var(--me)" },
    { key: "her", label: meIsAdmin ? "상대" : "내", color: "var(--her)" },
    { key: "us", label: "함께", color: "var(--us)" },
  ];

  // 칸에 들어가는 줄 수 (5주 달은 칸이 더 큼). 일정이 2개 이하면 두 줄까지, 많으면 한 줄씩
  const lines = grid.length > 35 ? 4 : 5;

  // 여러 날 일정은 주마다 같은 줄(레인)에 놓아서 칸끼리 이어지게
  const cells = grid.map((g) => (g.inMonth ? itemsFor(g.date) : []));
  const lanes: (Item | null)[][] = grid.map(() => []);
  for (let w = 0; w < grid.length; w += 7) {
    const seen = new Map<string, { s: number; e: number; it: Item }>();
    for (let i = w; i < w + 7; i++)
      for (const it of cells[i])
        if (it.span) {
          const r = seen.get(it.key);
          if (r) r.e = i;
          else seen.set(it.key, { s: i, e: i, it });
        }
    const rows: boolean[][] = [];
    // 먼저 시작한 일정이 위, 같으면 긴 게 위 (지난주에서 이어진 띠가 같은 줄을 지키도록)
    const spans = [...seen.entries()].sort(
      ([, x], [, y]) =>
        (x.it.kind === "holiday" ? 0 : 1) - (y.it.kind === "holiday" ? 0 : 1) ||
        (x.it.event?.date ?? x.it.from ?? "").localeCompare(y.it.event?.date ?? y.it.from ?? "") ||
        (y.it.event?.end_date ?? "").localeCompare(x.it.event?.end_date ?? ""),
    );
    for (const [key, { s: a, e: b }] of spans) {
      let lane = 0;
      while (rows[lane]?.slice(a - w, b - w + 1).some(Boolean)) lane++;
      rows[lane] ??= Array(7).fill(false);
      for (let i = a; i <= b; i++) {
        rows[lane][i - w] = true;
        lanes[i][lane] = cells[i].find((x) => x.key === key) ?? null;
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={() => move(-1)} aria-label="이전 달">
            <Chevron dir="left" />
          </button>
          <h1 className={`hand ${styles.month}`}>
            {y}년 {m + 1}월
          </h1>
          <button className={styles.navBtn} onClick={() => move(1)} aria-label="다음 달">
            <Chevron dir="right" />
          </button>
          {!isThisMonth && (
            <button className={styles.todayBtn} onClick={goToday}>
              오늘
            </button>
          )}
        </div>
        <DdayBadge />
      </header>

      <div className={styles.chips}>
        {chips.map((c) => (
          <button
            key={c.key}
            className={styles.heartBtn}
            aria-pressed={filter[c.key]}
            aria-label={`${c.label} 일정 ${filter[c.key] ? "숨기기" : "보이기"}`}
            onClick={() => setFilter((f) => ({ ...f, [c.key]: !f[c.key] }))}
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
              <path
                d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.8 1.1 4.9 2.8C13.1 4.1 14.9 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z"
                fill={filter[c.key] ? c.color : "none"}
                stroke={filter[c.key] ? c.color : "#cdb3bb"}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
        <Link href={`${base}/shifts`} className={styles.shiftLink}>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          근무표
        </Link>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 0 ? styles.sun : i === 6 ? styles.sat : undefined}>
            {w}
          </span>
        ))}
      </div>

      {data.error && <p className={styles.error}>{data.error}</p>}

      <div
        key={`${y}-${m}`}
        className={[styles.grid, slide === "next" ? styles.slideNext : slide === "prev" ? styles.slidePrev : ""].join(" ")}
        style={{
          gridTemplateRows: `repeat(${grid.length / 7}, minmax(0, 1fr))`,
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragX ? "none" : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        {grid.map((g, gi) => {
          const items = cells[gi];
          // 위쪽은 여러 날 레인(빈 줄은 자리만), 그 아래 하루짜리
          const rows: (Item | null)[] = [...Array.from(lanes[gi], (x) => x ?? null), ...items.filter((x) => !x.span)];
          const shift = filter.her ? byDate.shift.get(g.date) : undefined;
          const isToday = g.date === today;
          const isSel = g.date === selected && sheet !== "closed";
          const cls = [
            styles.cell,
            !g.inMonth && styles.out,
            isSel && styles.sel,
            !isSel && g.inMonth && isFree(g.date) && styles.free,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={g.date}
              className={cls}
              onClick={() => pick(g.date, g.inMonth)}
              aria-label={`${g.m + 1}월 ${g.d}일${items.length ? `, 일정 ${items.length}개` : ""}${shift ? `, ${SHIFT_LABEL[shift].split(" ")[0]}` : ""}`}
            >
              <span className={styles.cellTop}>
                <span
                  className={[
                    styles.num,
                    isToday && styles.today,
                    !isToday && (g.weekday === 0 || (g.inMonth && holidaysOn(g.date).length > 0)) && styles.sun,
                    !isToday && g.weekday === 6 && !(g.inMonth && holidaysOn(g.date).length > 0) && styles.sat,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {g.d}
                </span>
                {shift && <span className={`${styles.shift} ${styles[`shift${shift}`]}`}>{shift}</span>}
              </span>
              {(() => {
                const total = rows.filter(Boolean).length;
                const fits = rows.length <= lines;
                const shown = rows.slice(0, fits ? lines : lines - 1);
                const hidden = total - shown.filter(Boolean).length;
                const oneLine = rows.length > 2;
                return (
                  <>
              {shown.map((it, ri) => {
                if (!it) return <span key={`gap${ri}`} className={`${styles.bar} ${styles.gap}`} aria-hidden="true">{"\u00a0"}</span>;
                // 이어지는 칸은 제목 대신 색 띠만 (주가 바뀌거나 달 첫날엔 제목 다시)
                const showTitle = !it.span || it.span === "start" || g.weekday === 0 || g.d === 1;
                return (
                  <span
                    key={it.key}
                    className={[styles.bar, styles[`bar_${it.kind}`], it.span && styles[`span_${it.span}`], oneLine && styles.oneLine]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {showTitle ? it.title : "\u00a0"}
                  </span>
                );
              })}
              {hidden > 0 && <span className={styles.more}>+{hidden}</span>}
                  </>
                );
              })()}
            </button>
          );
        })}
      </div>


      {sheet !== "closed" && selected && (
        <DaySheet
          date={selected}
          size={sheet}
          onSize={setSheet}
          items={itemsFor(selected)}
          shift={filter.her ? byDate.shift.get(selected) : undefined}
          meIsMember={!meIsAdmin}
          free={isFree(selected)}
          meId={data.people?.me.id ?? ""}
          onAdd={() => setAdding(selected)}
          onEdit={setEditing}
          onDelete={async (id) => {
            data.setEvents((list) => list.filter((e) => e.id !== id));
            try {
              await store.deleteEvent(id);
            } finally {
              data.reload();
            }
          }}
        />
      )}

      {adding && (
        <AddSheet
          date={adding}
          onClose={() => setAdding(null)}
          onSave={async (e) => {
            const saved = await store.addEvent(e);
            data.setEvents((list) => [...list, saved]);
            setAdding(null);
            const t = fromIso(e.date);
            if (t.y !== y || t.m !== m) setYM({ y: t.y, m: t.m });
            setSelected(e.date);
            setSheet((s) => (s === "closed" ? "half" : s));
            data.reload();
          }}
        />
      )}

      {editing && (
        <AddSheet
          date={editing.date}
          editing={editing}
          canChangeScope={editing.created_by === data.people?.me.id}
          onClose={() => setEditing(null)}
          onSave={async (e) => {
            const saved = await store.updateEvent(editing.id, e);
            data.setEvents((list) => list.map((x) => (x.id === saved.id ? saved : x)));
            setEditing(null);
            const t = fromIso(e.date);
            if (t.y !== y || t.m !== m) setYM({ y: t.y, m: t.m });
            setSelected(e.date);
            data.reload();
          }}
        />
      )}
    </div>
  );
}

export function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
