/* Cloudflare Pages Function 공용 유틸 (게이트 쿠키 + Firebase 커스텀 토큰) */

export const GATE_COOKIE = 'gwbs_gate';
const GATE_TTL = 60 * 60 * 24 * 30; // 30일

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 타이밍 공격에 흔들리지 않는 문자열 비교 */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** 비밀번호를 아는 쪽만 만들 수 있는 쿠키 값 ("만료시각.서명") */
export async function makeGateCookie(secret) {
  const exp = Math.floor(Date.now() / 1000) + GATE_TTL;
  return `${exp}.${await hmac(secret, 'gwbs-gate-v1|' + exp)}`;
}

export async function isGateCookieValid(value, secret) {
  if (!value || !secret) return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const exp = Number(value.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(value.slice(dot + 1), await hmac(secret, 'gwbs-gate-v1|' + exp));
}

export function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function gateCookieHeader(value) {
  return `${GATE_COOKIE}=${value}; Path=/; Max-Age=${GATE_TTL}; HttpOnly; Secure; SameSite=Lax`;
}

/** 요청이 게이트를 통과했는지 */
export async function isStaff(request, env) {
  if (!env.SITE_PASSWORD) return false;
  return isGateCookieValid(readCookie(request, GATE_COOKIE), env.SITE_PASSWORD);
}

/**
 * Cloudflare Access가 인증한 이메일.
 * Pages 앞단의 Access만 이 헤더를 붙일 수 있고 외부에서는 위조해도
 * 엣지에서 덮어써지므로, Pages 환경에서는 이 값을 신뢰할 수 있습니다.
 */
export function accessEmail(request) {
  return request.headers.get('Cf-Access-Authenticated-User-Email') || null;
}

function pemToArrayBuffer(pem) {
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/**
 * Firebase 커스텀 토큰(RS256 JWT)을 발급한다.
 * 클라이언트가 signInWithCustomToken()으로 로그인하면, 여기서 넣은
 * claims 가 Firestore 규칙의 request.auth.token 으로 들어옵니다.
 */
export async function mintFirebaseToken(env, uid, claims) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
    claims
  };
  const signingInput = b64url(enc.encode(JSON.stringify(header))) + '.' +
                       b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  return signingInput + '.' + b64url(sig);
}

export function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
