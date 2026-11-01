"use client";

import { useState, useSyncExternalStore } from "react";
import { StoreProvider } from "@/lib/calendar/StoreContext";
import { memoryStore, DEMO_HER, DEMO_ME } from "@/lib/calendar/memoryStore";
import { fromIso, iso, todayIso } from "@/lib/calendar/dates";
import type { CalEvent, Shift } from "@/lib/calendar/types";
import { GameStoreProvider } from "@/lib/game/GameContext";
import { memoryGameStore } from "@/lib/game/memoryStore";
import type { Question, Thread } from "@/lib/game/types";
import { WishStoreProvider } from "@/lib/wish/WishContext";
import { memoryWishStore } from "@/lib/wish/memoryStore";
import type { Wish } from "@/lib/wish/types";
import questionData from "../../../data/questions.json";

// Supabase 없이 화면만 확인하는 개발용 가짜 데이터 (이번 달 기준)
function seed() {
  const t = fromIso(todayIso());
  const day = (d: number) => iso(Date.UTC(t.y, t.m, d));
  let n = 0;
  const ev = (d: number, title: string, scope: CalEvent["scope"], by = DEMO_ME.id, days = 1): CalEvent => ({
    id: `s${++n}`,
    date: day(d),
    end_date: day(d + days - 1),
    title,
    scope,
    created_by: by,
  });
  const events = [
    ev(2, "영화", "together"),
    ev(5, "스터디", "personal"),
    ev(9, "전주 당일치기", "together"),
    ev(6, "부산 여행", "together", DEMO_ME.id, 3),
    ev(18, "학회", "personal", DEMO_HER.id, 2),
    ev(12, "과제 마감", "personal"),
    ev(12, "병원 예약", "personal", DEMO_HER.id),
    ev(14, "저녁", "together"),
    ev(17, "카페 투어", "together"),
    ev(20, "팀플 회의", "personal"),
    ev(22, "친구 결혼식", "personal", DEMO_HER.id),
    ev(25, "저녁 데이트", "together"),
    ev(25, "알바", "personal"),
    ev(25, "택배 받기", "personal", DEMO_HER.id),
    ev(26, "리눅스 2급 2차", "personal"),
    ev(26, "저녁 약속", "together"),
    ev(26, "회의", "personal"),
    ev(26, "헬스", "personal"),
    ev(26, "택배", "personal", DEMO_HER.id),
    ev(26, "엄마 생신 선물", "personal", DEMO_HER.id),
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
  const [game] = useState(() => memoryGameStore(...gameSeed()));
  const [wish] = useState(() => memoryWishStore(wishSeed()));
  return (
    <StoreProvider store={store}>
      <GameStoreProvider store={game}>
        <WishStoreProvider store={wish}>{children}</WishStoreProvider>
      </GameStoreProvider>
    </StoreProvider>
  );
}

function gameSeed(): [Question[], { me: string; partner: string; threads: Thread[] }] {
  type Raw = { id: number; type: string; text?: string; a?: string; b?: string; adult?: boolean; sort_order: number };
  const qs: Question[] = (questionData.items as Raw[])
    .slice()
    .sort((x, y) => x.sort_order - y.sort_order)
    .map((r) => ({ id: r.id, type: r.type as Question["type"], text: r.text ?? null, a: r.a ?? null, b: r.b ?? null, adult: !!r.adult }));
  const bal = qs.filter((q) => q.type === "balance" && !q.adult);
  const wif = qs.filter((q) => q.type === "whatif" && !q.adult);
  const hot = qs.filter((q) => q.adult);
  const t = (q: Question, startedBy: string, mine: string | null, theirs: string | null): Thread => ({
    question: q,
    startedBy,
    createdAt: new Date().toISOString(),
    mine,
    theirs,
  });
  const me = DEMO_ME.id;
  const her = DEMO_HER.id;
  return [
    qs,
    {
      me,
      partner: her,
      threads: [
        t(bal[40], her, null, "a"),
        t(wif[40], her, null, "바다 보이는 데서 한 달 살아보기"),
        t(bal[41], me, "b", null),
        t(bal[42], me, "a", "a"),
        t(wif[41], her, "첫 데이트 때 더 일찍 손잡기", "긴장 덜 하고 더 많이 웃기"),
        t(bal[43], me, "a", "b"),
        t(bal[44], her, "b", "b"),
        t(wif[42], me, "수달", "골든 리트리버"),
        t(bal[45], me, "a", "a"),
        t(hot.find((q) => q.type === "balance")!, her, "a", "b"),
        t(hot.find((q) => q.type === "whatif")!, me, "목소리 들으면 바로 녹아", "눈 마주칠 때"),
      ],
    },
  ];
}

function wishSeed(): { me: string; wishes: Wish[] } {
  const t = fromIso(todayIso());
  const day = (d: number) => iso(Date.UTC(t.y, t.m, d));
  const w = (id: string, kind: Wish["kind"], title: string, by: string, more: Partial<Wish> = {}): Wish => ({
    id,
    kind,
    title,
    memo: null,
    created_by: by,
    done_on: null,
    event: null,
    ...more,
  });
  return {
    me: DEMO_ME.id,
    wishes: [
      w("1", "go", "제주도 한 달 살기", DEMO_ME.id, { memo: "겨울 말고 봄에" }),
      w("2", "eat", "성수동 그 파스타집", DEMO_HER.id, { memo: "웨이팅 앱으로 줄 서기" }),
      w("3", "do", "같이 도자기 만들기", DEMO_HER.id, { event: { id: "e1", date: day(28), end_date: day(28) } }),
      w("4", "do", "한강에서 라면", DEMO_ME.id),
      w("5", "etc", "커플 반지 맞추기", DEMO_HER.id),
      w("6", "go", "경주 야경", DEMO_ME.id, { done_on: day(1) }),
      w("7", "eat", "오마카세 한 번", DEMO_HER.id),
    ],
  };
}
