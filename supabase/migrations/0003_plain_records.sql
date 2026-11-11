-- 감정 관찰실 · 기록 암호 빼기 · 2026-11-02 본인 결정 변경
--
-- 실행: Aside가 0001, 0002 다음에 Supabase SQL 편집기에서 한 번 실행한다.
--
-- 앞 결정(기기에서 기록 암호로 잠근 뒤 올리기)을 바꿨다. 이제 기록은 잠그지 않고
-- 서버에 저장한다. 다른 사용자는 RLS로 볼 수 없고(본인 행만), 서비스를 관리하는
-- 만든 사람은 Supabase 관리 화면에서 볼 수 있다. 0001의 「만든 사람도 볼 수 없다」는
-- 설명은 이 파일부터 맞지 않는다.
--
-- 서버에 기록이 한 줄도 없을 때 실행한다(2026-11-02 Aside 확인: vault, records 모두 0행).
-- 그래서 옮길 데이터는 없고, data 열은 기본값 없이 not null로 더한다.
--
-- 그대로 두는 것: records 기본키 (user_id, id)(0002), RLS 정책 4개(본인 행만),
-- authenticated만 권한, anon 권한 없음, delete_my_account().

-- 기록 암호의 보관함은 더 쓰지 않는다
drop table public.vault;

-- 잠긴 글(blob) 대신 기록 하나 전체를 그대로
alter table public.records drop column blob;
alter table public.records add column data jsonb not null;
