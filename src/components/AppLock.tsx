"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  checkPin,
  clearLock,
  fingerprintAvailable,
  hasFingerprint,
  hasPin,
  markUnlocked,
  needsUnlock,
  registerFingerprint,
  setPin,
  touch,
  unlockWithFingerprint,
} from "@/lib/lock";
import styles from "./AppLock.module.css";

const noop = () => () => {};
const MAX_TRIES = 5;

type Mode = "setup" | "confirm" | "finger" | "locked" | "open";

export default function AppLock({ children }: { children: React.ReactNode }) {
  // 잠금 상태는 이 기기 저장소에 있어서 브라우저에서만 판단
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  if (!onClient) return null;
  return <Lock>{children}</Lock>;
}

function Lock({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => (!hasPin() ? "setup" : needsUnlock() ? "locked" : "open"));
  const [digits, setDigits] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [canFinger, setCanFinger] = useState(false);

  // 앱을 1분 넘게 벗어났다 돌아오면 다시 잠금
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") touch();
      else if (needsUnlock()) {
        setDigits("");
        setError("");
        setMode("locked");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let alive = true;
    fingerprintAvailable().then((ok) => alive && setCanFinger(ok));
    return () => {
      alive = false;
    };
  }, []);

  // 잠겨 있어도 화면은 뒤에서 미리 그려둠 → 비밀번호 푸는 동안 일정이 다 불러와짐
  const behind = (
    <div inert={mode !== "open"} aria-hidden={mode !== "open"}>
      {children}
    </div>
  );
  if (mode === "open") return behind;

  async function logout() {
    clearLock();
    await createClient().auth.signOut();
    router.replace("/login");
  }

  function open() {
    markUnlocked();
    setDigits("");
    setError("");
    setTries(0);
    setMode("open");
  }

  async function complete(pin: string) {
    setBusy(true);
    try {
      if (mode === "setup") {
        setFirstPin(pin);
        setMode("confirm");
      } else if (mode === "confirm") {
        if (pin !== firstPin) {
          setError("두 번 입력한 게 달라. 처음부터 다시 해줘");
          setFirstPin("");
          setMode("setup");
        } else {
          await setPin(pin);
          if (canFinger) setMode("finger");
          else open();
        }
      } else if (mode === "locked") {
        if (await checkPin(pin)) open();
        else {
          const t = tries + 1;
          setTries(t);
          if (t >= MAX_TRIES) await logout();
          else setError(`틀렸어 (${t}/${MAX_TRIES})`);
        }
      }
    } finally {
      setDigits("");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    setError("");
    const next = (digits + d).slice(0, 4);
    setDigits(next);
    if (next.length === 4) void complete(next);
  }

  async function finger() {
    if (await unlockWithFingerprint()) open();
    else setError("지문 확인이 안 됐어. 비밀번호로 열어줘");
  }

  async function enableFinger() {
    setBusy(true);
    const ok = await registerFingerprint("Fable");
    setBusy(false);
    if (!ok) setError("지문 등록이 안 됐어. 나중에 다시 해도 돼");
    open();
  }

  if (mode === "finger") {
    return (
      <>
      {behind}
      <div className={styles.screen}>
        <FingerIcon />
        <h1 className={`hand ${styles.title}`}>지문으로도 열까?</h1>
        <p className={styles.sub}>다음부터 지문 한 번이면 바로 열려</p>
        <div className={styles.choices}>
          <button className={styles.primary} onClick={enableFinger} disabled={busy}>
            지문 쓸래
          </button>
          <button className={styles.ghost} onClick={open}>
            비밀번호만 쓸래
          </button>
        </div>
      </div>
      </>
    );
  }

  const title =
    mode === "setup" ? "비밀번호 4자리 정하기" : mode === "confirm" ? "한 번 더 입력" : "Fable";
  const sub =
    mode === "setup"
      ? "이 폰에서 앱 열 때 쓸 번호야"
      : mode === "confirm"
        ? "확인을 위해 같은 번호를 한 번 더"
        : "비밀번호를 눌러줘";
  const showFinger = mode === "locked" && hasFingerprint();

  return (
    <>
    {behind}
    <div className={styles.screen}>
      <h1 className={`hand ${styles.title}`}>{title}</h1>
      <p className={styles.sub}>{sub}</p>
      <div className={styles.dots} aria-label={`${digits.length}자리 입력됨`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < digits.length ? `${styles.dot} ${styles.on}` : styles.dot} />
        ))}
      </div>
      <p className={styles.error} role="alert">
        {error}
      </p>
      <div className={styles.pad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} className={styles.key} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        {showFinger ? (
          <button className={styles.key} onClick={finger} aria-label="지문으로 열기">
            <FingerIcon small />
          </button>
        ) : (
          <span />
        )}
        <button className={styles.key} onClick={() => press("0")}>
          0
        </button>
        <button
          className={styles.key}
          onClick={() => setDigits((v) => v.slice(0, -1))}
          aria-label="지우기"
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5H9l-6 7 6 7h12z" />
            <path d="M18 9l-6 6M12 9l6 6" />
          </svg>
        </button>
      </div>
      {mode === "locked" && (
        <button className={styles.forgot} onClick={logout}>
          비밀번호를 잊었어 (다시 로그인)
        </button>
      )}
    </div>
    </>
  );
}

function FingerIcon({ small }: { small?: boolean }) {
  const s = small ? 26 : 56;
  return (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--us)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11v3a8 8 0 0 1-1.5 4.7" />
      <path d="M8.5 9.5a3.5 3.5 0 0 1 7 1.5v1a12 12 0 0 1-1 4.8" />
      <path d="M5.5 8.5a7 7 0 0 1 13 2.5v1.5a15 15 0 0 1-.7 4.5" />
      <path d="M6 13.5v-1.5" />
      <path d="M8.6 20.5A9 9 0 0 0 9 18v-5" />
    </svg>
  );
}
