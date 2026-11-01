export type WishKind = "do" | "go" | "eat" | "etc";

export const KINDS: { key: WishKind; label: string; short: string }[] = [
  { key: "do", label: "하고 싶은 거", short: "할 거" },
  { key: "go", label: "가고 싶은 곳", short: "갈 곳" },
  { key: "eat", label: "먹고 싶은 거", short: "먹을 거" },
  { key: "etc", label: "그 외", short: "그 외" },
];

export type Wish = {
  id: string;
  kind: WishKind;
  title: string;
  memo: string | null;
  created_by: string;
  /** 직접 '했어'를 누른 날 */
  done_on: string | null;
  /** 날 잡아서 캘린더에 넣은 같이 하는 일정 */
  event: { id: string; date: string; end_date: string } | null;
};

export type WishInput = { kind: WishKind; title: string; memo: string | null };

/** 위시리스트가 데이터를 주고받는 창구. 실제는 Supabase, 미리보기는 메모리 */
export interface WishStore {
  /** 나 (색: 관리자=파랑, 상대=주황) */
  me(): Promise<{ id: string; admin: boolean }>;
  list(): Promise<Wish[]>;
  add(w: WishInput): Promise<void>;
  update(id: string, w: WishInput): Promise<void>;
  remove(id: string): Promise<void>;
  /** 그날 '같이 하는 일정'으로 캘린더에 넣고 연결 */
  schedule(id: string, date: string): Promise<void>;
  /** 잡은 날 취소 (캘린더 일정도 지움) */
  unschedule(id: string): Promise<void>;
  /** 했어 / 안 한 걸로 (안 한 걸로 하면 지난 일정 연결도 풀림) */
  setDone(id: string, on: string | null): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

/** 해본 것: 직접 '했어' 했거나, 잡아둔 날이 지났으면 */
export const doneDate = (w: Wish, today: string): string | null =>
  w.done_on ?? (w.event && w.event.end_date < today ? w.event.date : null);
