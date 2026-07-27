# 터잡앙 백엔드 API 명세

Base URL: `http://localhost:8000`
(대화형 문서: `/docs`, 원본 스펙: `/openapi.json`)

## 엔드포인트 목록

| FE | BE | 기능 | 사용자 | Method | URL | 설명 | 상세 등록 | param |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 완료 | 완료 | 빈집 목록 조회 | 청년농 | GET | [`/houses`](#-빈집-목록-조회) | 등록된 빈집 목록(최대 3채) 조회 | ☑ | - |
| 완료 | 완료 | 빈집 등록 | 관리자 | POST | [`/houses`](#-빈집-등록) | 집 정보+사진 등록 → AI 진단 실행 → 목록에 추가·저장 | ☑ | 10 + 사진 |
| 완료 | 완료 | 사진 미리보기 진단 | 관리자 | POST | [`/analyze`](#-사진-미리보기-진단) | 등록 없이 사진만 올려 AI 진단 결과 미리보기 | ☑ | 사진만 |
| 완료 | 완료 | 전체 초기화 | 관리자 | DELETE | [`/houses`](#-전체-초기화) | 등록된 빈집·사진 전부 삭제하고 빈 상태로 되돌림 | ☑ | - |

---

## 🔌 빈집 목록 조회

| | |
| --- | --- |
| 카테고리 | 청년농 |
| 설명 | 등록된 빈집 목록(최대 3채)과 AI 진단 결과를 조회한다. 예비 청년농이 조건 입력 후 적합도 순위를 계산할 때 쓰는 데이터 원본. |
| Method | `GET` |
| URL | `/houses` |
| BE | 완료 |
| FE | 완료 |
| param | 비어 있음 |
| 사용자 | 청년농 |
| 상세 등록 | ☑ |

### Request

요청 파라미터 없음 (쿼리·바디 없음)

### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| (배열) | `House[]` | 등록된 빈집 목록. 등록된 집이 없으면 `[]` |
| `id` | string | `house-1` \| `house-2` \| `house-3` |
| `name`/`region`/`address`/`area`/`rent`/`deposit` | string/number | 등록 시 입력한 집 정보 |
| `imageUrl` | string | 대표 사진 URL |
| `vehicleAccess`/`hasWarehouse`/`hasYard` | bool | 영농 조건 |
| `publicTransportScore` | number | 대중교통 점수 (0~5) |
| `diagnosis` | `DiagnosisItem[]` | AI 진단 결과. `status`는 `good`\|`caution`\|`danger`\|`onsite` |

**Example**

```json
[
  {
    "id": "house-1",
    "name": "서귀포 감귤밭 인근 단독주택",
    "region": "서귀포",
    "address": "제주 서귀포시 남원읍 신례리 123-4",
    "area": 82,
    "rent": 350000,
    "deposit": 10000000,
    "imageUrl": "http://localhost:8000/house1/img1.jpg",
    "vehicleAccess": true,
    "hasWarehouse": true,
    "hasYard": true,
    "publicTransportScore": 2,
    "photoDir": "house1",
    "diagnosis": [
      { "category": "지붕", "status": "good", "note": "기와 지붕 상태 양호, 누수 흔적 없음" }
    ]
  }
]
```

### Status

`200` 정상 조회 (등록된 집이 없으면 빈 배열 반환, 별도 에러 케이스 없음)

---

## 🔌 빈집 등록

| | |
| --- | --- |
| 카테고리 | 등록/관리자 |
| 설명 | 집 정보와 사진을 받아 빈 슬롯(`house1`→`house2`→`house3` 순서)에 저장하고 Gemini로 진단한 뒤, 목록에 추가하고 `houses.json`에 반영한다. 최대 3채까지만 등록 가능. |
| Method | `POST` |
| URL | `/houses` |
| BE | 완료 |
| FE | 완료 |
| param | 10 + 사진 |
| 사용자 | 관리자 |
| 상세 등록 | ☑ |

### Request

`multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 집 이름 |
| `region` | string | ✅ | 지역 (`서귀포`/`제주시`/`성산`/`한림`/`구좌`) |
| `address` | string | ✅ | 주소 |
| `area` | number | ✅ | 면적 (㎡) |
| `rent` | int | ✅ | 월 임대료 (원) |
| `deposit` | int | ✅ | 보증금 (원) |
| `vehicleAccess` | bool | 기본 `false` | 1톤 트럭 진입 가능 여부 |
| `hasWarehouse` | bool | 기본 `false` | 창고 유무 |
| `hasYard` | bool | 기본 `false` | 마당 유무 |
| `publicTransportScore` | int | ✅ | 대중교통 점수 (0~5) |
| `files` | file[] | ✅ | 빈집 사진 여러 장 |

**Example** (multipart 필드)

```
name=서귀포 감귤밭 인근 단독주택
region=서귀포
address=제주 서귀포시 남원읍 신례리 123-4
area=82
rent=350000
deposit=10000000
vehicleAccess=true
hasWarehouse=true
hasYard=true
publicTransportScore=2
files=(이미지 파일 여러 장)
```

### Response

등록된 `House` 객체 1개 (구조는 [빈집 목록 조회](#-빈집-목록-조회) Response와 동일, `diagnosis`는 방금 분석한 결과)

**Example**

```json
{
  "id": "house-1",
  "name": "서귀포 감귤밭 인근 단독주택",
  "region": "서귀포",
  "address": "제주 서귀포시 남원읍 신례리 123-4",
  "area": 82,
  "rent": 350000,
  "deposit": 10000000,
  "imageUrl": "http://localhost:8000/house1/img1.jpg",
  "vehicleAccess": true,
  "hasWarehouse": true,
  "hasYard": true,
  "publicTransportScore": 2,
  "photoDir": "house1",
  "diagnosis": [
    { "category": "지붕", "status": "good", "note": "기와 지붕 상태 양호" }
  ]
}
```

### Status

`200` 등록 성공 · `400` 이미 3채 등록됨 — `{"detail": "빈집은 최대 3채까지 등록할 수 있습니다"}`

---

## 🔌 사진 미리보기 진단

| | |
| --- | --- |
| 카테고리 | 등록/관리자 |
| 설명 | 등록 전에 사진만 올려서 AI 진단 결과를 미리 확인한다. 목록에 저장되지 않는 미리보기 전용 엔드포인트. |
| Method | `POST` |
| URL | `/analyze` |
| BE | 완료 |
| FE | 완료 (구버전 미리보기 화면에서 사용, 현재 등록 폼은 `/houses`를 바로 호출) |
| param | 사진만 |
| 사용자 | 관리자 |
| 상세 등록 | ☑ |

### Request

`multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `files` | file[] | ✅ | 진단해볼 사진 여러 장 |

### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `diagnosis` | `DiagnosisItem[]` | AI 진단 결과 (저장 안 됨) |

**Example**

```json
{ "diagnosis": [ { "category": "지붕", "status": "good", "note": "..." } ] }
```

### Status

`200` 정상 진단 (사진이 비정상이거나 Gemini 호출 실패 시 `500`)

---

## 🔌 전체 초기화

| | |
| --- | --- |
| 카테고리 | 등록/관리자 |
| 설명 | 등록된 빈집을 전부 삭제하고 `house1`/`house2`/`house3` 사진 폴더도 비워, 처음부터 다시 등록할 수 있는 상태로 되돌린다. |
| Method | `DELETE` |
| URL | `/houses` |
| BE | 완료 |
| FE | 완료 (관리자 화면 "전체 초기화" 버튼, 클릭 시 confirm 확인창) |
| param | 없음 |
| 사용자 | 관리자 |
| 상세 등록 | ☑ |

### Request

요청 파라미터 없음

### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `message` | string | 처리 결과 메시지 |

**Example**

```json
{ "message": "초기화 완료" }
```

### Status

`200` 초기화 성공 (별도 에러 케이스 없음)

---

## 정적 파일: GET /house1/{파일명}, /house2/{파일명}, /house3/{파일명}

등록된 집 사진을 그대로 서빙한다. `House.imageUrl`이 가리키는 주소.

---

## 참고

- CORS: 모든 origin 허용 (`allow_origins=["*"]`)
- 서버 시작 시 등록된 각 집을 `photoDir` 사진으로 재분석함 (사진 없으면 실패하고 기존 값 유지, 서버는 계속 켜짐)
- 데이터는 DB가 아니라 `houses.json` 파일에 저장됨
