import { createClient } from "@/lib/supabase/client";
import type { Wish, WishStore } from "./types";

const COLS = "id, kind, title, memo, created_by, done_on, event:events(id, date, end_date)";

export function supabaseWishStore(): WishStore {
  const sb = createClient();
  let mine: { id: string; admin: boolean } | null = null;

  async function me() {
    if (mine) return mine;
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("로그인이 필요해");
    const { data, error } = await sb.from("profiles").select("role").eq("id", user.id).single();
    if (error) throw error;
    mine = { id: user.id, admin: data.role === "admin" };
    return mine;
  }

  const check = ({ error }: { error: unknown }) => {
    if (error) throw error;
  };

  return {
    me,
    async list() {
      const { data, error } = await sb.from("wishes").select(COLS).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Wish[];
    },
    async add(w) {
      check(await sb.from("wishes").insert(w));
    },
    async update(id, w) {
      check(await sb.from("wishes").update(w).eq("id", id));
    },
    async remove(id) {
      check(await sb.from("wishes").delete().eq("id", id));
    },
    async schedule(id, date) {
      const { data: w, error } = await sb.from("wishes").select("title").eq("id", id).single();
      if (error) throw error;
      const ev = await sb
        .from("events")
        .insert({ date, end_date: date, title: w.title, scope: "together" })
        .select("id")
        .single();
      if (ev.error) throw ev.error;
      check(await sb.from("wishes").update({ event_id: ev.data.id, done_on: null }).eq("id", id));
    },
    async unschedule(id) {
      const { data, error } = await sb.from("wishes").select("event_id").eq("id", id).single();
      if (error) throw error;
      // 일정을 지우면 wishes.event_id는 DB가 알아서 비움
      if (data.event_id) check(await sb.from("events").delete().eq("id", data.event_id));
    },
    async setDone(id, on) {
      // 체크 풀면 지난 일정과의 연결도 풀어서 다시 '해볼 것'으로 (캘린더 일정은 그대로)
      check(await sb.from("wishes").update(on ? { done_on: on } : { done_on: null, event_id: null }).eq("id", id));
    },
    subscribe(onChange) {
      const ch = sb
        .channel("wishes")
        .on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, onChange)
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
