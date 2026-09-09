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

### 방법 2 — Cloudflare Pages로 호스팅까지 옮기기  ← **이제 이 방식이 필요합니다**

> 입장 게이트(`functions/`)와 관리자 구글 로그인은 Cloudflare Pages에서만
> 동작합니다. Vercel은 `functions/` 디렉터리를 실행하지 않으므로,
> Vercel에 그대로 두면 **사이트가 아무 보호 없이 열립니다.**

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

---

## D. 유튜브 검색 자동화 (선택)

신청곡에 유튜브 영상을 연결해 두면 방송 페이지의 **재생 목록** 버튼이
선택한 곡들을 한 탭에 담은 임시 재생목록으로 열어 줍니다.

> 참고: 유튜브 뮤직에는 링크만으로 재생목록을 만드는 방법이 없습니다.
> 일반 유튜브의 `watch_videos` 엔드포인트를 쓰며, 로그인 없이 열리지만
> 공식 문서에 없는 주소라 구글이 바꿀 수 있고 한 번에 50곡까지입니다.

### 키 없이 쓰기 (기본)
관리자 페이지 → 신청곡 → 곡 옆 **🔍 찾기**
→ 유튜브 검색 탭이 열림 → 영상 주소 복사 → **📋** 버튼

### 키를 넣으면 (원클릭)
곡 옆 **🔍 찾기** → 앱 안에서 검색 결과 썸네일 → 클릭 → 바로 연결.

1. https://console.cloud.google.com → 프로젝트 선택(또는 생성)
2. **API 및 서비스 → 라이브러리** → `YouTube Data API v3` → **사용 설정**
3. **API 및 서비스 → 사용자 인증 정보** → **사용자 인증 정보 만들기 → API 키**
4. 만들어진 키 → **키 제한**
   - 애플리케이션 제한: **HTTP 리퍼러** → `https://gwbs.kakainfo.com/*` 추가
   - API 제한: **YouTube Data API v3** 만 선택
5. `yt.js` 첫 줄의 `window.YT_API_KEY = "";` 에 키를 붙여넣고 배포

**할당량**: 검색 1회 = 100유닛, 기본 한도 10,000유닛/일 → **하루 100곡**.
초과하면 자동으로 위의 클립보드 방식 안내로 넘어갑니다.

---

## E. 접속 권한 구조

| 경로 | 누가 | 어떻게 |
|------|------|--------|
| `/request.html` | 학생 전체 | 게이트 예외 (공개) |
| `/` `/index.html` 등 | 방송부원 | **입장 비밀번호** (`SITE_PASSWORD` 시크릿) |
| `/admin.html` | 본인만 | **Cloudflare Access → 구글 로그인** |

별도의 "방송 관리 비밀번호"는 없앴습니다. 사이트 입장 자체가 게이트라
들어온 사람은 이미 방송부원이기 때문입니다.

### E-1. 입장 비밀번호 (`SITE_PASSWORD`)

Cloudflare Pages 프로젝트 → **Settings → Variables and Secrets**
→ **Add** → 유형 **Secret**

| 이름 | 값 |
|------|-----|
| `SITE_PASSWORD` | 방송부원에게 알려 줄 입장 비밀번호 |

- 코드에 들어가지 않습니다. 바꿔도 재배포가 필요 없습니다.
- 통과하면 30일짜리 서명 쿠키(HttpOnly·Secure)가 발급됩니다.
  비밀번호를 모르면 쿠키를 위조할 수 없습니다(HMAC-SHA256).
- ⚠️ **이 시크릿을 설정하지 않으면 게이트가 동작하지 않고 사이트가 그냥 열립니다.**
  (배포 직후 스스로 잠겨 버리는 사고를 막기 위한 기본 동작입니다.)

### E-2. Firestore 쓰기 권한 (`FIREBASE_SERVICE_ACCOUNT`)

게이트를 통과한 브라우저만 Firestore에 쓸 수 있게 하려면, Cloudflare가
Firebase 커스텀 토큰을 발급해야 합니다.

1. Firebase 콘솔 → 프로젝트 설정 → **서비스 계정** → **새 비공개 키 생성**
   → JSON 파일 다운로드
2. Pages → Settings → Variables and Secrets → **Secret** 추가

| 이름 | 값 |
|------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | 내려받은 JSON 파일 **전체 내용**을 그대로 붙여넣기 |

> 이 키는 Firebase 전체 권한을 가집니다. 절대 저장소에 커밋하지 마세요.

### E-3. 관리자 페이지 구글 로그인 (Cloudflare Access)

1. Cloudflare 대시보드 → **Zero Trust** → 최초 1회 팀 이름 설정 (Free 플랜, 50명까지)
2. **Settings → Authentication → Login methods** → **Add new** → **Google**
3. **Access → Applications → Add an application → Self-hosted**
   - Application name: `GWBS 관리자`
   - Subdomain / Domain: `gwbs` / `kakainfo.com`
   - **Path**: `admin.html`
4. Policy 추가 — Action **Allow**, Include **Emails** → 본인 Gmail 주소
5. 저장

이후 `gwbs.kakainfo.com/admin.html` 은 구글 로그인 화면을 거칩니다.
로그인하면 비밀번호 없이 바로 열리고, 설정 탭의 **접속 권한** 카드에
로그인한 계정이 표시됩니다.

> Access를 아직 붙이지 않았다면 관리자 페이지는 기존의 페이지 내 비밀번호
> 화면으로 폴백합니다. 무방비로 열리지는 않지만, 그 비밀번호는 소스에
> 그대로 노출돼 있으니 Access 설정을 마치는 편이 좋습니다.

### E-4. 적용 순서

시크릿이 없으면 편집이 막히므로 아래 순서를 지켜 주세요.

1. `FIREBASE_SERVICE_ACCOUNT`, `SITE_PASSWORD` 시크릿 등록
2. 재배포 (시크릿은 새 배포부터 적용됩니다)
3. `firestore.rules` 게시 — `firebase deploy --only firestore:rules`
4. 사이트 접속 → 입장 비밀번호 확인 → 일정 수정이 되는지 확인
5. Cloudflare Access 설정 → `/admin.html` 구글 로그인 확인

3번을 2번보다 먼저 하면 **그 사이 모든 편집이 막힙니다.** 읽기는 계속 됩니다.

### E-5. 이 구조가 막는 것과 못 막는 것

**막습니다**
- 신청곡 링크를 타고 들어온 학생이 방송 페이지를 보는 것
- 데이터 변조 — 일정·명단·출결·매뉴얼 쓰기는 전부 게이트 통과자만
- 신청곡 대량 등록 — 규칙에서 길이와 형식을 검사

**못 막습니다**
- **데이터 읽기.** Firestore 읽기는 여전히 공개입니다. 신청 페이지가
  공개라 거기서 프로젝트 ID와 API 키를 얻을 수 있고, 그걸로 방송 일정·
  학생 명단·출결을 조회할 수 있습니다.
- 읽기까지 막으려면 방송부원 전원이 구글 로그인을 해야 합니다
  (`firestore.rules` 의 `allow read: if true` 를 `if staff()` 로 바꾸고
  각 페이지에서 로그인을 요구하는 구조).
