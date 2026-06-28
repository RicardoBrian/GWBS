# 관산중학교 방송부 - 설치 가이드

## 1. Firebase 설정

### 1-1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: `gwbs-broadcast`)
3. Google Analytics는 선택사항

### 1-2. Firestore 데이터베이스 생성
1. Firebase 콘솔 좌측 메뉴 → **빌드 > Firestore Database**
2. **데이터베이스 만들기** 클릭
3. **테스트 모드**로 시작 (나중에 `firestore.rules` 파일로 교체)
4. 위치: `asia-northeast3 (서울)` 선택

### 1-3. 웹 앱 등록 및 config 복사
1. Firebase 콘솔 → 프로젝트 설정 (⚙️ 아이콘)
2. **내 앱** 섹션 → 웹 아이콘(`</>`) 클릭
3. 앱 닉네임 입력 후 **앱 등록**
4. 표시되는 `firebaseConfig` 코드를 복사

### 1-4. index.html에 config 붙여넣기
`index.html` 파일에서 아래 부분을 찾아 교체:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",          // ← 실제 값으로 교체
  authDomain: "...",
  projectId: "...",
  ...
};
```

### 1-5. Firestore 보안 규칙 적용
1. Firebase 콘솔 → Firestore Database → **규칙** 탭
2. `firestore.rules` 파일 내용을 붙여넣고 **게시**

---

## 2. Netlify 배포

### 2-1. GitHub에 코드 push
```bash
git add .
git commit -m "feat: firebase+netlify 웹앱 초기 설정"
git push origin main
```

### 2-2. Netlify 배포
1. https://netlify.com 접속 → **Add new site**
2. **Import an existing project** → GitHub 연결
3. 레포지토리 선택
4. 빌드 설정:
   - Build command: 비워두기
   - Publish directory: `.` (루트)
5. **Deploy site** 클릭

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
