import type { CalEvent, CalendarStore, Shift } from "./types";

// 개발·테스트용: Supabase 없이 화면을 띄워볼 때만 씀
export const DEMO_ME = { id: "w", role: "admin" as const };
export const DEMO_HER = { id: "h", role: "member" as const };

export function memoryStore(seed: { events: CalEvent[]; shifts: Shift[] }): CalendarStore {
  const events = [...seed.events];
  let shifts = [...seed.shifts];
  let n = 0;
  return {
    async people() {
      return { me: DEMO_ME, partner: DEMO_HER };
    },
    async load(from, to) {
      return {
        events: events.filter((e) => e.date <= to && e.end_date >= from),
        shifts: shifts.filter((s) => s.date >= from && s.date <= to),
      };
    },
    async addEvent(e) {
      const ev = { ...e, id: `m${++n}`, created_by: DEMO_ME.id };
      events.push(ev);
      return ev;
    },
    async updateEvent(id, e) {
      const i = events.findIndex((x) => x.id === id);
      events[i] = { ...events[i], ...e };
      return events[i];
    },
    async deleteEvent(id) {
      const i = events.findIndex((e) => e.id === id);
      if (i >= 0) events.splice(i, 1);
    },
    async saveShifts(userId, changes) {
      for (const c of changes) {
        shifts = shifts.filter((s) => !(s.user_id === userId && s.date === c.date));
        if (c.code) shifts.push({ user_id: userId, date: c.date, code: c.code });
      }
    },
    subscribe() {
      return () => {};
    },
  };
}
