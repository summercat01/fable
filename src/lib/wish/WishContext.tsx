"use client";

import { createContext, useContext } from "react";
import { supabaseWishStore } from "./supabaseStore";
import type { WishStore } from "./types";

const Ctx = createContext<WishStore | null>(null);
// 앱 전체에서 하나만 (탭 옮겨도 같은 연결·같은 기억)
let shared: WishStore | null = null;

export function WishStoreProvider({ store, children }: { store: WishStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useWishStore(): WishStore {
  const given = useContext(Ctx);
  return given ?? (shared ??= supabaseWishStore());
}
