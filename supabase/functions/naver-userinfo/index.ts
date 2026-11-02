// 감정 관찰실 · 네이버 사용자 정보 중계 (2026-11-02)
// 네이버는 사용자 정보를 {"response": {...}}로 한 겹 감싸 보내서 Supabase가 읽지 못한다.
// 이 함수는 네이버 식별자(id)만 꺼내 {"sub": id}로 돌려준다.
// 이메일은 넘기지 않는다: 네이버 계정은 다른 계정과 합치지 않는다 (본인 결정 2026-11-02 (가)).
// 받은 토큰은 네이버로만 전달하고 어디에도 남기지 않는다.
Deno.serve(async (req: Request) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response("unauthorized", { status: 401 });
  const upstream = await fetch("https://openapi.naver.com/v1/nid/me", { headers: { Authorization: auth } });
  if (!upstream.ok) return new Response("upstream error", { status: 502 });
  const body = await upstream.json().catch(() => null);
  const id = body?.response?.id;
  if (body?.resultcode !== "00" || typeof id !== "string" || id.length === 0) {
    return new Response("unauthorized", { status: 401 });
  }
  return Response.json({ sub: id });
});
