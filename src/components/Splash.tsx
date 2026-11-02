"use client";

import { useEffect, useState } from "react";
import styles from "./Splash.module.css";

/**
 * 앱 켤 때 한 번: 파랑·주황 원이 모여서 겹친 곳이 분홍 + 하트 → "Fable"
 * 서버 HTML에 바로 들어가 있어서 첫 화면부터 보이고, 그동안 뒤에서 데이터를 불러옴
 */
export default function Splash() {
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 설치한 앱은 폰 시작 화면을 이미 봤으니 짧게 이어서 끝냄
    const app = window.matchMedia("(display-mode: standalone)").matches;
    const show = quick ? 400 : app ? 1100 : 1500;
    const t1 = setTimeout(() => setPhase("out"), show);
    const t2 = setTimeout(() => setPhase("gone"), show + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={phase === "out" ? `${styles.splash} ${styles.out}` : styles.splash} aria-hidden="true">
      {/* 설치한 앱으로 켜면 폰이 먼저 아이콘(흰 원)을 보여줌 → 그 모습에서 그대로 이어지게 */}
      <span className={styles.disc} />
      <svg className={styles.logo} width="132" height="132" viewBox="0 0 100 100">
        <defs>
          <clipPath id="splash-l">
            <circle cx="40" cy="50" r="24" />
          </clipPath>
        </defs>
        <circle className={styles.left} cx="40" cy="50" r="24" fill="#2F5F9E" />
        <circle className={styles.right} cx="60" cy="50" r="24" fill="#E07B39" />
        <g className={styles.overlap}>
          <circle cx="60" cy="50" r="24" fill="#C8435A" clipPath="url(#splash-l)" />
        </g>
        <path
          className={styles.heart}
          d="M50 58 C45 54 42.5 51.2 42.5 48.4 C42.5 46.1 44.3 44.4 46.5 44.4 C48 44.4 49.2 45.2 50 46.4 C50.8 45.2 52 44.4 53.5 44.4 C55.7 44.4 57.5 46.1 57.5 48.4 C57.5 51.2 55 54 50 58 Z"
          fill="#fff"
        />
      </svg>
      <p className={`hand ${styles.word}`}>Fable</p>
    </div>
  );
}
