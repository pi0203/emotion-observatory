-- 감정 관찰실 · 로그인과 잠근 기록 동기화 (미리보기) · 2026-11-02 본인 결정
--
-- 실행: Aside가 Supabase SQL 편집기에서 한 번 실행한다. 이 파일은 앱이 실행하지 않는다.
--
-- 서버에는 기기에서 「기록 암호」로 잠근 글(blob)만 온다. 기록 내용·단계·날짜·감정 단어는
-- 따로 칸을 두지 않고 모두 blob 안에 잠겨 있다. 만든 사람도 내용을 볼 수 없다.
-- 두 표 모두 RLS를 켜고, 로그인한 사람(authenticated)이 자기 행만 다루게 한다.
-- anon(로그인 안 한 요청)에는 아무 권한도 주지 않는다. 새 표 자동 공개를 꺼 두었으므로
-- authenticated에 필요한 권한(grant)을 여기서 직접 준다.

-- 기록 암호의 보관함: 암호를 키로 바꿀 때 쓰는 값과, 암호가 맞는지만 보는 짧은 잠긴 글
create table public.vault (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  kdf jsonb not null,          -- {"salt": base64, "iterations": 정수}
  check_blob text not null,    -- 정해진 짧은 글을 기록 암호로 잠근 것 (암호 확인용)
  created_at timestamptz not null default now()
);

-- 잠긴 기록: 기록 하나가 한 행, id는 앱의 기록 id와 같다
create table public.records (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blob text not null,          -- 잠긴 기록 전체
  updated_at timestamptz not null
);

create index records_user_id_idx on public.records (user_id);

alter table public.vault enable row level security;
alter table public.records enable row level security;

-- 권한: anon에는 없음, authenticated에는 네 가지 작업만
revoke all on table public.vault from anon, authenticated;
revoke all on table public.records from anon, authenticated;
grant select, insert, update, delete on table public.vault to authenticated;
grant select, insert, update, delete on table public.records to authenticated;

-- vault: 본인 행만
create policy "vault: 본인 행 읽기" on public.vault
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vault: 본인 행 넣기" on public.vault
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vault: 본인 행 고치기" on public.vault
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vault: 본인 행 지우기" on public.vault
  for delete to authenticated using ((select auth.uid()) = user_id);

-- records: 본인 행만
create policy "records: 본인 행 읽기" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "records: 본인 행 넣기" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "records: 본인 행 고치기" on public.records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "records: 본인 행 지우기" on public.records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 계정 지우기: 지금 로그인한 사람의 계정 하나만 지운다.
-- vault와 records는 on delete cascade로 함께 지워진다.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
