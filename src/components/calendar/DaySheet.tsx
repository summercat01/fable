"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCalendarBase } from "@/lib/calendar/useBase";
import { prettyDate, prettyRange } from "@/lib/calendar/dates";
import type { ShiftCode } from "@/lib/calendar/types";
import { SHIFT_LABEL, type Item } from "./CalendarView";
import styles from "./Calendar.module.css";

const LABEL: Record<Item["kind"], string> = { holiday: "공휴일", special: "특별한 날", anniv: "기념일", us: "함께", w: "", h: "" };

export default function DaySheet({
  date,
  size,
  onSize,
  items,
  shift,
  meIsMember,
  free,
  meId,
  onAdd,
  onDelete,
  onEdit,
}: {
  date: string;
  size: "half" | "full";
  onSize: (s: "closed" | "half" | "full") => void;
  items: Item[];
  shift?: ShiftCode;
  meIsMember: boolean;
  free: boolean;
  meId: string;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (e: NonNullable<Item["event"]>) => void;
}) {
  const startY = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const base = useCalendarBase();

  // 손잡이를 끌어서 크게/작게/닫기
  function down(e: React.PointerEvent) {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function moveP(e: React.PointerEvent) {
    if (startY.current !== null) setDrag(e.clientY - startY.current);
  }
  function up() {
    if (startY.current === null) return;
    const dy = drag;
    startY.current = null;
    setDrag(0);
    if (Math.abs(dy) < 8) onSize(size === "full" ? "half" : "full");
    else if (dy > 60) onSize(size === "full" ? "half" : "closed");
    else if (dy < -60) onSize("full");
  }

  const canDelete = (it: Item) =>
    !!it.event && (it.event.scope === "together" || it.event.created_by === meId);

  return (
    <section
      className={`${styles.sheet} ${size === "full" ? styles.sheetFull : styles.sheetHalf}`}
      style={drag ? { transform: `translateY(${Math.max(drag, -200)}px)`, transition: "none" } : undefined}
      aria-label={`${prettyDate(date)} 일정`}
    >
      <button
        className={styles.handle}
        onPointerDown={down}
        onPointerMove={moveP}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={size === "full" ? "시트 줄이기" : "시트 키우기"}
      >
        <span />
      </button>
      <div className={styles.sheetHead}>
        <h2>{prettyDate(date)}</h2>
        <div className={styles.sheetActions}>
          <button className={styles.addBtn} onClick={onAdd}>
            + 일정
          </button>
          <button className={styles.closeBtn} onClick={() => onSize("closed")} aria-label="닫기">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.sheetBody}>
        {free && (
          <div className={styles.freeNote}>
            <svg className={styles.freeHeart} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.8 1.1 4.9 2.8C13.1 4.1 14.9 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z" />
            </svg>
            <span className={styles.freeText}>
              <strong>둘 다 비는 날</strong>
              <span>데이트 잡아볼까?</span>
            </span>
            <Link href={`${base.replace("/calendar", "/wish")}?date=${date}`} className={styles.freeLink}>
              위시에서 고르기
            </Link>
          </div>
        )}
        {!items.length && !shift && !free && <p className={styles.empty}>아직 일정이 없어</p>}
        {items.map((it) => (
          <div key={it.key} className={styles.row}>
            <span className={`${styles.rowBar} ${styles[`dot_${it.kind}`]}`} />
            {canDelete(it) ? (
              <button className={`${styles.rowText} ${styles.rowEdit}`} onClick={() => onEdit(it.event!)} aria-label={`${it.title} 고치기`}>
              <span className={styles.rowKind}>{LABEL[it.kind] || (it.event?.created_by === meId ? "내 일정" : "상대 일정")}</span>
              <span className={styles.rowTitle}>{it.full ?? it.title}</span>
              {it.span && it.event && <span className={styles.rowRange}>{prettyRange(it.event.date, it.event.end_date)}</span>}
                <svg className={styles.editHint} aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                </svg>
              </button>
            ) : (
              <div className={styles.rowText}>
              <span className={styles.rowKind}>{LABEL[it.kind] || (it.event?.created_by === meId ? "내 일정" : "상대 일정")}</span>
              <span className={styles.rowTitle}>{it.full ?? it.title}</span>
              {it.span && it.event && <span className={styles.rowRange}>{prettyRange(it.event.date, it.event.end_date)}</span>}
              </div>
            )}
            {canDelete(it) &&
              (confirm === it.key ? (
                <button
                  className={styles.delConfirm}
                  onClick={() => {
                    setConfirm(null);
                    onDelete(it.event!.id);
                  }}
                >
                  삭제
                </button>
              ) : (
                <button className={styles.delBtn} onClick={() => setConfirm(it.key)} aria-label={`${it.title} 지우기`}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              ))}
          </div>
        ))}
        {shift && (
          <div className={styles.row}>
            <span className={`${styles.rowBar} ${styles[`dotShift${shift}`]}`} />
            <div className={styles.rowText}>
              <span className={styles.rowKind}>{meIsMember ? "내 근무" : "근무"}</span>
              <span className={styles.rowTitle}>{SHIFT_LABEL[shift]}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
