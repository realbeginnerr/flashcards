# 붕억빵

UX/UI 디자인·개발·AI 툴·마케팅 용어를 하루 열 장씩 익히는 플래시카드 웹 앱.

## 로컬 실행

```powershell
npm ci --include=dev
npm run dev
```

주소: `http://localhost:5174/`. 기존 레시피 사이트의 5173 포트와 분리했다. 포트가 사용 중이면 오류로 종료하며 다른 포트로 바꾸지 않는다.

`npm run dev`는 시작할 때 최신 소스로 `dist`를 만든다. 실행 중 파일을 바꿨다면 `npm run build` 후 브라우저를 새로고침한다. 개발 서버에 자동 새로고침 기능은 없다.

## 검증과 빌드

```powershell
npm test
npm run test:rules
npm run build
```

- `npm test`: 데이터·학습 순서·저장·복습·화면 이벤트·관리자 폼 테스트.
- `npm run test:rules`: Firestore 에뮬레이터를 사용한다. Firebase CLI와 Java 17 이상이 필요하며 운영 데이터에 쓰지 않는다.
- `npm run preview`: 다시 빌드한 뒤 `http://localhost:4174/`에서 확인한다.

## 구현 범위

- 239개 초기 용어, 분야별 학습, 한글·영문 병기.
- 10장씩 학습, 마지막 묶음, 다음 묶음, 분야별 완료 진행 저장.
- 설명 확인 후 알아요·몰라요 평가, 전체·회차별 모르는 용어 복습.
- 브라우저 기록 유지, 저장 오류·손상 안내, 텍스트·코드 예시 보존.
- 관리자 Google 로그인, 검색, 등록·수정·삭제, 동시 수정 충돌 감지.
- Firebase Authentication·Firestore를 사용한다. 분석 추적은 연결하지 않았다.

## 데이터와 인증

- `public/terms.json`: 검토한 원본에서 변환한 초기 데이터. 내부 검토 메모와 CSV 원문은 공개 파일에 포함하지 않는다.
- Firebase가 설정되면 방문자는 Firestore의 최신 목록을 읽는다. `public/config.js`의 설정은 Firebase 웹 앱 공개 설정이며 비공개 키가 아니다.
- 원본 CSV와 검토용 JSON은 상위 프로젝트의 `data/`에 보존한다. 이 앱 배포에 포함하지 않는다.
- 관리자 쓰기 권한은 `firestore.rules`에서 검증된 관리자 이메일로 제한한다. 화면 숨김만으로 권한을 제어하지 않는다.
- 일반 방문자는 가입하지 않는다. 학습 기록은 현재 브라우저에 저장되고, 다른 기기와 동기화되지 않는다.
- Firestore 규칙을 수정한 뒤에는 해당 프로젝트에 `firebase deploy --only firestore:rules --project flashcars-294bc`를 실행해야 한다.

## 운영 주의

학습 기록은 사이트 주소마다 별도다. localhost에서 학습한 기록은 배포 주소에 자동으로 옮겨지지 않는다. 브라우저 데이터 삭제 시 기록도 사라진다.

`scripts/firebase-setup.mjs`는 초기 연결을 위한 관리자 도구다. Google Cloud OAuth 토큰을 stdin으로 받아 메모리에서만 사용한다. 토큰을 파일·Git·셸 인수에 넣지 않는다. 초기 등록은 기존 문서가 있으면 덮어쓰지 않고 원자적으로 실패한다.

이 저장소의 자동 테스트 통과는 실제 Google 팝업 로그인과 모바일 브라우저 시각 검증을 대신하지 않는다.
