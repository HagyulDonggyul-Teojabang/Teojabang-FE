# AI 코딩 어시스턴트 지침 — 터잡앙 (FE + BE)

> 이 파일은 **코딩 작업용** 컨텍스트다. UI·디자인 상세는 [DESIGN.md](./DESIGN.md) 참고.

---

## 1. 프로젝트 요약

| 항목       | 내용                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| **서비스** | 터잡앙 — AI 기반 청년농 맞춤 빈집 분석·비교 (MVP 데모)                         |
| **구성**   | React 프론트엔드(SPA) + Python/FastAPI 백엔드, 등록 빈집 3채 대상 4단계 플로우 |
| **AI**     | Google Gemini(`gemini-3.5-flash`) **연동 완료·실제 동작 중** (mock 아님)       |
| **mock**   | `mockHouses.ts`는 오프라인 데모 대체용으로만 유지                              |

### 사용자 플로우

```
조건 입력 → AI 분석·적합도 순위 → 정착비용 → 현장 방문 신청
```

| 단계 | 컴포넌트               | 핵심 로직                                  |
| ---- | ---------------------- | ------------------------------------------ |
| 1    | `ConditionForm.tsx`    | `UserConditions` 입력                      |
| 2    | `RankingResult.tsx`    | `rankHouses()` + `diagnosis` 표시          |
| 3    | `CostReport.tsx`       | `calculateCost()` + `estimateRepairCost()` |
| 4    | `VisitApplication.tsx` | 방문 신청 + `onsite` 체크리스트            |

상단 "관리자: 빈집 등록"(`HouseRegister.tsx`) 토글로 사진 업로드 → 실시간 Gemini 진단 데모 가능.

---

## 2. 기술 스택

### Frontend

| 구분   | 기술                                |
| ------ | ----------------------------------- |
| 빌드   | Vite 8                              |
| UI     | React 19                            |
| 언어   | TypeScript 6                        |
| 스타일 | CSS (`index.css` + 컴포넌트 클래스) |
| 상태   | `useState` / `useMemo` (로컬)       |
| 저장   | `localStorage` (방문 신청)          |

### Backend

| 구분            | 기술                                                   |
| --------------- | ------------------------------------------------------ |
| 언어/프레임워크 | Python + FastAPI (Uvicorn)                             |
| AI              | Google Gemini(`google-genai`), 모델 `gemini-3.5-flash` |
| 이미지 처리     | Pillow (1024px 이하로 축소)                            |
| 검증            | Pydantic (`DiagnosisItem`, `response_schema`)          |
| 저장소          | 없음 — `houses.json` 파일을 서버 시작 시 메모리로 읽음 |

### 터미널 명령

```bash
# frontend
npm install && npm run dev   # http://localhost:5173

# backend (별도 터미널)
pip install fastapi uvicorn python-dotenv google-genai pillow pydantic
uvicorn server:app --reload  # http://localhost:8000, .env에 GEMINI_API_KEY 필요
```

---

## 3. 디렉터리 구조

```
src/                         # frontend
├── App.tsx
├── types/index.ts
├── data/mockHouses.ts       # 오프라인 데모용, 실사용 경로 아님
├── utils/                   # scoring, costCalculator, visitStorage, format
├── components/              # 페이지 간 재사용 UI
└──pages/                    # ConditionsPage.tsx, RankingPage.tsx, CostPage.tsx, VisitPage.tsx

backend/                     # 백엔드 (별도 레포: Teojabang-BE)
├── server.py                # GET /houses, POST /analyze
├── houses.json               # 빈집 데이터 + 진단 결과
└── house1/                   # 샘플 사진
```

### 핵심 타입 (`types/index.ts`)

- `DiagnosisStatus`: `'good' | 'caution' | 'danger' | 'onsite'`
- `DiagnosisItem`: `{ category, status, note }`
- `House`: 빈집 기본정보 + `diagnosis[]`
- `UserConditions`: 지역·작목·농지·예산·차량·창고·마당

---

## 4. 코딩 가이드라인

- TypeScript strict 준수, `any` 지양. 공통 타입은 `types/index.ts`에 정의.
- 함수형 컴포넌트, props는 interface로 명시. 전역 상태 라이브러리 추가 금지(`App.tsx` 로컬 상태로 충분).
- Tailwind·CSS-in-JS 도입 금지, `index.css` 기존 클래스 재사용. 디자인 스펙은 [DESIGN.md](./DESIGN.md) 우선.
- 백엔드 신규 엔드포인트는 `server.py`에 추가. `DiagnosisItem` 구조는 프론트 타입과 반드시 일치시킬 것.
- MVP 범위(빈집 3채, 4단계 플로우) 밖의 새 인프라(DB, 클라우드 스토리지, 인증 등)는 요청 없이 추가하지 않음.
- 비즈니스 로직(점수·비용 계산)에만 간단히 주석, 자명한 코드엔 생략.

---

## 5. Gemini 연동 — 실제 동작 방식

이미 연동되어 실제로 동작 중이다 (예정이 아님).

- `.env`(백엔드)에 `GEMINI_API_KEY`만 있고, 프론트엔드에는 절대 노출하지 않는다. 모델명은 `server.py`에 하드코딩.
- 흐름: 사진 업로드/서버 시작 → FastAPI가 Gemini 호출 → `DiagnosisItem[]` JSON 응답 → `House.diagnosis`에 반영 → `rankHouses()`가 그대로 사용.
- 실제 분석 항목: 지붕·외벽·창호·누수·곰팡이·노후도 6개. 상태값은 `good|caution|danger|onsite` 중 하나, 사진으로 판단 불가하면 `onsite`.
- `mockHouses.ts`는 백엔드 없이 프론트만 켤 때 대체용으로 유지.

---

## 6. 작업 체크리스트

- 4단계 플로우가 깨지지 않는지, `types/index.ts`/utils 시그니처가 호환되는지 확인.
- 백엔드 변경 시 `uvicorn --reload` 재시작 + `curl localhost:8000/houses` 정상 응답 확인.
- 프론트 변경 시 `npm run build` / `npm run lint` 통과 확인.
- API 키·비밀값 커밋 금지.

---

## 7. 참고 문서

- [FE README](./README.md), [DESIGN.md](./DESIGN.md)
- 백엔드 레포: `HagyulDonggyul-Teojabang/Teojabang-BE`
