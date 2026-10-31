"use client";

import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

export default function LoginPage() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className={`app-shell ${styles.wrap}`}>
      <svg role="img" aria-label="Fable 로고" width="140" height="140" viewBox="0 0 100 100">
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
      <button className={styles.kakao} onClick={signIn}>
        카카오로 시작하기
      </button>
    </div>
  );
}
