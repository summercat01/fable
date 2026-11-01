import { createClient } from "@/lib/supabase/client";
import type { GameStore, Question, Thread } from "./types";

type Row = {
  question_id: number;
  started_by: string;
  created_at: string;
  questions: Question;
  question_answers: { user_id: string; answer: string }[];
};

export function supabaseGameStore(): GameStore {
  const sb = createClient();
  let me: string | null = null;

  async function meId() {
    if (me) return me;
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("로그인이 필요해");
    me = user.id;
    return me;
  }

  return {
    meId,

    async draw(type, n) {
      const { data, error } = await sb.rpc("draw_questions", { p_type: type, p_count: n });
      if (error) throw error;
      return (data ?? []) as Question[];
    },

    async threads() {
      const uid = await meId();
      const { data, error } = await sb
        .from("question_threads")
        .select("question_id, started_by, created_at, questions(id, type, text, a, b), question_answers(user_id, answer)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).map(
        (r): Thread => ({
          question: r.questions,
          startedBy: r.started_by,
          createdAt: r.created_at,
          mine: r.question_answers.find((a) => a.user_id === uid)?.answer ?? null,
          theirs: r.question_answers.find((a) => a.user_id !== uid)?.answer ?? null,
        }),
      );
    },

    async start(questionId, answer) {
      const t = await sb.from("question_threads").insert({ question_id: questionId });
      // 상대가 거의 동시에 같은 질문을 먼저 시작했으면, 그 질문에 답하는 걸로 처리
      if (t.error && t.error.code !== "23505") throw t.error;
      const a = await sb.from("question_answers").insert({ question_id: questionId, answer });
      if (a.error) throw a.error;
    },

    async answer(questionId, answer) {
      const { error } = await sb.from("question_answers").insert({ question_id: questionId, answer });
      if (error) throw error;
    },

    async remaining() {
      const { data, error } = await sb.rpc("remaining_questions");
      if (error) throw error;
      return (data as number) ?? 0;
    },

    subscribe(onChange) {
      const ch = sb
        .channel("game")
        .on("postgres_changes", { event: "*", schema: "public", table: "question_threads" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "question_answers" }, onChange)
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
