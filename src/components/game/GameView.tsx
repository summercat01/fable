"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/game/GameContext";
import type { Question, QType, Thread } from "@/lib/game/types";
import styles from "./Game.module.css";

type View = "home" | "pick" | "answer" | "done" | "log";
type QueueItem = { q: Question; from: "new" | "inbox" };
type Filter = "all" | "balance" | "whatif" | "same" | "diff" | "hot";

const PER_PAGE = 4;

export const qLine = (q: Question) => (q.type === "balance" ? `${q.a} vs ${q.b}` : q.text ?? "");
const ansText = (q: Question, v: string | null) => (v == null ? "" : q.type === "balance" ? (v === "a" ? q.a : q.b) ?? "" : v);

export default function GameView() {
  const store = useGameStore();
  const [view, setView] = useState<View>("home");
  const [meId, setMeId] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  // 고르기
  const [mode, setMode] = useState<QType>("balance");
  const [drawn, setDrawn] = useState<Question[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  // 답하기
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState({ sent: 0, revealed: 0 });

  // 기록
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([store.meId(), store.threads(), store.remaining()])
      .then(([id, ts, rem]) => {
        if (!alive) return;
        setMeId(id);
        setThreads(ts);
        setRemaining(rem);
        setError("");
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어"));
    return () => {
      alive = false;
    };
  }, [store, tick]);

  useEffect(() => store.subscribe(reload), [store, reload]);

  const inbox = useMemo(() => threads.filter((t) => t.startedBy !== meId && !t.mine), [threads, meId]);
  const sent = useMemo(() => threads.filter((t) => t.startedBy === meId && t.mine && !t.theirs), [threads, meId]);
  const done = useMemo(() => threads.filter((t) => t.mine && t.theirs), [threads]);

  // ── 뽑기 ──
  async function draw(type: QType) {
    setBusy(true);
    setError("");
    try {
      const qs = await store.draw(type, 5, 1); // 5개 중 하나는 19금
      setMode(type);
      setDrawn(qs);
      setSel([]);
      setView("pick");
    } catch {
      setError("질문을 못 불러왔어. 다시 해줘");
    } finally {
      setBusy(false);
    }
  }

  async function reroll() {
    setBusy(true);
    try {
      const keep = drawn.filter((q) => sel.includes(q.id));
      // 19금을 이미 남겨뒀으면 새로 뽑을 땐 19금 없이
      const fresh = await store.draw(mode, 5 - keep.length, keep.some((q) => q.adult) ? 0 : 1);
      setDrawn([...keep, ...fresh.filter((q) => !keep.some((k) => k.id === q.id))]);
    } finally {
      setBusy(false);
    }
  }

  function startAnswering(items: QueueItem[]) {
    setQueue(items);
    setQi(0);
    setAnswers({});
    setDraft("");
    setView("answer");
  }

  // ── 답하기 ──
  const cur = queue[qi];
  const curAns = cur ? answers[cur.q.id] : undefined;
  const isLast = qi === queue.length - 1;
  const canNext = !!cur && (cur.q.type === "balance" ? !!curAns : draft.trim().length > 0);

  async function next() {
    if (!cur || !canNext || busy) return;
    const value = cur.q.type === "balance" ? curAns! : draft.trim().slice(0, 500);
    const all = { ...answers, [cur.q.id]: value };
    setAnswers(all);
    if (!isLast) {
      setQi(qi + 1);
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      let s = 0;
      let r = 0;
      for (const it of queue) {
        if (it.from === "new") {
          await store.start(it.q.id, all[it.q.id]);
          s++;
        } else {
          await store.answer(it.q.id, all[it.q.id]);
          r++;
        }
      }
      setResult({ sent: s, revealed: r });
      setView("done");
      reload();
    } catch {
      setError("저장이 안 됐어. 다시 해줘");
    } finally {
      setBusy(false);
    }
  }

  // ── 기록 ──
  // 19금은 하트 필터에서만 보이고 나머지 목록에선 숨김
  const match = (t: Thread, f: Filter) =>
    f === "hot"
      ? t.question.adult
      : !t.question.adult &&
    (f === "all" ||
    t.question.type === f ||
    (f === "same" && t.question.type === "balance" && t.mine === t.theirs) ||
    (f === "diff" && t.question.type === "balance" && t.mine !== t.theirs));
  const filtered = done.filter((t) => match(t, filter));
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pg = Math.min(page, pages - 1);

  const goHome = () => {
    setView("home");
    setQueue([]);
    setDrawn([]);
    setSel([]);
  };

  // ───────────── 화면 ─────────────
  if (view === "pick") {
    return (
      <div className={styles.wrap}>
        <header className={styles.subHead}>
          <BackBtn onClick={goHome} label="뒤로" />
          <div>
            <h1 className={`hand ${styles.subTitle}`}>{mode === "balance" ? "밸런스 고르기" : "만약에 고르기"}</h1>
            <p className={styles.subNote}>여러 개 골라도 돼</p>
          </div>
        </header>
        <div className={styles.scroll}>
          {drawn.length === 0 && <p className={styles.empty}>남은 질문이 없어</p>}
          {drawn.map((q) => {
            const on = sel.includes(q.id);
            return (
              <button
                key={q.id}
                className={on ? `${styles.card} ${styles.cardOn}` : styles.card}
                aria-pressed={on}
                onClick={() => setSel((s) => (on ? s.filter((x) => x !== q.id) : [...s, q.id]))}
              >
                <span className={on ? `${styles.check} ${styles.checkOn}` : styles.check}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </span>
                {q.type === "balance" ? (
                  <span className={styles.vs}>
                    <strong>{q.a}</strong>
                    <em>VS</em>
                    <strong>{q.b}</strong>
                  </span>
                ) : (
                  <strong className={styles.whatText}>{q.text}</strong>
                )}
              </button>
            );
          })}
        </div>
        <div className={styles.bottomBar}>
          <button className={styles.ghostBtn} onClick={reroll} disabled={busy}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 5v6h-6" />
            </svg>
            다시 뽑기
          </button>
          <button
            className={styles.primaryBtn}
            disabled={!sel.length}
            onClick={() => startAnswering(drawn.filter((q) => sel.includes(q.id)).map((q) => ({ q, from: "new" })))}
          >
            {sel.length ? `${sel.length}개 답하기` : "맘에 드는 걸 골라줘"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "answer" && cur) {
    return (
      <div className={styles.wrap}>
        <header className={styles.answerHead}>
          <BackBtn onClick={goHome} label="그만하기" close />
          <span className={styles.progress}>
            {qi + 1} / {queue.length}
          </span>
        </header>
        <div className={styles.scroll}>
          <span className={cur.q.type === "balance" ? styles.tagBal : styles.tagWhat}>
            {cur.q.type === "balance" ? "밸런스" : "만약에"}
          </span>
          <h1 className={`hand ${styles.qTitle}`}>{cur.q.type === "balance" ? "둘 중 하나만 고른다면?" : cur.q.text}</h1>
          {cur.q.type === "balance" ? (
            <div className={styles.options}>
              {(["a", "b"] as const).map((k, i) => (
                <div key={k} className={styles.optWrap}>
                  {i === 1 && <span className={styles.vsMark}>VS</span>}
                  <button
                    className={curAns === k ? `${styles.opt} ${styles.optOn}` : styles.opt}
                    aria-pressed={curAns === k}
                    onClick={() => setAnswers((a) => ({ ...a, [cur.q.id]: k }))}
                  >
                    {cur.q[k]}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.field}>
              <label htmlFor="what-answer">내 생각</label>
              <textarea
                id="what-answer"
                rows={5}
                maxLength={500}
                value={draft}
                placeholder="편하게 써줘"
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
          )}
          <p className={styles.lockNote}>
            <LockIcon />
            {cur.from === "inbox" ? "상대는 이미 답했어. 내가 답하면 바로 같이 공개돼" : "내 답은 상대가 답할 때까지 가려져"}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <div className={styles.bottomBar}>
          <button className={styles.primaryBtn} onClick={next} disabled={!canNext || busy}>
            {busy ? "보내는 중…" : !isLast ? "다음" : cur.from === "inbox" ? "답하고 공개하기" : "보내기"}
          </button>
        </div>
      </div>
    );
  }

  if (view === "done") {
    const onlyReveal = result.revealed > 0 && result.sent === 0;
    return (
      <div className={`${styles.wrap} ${styles.doneWrap}`}>
        <Logo />
        <h1 className={`hand ${styles.doneTitle}`} role="status">
          {onlyReveal ? "답이 공개됐어!" : `${result.sent}개 보냈어`}
        </h1>
        <p className={styles.subNote}>{onlyReveal ? "기록에서 서로 답을 확인해봐" : "상대가 편할 때 답하면 보여줄게"}</p>
        <button className={`${styles.primaryBtn} ${styles.doneBtn}`} onClick={() => (onlyReveal ? setView("log") : goHome())}>
          {onlyReveal ? "기록 보기" : "확인"}
        </button>
      </div>
    );
  }

  if (view === "log") {
    const FILTERS: { key: Filter; label: string }[] = [
      { key: "all", label: "전체" },
      { key: "balance", label: "밸런스" },
      { key: "whatif", label: "만약에" },
      { key: "same", label: "같은 답" },
      { key: "diff", label: "다른 답" },
      { key: "hot", label: "" },
    ];
    return (
      <div className={styles.wrap}>
        <header className={styles.subHead}>
          <BackBtn onClick={goHome} label="뒤로" />
          <h1 className={`hand ${styles.subTitle}`}>우리 답 기록</h1>
        </header>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? `${styles.filter} ${styles.filterOn}` : styles.filter}
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(0);
              }}
            >
              {f.key === "hot" ? <HeartIcon aria-label="19금" /> : f.label} <span>{done.filter((t) => match(t, f.key)).length}</span>
            </button>
          ))}
        </div>
        <div className={styles.scroll}>
          {!filtered.length && <p className={styles.empty}>해당하는 기록이 없어</p>}
          {filtered.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE).map((t) => {
            const same = t.question.type === "balance" && t.mine === t.theirs;
            return (
              <div key={t.question.id} className={styles.logItem}>
                <div className={styles.logTop}>
                  <span className={t.question.type === "balance" ? styles.tagBal : styles.tagWhat}>
                    {t.question.type === "balance" ? "밸런스" : "만약에"}
                  </span>
                  {t.question.type === "balance" && (
                    <span className={same ? styles.sameBadge : styles.diffBadge}>{same ? "같은 선택" : "다른 선택"}</span>
                  )}
                </div>
                <p className={styles.logQ}>{qLine(t.question)}</p>
                <div className={styles.answers}>
                  <div className={styles.ansMe}>
                    <span>나</span>
                    <p>{ansText(t.question, t.mine)}</p>
                  </div>
                  <div className={styles.ansThem}>
                    <span>상대</span>
                    <p>{ansText(t.question, t.theirs)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.pager}>
          <button onClick={() => setPage(pg - 1)} disabled={pg === 0} aria-label="이전 페이지">
            <Chev dir="left" />
          </button>
          <span>
            {pg + 1} / {pages}
          </span>
          <button onClick={() => setPage(pg + 1)} disabled={pg >= pages - 1} aria-label="다음 페이지">
            <Chev dir="right" />
          </button>
        </div>
      </div>
    );
  }

  // 홈
  const waiting = [
    ...inbox.map((t) => ({ t, hers: true })),
    ...sent.map((t) => ({ t, hers: false })),
  ];
  return (
    <div className={styles.wrap}>
      <header className={styles.homeHead}>
        <h1 className={`hand ${styles.homeTitle}`}>우리 게임</h1>
        {remaining !== null && <span className={styles.remain}>남은 질문 {remaining.toLocaleString("ko-KR")}개</span>}
      </header>

      <div className={styles.bigBtns}>
        <button className={`${styles.big} ${styles.bigBal}`} onClick={() => draw("balance")} disabled={busy}>
          <span>둘 중 하나</span>
          <span>
            <strong className="hand">밸런스</strong>
            <small>5개 뽑기</small>
          </span>
        </button>
        <button className={`${styles.big} ${styles.bigWhat}`} onClick={() => draw("whatif")} disabled={busy}>
          <span>상상해서 답하기</span>
          <span>
            <strong className="hand">만약에</strong>
            <small>5개 뽑기</small>
          </span>
        </button>
      </div>

      <button className={styles.logLink} onClick={() => setView("log")}>
        <span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--us)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4h11l3 3v13H5z" />
            <path d="M9 10h6M9 14h6" />
          </svg>
          둘 다 답한 기록
        </span>
        <span className={styles.logCount}>
          {done.length}개 <Chev dir="right" />
        </span>
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.scroll}>
        <h2 className={styles.sectionTitle}>기다리는 중 · {waiting.length}</h2>
        {!waiting.length && <p className={styles.empty}>기다리는 질문이 없어</p>}
        {waiting.map(({ t, hers }) =>
          hers ? (
            <button
              key={t.question.id}
              className={`${styles.wait} ${styles.waitHers}`}
              onClick={() => startAnswering([{ q: t.question, from: "inbox" }])}
            >
              <span className={styles.waitTop}>
                <span className={styles.whoThem}>상대가 먼저</span>
                <span className={t.question.type === "balance" ? styles.tagBal : styles.tagWhat}>
                  {t.question.type === "balance" ? "밸런스" : "만약에"}
                </span>
                <span className={styles.answerCta}>답하기</span>
              </span>
              <span className={styles.waitQ}>{qLine(t.question)}</span>
            </button>
          ) : (
            <div key={t.question.id} className={styles.wait}>
              <span className={styles.waitTop}>
                <span className={styles.whoMe}>내가 먼저</span>
                <span className={t.question.type === "balance" ? styles.tagBal : styles.tagWhat}>
                  {t.question.type === "balance" ? "밸런스" : "만약에"}
                </span>
              </span>
              <span className={styles.waitQ}>{qLine(t.question)}</span>
              <span className={styles.myAns}>
                <LockIcon />내 답: {ansText(t.question, t.mine)}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function BackBtn({ onClick, label, close }: { onClick: () => void; label: string; close?: boolean }) {
  return (
    <button className={styles.back} onClick={onClick} aria-label={label}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={close ? "M6 6l12 12M18 6L6 18" : "M15 18l-6-6 6-6"} />
      </svg>
    </button>
  );
}

function Chev({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Logo() {
  return (
    <svg aria-hidden="true" width="96" height="96" viewBox="0 0 100 100">
      <defs>
        <clipPath id="gm">
          <circle cx="40" cy="50" r="24" />
        </clipPath>
      </defs>
      <circle cx="40" cy="50" r="24" fill="#2F5F9E" />
      <circle cx="60" cy="50" r="24" fill="#E07B39" />
      <circle cx="60" cy="50" r="24" fill="#C8435A" clipPath="url(#gm)" />
      <path
        d="M50 58 C45 54 42.5 51.2 42.5 48.4 C42.5 46.1 44.3 44.4 46.5 44.4 C48 44.4 49.2 45.2 50 46.4 C50.8 45.2 52 44.4 53.5 44.4 C55.7 44.4 57.5 46.1 57.5 48.4 C57.5 51.2 55 54 50 58 Z"
        fill="#fff"
      />
    </svg>
  );
}

function HeartIcon(props: { "aria-label"?: string }) {
  return (
    <svg role={props["aria-label"] ? "img" : undefined} aria-hidden={props["aria-label"] ? undefined : true} {...props} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.8 1.1 4.9 2.8C13.1 4.1 14.9 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z" />
    </svg>
  );
}

