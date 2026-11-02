"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalEvent, CalendarStore, People, Shift } from "./types";

type State = {
  people: People | null;
  events: CalEvent[];
  shifts: Shift[];
  loading: boolean;
  error: string;
};

// 달 넘길 때 바로 보이게 최근에 불러온 범위를 기억 (앱 켜져 있는 동안만)
const cache = new Map<string, Omit<State, "loading" | "error">>();
const key = (store: CalendarStore, from: string, to: string) => `${storeId(store)}|${from}|${to}`;
const ids = new WeakMap<CalendarStore, number>();
let nextId = 0;
const storeId = (s: CalendarStore) => {
  if (!ids.has(s)) ids.set(s, ++nextId);
  return ids.get(s)!;
};

/** 보이는 범위(from~to)의 일정·근무를 불러오고, 다른 폰에서 바뀌면 다시 불러옴 */
export function useRange(store: CalendarStore, from: string, to: string, prefetch?: [string, string][]) {
  const [s, setS] = useState<State>(() => {
    const c = cache.get(key(store, from, to));
    return c ? { ...c, loading: false, error: "" } : { people: null, events: [], shifts: [], loading: true, error: "" };
  });
  const [shown, setShown] = useState(`${from}|${to}`);
  // 범위가 바뀌면 기억해둔 게 있으면 즉시 보여주고 뒤에서 새로 불러옴
  if (shown !== `${from}|${to}`) {
    setShown(`${from}|${to}`);
    const c = cache.get(key(store, from, to));
    setS((p) => (c ? { ...c, loading: false, error: "" } : { ...p, events: [], shifts: [], loading: true }));
  }
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([store.people(), store.load(from, to)])
      .then(([people, data]) => {
        cache.set(key(store, from, to), { people, ...data });
        if (alive) setS({ people, ...data, loading: false, error: "" });
        // 옆 달도 미리 불러두기
        for (const [f, t] of prefetch ?? []) {
          if (cache.has(key(store, f, t))) continue;
          store.load(f, t).then((d) => cache.set(key(store, f, t), { people, ...d })).catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (alive)
          setS((p) => ({ ...p, loading: false, error: e instanceof Error ? e.message : "불러오지 못했어" }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefetch는 from/to에서 나오는 값
  }, [store, from, to, tick]);

  useEffect(() => store.subscribe(reload), [store, reload]);

  // 다른 앱 갔다가 돌아오면 새로 불러오기
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  return {
    ...s,
    reload,
    setEvents: (fn: (e: CalEvent[]) => CalEvent[]) =>
      setS((p) => {
        const next = { ...p, events: fn(p.events) };
        cache.delete(key(store, from, to));
        return next;
      }),
  };
}
