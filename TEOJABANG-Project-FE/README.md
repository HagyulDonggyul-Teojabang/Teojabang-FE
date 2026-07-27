# 터잡앙 프론트엔드 (TEOJABANG-Project-FE)

> 터잡앙 MVP 데모 웹 애플리케이션

프로젝트 전체 배경과 문제 정의는 [상위 README](../README.md)를 참고한다.

---

## 목차

- [기술 스택](#기술-스택)
- [현재 개발 진행도](#현재-개발-진행도)
- [사용자 플로우](#사용자-플로우)
- [프로젝트 구조](#프로젝트-구조)
- [로컬 실행 방법](#로컬-실행-방법)
- [향후 계획](#향후-계획)

---

## 기술 스택

| 구분              | 기술                                     |
| ----------------- | ---------------------------------------- |
| **빌드 도구**     | [Vite](https://vite.dev/) 8              |
| **UI 프레임워크** | [React](https://react.dev/) 19           |
| **언어**          | TypeScript 6                             |
| **스타일링**      | CSS (커스텀 스타일, `index.css`)         |
| **상태 관리**     | React `useState` / `useMemo` / `useEffect` (로컬 상태) |
| **백엔드 연동**   | FastAPI (`/api` → Vite 프록시 → `:8000`) |
| **AI 분석**       | Gemini API (백엔드 경유)                 |
| **로컬 저장**     | `localStorage` (방문 신청 내역만)        |

### 주요 의존성

```json
{
  "react": "^19.2.7",
  "react-dom": "^19.2.7",
  "vite": "^8.1.1",
  "typescript": "~6.0.2"
}
```

---

## 현재 개발 진행도

> **2026.07 기준** — MVP 핵심 플로우 + 백엔드·Gemini 연동 완료. 관리자/청년농 화면 분리 및 UX 개선 반영.

### 전체 진행 요약

| 영역 | 진행률 | 비고 |
| ---- | ------ | ---- |
| 시작 페이지 | ✅ 완료 | 로고 + 「사용하러 가기」 |
| 청년농 서비스 플로우 | ✅ 완료 | 조건 입력 → 순위 → 정착비용 → 방문 신청 |
| 관리자 빈집 등록 | ✅ 완료 | 헤더 토글로 분리, 사진 업로드·AI 분석 |
| 백엔드 API 연동 | ✅ 완료 | 빈집 CRUD, Gemini 진단 |
| 방문 신청 서버 저장 | ⬜ 미구현 | 현재 `localStorage`만 사용 |
| 관리자 인증 | ⬜ 미구현 | 토글 UI만 (실제 로그인 없음) |

### 기능별 상세

| 기능 | 상태 | 설명 |
| ---- | ---- | ---- |
| **시작 페이지** | ✅ | `LandingPage` — 브랜드 로고 + 「사용하러 가기」 버튼, 전체 화면 중앙 배치 |
| **관리자 모드 토글** | ✅ | 조건 입력 단계 헤더 — 「관리자 시점으로 보기」 ON/OFF |
| **관리자: 빈집 사진 업로드** | ✅ | `HousePhotoAnalyze` — 최대 3채, 사진·메타데이터 입력 후 AI 분석·저장 |
| **관리자: 전체 분석·저장** | ✅ | 3채 **병렬** 등록 (`Promise.all` + `slotIndex`) |
| **관리자: AI 재분석** | ✅ | 분석 실패 시 저장된 사진으로 재시도 (`POST /houses/{id}/reanalyze`) |
| **관리자: 전체 초기화** | ✅ | 서버·UI 데이터 일괄 삭제 |
| **청년농: 영농 조건 입력** | ✅ | `ConditionForm` — 지역·작목·농지·예산 (빈집 3채 등록 완료 후 활성화) |
| **AI 분석·적합도 순위** | ✅ | `RankingResult` — 백엔드 진단 + 규칙 기반 점수·순위·추천 이유 |
| **항목별 상태 진단** | ✅ | 지붕·외벽·창호·누수·곰팡이·노후도 — 양호/주의/위험/현장 확인 |
| **진단 결과 표시** | ✅ | 번호 목록 형식 (`1. 지붕 양호 — …`) |
| **초기 정착비용 계산** | ✅ | `CostReport` — 빈집·농지·영농 패키지, 예산 비교, 수리비 범위 |
| **현장 방문 신청** | ✅ | `VisitApplication` — 일시·연락처, onsite 항목 체크리스트 |
| **단계별 네비게이션** | ✅ | 4단계 UI + 단계 전환 시 **페이지 상단 스크롤** |
| **이미지 업로드 최적화** | ✅ | 클라이언트 압축 (`compressImage.ts`, 512px) 후 전송 |
| **브랜드 로고** | 🔶 임시 | 🏠 + 「터잡앙」 텍스트 — `src/config/brand.ts`에서 이미지 교체 가능 |

### 역할별 화면 구성

```
[시작 페이지]
  └─ 사용하러 가기

[청년농 — 관리자 토글 OFF]
  STEP 1  영농 조건 입력
  STEP 2  AI 분석 · 적합도 순위
  STEP 3  초기 정착비용
  STEP 4  방문 신청

[관리자 — 관리자 토글 ON]  (조건 입력 단계에서만)
  빈집 사진 업로드 · AI 분석 · 저장 (최대 3채)
  ※ 영농 조건 입력 UI는 숨김
```

### 백엔드 연동 API (프론트 사용처)

| Method | 경로 | 사용 컴포넌트 |
| ------ | ---- | ------------- |
| `GET` | `/houses` | `App.tsx` — 앱 진입 시 빈집 목록 로드 |
| `POST` | `/houses` | `HousePhotoAnalyze` — 빈집 등록 + AI 진단 |
| `POST` | `/houses/{id}/reanalyze` | `HousePhotoAnalyze` — AI 재분석 |
| `DELETE` | `/houses` | `HousePhotoAnalyze` — 전체 초기화 |

개발 환경에서는 `/api/*` 요청이 Vite 프록시를 통해 `http://localhost:8000`으로 전달된다.

### 아직 mock/로컬만 사용하는 부분

| 항목 | 설명 |
| ---- | ---- |
| `mockHouses.ts` | **CROPS**, **REGIONS** 상수만 사용 (빈집 데이터는 서버에서 로드) |
| `analyzeApi.ts` | `POST /analyze` 미리보기 클라이언트 — **UI 미연결** (레거시) |
| `visitStorage.ts` | 방문 신청 — **localStorage** 저장 (서버 API 없음) |

---

## 사용자 플로우

```
0. 시작 페이지    → 로고 확인 후 「사용하러 가기」
1. 조건 입력      → (관리자) 빈집 3채 사진 업로드·AI 분석
                 → (청년농) 영농 조건 입력 → 「등록된 3채 비교하기」
2. AI 분석        → 적합도 순위·항목별 진단 확인, 후보 선택
3. 정착비용       → 선택 빈집 기준 초기 정착비용·예산 비교
4. 방문 신청      → 방문 일시·연락처 → 접수 확인 + 현장 체크리스트
5. 처음부터       → 시작 페이지로 복귀
```

---

## 프로젝트 구조

```
TEOJABANG-Project-FE/
├── src/
│   ├── App.tsx                    # 단계 플로우, 관리자 토글, 백엔드 연동
│   ├── main.tsx
│   ├── index.css
│   ├── config/
│   │   └── brand.ts               # 로고 이미지 설정 (교체 포인트)
│   ├── types/
│   │   └── index.ts               # House, UserConditions, CostBreakdown 등
│   ├── data/
│   │   ├── mockHouses.ts          # 지역·작목 상수
│   │   └── jejuFarmlandPrices.ts  # 농지 실거래 참고 데이터
│   ├── utils/
│   │   ├── houseApi.ts            # 빈집 CRUD API
│   │   ├── apiClient.ts           # API 베이스 URL, 에러 파싱
│   │   ├── compressImage.ts         # 업로드 전 이미지 압축
│   │   ├── buildHouseFromUpload.ts
│   │   ├── scoring.ts             # 적합도 점수·순위
│   │   ├── costCalculator.ts      # 초기 정착비용
│   │   ├── visitStorage.ts        # 방문 신청 localStorage
│   │   └── format.ts              # 금액·진단 요약 포맷
│   └── components/
│       ├── LandingPage.tsx        # 시작 페이지
│       ├── BrandLogo.tsx          # 공통 로고
│       ├── HousePhotoAnalyze.tsx  # 관리자: 빈집 사진 업로드·AI 분석
│       ├── ConditionForm.tsx      # 청년농: 영농 조건 입력
│       ├── RankingResult.tsx      # AI 분석·적합도 순위
│       ├── CostReport.tsx         # 초기 정착비용
│       └── VisitApplication.tsx   # 현장 방문 신청
├── public/
├── vite.config.ts                 # /api 프록시 설정
├── API.md                         # API 명세 (FE·BE 공통)
└── package.json
```

---

## 로컬 실행 방법

백엔드(FastAPI)와 함께 실행해야 빈집 등록·AI 분석이 동작한다.

```bash
# 1. 백엔드 (별도 터미널, ../Teojabang-BE)
cd ../Teojabang-BE
source venv/bin/activate
uvicorn server:app --reload

# 2. 프론트엔드
npm install
npm run dev
```

| 명령 | 설명 |
| ---- | ---- |
| `npm run dev` | 개발 서버 (기본 `http://localhost:5173`) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 |

프로덕션 배포 시 `VITE_API_BASE_URL` 환경 변수로 API 주소를 지정한다.

---

## 향후 계획

| 우선순위 | 항목 |
| -------- | ---- |
| 높음 | 관리자 인증 (로그인·역할 기반 접근) |
| 높음 | 방문 신청 백엔드 API 연동 |
| 중간 | 브랜드 로고 이미지 적용 (`src/config/brand.ts`) |
| 중간 | `POST /analyze` 미리보기 UI 연동 또는 레거시 코드 정리 |
| Stretch | 사진 기반 수리비 예측 고도화 |
| Stretch | 농지 매칭, 지원정책 추천 |

---

## 라이선스

2026 제주 지역대학 연합 창업 캠프 프로젝트
