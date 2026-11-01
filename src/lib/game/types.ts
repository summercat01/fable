export type QType = "balance" | "whatif";

export type Question = {
  id: number;
  type: QType;
  text: string | null; // 만약에
  a: string | null; // 밸런스 A
  b: string | null; // 밸런스 B
};

/** 누가 먼저 고른 질문 하나와 그 답들 */
export type Thread = {
  question: Question;
  startedBy: string;
  createdAt: string;
  mine: string | null; // 내 답 (밸런스는 'a' | 'b')
  theirs: string | null; // 상대 답. 내가 답하기 전엔 DB가 안 보여줌
};

export interface GameStore {
  meId(): Promise<string>;
  /** 고정 순서대로 n개. 본 건 뒤로, 누가 고른 건 빼고. 뽑힌 건 '봤음'으로 기록 */
  draw(type: QType, n: number): Promise<Question[]>;
  threads(): Promise<Thread[]>;
  /** 새 질문을 내가 먼저 시작하면서 답 */
  start(questionId: number, answer: string): Promise<void>;
  /** 상대가 시작한 질문에 답 */
  answer(questionId: number, answer: string): Promise<void>;
  remaining(): Promise<number>;
  subscribe(onChange: () => void): () => void;
}
