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

### 2. 카카오 로그인
1. developers.kakao.com > 내 애플리케이션 > 앱 추가
2. 플랫폼 > Web에 `http://localhost:3000` (나중에 Vercel 주소도) 등록
3. 카카오 로그인 활성화, Redirect URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`
4. 동의항목: 닉네임만 (이메일은 비즈 앱이 필요해서 안 받음)
5. 보안 > Client Secret 발급
6. Supabase > Authentication > Providers > Kakao 켜고 REST API 키, Client Secret 입력
7. Supabase > Authentication > URL Configuration > Redirect URLs에 `http://localhost:3000/auth/callback` 추가

### 3. 우리 둘 계정 등록
둘 다 앱에서 카카오로 한 번씩 로그인한 뒤, SQL Editor에서:
```sql
select id, created_at from auth.users order by created_at;  -- 두 사람 id 확인

insert into public.profiles (id, role, display_name) values
  ('<재우 id>', 'admin', '재우'),
  ('<여친 id>', 'member', '<여친 이름>');
```
그다음 Authentication > Sign In / Providers에서 **새 가입 막기**. 이제 다른 사람은 로그인해도 아무것도 못 봄.

## 개발
```
npm install
npm run dev
```
폰으로 볼 때: 같은 와이파이에서 `http://<PC IP>:3000`

## 질문 추가
`data/raw/`에 줄 추가 → `python3 scripts/build_questions.py` → 새로 생긴 `supabase/seed_questions.sql` 실행 (이미 있는 질문은 건너뜀)
