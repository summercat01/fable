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

/** 보이는 범위(from~to)의 일정·근무를 불러오고, 다른 폰에서 바뀌면 다시 불러옴 */
export function useRange(store: CalendarStore, from: string, to: string) {
  const [s, setS] = useState<State>({ people: null, events: [], shifts: [], loading: true, error: "" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([store.people(), store.load(from, to)])
      .then(([people, data]) => {
        if (alive) setS({ people, ...data, loading: false, error: "" });
      })
      .catch((e: unknown) => {
        if (alive)
          setS((p) => ({ ...p, loading: false, error: e instanceof Error ? e.message : "불러오지 못했어" }));
      });
    return () => {
      alive = false;
    };
  }, [store, from, to, tick]);

  useEffect(() => store.subscribe(reload), [store, reload]);

  // 다른 앱 갔다가 돌아오면 새로 불러오기
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  return { ...s, reload, setEvents: (fn: (e: CalEvent[]) => CalEvent[]) => setS((p) => ({ ...p, events: fn(p.events) })) };
}
