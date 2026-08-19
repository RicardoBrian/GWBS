# 관산중학교 방송부 - 설치 가이드

## 1. Firebase 설정

### 1-1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: `gwbs-broadcast`)
3. Google Analytics는 선택사항

### 1-2. Firestore 데이터베이스 생성
1. Firebase 콘솔 좌측 메뉴 → **빌드 > Firestore Database**
2. **데이터베이스 만들기** 클릭
3. **테스트 모드**로 시작 → 만든 직후 아래 1-5를 반드시 진행하세요.
   (테스트 모드 규칙은 30일 뒤 만료되어 앱 전체가 멈춥니다)
4. 위치: `asia-northeast3 (서울)` 선택

### 1-3. 웹 앱 등록 및 config 복사
1. Firebase 콘솔 → 프로젝트 설정 (⚙️ 아이콘)
2. **내 앱** 섹션 → 웹 아이콘(`</>`) 클릭
3. 앱 닉네임 입력 후 **앱 등록**
4. 표시되는 `firebaseConfig` 코드를 복사

### 1-4. fb-guard.js에 config 붙여넣기
`fb-guard.js` 파일 맨 위의 `FB_CONFIG`를 실제 값으로 교체합니다.
(모든 페이지가 이 설정 하나를 공유합니다.)

```javascript
window.FB_CONFIG = {
  apiKey: "YOUR_API_KEY",          // ← 실제 값으로 교체
  authDomain: "...",
  projectId: "...",
  ...
};
```

### 1-5. Firestore 보안 규칙 적용 (필수!)
`firestore.rules`는 저장소에 있는 것만으로는 적용되지 않습니다. 반드시 게시하세요.

1. Firebase 콘솔 → Firestore Database → **규칙** 탭
2. `firestore.rules` 파일 내용을 붙여넣고 **게시**

또는 CLI로:
```bash
firebase deploy --only firestore:rules --project gwbs-3ec22
```

> 콘솔의 "테스트 모드" 기본 규칙은 30일 뒤 모든 요청을 차단합니다.
> 앱이 갑자기 데이터를 못 불러오면 거의 항상 이 문제입니다.
> 자세한 내용은 [DEPLOY.md](DEPLOY.md#b-firestore-보안-규칙-배포--️-지금-앱이-안-되는-원인) 참고.

---

## 2. 배포 & 도메인 연결

Vercel / Cloudflare Pages 배포 방법과 Cloudflare 도메인 연결 절차는
**[DEPLOY.md](DEPLOY.md)** 에 정리해 두었습니다.

```bash
git add .
git commit -m "설정 반영"
git push
```

---

## 3. 기존 구글 스프레드시트 데이터 마이그레이션

Firebase 콘솔에서 직접 Firestore에 데이터를 입력하거나,
관리자 패널(비밀번호: 9600)을 통해 데이터를 새로 등록하세요.

### Firestore 컬렉션 구조
| 컬렉션 | 설명 |
|--------|------|
| `broadcasts` | 방송 일정 (문서 ID: 날짜 키 `yyyy-MM-dd`) |
| `attendance` | 출석 기록 (문서 ID: `날짜_시간대_이름`) |
| `songs` | 신청곡 목록 |
| `manuals` | 업무 매뉴얼 |

---

## 4. 신청곡 기능 추가

학생들이 신청곡을 직접 입력하려면 별도의 신청 페이지를 만들거나,
Google Forms → Firestore 연동을 설정하세요.
(현재는 관리자가 직접 Firestore에 추가하는 방식)
