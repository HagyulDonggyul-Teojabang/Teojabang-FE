import type { CostBreakdown, Crop, House, UserConditions } from '../types'

const FARMLAND_PRICE_PER_PYUNG: Record<Crop, number> = {
  감귤: 800000,
  당근: 600000,
  브로콜리: 500000,
  마늘: 700000,
  기타: 550000,
}

const FARMING_PREP: Record<Crop, number> = {
  감귤: 5000000,
  당근: 3000000,
  브로콜리: 2500000,
  마늘: 4000000,
  기타: 3000000,
}

const MACHINERY_COST = 8000000

export function calculateCost(house: House, conditions: UserConditions): CostBreakdown {
  const farmland = Math.round(conditions.farmSize * FARMLAND_PRICE_PER_PYUNG[conditions.crop])
  const farmingPrep = FARMING_PREP[conditions.crop]
  const machinery = conditions.hasVehicle ? MACHINERY_COST : 0
  const rentYearly = house.rent * 12

  const items = [
    { label: '보증금', amount: house.deposit },
    { label: '연간 임대료', amount: rentYearly, note: `월 ${house.rent.toLocaleString()}원 × 12개월` },
    {
      label: '농지 비용 (임차)',
      amount: farmland,
      note: `${conditions.farmSize}평 · ${conditions.crop} 기준`,
    },
    {
      label: '영농 준비비',
      amount: farmingPrep,
      note: `${conditions.crop} 초기 재배 준비 (묘목·종자·비료 등)`,
    },
  ]

  if (conditions.hasVehicle) {
    items.push({
      label: '농기계·운송 장비',
      amount: machinery,
      note: '중고 1톤 트럭·소형 농기계 기준',
    })
  }

  items.push({
    label: '수리비',
    amount: 0,
    note: '현장 견적 후 별도',
  })

  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return {
    deposit: house.deposit,
    rentYearly,
    farmland,
    farmingPrep,
    machinery,
    total,
    items,
  }
}
