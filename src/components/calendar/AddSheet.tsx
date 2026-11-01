"use client";

import { useState } from "react";
import { addDays, daysBetween, prettyDate, prettyRange } from "@/lib/calendar/dates";
import type { Scope } from "@/lib/calendar/types";
import styles from "./Calendar.module.css";

export default function AddSheet({
  date: initial,
  onClose,
  onSave,
}: {
  date: string;
  onClose: () => void;
  onSave: (e: { date: string; end_date: string; title: string; scope: Scope }) => Promise<void>;
}) {
  const [date, setDate] = useState(initial);
  const [multi, setMulti] = useState(false);
  const [end, setEnd] = useState(() => addDays(initial, 1));
  const endDate = multi ? end : date;
  const nDays = daysBetween(date, endDate) + 1;
  const rangeOk = !multi || (nDays >= 2 && nDays <= 31);
  const [scope, setScope] = useState<Scope>("together");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy || !rangeOk) return;
    setBusy(true);
    setError("");
    try {
      await onSave({ date, end_date: endDate, title: t.slice(0, 60), scope });
    } catch {
      setError("저장이 안 됐어. 다시 해줘");
      setBusy(false);
    }
  }

  const kinds: { key: Scope; label: string; desc: string }[] = [
    { key: "personal", label: "내 일정", desc: "나만 하는 일" },
    { key: "together", label: "같이 하는 일정", desc: "데이트, 약속" },
  ];

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={styles.addSheet}
        role="dialog"
        aria-label="일정 추가"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <div className={styles.sheetHead}>
          <h2>{multi && rangeOk ? prettyRange(date, end) : prettyDate(date)} 일정 추가</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.kinds} role="radiogroup" aria-label="누구 일정">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={scope === k.key}
              className={`${styles.kind} ${scope === k.key ? styles[`kindOn_${k.key}`] : ""}`}
              onClick={() => setScope(k.key)}
            >
              <span className={`${styles.kindDot} ${styles[`kindDot_${k.key}`]}`} />
              <strong>{k.label}</strong>
              <span>{k.desc}</span>
            </button>
          ))}
        </div>

        <label className={styles.fieldLabel} htmlFor="ev-title">
          일정 이름
        </label>
        <input
          id="ev-title"
          className={styles.input}
          value={title}
          maxLength={60}
          autoFocus
          placeholder={scope === "together" ? "예: 영화, 저녁 데이트" : "예: 스터디, 알바"}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className={styles.fieldLabel} htmlFor="ev-date">
          {multi ? "기간" : "날짜"}
        </label>
        <div className={styles.dateRow}>
          <input
            id="ev-date"
            className={styles.input}
            type="date"
            value={date}
            aria-label={multi ? "시작 날짜" : "날짜"}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              // 시작을 옮기면 기간 길이는 그대로 유지
              if (multi) setEnd(addDays(v, Math.max(1, daysBetween(date, end))));
              setDate(v);
            }}
          />
          {multi && (
            <>
              <span className={styles.tilde}>~</span>
              <input
                className={styles.input}
                type="date"
                value={end}
                min={addDays(date, 1)}
                max={addDays(date, 30)}
                aria-label="끝나는 날짜"
                onChange={(e) => e.target.value && setEnd(e.target.value)}
              />
            </>
          )}
        </div>
        <div className={styles.dateRow}>
          <button
            type="button"
            className={multi ? `${styles.multiBtn} ${styles.multiBtnOn}` : styles.multiBtn}
            aria-pressed={multi}
            onClick={() => {
              if (!multi && daysBetween(date, end) < 1) setEnd(addDays(date, 1));
              setMulti(!multi);
            }}
          >
            여러 날
          </button>
          {multi && <span className={styles.days}>{rangeOk ? `${nDays}일` : "끝나는 날을 다시 골라줘"}</span>}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          className={`${styles.save} ${scope === "together" ? styles.save_together : styles.save_personal}`}
          disabled={!title.trim() || busy || !rangeOk}
        >
          {busy ? "저장하는 중…" : scope === "together" ? "같이 하는 일정으로 저장" : "내 일정으로 저장"}
        </button>
      </form>
    </div>
  );
}
