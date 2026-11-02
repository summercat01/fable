"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { idToEmail } from "@/lib/accounts";
import { clearLock } from "@/lib/lock";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim() || !pw) return;
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email: idToEmail(id),
      password: pw,
    });
    setBusy(false);
    if (error) {
      setError("아이디나 비밀번호가 달라");
      return;
    }
    clearLock(); // 새로 로그인하면 이 기기 잠금 번호도 새로 정함
    router.replace("/home");
    router.refresh();
  }

  return (
    <div className={`app-shell ${styles.wrap}`}>
      <svg role="img" aria-label="Fable 로고" width="120" height="120" viewBox="0 0 100 100">
        <defs>
          <clipPath id="lg">
            <circle cx="40" cy="50" r="24" />
          </clipPath>
        </defs>
        <circle cx="40" cy="50" r="24" fill="#2F5F9E" />
        <circle cx="60" cy="50" r="24" fill="#E07B39" />
        <circle cx="60" cy="50" r="24" fill="#C8435A" clipPath="url(#lg)" />
        <path
          d="M50 58 C45 54 42.5 51.2 42.5 48.4 C42.5 46.1 44.3 44.4 46.5 44.4 C48 44.4 49.2 45.2 50 46.4 C50.8 45.2 52 44.4 53.5 44.4 C55.7 44.4 57.5 46.1 57.5 48.4 C57.5 51.2 55 54 50 58 Z"
          fill="#fff"
        />
      </svg>
      <h1 className={`hand ${styles.title}`}>Fable</h1>

      <form className={styles.form} onSubmit={signIn}>
        <label className={styles.label} htmlFor="login-id">
          아이디
        </label>
        <input
          id="login-id"
          className={styles.input}
          autoComplete="username"
          autoCapitalize="none"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <label className={styles.label} htmlFor="login-pw">
          비밀번호
        </label>
        <input
          id="login-pw"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <p className={styles.error} role="alert">
          {error}
        </p>
        <button className={styles.submit} disabled={busy || !id.trim() || !pw}>
          {busy ? "들어가는 중…" : "로그인"}
        </button>
      </form>
      <p className={styles.note}>한 번 로그인하면 이 폰에선 계속 로그인돼 있어</p>
    </div>
  );
}
