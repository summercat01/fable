-- Fable DB 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행
-- 원칙: profiles 에 등록된 두 계정만 모든 데이터에 접근 가능 (RLS)

-- ─────────────────────────────────────────────
-- 사람
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'member')), -- admin = 개발자(파랑), member = 상대(주황). 이름은 저장 안 함
  adult_enabled boolean not null default false,           -- 19금 질문 보이기 (지금은 두 계정 모두 true로 켜둠)
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
  date date not null,                -- 시작일
  end_date date not null,            -- 끝나는 날 (하루짜리면 date와 같음, 비우면 트리거가 채움)
  title text not null check (char_length(title) between 1 and 60),
  scope text not null check (scope in ('personal', 'together')), -- 내 일정 / 같이 하는 일정
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index events_date_idx on public.events (date);
create index events_end_idx on public.events (end_date);
alter table public.events add constraint events_range_chk
  check (end_date >= date and end_date - date <= 30);

create or replace function public.events_fill_end() returns trigger
language plpgsql set search_path = public as $$
begin
  new.end_date := coalesce(new.end_date, new.date);
  return new;
end $$;
create trigger events_fill_end before insert or update on public.events
  for each row execute function public.events_fill_end();

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
set search_path = public
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

-- 뽑기 (실제로 쓰는 것): 5개 중 p_adult개는 19금(있으면), 모자라면 다른 쪽으로 채움. 섞인 순서
create or replace function public.draw_mix(p_type text, p_count int default 5, p_adult int default 1)
returns setof public.questions
language plpgsql
security invoker
set search_path = public
as $$
declare
  want_adult int := least(greatest(p_adult, 0), p_count);
  a_ids int[];
  n_ids int[];
  picked int[];
begin
  select coalesce(array_agg(id), '{}') into a_ids from (
    select q.id from public.questions q
    left join public.question_seen s on s.question_id = q.id and s.user_id = auth.uid()
    where q.type = p_type and q.adult and not q.custom
      and not exists (select 1 from public.question_threads t where t.question_id = q.id)
    order by (s.question_id is not null), q.sort_order
    limit want_adult
  ) x;

  select coalesce(array_agg(id), '{}') into n_ids from (
    select q.id from public.questions q
    left join public.question_seen s on s.question_id = q.id and s.user_id = auth.uid()
    where q.type = p_type and not q.adult and not q.custom
      and not exists (select 1 from public.question_threads t where t.question_id = q.id)
    order by (s.question_id is not null), q.sort_order
    limit p_count - cardinality(a_ids)
  ) x;

  if cardinality(a_ids) + cardinality(n_ids) < p_count then
    select a_ids || coalesce(array_agg(id), '{}') into a_ids from (
      select q.id from public.questions q
      left join public.question_seen s on s.question_id = q.id and s.user_id = auth.uid()
      where q.type = p_type and q.adult and not q.custom and not (q.id = any (a_ids))
        and not exists (select 1 from public.question_threads t where t.question_id = q.id)
      order by (s.question_id is not null), q.sort_order
      limit p_count - cardinality(a_ids) - cardinality(n_ids)
    ) x;
  end if;

  picked := a_ids || n_ids;
  if cardinality(picked) = 0 then
    return;
  end if;

  insert into public.question_seen (question_id)
  select unnest(picked)
  on conflict do nothing;

  return query
  select * from public.questions where id = any (picked) order by md5(id::text || clock_timestamp()::text);
end;
$$;

-- 남은 질문 수 (아무도 고르지 않은 질문). admin 갱신 알림에 씀
create or replace function public.remaining_questions()
returns int
language sql
stable
security invoker
set search_path = public
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

-- ─────────────────────────────────────────────
-- 실시간 반영: 한 폰에서 일정·근무를 바꾸면 다른 폰 캘린더도 바로 갱신
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.events, public.shifts;

-- ─────────────────────────────────────────────
-- 로그인 안 한 사람은 내부 함수도 못 부르게
-- ─────────────────────────────────────────────
revoke execute on function public.is_member() from public, anon;
revoke execute on function public.i_answered(int) from public, anon;
revoke execute on function public.draw_questions(text, int) from public, anon;
revoke execute on function public.remaining_questions() from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.i_answered(int) to authenticated;
grant execute on function public.draw_questions(text, int) to authenticated;
revoke execute on function public.draw_mix(text, int, int) from anon, public;
grant execute on function public.draw_mix(text, int, int) to authenticated;
grant execute on function public.remaining_questions() to authenticated;

-- 게임도 실시간 반영 (상대가 답하면 바로 보이게)
alter publication supabase_realtime add table public.question_threads, public.question_answers;

-- ─────────────────────────────────────────────
-- 게임: 시간은 안 남김 (날짜만, 한국 자정으로 저장) + 같은 날 순서는 seq로
-- ─────────────────────────────────────────────
create or replace function public.day_only() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'question_threads' then
    new.created_at := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  elsif tg_table_name = 'question_answers' then
    new.answered_at := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  elsif tg_table_name = 'question_seen' then
    new.seen_at := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  end if;
  return new;
end $$;
create trigger threads_day_only before insert on public.question_threads for each row execute function public.day_only();
create trigger answers_day_only before insert on public.question_answers for each row execute function public.day_only();
create trigger seen_day_only before insert on public.question_seen for each row execute function public.day_only();
alter table public.question_threads add column seq bigint generated always as identity;

-- ─────────────────────────────────────────────
-- 게임: 직접 만든 질문 (id 100001부터, 뽑기·남은 수에선 빠짐)
-- ─────────────────────────────────────────────
alter table public.questions add column custom boolean not null default false;
alter table public.questions add column created_by uuid references public.profiles (id);
create sequence public.custom_question_id start 100001;
grant usage on sequence public.custom_question_id to authenticated;

create or replace function public.custom_question_fill() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.custom then
    new.id := nextval('public.custom_question_id');
    new.sort_order := new.id;
    new.created_by := auth.uid();
    new.adult := false;
  end if;
  return new;
end $$;
create trigger questions_custom_fill before insert on public.questions for each row execute function public.custom_question_fill();

alter table public.questions add constraint custom_len check (
  not custom or (
    (type = 'balance' and char_length(a) between 1 and 60 and char_length(b) between 1 and 60)
    or (type = 'whatif' and char_length(text) between 1 and 120)
  )
);
create policy "직접 질문 만들기" on public.questions for insert with check (public.is_member() and custom);

-- 질문 + 시작 + 내 답을 한 번에
create or replace function public.ask_question(p_type text, p_text text, p_a text, p_b text, p_answer text)
returns int language plpgsql security invoker set search_path = public as $$
declare
  qid int;
begin
  insert into public.questions (id, type, text, a, b, custom, sort_order)
  values (0, p_type,
          case when p_type = 'whatif' then nullif(trim(p_text), '') end,
          case when p_type = 'balance' then nullif(trim(p_a), '') end,
          case when p_type = 'balance' then nullif(trim(p_b), '') end,
          true, 0)
  returning id into qid;
  insert into public.question_threads (question_id) values (qid);
  insert into public.question_answers (question_id, answer) values (qid, p_answer);
  return qid;
end;
$$;
revoke execute on function public.ask_question(text, text, text, text, text) from anon, public;
grant execute on function public.ask_question(text, text, text, text, text) to authenticated;
-- (draw_mix, remaining_questions는 위 정의에 `not q.custom` 조건이 들어간 버전이 실제 DB에 있음)

-- ─────────────────────────────────────────────
-- 버킷리스트: 하고 싶은 거·가고 싶은 곳·먹고 싶은 거·그 외
-- 날 잡으면 '같이 하는 일정'을 만들고 event_id로 연결 (일정 지우면 연결만 풀림)
-- 해본 것 = done_on이 있거나, 연결된 일정 날짜가 지났거나 (화면에서 계산)
-- ─────────────────────────────────────────────
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('do', 'go', 'eat', 'etc')),
  title text not null check (char_length(title) between 1 and 60),
  memo text check (memo is null or char_length(memo) <= 200),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  event_id uuid references public.events (id) on delete set null,
  done_on date
);
create index wishes_event_idx on public.wishes (event_id);
alter table public.wishes enable row level security;
create policy "버킷리스트" on public.wishes for all using (public.is_member()) with check (public.is_member());
alter publication supabase_realtime add table public.wishes;
