# 붕억빵 작업 지침

작업하기 전에 다음 문서를 읽고 따른다.

1. [공통 AI 프로젝트 가이드](../.claude/common/README.md)
2. [공통 작업 규칙](../.claude/common/work-rules.md)
3. [공통 문서·SSOT 관리 규칙](../.claude/common/document-governance.md)
4. [공통 디자인 원칙](../.claude/references/design-common.md)
5. [제품 요구사항](docs/prd.md)
6. [용어 뜻 작성 가이드](docs/term-definition-guide.md) — 용어 콘텐츠를 작성·수정할 때
7. [AI 직원 만들기 step 페이지 작성 가이드](docs/guide-writing-principles.md) — 홈 카드의 업무 가이드 step 페이지를 작성·수정할 때

계정 삭제 알림 작업은 `apps-script/account-deletion-notifier/README.md`를 추가로 읽는다. 초기 화면 설계 검토에는 `docs/mobile-screen-design.md`를 참고하되, 현재 기능·권한·배포 상태는 PRD, 실제 코드, `firestore.rules`, `package.json`을 기준으로 판단한다.

기존 사용자 변경을 보존한다. 실제 실행·테스트 명령은 `package.json`, 실제 권한은 `firestore.rules`, Firebase 배포 대상은 `firebase.json`을 기준으로 확인한다.
