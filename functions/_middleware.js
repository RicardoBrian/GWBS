/*
 * 사이트 입장 게이트 (Cloudflare Pages Function)
 *
 *  · /request.html 과 그 자산은 학생용이라 누구나 접근 가능
 *  · 나머지는 SITE_PASSWORD 시크릿을 아는 사람만
 *  · /admin.html 은 그 위에 Cloudflare Access(구글 로그인)를 얹습니다
 *
 * SITE_PASSWORD 시크릿이 설정돼 있지 않으면 게이트는 동작하지 않습니다.
 * (배포 직후 스스로 잠겨 버리는 사고를 막기 위한 기본값)
 */
import { GATE_COOKIE, isGateCookieValid, makeGateCookie, gateCookieHeader,
         readCookie, isStaff, accessEmail, mintFirebaseToken, json } from './_lib.js';

const PUBLIC_PATHS = new Set([
  '/request', '/request.html',   // 학생 신청 페이지
  '/fb-guard.js',                // 신청 페이지가 불러오는 스크립트
  '/favicon.svg', '/logo.png'
]);

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/_gate')      return handleGate(context, url);
  if (path === '/api/token')  return handleToken(context);
  if (path === '/api/me')     return handleMe(context);

  if (PUBLIC_PATHS.has(path)) return next();
  if (!env.SITE_PASSWORD)     return next();   // 시크릿 미설정 → 게이트 비활성

  if (await isGateCookieValid(readCookie(request, GATE_COOKIE), env.SITE_PASSWORD)) return next();

  const to = new URL('/_gate', url);
  to.searchParams.set('next', path + url.search);
  return Response.redirect(to.toString(), 302);
}

/* ── 입장 화면 ─────────────────────────────────────────────── */
async function handleGate({ request, env }, url) {
  const nextPath = sanitizeNext(url.searchParams.get('next'));

  if (request.method === 'POST') {
    const form = await request.formData();
    const given = String(form.get('password') || '');
    if (env.SITE_PASSWORD && given === env.SITE_PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          'Location': sanitizeNext(form.get('next')) || '/',
          'Set-Cookie': gateCookieHeader(await makeGateCookie(env.SITE_PASSWORD))
        }
      });
    }
    return gatePage(nextPath, '비밀번호가 올바르지 않습니다', 401);
  }
  return gatePage(nextPath, '', 200);
}

/** 오픈 리다이렉트 방지: 같은 사이트 안의 경로만 허용 */
function sanitizeNext(value) {
  const v = String(value || '');
  return /^\/[^/\\]/.test(v) ? v : '';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gatePage(nextPath, error, status) {
  return new Response(`<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>관산중학교 방송부</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
         padding: 24px; background: #f0f2f8; color: #0d0f1a;
         font: 400 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .card { width: 100%; max-width: 360px; background: #fff; border-radius: 20px; padding: 36px 30px;
          box-shadow: 0 12px 40px rgba(30,40,90,.13); text-align: center; }
  img { width: 60px; height: 60px; object-fit: contain; margin-bottom: 18px; }
  h1 { font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
  p { font-size: 13.5px; color: #7a7f9a; margin-top: 6px; margin-bottom: 22px; }
  input { width: 100%; padding: 13px 15px; border: 1px solid #dfe2ee; border-radius: 12px;
          font-size: 15px; background: #fafbff; color: inherit; }
  input:focus { outline: 2px solid #0071e3; outline-offset: -1px; border-color: transparent; }
  button { width: 100%; margin-top: 10px; padding: 13px; border: 0; border-radius: 12px;
           background: #1d1d1f; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
  button:hover { background: #35353a; }
  .err { color: #d92c20; font-size: 13px; margin-top: 12px; min-height: 18px; }
  .hint { font-size: 12.5px; color: #9aa0b8; margin-top: 20px; }
  .hint a { color: #0071e3; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d0f1a; color: #f0f2f8; }
    .card { background: #171a2b; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
    input { background: #10121f; border-color: #2b2f47; }
    button { background: #f0f2f8; color: #0d0f1a; }
    button:hover { background: #d6d9e6; }
  }
</style>
</head><body>
  <form class="card" method="POST" action="/_gate">
    <img src="/logo.png" alt="">
    <h1>관산중학교 방송부</h1>
    <p>방송부원만 입장할 수 있습니다</p>
    <input type="password" name="password" placeholder="입장 비밀번호"
           autocomplete="current-password" autofocus required>
    <input type="hidden" name="next" value="${esc(nextPath)}">
    <button type="submit">입장</button>
    <div class="err">${esc(error)}</div>
    <p class="hint">신청곡을 신청하러 오셨나요?<br><a href="/request.html">신청곡 신청 페이지로 →</a></p>
  </form>
</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

/* ── Firestore 쓰기 권한 토큰 ─────────────────────────────── */
async function handleToken({ request, env }) {
  const email = accessEmail(request);          // Access(구글 로그인) 통과 여부
  const staff = await isStaff(request, env);   // 입장 비밀번호 통과 여부
  if (!email && !staff) return json({ error: 'unauthorized' }, 401);
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'no_service_account' }, 503);

  try {
    const token = await mintFirebaseToken(
      env,
      email ? 'admin:' + email : 'staff',
      { staff: true, admin: !!email }
    );
    return json({ token, admin: !!email, email });
  } catch (e) {
    return json({ error: 'mint_failed', detail: String(e && e.message) }, 500);
  }
}

/** 관리자 페이지가 "누구로 로그인돼 있는지" 물어보는 곳 */
function handleMe({ request, env }) {
  return json({
    email: accessEmail(request),
    accessEnabled: !!accessEmail(request),
    gateEnabled: !!env.SITE_PASSWORD
  });
}
