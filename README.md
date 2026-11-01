# Fable

우리 둘만 쓰는 앱. 자세한 기획은 [CLAUDE.md](./CLAUDE.md).

## 처음 세팅 (한 번만)

### 1. Supabase
1. supabase.com에서 새 프로젝트 만들기 (지역: Northeast Asia (Seoul))
2. SQL Editor에서 `supabase/schema.sql` 실행 → 이어서 `supabase/seed_questions.sql` 실행
3. Project Settings > API에서 URL과 anon key 복사 → `.env.local` 만들기
   ```
   cp .env.example .env.local
   ```

### 2. 우리 둘 계정 만들기
1. Supabase > Authentication > Users > **Add user > Create new user**
2. 이메일 칸에 `<아이디>@fable.test` (예: 아이디가 fablew면 `fablew@fable.test`), 비밀번호 입력, **Auto Confirm User 체크**
3. 두 명 다 만든 뒤 SQL Editor에서:
```sql
select id, email from auth.users;  -- 두 사람 id 확인

insert into public.profiles (id, role) values
  ('<관리자 id>', 'admin'),
  ('<상대 id>', 'member');
```
4. Authentication > Sign In / Providers에서 **Allow new users to sign up 끄기**

앱에선 아이디만 입력하면 돼 (`@fable.test`는 앱이 알아서 붙임). 한 번 로그인하면 그 폰에선 계속 로그인 유지되고, 앱 열 때는 4자리 비밀번호나 지문으로 열어.
비밀번호는 코드나 레포에 절대 적지 말 것.

## 개발
```
npm install
npm run dev
```
폰으로 볼 때: 같은 와이파이에서 `http://<PC IP>:3000`

## 질문 추가
`data/raw/`에 줄 추가 → `python3 scripts/build_questions.py` → 새로 생긴 `supabase/seed_questions.sql` 실행 (이미 있는 질문은 건너뜀)
