"use client";

import { useState, useSyncExternalStore } from "react";
import { StoreProvider } from "@/lib/calendar/StoreContext";
import { memoryStore, DEMO_HER, DEMO_ME } from "@/lib/calendar/memoryStore";
import { fromIso, iso, todayIso } from "@/lib/calendar/dates";
import type { CalEvent, Shift } from "@/lib/calendar/types";

// Supabase 없이 화면만 확인하는 개발용 가짜 데이터 (이번 달 기준)
function seed() {
  const t = fromIso(todayIso());
  const day = (d: number) => iso(Date.UTC(t.y, t.m, d));
  let n = 0;
  const ev = (d: number, title: string, scope: CalEvent["scope"], by = DEMO_ME.id): CalEvent => ({
    id: `s${++n}`,
    date: day(d),
    title,
    scope,
    created_by: by,
  });
  const events = [
    ev(2, "영화", "together"),
    ev(5, "스터디", "personal"),
    ev(9, "전주 당일치기", "together"),
    ev(12, "과제 마감", "personal"),
    ev(12, "병원 예약", "personal", DEMO_HER.id),
    ev(14, "저녁", "together"),
    ev(17, "카페 투어", "together"),
    ev(20, "팀플 회의", "personal"),
    ev(22, "친구 결혼식", "personal", DEMO_HER.id),
    ev(25, "저녁 데이트", "together"),
    ev(25, "알바", "personal"),
    ev(25, "택배 받기", "personal", DEMO_HER.id),
  ];
  const pattern = ["D", "D", "E", "E", "N", "N", null, null] as const;
  const shifts: Shift[] = [];
  for (let d = 1; d <= 28; d++) {
    const c = pattern[(d + 2) % 8];
    if (c) shifts.push({ user_id: DEMO_HER.id, date: day(d), code: c });
  }
  return { events, shifts };
}

const noop = () => () => {};

export default function DemoStore({ children }: { children: React.ReactNode }) {
  // 날짜를 쓰는 화면이라 브라우저에서만 그림 (실제 앱은 AppLock이 같은 역할)
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  return onClient ? <Inner>{children}</Inner> : null;
}

function Inner({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => memoryStore(seed()));
  return <StoreProvider store={store}>{children}</StoreProvider>;
}
