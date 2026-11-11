-- 감정 관찰실 · 기록 번호를 계정마다 따로 · 2026-11-02 본인 결정
--
-- 실행: Aside가 0001_login_sync.sql 다음에 Supabase SQL 편집기에서 한 번 실행한다.
--
-- 0001에서는 records의 기본키가 id 하나라서, 같은 기기의 같은 기록을 두 계정으로
-- 가져오면 두 번째 계정이 실패했다. 기록 번호는 이제 한 계정 안에서만 겹치지 않으면 된다.
-- 앱은 행마다 user_id를 넣고 onConflict를 "user_id,id"로 보낸다(lib/account.ts).
-- RLS 정책은 그대로다(본인 행만).

alter table public.records drop constraint records_pkey;
alter table public.records add primary key (user_id, id);
