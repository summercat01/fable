-- Fable DB 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행
-- 원칙: profiles 에 등록된 두 계정만 모든 데이터에 접근 가능 (RLS)

-- ─────────────────────────────────────────────
-- 사람
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'member')), -- admin = 재우(개발자), member = 여친
  display_name text not null,
  adult_enabled boolean not null default false,           -- 19금 질문 스위치 (기본 꺼짐)
  created_at timestamptz not null default now()
);

-- 우리 둘 중 한 명인지
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

alter table public.profiles enable row level security;
create policy "둘끼리 서로 조회" on public.profiles for select using (public.is_member());
create policy "내 설정만 수정" on public.profiles for update using (id = auth.uid());

-- ─────────────────────────────────────────────
-- 캘린더
-- ─────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null check (char_length(title) between 1 and 60),
  scope text not null check (scope in ('personal', 'together')), -- 내 일정 / 같이 하는 일정
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index events_date_idx on public.events (date);

alter table public.events enable row level security;
create policy "일정 조회" on public.events for select using (public.is_member());
create policy "일정 추가" on public.events for insert with check (public.is_member() and created_by = auth.uid());
-- 내 일정은 나만, 같이 하는 일정은 둘 다 수정·삭제
create policy "일정 수정" on public.events for update
  using (public.is_member() and (scope = 'together' or created_by = auth.uid()));
create policy "일정 삭제" on public.events for delete
  using (public.is_member() and (scope = 'together' or created_by = auth.uid()));

-- 여친 근무 (오프는 저장 안 함: 비어 있으면 오프)
create table public.shifts (
  user_id uuid not null references public.profiles (id),
  date date not null,
  code text not null check (code in ('D', 'E', 'N')),
  primary key (user_id, date)
);

alter table public.shifts enable row level security;
create policy "근무 조회" on public.shifts for select using (public.is_member());
create policy "근무 입력" on public.shifts for all
  using (public.is_member()) with check (public.is_member());

-- ─────────────────────────────────────────────
-- 추억 카드
-- 카드 = 날짜가 지난 '같이 하는 일정'. 처음 채울 때 memory_cards 행이 생김
-- ─────────────────────────────────────────────
create table public.memory_cards (
  event_id uuid primary key references public.events (id) on delete cascade,
  region text not null check (char_length(region) between 1 and 20), -- 공주, 순천 같은 큰 지역
  province text,
  updated_at timestamptz not null default now()
);

create table public.card_places (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.memory_cards (event_id) on delete cascade,
  seq int not null,                 -- 핀 찍은 순서
  name text not null,
  lat double precision not null,
  lng double precision not null
);

create table public.card_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.memory_cards (event_id) on delete cascade,
  storage_path text not null,       -- storage 버킷 photos 안의 경로
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.memory_cards enable row level security;
alter table public.card_places enable row level security;
alter table public.card_photos enable row level security;
create policy "카드" on public.memory_cards for all using (public.is_member()) with check (public.is_member());
create policy "장소" on public.card_places for all using (public.is_member()) with check (public.is_member());
create policy "사진" on public.card_photos for all using (public.is_member()) with check (public.is_member());

-- 추억 카드 목록 (최신순). 카드 번호 = 같이 한 일정 중 몇 번째인지
create or replace view public.cards_view
with (security_invoker = true)
as
select
  e.id as event_id,
  e.date,
  e.title,
  row_number() over (order by e.date, e.created_at) as chapter,
  c.region,
  c.province,
  (select count(*) from public.card_places p where p.event_id = e.id) as place_count,
  (select count(*) from public.card_photos f where f.event_id = e.id) as photo_count
from public.events e
left join public.memory_cards c on c.event_id = e.id
where e.scope = 'together'
  and e.date < (now() at time zone 'Asia/Seoul')::date;

-- ─────────────────────────────────────────────
-- 게임 (밸런스 / 만약에)
-- ─────────────────────────────────────────────
create table public.questions (
  id int primary key,
  type text not null check (type in ('balance', 'whatif')),
  text text,                        -- 만약에 질문
  a text,                           -- 밸런스 선택지 A
  b text,                           -- 밸런스 선택지 B
  adult boolean not null default false,
  sort_order int not null unique,   -- 미리 섞어서 고정한 순서
  check (
    (type = 'balance' and a is not null and b is not null)
    or (type = 'whatif' and text is not null)
  )
);

-- 내가 뽑기에서 본 질문 (사람마다 따로)
create table public.question_seen (
  user_id uuid not null default auth.uid() references public.profiles (id),
  question_id int not null references public.questions (id),
  seen_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- 누가 먼저 고른 질문. 여기 있으면 둘 다 뽑기에서 빠짐
create table public.question_threads (
  question_id int primary key references public.questions (id),
  started_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.question_answers (
  question_id int not null references public.question_threads (question_id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id),
  answer text not null check (char_length(answer) between 1 and 500), -- 밸런스는 'a' 또는 'b'
  answered_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

alter table public.questions enable row level security;
alter table public.question_seen enable row level security;
alter table public.question_threads enable row level security;
alter table public.question_answers enable row level security;

-- 19금 질문은 내 스위치가 켜져 있을 때만 보임
create policy "질문 조회" on public.questions for select using (
  public.is_member()
  and (not adult or (select adult_enabled from public.profiles where id = auth.uid()))
);
create policy "본 질문" on public.question_seen for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member());
create policy "질문 시작" on public.question_threads for select using (public.is_member());
create policy "질문 시작 추가" on public.question_threads for insert
  with check (public.is_member() and started_by = auth.uid());
-- 상대 답은 내가 답한 뒤에만 보임 (둘 다 답하면 동시에 공개)
-- (정책 안에서 같은 테이블을 다시 읽으면 무한 반복이 나서 함수로 분리)
create or replace function public.i_answered(p_question int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.question_answers where question_id = p_question and user_id = auth.uid()
  );
$$;

create policy "답 조회" on public.question_answers for select using (
  user_id = auth.uid() or public.i_answered(question_id)
);
create policy "답 쓰기" on public.question_answers for insert
  with check (public.is_member() and user_id = auth.uid());

-- 5개 뽑기: 고정 순서대로, 둘 중 누가 이미 고른 건 빼고, 내가 본 건 뒤로
-- 다 보면 건너뛴 질문이 다시 나옴. 뽑힌 질문은 '본 질문'으로 기록
create or replace function public.draw_questions(p_type text, p_count int default 5)
returns setof public.questions
language plpgsql
security invoker
as $$
declare
  picked int[];
begin
  select array_agg(id) into picked from (
    select q.id
    from public.questions q
    left join public.question_seen s on s.question_id = q.id and s.user_id = auth.uid()
    where q.type = p_type
      and not exists (select 1 from public.question_threads t where t.question_id = q.id)
    order by (s.question_id is not null), q.sort_order
    limit p_count
  ) x;

  if picked is null then
    return;
  end if;

  insert into public.question_seen (question_id)
  select unnest(picked)
  on conflict do nothing;

  return query
  select * from public.questions where id = any (picked) order by sort_order;
end;
$$;

-- 남은 질문 수 (아무도 고르지 않은 질문). admin 갱신 알림에 씀
create or replace function public.remaining_questions()
returns int
language sql
stable
security invoker
as $$
  select count(*)::int from public.questions q
  where not exists (select 1 from public.question_threads t where t.question_id = q.id);
$$;

-- ─────────────────────────────────────────────
-- 사진 저장소
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "사진 파일 조회" on storage.objects for select
  using (bucket_id = 'photos' and public.is_member());
create policy "사진 파일 올리기" on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_member());
create policy "사진 파일 삭제" on storage.objects for delete
  using (bucket_id = 'photos' and public.is_member());
