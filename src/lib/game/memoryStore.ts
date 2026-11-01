import type { GameStore, Question, QType, Thread } from "./types";

// 개발·테스트용: Supabase 없이 게임 화면을 띄워볼 때만 씀
export function memoryGameStore(questions: Question[], seed: { me: string; partner: string; threads: Thread[] }): GameStore {
  const threads = [...seed.threads];
  const seen = new Set<number>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((f) => f());
  const taken = () => new Set(threads.map((t) => t.question.id));

  return {
    async meId() {
      return seed.me;
    },
    async draw(type: QType, n: number, adult: number) {
      const used = taken();
      const order = (list: Question[]) => [...list.filter((q) => !seen.has(q.id)), ...list.filter((q) => seen.has(q.id))];
      const pool = questions.filter((q) => q.type === type && !used.has(q.id));
      const a = order(pool.filter((q) => q.adult)).slice(0, adult);
      const rest = order(pool.filter((q) => !q.adult && !a.includes(q))).slice(0, n - a.length);
      const picked = [...rest, ...a];
      picked.sort(() => Math.random() - 0.5);
      picked.forEach((q) => seen.add(q.id));
      return picked;
    },
    async threads() {
      return threads.map((t) => ({ ...t, theirs: t.mine ? t.theirs : null }));
    },
    async start(questionId, answer) {
      const q = questions.find((x) => x.id === questionId)!;
      threads.unshift({ question: q, startedBy: seed.me, createdAt: new Date().toISOString(), mine: answer, theirs: null });
      emit();
    },
    async answer(questionId, answer) {
      const t = threads.find((x) => x.question.id === questionId);
      if (t) t.mine = answer;
      emit();
    },
    async remaining() {
      return questions.length - threads.length;
    },
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  };
}
