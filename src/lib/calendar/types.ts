export type Role = "admin" | "member";
export type Scope = "personal" | "together";
export type ShiftCode = "D" | "E" | "N";

export type Profile = { id: string; role: Role };

export type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD, 시작일
  end_date: string; // 끝나는 날 (하루짜리면 date와 같음)
  title: string;
  scope: Scope;
  created_by: string;
};

export type Shift = { user_id: string; date: string; code: ShiftCode };

export type People = { me: Profile; partner: Profile | null };

/** 캘린더가 데이터를 주고받는 창구. 실제는 Supabase, 테스트는 메모리 */
export interface CalendarStore {
  people(): Promise<People>;
  load(from: string, to: string): Promise<{ events: CalEvent[]; shifts: Shift[] }>;
  addEvent(e: { date: string; end_date: string; title: string; scope: Scope }): Promise<CalEvent>;
  updateEvent(id: string, e: { date: string; end_date: string; title: string; scope: Scope }): Promise<CalEvent>;
  deleteEvent(id: string): Promise<void>;
  /** 한 사람의 근무를 날짜별로 덮어씀. code가 null이면 그날은 오프(삭제) */
  saveShifts(userId: string, changes: { date: string; code: ShiftCode | null }[]): Promise<void>;
  /** 다른 폰에서 바뀌면 알려줌 */
  subscribe(onChange: () => void): () => void;
}
