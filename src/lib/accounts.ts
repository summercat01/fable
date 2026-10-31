// 아이디만 입력받고, Supabase에는 "<아이디>@fable.test" 이메일로 저장
// (.test 는 실제로 메일이 가지 않는 예약 도메인. 계정은 대시보드에서 직접 만듦)
export const LOGIN_DOMAIN = "fable.test";

export function idToEmail(id: string): string {
  const v = id.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`;
}
