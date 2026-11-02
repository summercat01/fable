"use client";

import { createContext, useContext } from "react";
import { supabaseGameStore } from "./supabaseStore";
import type { GameStore } from "./types";

const Ctx = createContext<GameStore | null>(null);
// 앱 전체에서 하나만 (탭 옮겨도 같은 연결·같은 기억)
let shared: GameStore | null = null;

export function GameStoreProvider({ store, children }: { store: GameStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useGameStore(): GameStore {
  const given = useContext(Ctx);
  return given ?? (shared ??= supabaseGameStore());
}
