"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWishStore } from "@/lib/wish/WishContext";
import { KINDS, doneDate, type Wish, type WishInput, type WishKind } from "@/lib/wish/types";
import { prettyDate, todayIso } from "@/lib/calendar/dates";
import styles from "./Wish.module.css";

type Tab = "todo" | "done";

const shortDate = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${m}월 ${day}일`;
};

export default function WishView() {
  const store = useWishStore();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const pickDate = params.get("date"); // 캘린더 '둘 다 비는 날'에서 넘어온 날짜
  const calendarHref = path.startsWith("/demo") ? "/demo/calendar" : "/calendar";
  const today = todayIso();

  const [me, setMe] = useState<{ id: string; admin: boolean } | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const [tab, setTab] = useState<Tab>("todo");
  const [kind, setKind] = useState<WishKind | "all">("all");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [editing, setEditing] = useState<Wish | "new" | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([store.me(), store.list()])
      .then(([m, list]) => {
        if (!alive) return;
        setMe(m);
        setWishes(list);
        setLoaded(true);
        setError("");
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어"));
    return () => {
      alive = false;
    };
  }, [store, tick]);

  useEffect(() => store.subscribe(reload), [store, reload]);

  const todo = useMemo(() => wishes.filter((w) => !doneDate(w, today)), [wishes, today]);
  const done = useMemo(
    () =>
      wishes
        .filter((w) => doneDate(w, today))
        .sort((a, b) => doneDate(b, today)!.localeCompare(doneDate(a, today)!)),
    [wishes, today],
  );
  const list = (tab === "todo" ? todo : done).filter((w) => kind === "all" || w.kind === kind);


  async function run(f: () => Promise<void>) {
    setError("");
    try {
      await f();
      reload();
    } catch {
      setError("저장이 안 됐어. 다시 해줘");
    }
  }

  async function pick(w: Wish) {
    if (!pickDate) return;
    await run(() => store.schedule(w.id, pickDate));
    router.push(calendarHref);
  }

  // 체크: 오늘 해본 걸로 / 다시 해볼 것으로
  const toggle = (w: Wish) => run(() => store.setDone(w.id, doneDate(w, today) ? null : today));

  const mine = (w: Wish) => w.created_by === me?.id;
  const dotClass = (w: Wish) => ((mine(w) ? me?.admin : !me?.admin) ? styles.dotMe : styles.dotHer);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={`hand ${styles.title}`}>위시리스트</h1>
        <span className={styles.count}>해본 것 {done.length}개</span>
      </header>

      {pickDate ? (
        <div className={styles.pickBar}>
          <span>
            <strong>{prettyDate(pickDate)}</strong>에 뭐 할까? 하나 골라줘
          </span>
          <button onClick={() => router.push(calendarHref)}>취소</button>
        </div>
      ) : (
        <div className={styles.tabs} role="tablist">
          {(["todo", "done"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? `${styles.tab} ${styles.tabOn}` : styles.tab}
              onClick={() => setTab(t)}
            >
              {t === "todo" ? "해볼 것" : "해본 것"} <span>{t === "todo" ? todo.length : done.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.chips}>
        {[{ key: "all" as const, short: "전체" }, ...KINDS].map((k) => (
          <button
            key={k.key}
            className={kind === k.key ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            aria-pressed={kind === k.key}
            onClick={() => setKind(k.key)}
          >
            {k.key !== "all" && <KindIcon kind={k.key} size={13} />}
            {k.short}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.scroll}>
        {tab === "todo" && !pickDate && (
          <button className={styles.addBtn} onClick={() => setEditing("new")}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            하나 적기
          </button>
        )}

        {loaded && !list.length && (
          <p className={styles.empty}>
            {tab === "done" ? "아직 해본 게 없어. 하나씩 같이 해보자" : "생각날 때 아무거나 적어둬"}
          </p>
        )}

        {list.map((w) => {
          const d = doneDate(w, today);
          const planned = !d && w.event;
          const label = mine(w) ? "내가 적음" : "상대가 적음";
          if (pickDate) {
            return (
              <button key={w.id} className={styles.item} onClick={() => pick(w)} disabled={!!planned}>
                <span className={`${styles.kindBadge} ${styles[`k_${w.kind}`]}`}>
                  <KindIcon kind={w.kind} size={16} />
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>{w.title}</span>
                  {w.memo && <span className={styles.itemMemo}>{w.memo}</span>}
                </span>
                <span className={styles.itemSide}>
                  {planned && <span className={styles.planTag}>{shortDate(w.event!.date)} 예정</span>}
                  <span className={`${styles.dot} ${dotClass(w)}`} aria-label={label} />
                </span>
              </button>
            );
          }
          return (
            <div key={w.id} className={d ? `${styles.item} ${styles.itemDone}` : styles.item}>
              <button
                className={d ? `${styles.check} ${styles.checkOn}` : styles.check}
                aria-pressed={!!d}
                aria-label={d ? `${w.title} 다시 해볼 것으로` : `${w.title} 해봤어`}
                onClick={() => toggle(w)}
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </button>
              <span className={styles.itemText}>
                <span className={styles.itemTop}>
                  <span className={`${styles.kindMini} ${styles[`k_${w.kind}`]}`} aria-hidden="true">
                    <KindIcon kind={w.kind} size={11} />
                  </span>
                  <span className={styles.itemTitle}>{w.title}</span>
                </span>
                {w.memo && <span className={styles.itemMemo}>{w.memo}</span>}
                {d ? (
                  <span className={styles.doneTag}>{shortDate(d)}에 해봤어</span>
                ) : planned ? (
                  <span className={styles.planTag}>{shortDate(w.event!.date)} 예정</span>
                ) : null}
              </span>
              <span className={`${styles.dot} ${dotClass(w)}`} aria-label={label} title={label} />
              <button className={styles.iconBtn} onClick={() => setEditing(w)} aria-label={`${w.title} 고치기`}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                </svg>
              </button>
              {confirmDel === w.id ? (
                <button
                  className={styles.delConfirm}
                  onClick={() => {
                    setConfirmDel(null);
                    void run(() => store.remove(w.id));
                  }}
                >
                  삭제
                </button>
              ) : (
                <button className={styles.iconBtn} onClick={() => setConfirmDel(w.id)} aria-label={`${w.title} 지우기`}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <Edit
          w={editing === "new" ? null : editing}
          defaultKind={kind === "all" ? "do" : kind}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === "new") await store.add(input);
            else await store.update(editing.id, input);
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Edit({
  w,
  defaultKind,
  onClose,
  onSave,
}: {
  w: Wish | null;
  defaultKind: WishKind;
  onClose: () => void;
  onSave: (input: WishInput) => Promise<void>;
}) {
  const [kind, setKind] = useState<WishKind>(w?.kind ?? defaultKind);
  const [title, setTitle] = useState(w?.title ?? "");
  const [memo, setMemo] = useState(w?.memo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ph: Record<WishKind, string> = {
    do: "예: 같이 도자기 만들기",
    go: "예: 제주도 한 달 살기",
    eat: "예: 성수동 그 파스타집",
    etc: "예: 커플 반지 맞추기",
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave({ kind, title: title.trim().slice(0, 60), memo: memo.trim() ? memo.trim().slice(0, 200) : null });
    } catch {
      setError("저장이 안 됐어. 다시 해줘");
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form className={styles.sheet} role="dialog" aria-label={w ? "고치기" : "하나 적기"} onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className={styles.sheetHead}>
          <h2>{w ? "고치기" : "하나 적기"}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.kindGrid} role="radiogroup" aria-label="종류">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={kind === k.key}
              className={kind === k.key ? `${styles.kindOpt} ${styles[`k_${k.key}`]} ${styles.kindOptOn}` : styles.kindOpt}
              onClick={() => setKind(k.key)}
            >
              <KindIcon kind={k.key} size={16} />
              {k.label}
            </button>
          ))}
        </div>

        <label className={styles.label} htmlFor="wish-title">
          뭐야?
        </label>
        <input
          id="wish-title"
          className={styles.input}
          value={title}
          maxLength={60}
          autoFocus={!w}
          placeholder={ph[kind]}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className={styles.label} htmlFor="wish-memo">
          메모 <span>(선택)</span>
        </label>
        <input
          id="wish-memo"
          className={styles.input}
          value={memo}
          maxLength={200}
          placeholder="위치, 링크, 아무 말"
          onChange={(e) => setMemo(e.target.value)}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.save} disabled={!title.trim() || busy}>
          {busy ? "저장하는 중…" : w ? "고치기" : "적어두기"}
        </button>
      </form>
    </div>
  );
}

export function KindIcon({ kind, size = 16 }: { kind: WishKind; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "do") return <svg {...p}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>;
  if (kind === "go") return <svg {...p}><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
  if (kind === "eat") return <svg {...p}><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8" /></svg>;
  return <svg {...p}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>;
}
