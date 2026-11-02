"use client";

import { useEffect } from "react";
import { useCalendarStore } from "@/lib/calendar/StoreContext";
import { preloadRange } from "@/lib/calendar/useRange";
import { addDays, fromIso, monthGrid, todayIso } from "@/lib/calendar/dates";
import { useGameStore } from "@/lib/game/GameContext";
import { useWishStore } from "@/lib/wish/WishContext";
import { snap } from "@/lib/snapshot";

/**
 * 앱 켜자마자(시작 화면·잠금 화면 동안) 모든 탭 데이터를 한 번에 불러둠
 * → 홈·캘린더·위시·게임 어디로 가도 로딩 없이 바로
 */
export default function Preload() {
  const cal = useCalendarStore();
  const game = useGameStore();
  const wish = useWishStore();

  useEffect(() => {
    const today = todayIso();
    const { y, m } = fromIso(today);
    const months = [-1, 0, 1].map((d) => {
      const t = new Date(Date.UTC(y, m + d, 1));
      const g = monthGrid(t.getUTCFullYear(), t.getUTCMonth());
      return [g[0].date, g[g.length - 1].date] as const;
    });
    const jobs: Promise<unknown>[] = [
      preloadRange(cal, today, addDays(today, 35)), // 홈
      ...months.map(([f, t]) => preloadRange(cal, f, t)), // 캘린더 이번 달·앞뒤 달
      Promise.all([game.meId(), game.threads(), game.remaining()]).then(([meId, threads, remaining]) => {
        snap.game ??= { meId, threads, remaining };
      }),
      Promise.all([wish.me(), wish.list()]).then(([me, wishes]) => {
        snap.wish ??= { me, wishes };
      }),
    ];
    jobs.forEach((j) => j.catch(() => {}));
  }, [cal, game, wish]);

  return null;
}
