import { createClient } from "@/lib/supabase/client";
import type { CalEvent, CalendarStore, People, Profile, Shift } from "./types";

export function supabaseStore(): CalendarStore {
  const sb = createClient();
  let peopleP: Promise<People> | null = null;

  return {
    async people(): Promise<People> {
      // 두 사람 정보는 안 바뀌니까 한 번만 불러옴
      peopleP ??= (async () => {
        // 이 폰에 저장된 로그인 정보로 바로 (서버 왕복 한 번 줄임). 세션 검증은 proxy가 이미 함
        const {
          data: { session },
        } = await sb.auth.getSession();
        const { data, error } = await sb.from("profiles").select("id, role");
        if (error) throw error;
        const list = (data ?? []) as Profile[];
        const me = list.find((p) => p.id === session?.user.id);
        if (!me) throw new Error("이 계정이 profiles에 등록돼 있지 않아");
        return { me, partner: list.find((p) => p.id !== me.id) ?? null };
      })().catch((e) => {
        peopleP = null;
        throw e;
      });
      return peopleP;
    },

    async load(from, to) {
      const [ev, sh] = await Promise.all([
        sb
          .from("events")
          .select("id, date, end_date, title, scope, created_by")
          .lte("date", to)
          .gte("end_date", from)
          .order("date")
          .order("created_at"),
        sb.from("shifts").select("user_id, date, code").gte("date", from).lte("date", to),
      ]);
      if (ev.error) throw ev.error;
      if (sh.error) throw sh.error;
      return { events: (ev.data ?? []) as CalEvent[], shifts: (sh.data ?? []) as Shift[] };
    },

    async addEvent(e) {
      const { data, error } = await sb
        .from("events")
        .insert(e)
        .select("id, date, end_date, title, scope, created_by")
        .single();
      if (error) throw error;
      return data as CalEvent;
    },

    async updateEvent(id, e) {
      const { data, error } = await sb
        .from("events")
        .update(e)
        .eq("id", id)
        .select("id, date, end_date, title, scope, created_by")
        .single();
      if (error) throw error;
      return data as CalEvent;
    },

    async deleteEvent(id) {
      const { error } = await sb.from("events").delete().eq("id", id);
      if (error) throw error;
    },

    async saveShifts(userId, changes) {
      const upserts = changes.filter((c) => c.code).map((c) => ({ user_id: userId, date: c.date, code: c.code }));
      const removes = changes.filter((c) => !c.code).map((c) => c.date);
      if (upserts.length) {
        const { error } = await sb.from("shifts").upsert(upserts);
        if (error) throw error;
      }
      if (removes.length) {
        const { error } = await sb.from("shifts").delete().eq("user_id", userId).in("date", removes);
        if (error) throw error;
      }
    },

    subscribe(onChange) {
      const ch = sb
        .channel("calendar")
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, onChange)
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
