import type { Wish, WishStore } from "./types";

// 개발·테스트용: Supabase 없이 위시리스트 화면을 띄워볼 때만 씀
export function memoryWishStore(seed: { me: string; wishes: Wish[] }): WishStore {
  let wishes = [...seed.wishes];
  let n = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((f) => f());
  const patch = (id: string, p: Partial<Wish>) => {
    wishes = wishes.map((w) => (w.id === id ? { ...w, ...p } : w));
    emit();
  };
  return {
    async me() {
      return { id: seed.me, admin: true };
    },
    async list() {
      return wishes.map((w) => ({ ...w }));
    },
    async add(w) {
      wishes.unshift({ ...w, kind: "etc", id: `w${++n}`, created_by: seed.me, done_on: null, event: null });
      emit();
    },
    async update(id, w) {
      patch(id, w);
    },
    async remove(id) {
      wishes = wishes.filter((w) => w.id !== id);
      emit();
    },
    async schedule(id, date) {
      patch(id, { event: { id: `e${++n}`, date, end_date: date }, done_on: null });
    },
    async unschedule(id) {
      patch(id, { event: null });
    },
    async setDone(id, on) {
      patch(id, on ? { done_on: on } : { done_on: null, event: null });
    },
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  };
}
