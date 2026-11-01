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
    async draw(type: QType, n: number) {
      const used = taken();
      const pool = questions.filter((q) => q.type === type && !used.has(q.id));
      const picked = [...pool.filter((q) => !seen.has(q.id)), ...pool.filter((q) => seen.has(q.id))].slice(0, n);
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
