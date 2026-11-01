"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const TABS = [
  {
    href: "/calendar",
    label: "캘린더",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/wish",
    label: "버킷리스트",
    icon: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  },
  {
    href: "/game",
    label: "게임",
    icon: (
      <path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.8 1.1 4.9 2.8C13.1 4.1 14.9 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21z" />
    ),
  },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="메뉴">
      {TABS.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={active ? `${styles.tab} ${styles.active}` : styles.tab}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              // 캘린더에서 캘린더 탭을 또 누르면 오늘 있는 달로
              if (active && t.href === "/calendar") window.dispatchEvent(new Event("fable:today"));
            }}
          >
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
