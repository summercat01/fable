"use client";

import { createContext, useContext, useState } from "react";
import { supabaseGameStore } from "./supabaseStore";
import type { GameStore } from "./types";

const Ctx = createContext<GameStore | null>(null);

export function GameStoreProvider({ store, children }: { store: GameStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useGameStore(): GameStore {
  const given = useContext(Ctx);
  const [real] = useState(() => (given ? null : supabaseGameStore()));
  return given ?? real!;
}
