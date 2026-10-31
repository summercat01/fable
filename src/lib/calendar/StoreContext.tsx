"use client";

import { createContext, useContext, useState } from "react";
import { supabaseStore } from "./supabaseStore";
import type { CalendarStore } from "./types";

const Ctx = createContext<CalendarStore | null>(null);

/** 테스트에서만 가짜 저장소를 끼워 넣을 때 씀 */
export function StoreProvider({ store, children }: { store: CalendarStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCalendarStore(): CalendarStore {
  const given = useContext(Ctx);
  const [real] = useState(() => (given ? null : supabaseStore()));
  return given ?? real!;
}
