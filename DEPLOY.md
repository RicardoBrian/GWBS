# 배포 & 도메인 연결 가이드

이 저장소는 빌드가 필요 없는 정적 사이트입니다(HTML + `fb-guard.js`).
Vercel과 Cloudflare Pages **양쪽 다** 그대로 올라가도록 설정해 뒀습니다.

| 파일 | 쓰이는 곳 |
|------|-----------|
| `vercel.json` | Vercel 헤더 설정 |
| `_headers` | Cloudflare Pages 헤더 설정 |
| `firebase.json` / `.firebaserc` / `firestore.rules` | Firestore 보안 규칙 배포 |

---

## A. Cloudflare로 도메인 연결하기

먼저 도메인을 Cloudflare에 등록해야 합니다.

1. Cloudflare 대시보드 → **Add a site** → 도메인 입력
2. 무료(Free) 플랜 선택
3. Cloudflare가 알려 주는 **네임서버 2개**를, 도메인을 구입한 곳
   (가비아 / 후이즈 / Namecheap 등)의 네임서버 설정에 입력
4. 반영까지 보통 몇 분 ~ 몇 시간. 대시보드에 `Active`로 바뀌면 완료

여기서부터는 **호스팅을 어디에 두느냐**에 따라 두 갈래입니다.

---

### 방법 1 — 지금처럼 Vercel에 두고, DNS만 Cloudflare (변경 최소)

**1) Vercel에 도메인 추가**

Vercel 프로젝트 → Settings → **Domains** → `example.com` 과 `www.example.com` 추가.
Vercel이 화면에 필요한 DNS 값을 보여 줍니다.

**2) Cloudflare DNS 레코드 추가** (DNS → Records)

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| `A` | `@` | `76.76.21.21` | **DNS only** (회색 구름) |
| `CNAME` | `www` | `cname.vercel-dns.com` | **DNS only** (회색 구름) |

> Vercel이 다른 값을 안내하면 **Vercel 화면의 값이 우선**입니다.

**3) Proxy(주황 구름)를 켜고 싶다면**

- SSL/TLS → Overview → 반드시 **Full (strict)** 로 설정
  (Flexible로 두면 무한 리디렉션 루프가 납니다)
- Vercel 쪽 도메인 검증이 끝난 **뒤에** 주황 구름을 켜세요.
  검증 전에 켜면 Vercel이 인증서를 발급하지 못합니다.

---

### 방법 2 — Cloudflare Pages로 호스팅까지 옮기기

**1) 프로젝트 생성**

Cloudflare 대시보드 → **Workers & Pages** → Create → **Pages** →
**Connect to Git** → 이 저장소 선택

**2) 빌드 설정**

| 항목 | 값 |
|------|-----|
| Framework preset | `None` |
| Build command | *(비워 둠)* |
| Build output directory | `/` |

**3) 도메인 연결**

배포 완료 후 프로젝트 → **Custom domains** → **Set up a domain** →
`example.com` 입력. 도메인이 같은 Cloudflare 계정에 있으면 DNS 레코드는
자동으로 만들어지고 인증서도 자동 발급됩니다.

`www`도 쓰려면 같은 방식으로 `www.example.com`을 한 번 더 추가하세요.

**4) Vercel 정리**

Cloudflare Pages가 정상 동작하는 것을 확인한 뒤 Vercel 프로젝트에서
도메인을 제거하세요. (`vercel.json`은 남겨 둬도 Cloudflare에서는 무시됩니다.)

---

### ⚠️ Cloudflare 설정 중 이 앱을 깨뜨릴 수 있는 항목

이 앱은 HTML 안에 인라인 `<script>`로 로직이 들어 있어서, 아래 기능들에 민감합니다.

- **Rocket Loader — 반드시 OFF.**
  Speed → Optimization → Content Optimization.
  켜면 인라인 스크립트 실행 순서가 바뀌어 `FBGuard is not defined` 같은
  오류로 화면이 비어 버립니다.
- **Auto Minify / Mirage** — 켜지 마세요. 인라인 스크립트를 건드립니다.
- **Browser Cache TTL** — Caching → Configuration에서 **Respect Existing Headers**로.
  그래야 `_headers`의 `max-age=0, must-revalidate`가 살아 있고,
  배포해도 옛날 화면이 계속 보이는 일이 없습니다.
- **Always Use HTTPS** — 켜는 걸 권장합니다.
- Firestore는 브라우저에서 `firestore.googleapis.com`으로 **직접** 통신합니다.
  Cloudflare 프록시를 타지 않으므로 도메인을 바꿔도 Firebase 설정은
  건드릴 필요가 없습니다. (이 앱은 Firebase Auth를 쓰지 않아
  "승인된 도메인(Authorized domains)" 등록도 필요 없습니다.)

---

## B. Firestore 보안 규칙 배포 — ⚠️ 지금 앱이 안 되는 원인

`firestore.rules` 파일이 저장소에 있어도 **Firebase에 게시하지 않으면 적용되지 않습니다.**
현재 이 프로젝트(`gwbs-3ec22`)의 Firestore는 모든 읽기/쓰기를 거부하고 있습니다.

```
$ curl ".../projects/gwbs-3ec22/databases/(default)/documents/broadcasts"
{ "error": { "code": 403, "message": "Missing or insufficient permissions.",
             "status": "PERMISSION_DENIED" } }
```

콘솔에서 "테스트 모드"로 만든 규칙은 30일 뒤 자동으로 모든 요청을 막습니다.
이 저장소의 규칙에는 만료 시각이 없으므로, 한 번 게시하면 다시 막히지 않습니다.

### 방법 1 — Firebase 콘솔 (가장 빠름)

1. https://console.firebase.google.com → `gwbs-3ec22` 프로젝트
2. 빌드 → **Firestore Database** → **규칙** 탭
3. 기존 내용을 지우고 이 저장소의 `firestore.rules` 전체를 붙여넣기
4. **게시** 클릭

### 방법 2 — Firebase CLI

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project gwbs-3ec22
```

### 확인

게시 후 아래 명령이 `403`이 아니라 `200`을 돌려주면 정상입니다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://firestore.googleapis.com/v1/projects/gwbs-3ec22/databases/(default)/documents/broadcasts?pageSize=1&key=AIzaSyBni9HsSfoY_e9oQkW5HDAwypaEXMXQAOo"
```

웹에서는 페이지를 열었을 때 상단 빨간 배너가 사라지면 정상입니다.

---

## C. Firebase 설정을 바꿀 때

프로젝트를 옮기거나 키가 바뀌면 `fb-guard.js` 맨 위의 `FB_CONFIG` **한 곳만**
수정하면 됩니다. 예전에는 4개 HTML 파일에 같은 설정이 복사돼 있었습니다.
