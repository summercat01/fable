@AGENTS.md

# Fable

재우와 여자친구, **딱 두 명만 쓰는 커플앱**. 이름은 재**우** + ○**화** = 우화 = Fable.
디자인 시안(캔버스): https://claude.ai/artifact/936Q6NADSCVL3W6pdJBsTY

## 원칙
- **부담 없이, 편하게.** 매일 해야 하는 것, 연속 기록, 재촉 알림은 만들지 않는다.
- 사용자는 2명 고정. 회원가입·온보딩·다국어 같은 일반 서비스 기능은 만들지 않는다.
- 기기는 갤럭시 S22·S23 (곧 S26). 화면 폭 **360px** 기준, 더 넓으면 가운데 360으로.
- 답변·UI 문구는 반말 한국어.

## 기술
- Next.js 16 (App Router, `src/`), TypeScript, CSS Modules + `globals.css` 변수. Tailwind 안 씀
  - Next 16: `middleware` → `src/proxy.ts`, `cookies()`는 async. 바뀐 API는 `node_modules/next/dist/docs/` 확인
- Supabase: **아이디·비밀번호 로그인** (아이디 → `<아이디>@fable.test`, `src/lib/accounts.ts`), Postgres(RLS), Storage(`photos` 버킷)
  - 계정은 대시보드에서 직접 생성, 새 가입은 막아둠. 아이디: 재우 `fablew`, 여친 `fableh`. 비밀번호는 절대 코드에 넣지 않음
  - 카카오 로그인은 보류 (`src/app/auth/callback`은 나중에 쓸 수 있게 남겨둠)
- **앱 잠금** (`src/components/AppLock.tsx`, `src/lib/lock.ts`): 로그인은 계속 유지되고, 앱 열 때 이 기기 전용 4자리 PIN 또는 지문(WebAuthn). 1분 넘게 벗어나면 다시 잠금, 5번 틀리면 로그아웃
  - APK로 감싼 뒤엔 웹뷰에서 WebAuthn이 안 될 수 있어서, 지문은 Capacitor 생체인증 플러그인으로 바꿀 것
- 배포: Vercel. 폰에는 **Capacitor로 감싼 APK** (원격 URL 로드) → 웹 배포만 하면 앱 내용 갱신
- 홈 화면 위젯만 Kotlin으로 (5×6 달력 + D-day). 자정에 한 번 + 앱에서 일정 바꿀 때 갱신
- 지도: 네이버 클라우드 Maps (`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`)

## 사람과 색 (`globals.css`)
- 나(재우) 파랑 `--me` #2F5F9E · 여친 주황 `--her` #E07B39 · 함께 분홍 `--us` #C8435A
- 근무 뱃지: 데이 주황 / 이브 보라 / 나이트 남색. 오프는 표시 안 함(빈칸 = 오프)
- 기념일 라벨: 노랑 `--anniv-bg`
- 글꼴: 제목 Gaegu(손글씨), 본문 Noto Sans KR
- 아이콘: 파랑·주황 원이 겹친 자리가 분홍 + 흰 하트 (`public/icons/icon.svg`)

## 우리 날짜 (`src/lib/couple.ts`)
- 사귄 날 2026-10-27 (D+1), 재우 생일 11-09, 여친 생일 04-22
- 캘린더에 100일 단위, 주년, 생일 자동 표시

## 화면 (하단 탭 3개: 캘린더 · 추억 카드 · 게임)
1. **시작 화면**: 두 원이 모이며 하트 → "Fable". 문구 없음
2. **캘린더(홈)**: 한 달이 화면을 꽉 채움. 칸 안 글씨 작게(날짜 11px, 일정 9px, 두 줄까지)
   - 날짜 누르면 아래 시트가 올라옴(끌어서 크게/닫기). + 버튼으로 추가
   - 추가할 때 **내 일정 / 같이 하는 일정** 선택. 색은 작성자 기준
   - 여친 OFF + 내 일정 없는 날 = "둘 다 비는 날" 연분홍
   - 근무표 입력: 데이/이브/나이트 버튼 고르고 날짜를 콕콕. 같은 걸 다시 누르면 지움
3. **추억 카드**: 날짜 지난 '같이 하는 일정' = 카드 (`cards_view`). 제1화, 제2화…
   - 필수는 **큰 지역 하나**(공주, 순천). 사진·세부 장소 핀은 선택
   - 카드 넘기기 = 최신이 맨 위. 채운 카드는 그날 지도 + 동선
4. **게임**: 밸런스(분홍) / 만약에(보라) 큰 버튼 → 5개 뽑기 → 여러 개 골라 내가 먼저 답
   - 기다리는 질문은 한 목록("내가 먼저" / "여친이 먼저"). 내 답은 상대가 답할 때까지 잠김
   - 둘 다 답한 기록은 별도 페이지: 필터(전체/밸런스/만약에/같은 답/다른 답), 4개씩 페이지
   - 같은 답/다른 답은 **밸런스만**
   - 뽑기 규칙(`draw_questions`): 고정 순서, **본 건 사람마다 따로 뒤로**, **누가 고른 질문은 둘 다에서 빠짐**, 다 보면 건너뛴 게 다시
   - 만약에 질문은 텍스트 그대로 보여주고 "만약에" 뱃지만 붙임(앞에 '만약에,'를 자동으로 붙이지 않음)
   - 알림은 "질문 하나 왔어" 한 번뿐. 위젯·알림에 질문 내용 안 띄움
5. **19금 질문(나중에)**: `questions.adult`. 스위치 기본 꺼짐(`profiles.adult_enabled`), 켤 때 지문/PIN, 기록도 잠긴 칸에 따로
6. **질문 갱신 알림**: 남은 질문 100개 이하면 **admin(재우)에게만** 배너

## 개발 팁
- `npm run dev` 후 `/demo/calendar`: Supabase 없이 가짜 데이터로 캘린더 확인 (개발 모드에서만 열림, `src/app/demo`)
- 캘린더 데이터는 `CalendarStore`(`src/lib/calendar/types.ts`)로만 주고받음. 실제는 `supabaseStore`, 미리보기는 `memoryStore`
- 앱 화면은 AppLock 때문에 폰에서만 그려짐 → 각 페이지에 `export const instant = false`

## 데이터
- 스키마: `supabase/schema.sql` (RLS: `profiles`에 있는 두 계정만 접근)
- 질문: `data/raw/*.txt` → `python3 scripts/build_questions.py` → `data/questions.json`, `supabase/seed_questions.sql`
  - 1,000개씩 추가. 이미 들어간 질문의 id·순서는 바꾸지 않음. 중복은 스크립트가 걸러줌
  - 현재: 밸런스 500 + 만약에 500

## 진행 상황
- [x] 프로젝트 뼈대, 하단 탭, D-day
- [x] 아이디·비번 로그인 + 자동 로그인 + 앱 잠금(PIN/지문)
- [x] DB 스키마 + 질문 1,000개
- [x] 캘린더 월간 화면 + 날짜 시트 + 일정 추가·삭제 + 근무표 + 실시간 반영
- [ ] 게임 화면
- [ ] 추억 카드 + 네이버 지도 + 사진
- [ ] Capacitor APK + 위젯
