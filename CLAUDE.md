# GWBS 작업 지침 (관산중 방송부)

방송부 운영 앱: 방송 일정, 신청곡, 출석, 매뉴얼, 학생 관리. 설치는 `SETUP.md`, 배포는 `DEPLOY.md`.

- **업무용 앱**이다(출결·방송부·봉사). 수업용 Ohweb 과는 분리한다. 방학 때 gwansanattend·GWBS·GWVS 를 DB 하나·레포 하나로 합칠 예정이며, **지금은 합치지 않는다**(다른 레포 코드·DB를 끌어오지 않는다).

## 구조
- 빌드 없음. 레포 맨 위가 그대로 배포된다.
- `index.html` 방송부 화면, `admin.html` 관리자(구글 로그인), `request.html` **학생 신청곡 페이지(공개)**, `migrate.html` 옛 구글 시트 → Firestore 이전용(1회성), `yt.js` 유튜브, `fb-guard.js` Firebase 설정·초기화.
- `functions/_middleware.js` 입장 게이트: `SITE_PASSWORD` 를 아는 사람만 들어온다(`/request*`, `fb-guard.js`, 로고는 공개). `/api/token` 은 `functions/_lib.js` 로 Firebase 토큰을 만든다.

## DB — Firebase `gwansan-work` (업무용 통합 프로젝트, 2026-11-09 전환)
- 방송부 데이터: `apps/broadcast/` 아래(`fb-guard.js` 의 `BC`) — `broadcasts`, `attendance`, `manuals`, `songs`, `settings`, 부원 `members/{명렬표 학생ID}`(`grade`, `name`, `studentId`).
- 방송 일정(`tasks[].p1·p2·p3`)과 방송부 출결은 화면·검색용으로 **이름 글자**를 그대로 두고, 부원과 맞는 이름에는 학생 ID 를 함께 저장한다: `tasks[].p1Ids·p2Ids·p3Ids`, `attendance.studentId·grade`(`fb-guard.js` 의 `BCIds`). 부원이 아닌 이름(선생님 등)이나 같은 학년 동명이인은 ID 없이 둔다. 관리 화면에서 부원을 추가하면 공용 명렬표에서 같은 학년·이름을 찾아 학생 ID 를 문서 ID 로 쓴다.
- 읽기·쓰기: 방송부원(입장 비밀번호 → Cloudflare 가 주는 커스텀 토큰 `staff: true`)과 관리자(공용 `admins/{이메일}` 구글 계정)만. 신청 페이지는 신청곡 만들기만(공개).
- 규칙: 세 앱 공용 파일 하나 — 원본은 GWVS 레포 `firestore.rules`(사용자 컴퓨터 `~/code/workapps-merge/`, 시험 `rules-test/broadcast.rules.test.mjs`). 이 레포의 `firestore.rules`·`.firebaserc` 는 예전 프로젝트(gwbs-3ec22)용으로 남아 있다.
- 예전 프로젝트 `gwbs-3ec22` 는 백업으로 남겨 두었다(지우지 않음).

## 배포
- Cloudflare Pages, Build command 비움, output `/`. 주소 `gwbs.kakainfo.com`.
- Cloudflare 비밀값: `SITE_PASSWORD`(없으면 게이트 꺼짐), `FIREBASE_SERVICE_ACCOUNT`(**gwansan-work** 서비스 계정 키). 넣거나 바꾼 뒤엔 재배포해야 적용된다. Production 과 Preview 는 값 목록이 따로다 — 미리보기 주소에서 시험하려면 Preview 에도 둘 다 넣는다.
- 실제 배포 브랜치는 `claude/korean-broadcast-schedule-81tmb4`(main 없음).
- 헤더는 `_headers`. `vercel.json` 은 Vercel 을 안 쓰므로 남은 파일이다(지우려면 먼저 묻는다).

## 테스트
- 자동 테스트 없음. 고친 뒤 `*.pages.dev` 미리보기 또는 실제 주소에서 직접 눌러 확인하고, 확인한 화면을 사용자에게 말한다.

## 작업 원칙
- 고치기 전에 **실제 오류 메시지를 먼저 확보**한다. 메시지 없이 추측으로 고치지 않는다.
  사용자에게 확인을 부탁할 때는 열어볼 주소·볼 곳을 하나로 정확히 준다.
- 잘 되던 기능은 요청 없이 건드리지 않는다. 원인이 확인되면 그 원인만 고치고, "겸사겸사" 개선은 먼저 묻는다.
- 같은 문제로 두 번 고쳐도 안 되면 멈추고, 확인한 사실과 모르는 것을 정리해 보고한다.
- 사용자에게는 한국어로, 짧게, 무엇을 바꿨고 무엇을 확인했는지(확인 못 한 것도) 말한다.
- 전체 DB 지도는 `RicardoBrian/Ohweb` 의 `DB.md`. 컬렉션을 새로 만들면 그 표도 고친다.
