import type { Crop, Region } from '../types'

/** 1평 = 3.305785㎡ (국토교통부 표준) */
export const PYEONG_TO_SQM = 3.305785

/** 농지·영농 비용 산출 기준 면적 */
export const FARM_BASE_PYUNG = 300

export type FarmlandLandType = 'orchard' | 'field'

/**
 * 농림축산식품부 '25년 2분기 농지실거래가(전국) Q2 평균 · 2025.6월 기준.
 * 제주는 전국 통계에 시도별 행이 없어, 제주 시군구 실거래 특성(감귤 산지 등)을 반영한 보정 단가를 사용.
 * @see 농지공간포털 / 농림축산식품 공공데이터포털
 */
export const NATIONAL_FARMLAND_Q2_2025 = {
  orchard: 75_892,
  field: 63_221,
  paddy: 48_005,
  nationwide: 53_322,
  outsidePromotion: {
    orchard: 80_599,
    field: 65_996,
  },
  insidePromotion: {
    orchard: 54_100,
    paddy: 39_811,
  },
} as const

/** 제주 시·읍·면권 실거래 보정 단가 (원/㎡) — 지목·진흥지역 편차 반영 */
export const JEJU_FARMLAND_PRICE: Record<
  Region,
  { orchard: number; field: number; min: number; max: number }
> = {
  서귀포: { orchard: 97_000, field: 78_000, min: 45_000, max: 115_000 },
  제주시: { orchard: 89_000, field: 72_000, min: 42_000, max: 105_000 },
  성산: { orchard: 92_000, field: 74_000, min: 43_000, max: 108_000 },
  한림: { orchard: 84_000, field: 68_000, min: 40_000, max: 98_000 },
  구좌: { orchard: 86_000, field: 70_000, min: 41_000, max: 100_000 },
}

const CROP_LAND_TYPE: Record<Crop, FarmlandLandType> = {
  감귤: 'orchard',
  당근: 'field',
  브로콜리: 'field',
  마늘: 'field',
  기타: 'field',
}

export function getLandTypeForCrop(crop: Crop): FarmlandLandType {
  return CROP_LAND_TYPE[crop]
}

export function farmSizeToSqm(farmSizePyung: number): number {
  return farmSizePyung * PYEONG_TO_SQM
}

export interface FarmlandPriceQuote {
  region: Region
  crop: Crop
  farmSizePyung: number
  farmSizeSqm: number
  landType: FarmlandLandType
  unitPrice: number
  amount: number
  minUnitPrice: number
  maxUnitPrice: number
  minAmount: number
  maxAmount: number
  sourceNote: string
}

export function quoteJejuFarmland(
  region: Region,
  crop: Crop,
  farmSizePyung: number,
): FarmlandPriceQuote {
  const regional = JEJU_FARMLAND_PRICE[region]
  const landType = getLandTypeForCrop(crop)
  const unitPrice = landType === 'orchard' ? regional.orchard : regional.field
  const farmSizeSqm = farmSizeToSqm(farmSizePyung)
  const amount = Math.round(unitPrice * farmSizeSqm)
  const minAmount = Math.round(regional.min * farmSizeSqm)
  const maxAmount = Math.round(regional.max * farmSizeSqm)

  const landLabel = landType === 'orchard' ? '과수' : '밭'
  const sourceNote =
    `제주 ${region} · ${crop}(${landLabel}) · ` +
    `'25.2Q 실거래가(전국 ${landType === 'orchard' ? '과' : '전'} ${NATIONAL_FARMLAND_Q2_2025[landType === 'orchard' ? 'orchard' : 'field'].toLocaleString()}원/㎡) + 제주 보정 · ` +
    `${farmSizePyung}평(${farmSizeSqm.toFixed(1)}㎡)`

  return {
    region,
    crop,
    farmSizePyung,
    farmSizeSqm,
    landType,
    unitPrice,
    amount,
    minUnitPrice: regional.min,
    maxUnitPrice: regional.max,
    minAmount,
    maxAmount,
    sourceNote,
  }
}
