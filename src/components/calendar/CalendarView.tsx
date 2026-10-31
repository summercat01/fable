"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { anniversariesOn } from "@/lib/couple";
import { monthGrid, todayIso, WEEKDAYS, fromIso } from "@/lib/calendar/dates";
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
  kind: "anniv" | "us" | "w" | "h";
  title: string;
  event?: CalEvent;
};

/** 사람 색: 재우(admin) 파랑, 여친(member) 주황. 보는 폰과 상관없이 같은 색 */
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

  const grid = useMemo(() => monthGrid(y, m), [y, m]);
  const from = grid[0].date;
  const to = grid[grid.length - 1].date;
  const data = useRange(store, from, to);

  const people = useMemo(
    () => (data.people ? [data.people.me, data.people.partner].filter(Boolean) : []) as Profile[],
    [data.people],
  );
  const admin = people.find((p) => p.role === "admin");
  const member = people.find((p) => p.role === "member");

  // 날짜별로 묶기
  const byDate = useMemo(() => {
    const items = new Map<string, Item[]>();
    const shift = new Map<string, ShiftCode>();
    for (const s of data.shifts) if (s.user_id === member?.id) shift.set(s.date, s.code);
    for (const e of data.events) {
      const k = kindOf(e, people);
      const list = items.get(e.date) ?? [];
      list.push({ key: e.id, kind: k, title: e.title, event: e });
      items.set(e.date, list);
    }
    return { items, shift };
  }, [data.events, data.shifts, people, member]);

  function itemsFor(date: string): Item[] {
    const { y: yy, m: mm, d } = fromIso(date);
    const anniv: Item[] = anniversariesOn(yy, mm, d).map((t) => ({ key: `a-${t}`, kind: "anniv", title: t }));
    const ev = (byDate.items.get(date) ?? []).filter(
      (i) => (i.kind === "us" && filter.us) || (i.kind === "w" && filter.me) || (i.kind === "h" && filter.her),
    );
    const order = { anniv: 0, us: 1, w: 2, h: 3 };
    return [...anniv, ...ev].sort((a, b) => order[a.kind] - order[b.kind]);
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
  }

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
    { key: "me", label: admin?.display_name ?? "재우", color: "var(--me)" },
    { key: "her", label: member?.display_name ?? "여친", color: "var(--her)" },
    { key: "us", label: "함께", color: "var(--us)" },
  ];

  const cap = grid.length > 35 ? 3 : 4;

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
        </div>
        <DdayBadge />
      </header>

      <div className={styles.chips}>
        {chips.map((c) => (
          <button
            key={c.key}
            className={filter[c.key] ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            aria-pressed={filter[c.key]}
            onClick={() => setFilter((f) => ({ ...f, [c.key]: !f[c.key] }))}
          >
            <span className={styles.swatch} style={{ background: filter[c.key] ? c.color : "#d9c2c9" }} />
            {c.label}
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

      <div className={styles.grid} style={{ gridTemplateRows: `repeat(${grid.length / 7}, minmax(0, 1fr))` }}>
        {grid.map((g) => {
          const items = g.inMonth ? itemsFor(g.date) : [];
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
                    !isToday && g.weekday === 0 && styles.sun,
                    !isToday && g.weekday === 6 && styles.sat,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {g.d}
                </span>
                {shift && <span className={`${styles.shift} ${styles[`shift${shift}`]}`}>{shift}</span>}
              </span>
              {items.slice(0, cap).map((it) => (
                <span key={it.key} className={`${styles.bar} ${styles[`bar_${it.kind}`]}`}>
                  {it.title}
                </span>
              ))}
              {items.length > cap && <span className={styles.more}>+{items.length - cap}</span>}
            </button>
          );
        })}
      </div>

      {sheet === "closed" && (
        <button className={styles.fab} onClick={() => setAdding(selected ?? today)} aria-label="일정 추가">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {sheet !== "closed" && selected && (
        <DaySheet
          date={selected}
          size={sheet}
          onSize={setSheet}
          items={itemsFor(selected)}
          shift={filter.her ? byDate.shift.get(selected) : undefined}
          shiftOwner={member?.display_name ?? "여친"}
          meName={admin?.display_name ?? "재우"}
          free={isFree(selected)}
          meId={data.people?.me.id ?? ""}
          onAdd={() => setAdding(selected)}
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
