# AI 코딩 어시스턴트 지침 — 터잡앙 FE

> 이 파일은 **코딩 작업용** 컨텍스트다. 프로젝트 배경·문제 정의는 [상위 README](../README.md), 기술 상세는 [FE README](./README.md), **UI·디자인 상세**는 [DESIGN.md](./DESIGN.md)를 참고한다.

---

## 1. 프로젝트 요약

| 항목        | 내용                                                        |
| ----------- | ----------------------------------------------------------- |
| **서비스**  | 터잡앙 — AI 기반 청년농 맞춤 빈집 분석·비교 (MVP 데모)      |
| **역할**    | 프론트엔드 단독 SPA. 등록 빈집 3채 대상 4단계 사용자 플로우 |
| **현재 AI** | mock 데이터 + 규칙 기반 점수 산출                           |
| **향후 AI** | Google Gemini Flash (사진 다중 업로드 → 항목별 진단)        |

### 사용자 플로우

```
조건 입력 → AI 분석·적합도 순위 → 정착비용 → 현장 방문 신청
```

| 단계 | 컴포넌트               | 핵심 로직                         |
| ---- | ---------------------- | --------------------------------- |
| 1    | `ConditionForm.tsx`    | `UserConditions` 입력             |
| 2    | `RankingResult.tsx`    | `rankHouses()` + `diagnosis` 표시 |
| 3    | `CostReport.tsx`       | `calculateCost()`                 |
| 4    | `VisitApplication.tsx` | 방문 신청 + `onsite` 체크리스트   |

---

## 2. 기술 스택

| 구분      | 기술                                |
| --------- | ----------------------------------- |
| 빌드      | Vite 8                              |
| UI        | React 19                            |
| 언어      | TypeScript 6                        |
| 스타일    | CSS (`index.css` + 컴포넌트 클래스) |
| 상태      | `useState` / `useMemo` (로컬)       |
| 저장      | `localStorage` (방문 신청)          |
| 백엔드    | 'Python + Fast API'                 |
| AI (현재) | `mockHouses.ts`                     |
| AI (예정) | Gemini Flash API                    |

### 터미널 명령

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (기본 http://localhost:5173)
npm run build    # tsc + vite build
npm run preview  # 빌드 미리보기
npm run lint     # ESLint
```

---

## 3. 디렉터리 구조

```
src/
├── App.tsx                 # 4단계 플로우·단계 네비게이션
├── types/index.ts          # House, UserConditions, DiagnosisItem 등
├── data/mockHouses.ts      # 샘플 빈집 3채 + 진단 mock
├── utils/
│   ├── scoring.ts          # 적합도 점수·순위·추천 이유
│   ├── costCalculator.ts   # 초기 정착비용 합산
│   ├── visitStorage.ts     # 방문 신청 localStorage
│   └── format.ts           # 금액·날짜 포맷
└── components/
    ├── ConditionForm.tsx
    ├── RankingResult.tsx
    ├── CostReport.tsx
    └── VisitApplication.tsx
```

### 핵심 타입 (`types/index.ts`)

- `DiagnosisStatus`: `'good' | 'caution' | 'danger' | 'onsite'`
- `DiagnosisItem`: `{ category, status, note }`
- `House`: 빈집 기본정보 + `diagnosis[]`
- `UserConditions`: 지역·작목·농지·예산·차량·창고·마당
- `AppStep`: `'conditions' | 'ranking' | 'cost' | 'visit' | 'complete'`

---

## 4. 코딩 가이드라인

### 언어 및 타입

- TypeScript strict 준수. `any` 사용 지양.
- 공통 타입은 `src/types/index.ts`에 정의하고 `import type` 사용.
- enum 대신 union type/string literal 유지 (기존 패턴 따름).

### React

- 함수형 컴포넌트 + named export / default export 혼용은 기존 파일 패턴 유지.
- props는 interface로 명시 (`ConditionForm`, `RankingResult` 등 참고).
- 전역 상태 라이브러리(Redux, Zustand 등) 추가하지 않음. `App.tsx` 로컬 상태로 충분.
- 파생 데이터는 `useMemo`로 계산 (`ranked`, `cost` 패턴).

### 스타일링

- Tailwind·CSS-in-JS 도입하지 않음.
- `index.css`의 기존 클래스(`app`, `step-nav`, 카드·버튼 등) 재사용.
- UI 톤: 제주 농촌·청년농 서비스 — 깔끔하고 읽기 쉬운 데모 UI.
- **색상·타이포·레이아웃·컴포넌트별 디자인 스펙**은 [DESIGN.md](./DESIGN.md)에 정리될 예정이다. UI 작업 시 해당 문서를 우선 참고하고, CLAUDE.md와 충돌하면 DESIGN.md를 따른다.

### 파일·로직 분리

- **UI** → `components/`
- **순수 계산** → `utils/` (점수, 비용, 포맷)
- **정적 데이터** → `data/`
- **플로우 조율** → `App.tsx`만

### 범위 및 변경 원칙

- MVP 범위: 빈집 **3채**, 4단계 플로우, mock 또는 Gemini 진단.
- 요청 없이 백엔드·DB·Supabase·라우터 추가하지 않음.
- 불필요한 추상화·과도한 리팩터링 지양. 최소 diff로 목표 달성.
- README·CLAUDE.md 수정은 사용자 요청 시에만.

### 주석

- 점수 산출·비용 계산 등 **비즈니스 로직**에만 간단히.
- 자명한 JSX·타입에는 주석 생략.

---

## 5. Gemini API 연동 규칙

### 환경 변수

`.env.example` 참고. 로컬은 `.env`에 설정 (Git 추적 금지).

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

### 보안

- **API 키를 프론트엔드에 노출하지 않는다.** `VITE_GEMINI_API_KEY` 같은 클라이언트 env 사용 금지.
- 연동 시 **Vite dev server 프록시** 또는 **별도 API 레이어**에서 Gemini 호출.
- `.env`는 `.gitignore`에 포함됨.

### 연동 시 데이터 흐름

```
[사용자] 사진 여러 장 업로드
    ↓
[프록시/API] Gemini Flash 호출 (프롬프트: 항목별 양호·주의·위험·현장확인)
    ↓
[응답] DiagnosisItem[] JSON 파싱
    ↓
[기존] rankHouses() → RankingResult → CostReport → VisitApplication
```

### 프롬프트·응답 규칙

- 진단 항목 예: 지붕, 창호, 벽·천장, 바닥, 누수·곰팡이, 난방, 화장실 등.
- 상태값은 반드시 `good | caution | danger | onsite` 중 하나.
- 사진만으로 판단 불가한 항목(배관, 전기, 소유관계 등)은 `onsite` + note 안내.
- mock → Gemini 전환 시 **`House.diagnosis` 구조 유지**. `scoring.ts`, `VisitApplication` 체크리스트 재사용.

### mock과의 관계

- `mockHouses.ts`는 Gemini 미연동·오프라인 데모용으로 유지 가능.
- 실제 분석 결과는 업로드 시점에 `House` 객체에 `diagnosis`를 채워 넣는 방식 권장.

---

## 6. AI 어시스턴트 작업 시 체크리스트

작업 전:

1. 4단계 플로우가 깨지지 않는지 확인.
2. `types/index.ts`와 기존 utils 시그니처 호환 유지.
3. MVP 3채·데모 시연 가능 상태 유지.

작업 후:

1. `npm run build` / `npm run lint` 통과 확인.
2. API 키·비밀값 코드/커밋에 포함되지 않았는지 확인.
3. git commit은 **사용자가 요청할 때만** 수행.

---

## 7. 참고 문서

- [프로젝트 전체 README](../README.md) — 문제 정의, MVP 기능, 시장성
- [FE README](./README.md) — 구현 현황, 실행 방법, 향후 계획
- [DESIGN.md](./DESIGN.md) — UI·디자인 가이드 (색상, 타이포, 레이아웃, 컴포넌트 스펙 등 상세 설명)
