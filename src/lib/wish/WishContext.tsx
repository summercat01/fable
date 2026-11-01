"use client";

import { createContext, useContext, useState } from "react";
import { supabaseWishStore } from "./supabaseStore";
import type { WishStore } from "./types";

const Ctx = createContext<WishStore | null>(null);

export function WishStoreProvider({ store, children }: { store: WishStore; children: React.ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useWishStore(): WishStore {
  const given = useContext(Ctx);
  const [real] = useState(() => (given ? null : supabaseWishStore()));
  return given ?? real!;
}
