-- 감정 관찰실 · 기록 크기 제한과 겹치는 색인 지우기 · 2026-11-12
--
-- 실행은 Aside, 본인 확인 뒤. 0001~0003 다음에 Supabase SQL 편집기에서 한 번 실행한다.
-- 이 파일은 앱이 실행하지 않는다.
--
-- 근거: 합치기 전 점검(2026-11-12) 1절.
-- - records.data(jsonb)에 크기 제한이 없어, 로그인한 사람 누구나 큰 값을 계속 넣어
--   저장 공간을 채울 수 있었다. 기록 하나를 64KB(65536바이트)까지로 막는다.
--   앱이 만드는 기록 하나는 이보다 훨씬 작다. 이미 이보다 큰 행이 있으면 이 줄은 실패하므로,
--   실패하면 먼저 그 행을 확인한다.
-- - 0002에서 기본키가 (user_id, id)가 되어, 0001의 records_user_id_idx(user_id 하나)는
--   기본키 색인과 같은 일을 두 번 한다.
--
-- 그대로 두는 것: RLS 정책 4개(본인 행만), authenticated만 권한, anon 권한 없음,
-- delete_my_account().

alter table public.records
  add constraint records_data_size check (pg_column_size(data) <= 65536);

drop index if exists public.records_user_id_idx;
