import { FARM_BASE_PYUNG, quoteJejuFarmland } from '../data/jejuFarmlandPrices'
import type {
  CostBreakdown,
  CostGroup,
  CostLineItem,
  CostPackage,
  Crop,
  DiagnosisItem,
  DiagnosisStatus,
  House,
  RepairEstimate,
  UserConditions,
} from '../types'

/** 300평 기준 영농 준비비 (묘목·종자·비료 등) */
const FARMING_PREP_PER_300PY: Record<Crop, number> = {
  감귤: 15_000_000,
  당근: 9_000_000,
  브로콜리: 7_500_000,
  마늘: 12_000_000,
  기타: 9_000_000,
}

const MACHINERY_COST = 8_000_000

/** AI 진단 상태별 수리비 추정 범위 (항목당) */
const REPAIR_RANGE: Record<DiagnosisStatus, { min: number; max: number }> = {
  good: { min: 0, max: 0 },
  caution: { min: 500_000, max: 2_000_000 },
  danger: { min: 2_000_000, max: 8_000_000 },
  onsite: { min: 300_000, max: 1_500_000 },
}

export function estimateRepairCost(diagnosis: DiagnosisItem[]): RepairEstimate {
  let min = 0
  let max = 0
  let cautionCount = 0
  let dangerCount = 0
  let onsiteCount = 0
  const flaggedItems: string[] = []

  for (const item of diagnosis) {
    const range = REPAIR_RANGE[item.status]
    min += range.min
    max += range.max

    if (item.status === 'caution') {
      cautionCount += 1
      flaggedItems.push(`${item.category}(주의)`)
    } else if (item.status === 'danger') {
      dangerCount += 1
      flaggedItems.push(`${item.category}(위험)`)
    } else if (item.status === 'onsite') {
      onsiteCount += 1
    }
  }

  const note =
    dangerCount > 0
      ? `위험 ${dangerCount}건·주의 ${cautionCount}건 — 현장 견적 전 참고 범위`
      : cautionCount > 0
        ? `주의 ${cautionCount}건 — 부분 수리 가능성`
        : onsiteCount > 0
          ? `현장 확인 ${onsiteCount}건 — 추가 비용 발생 가능`
          : '양호 항목 위주 — 수리 부담 낮음'

  return { min, max, cautionCount, dangerCount, onsiteCount, flaggedItems, note }
}

function scaleFarmingPrep(crop: Crop, farmSizePyung: number): number {
  return Math.round(FARMING_PREP_PER_300PY[crop] * (farmSizePyung / FARM_BASE_PYUNG))
}

function buildBudgetComparison(
  budget: number,
  total: number,
  repair: RepairEstimate,
): CostBreakdown['budget'] {
  const totalWithRepairMin = total + repair.min
  const totalWithRepairMax = total + repair.max
  const diff = budget - total
  const repairDiffMin = budget - totalWithRepairMin
  const repairDiffMax = budget - totalWithRepairMax

  let status: CostBreakdown['budget']['status'] = 'within'
  if (total > budget) {
    status = 'over'
  } else if (totalWithRepairMin > budget) {
    status = 'over_with_repair'
  }

  const tips: string[] = []
  if (total > budget) {
    tips.push('보증금·임대료 협상 또는 예산 범위 내 다른 후보를 검토해 보세요.')
    if (repair.dangerCount + repair.cautionCount >= 3) {
      tips.push('수리 항목이 많은 집은 초기 부담 외 추가 비용이 클 수 있습니다.')
    }
  } else if (status === 'over_with_repair') {
    tips.push('기본 정착비는 예산 내이나, 수리비 반영 시 초과 가능성이 있습니다.')
    tips.push('현장 방문 후 견적을 받고 지원정책(청년창업농 등)을 함께 검토해 보세요.')
  } else {
    tips.push('현재 조건 기준 예산 내 정착이 가능합니다. 수리비는 참고 범위로 확인하세요.')
  }

  tips.push('빈집만 계약하려면 아래 「빈집(주거)」 합계만 확인하세요.')

  return {
    budget,
    total,
    totalWithRepairMin,
    totalWithRepairMax,
    status,
    diff,
    repairDiffMin,
    repairDiffMax,
    tips,
  }
}

export function calculateCost(house: House, conditions: UserConditions): CostBreakdown {
  const farmSizePyung = conditions.farmSize
  const farmlandQuoteData = quoteJejuFarmland(
    conditions.region,
    conditions.crop,
    farmSizePyung,
  )
  const farmland = farmlandQuoteData.amount
  const farmingPrep = scaleFarmingPrep(conditions.crop, farmSizePyung)
  const machinery = conditions.hasVehicle ? MACHINERY_COST : 0
  const rentYearly = house.rent * 12
  const repair = estimateRepairCost(house.diagnosis)

  const housingItems: CostLineItem[] = [
    { label: '보증금', amount: house.deposit, group: 'housing' },
    {
      label: '연간 임대료',
      amount: rentYearly,
      note: `월 ${house.rent.toLocaleString()}원 × 12개월`,
      group: 'housing',
    },
  ]

  const farmlandItems: CostLineItem[] = [
    {
      label: '농지 매입비 (실거래가)',
      amount: farmland,
      note: `${farmlandQuoteData.sourceNote} · ${farmlandQuoteData.unitPrice.toLocaleString()}원/㎡`,
      group: 'farmland',
    },
  ]

  const farmingItems: CostLineItem[] = [
    {
      label: '영농 준비비',
      amount: farmingPrep,
      note: `${conditions.crop} · ${farmSizePyung}평 (300평당 ${FARMING_PREP_PER_300PY[conditions.crop].toLocaleString()}원 비례 산출)`,
      group: 'farming',
    },
  ]

  if (conditions.hasVehicle) {
    farmingItems.push({
      label: '농기계·운송 장비',
      amount: machinery,
      note: '중고 1톤 트럭·소형 농기계 기준',
      group: 'farming',
    })
  }

  const housingTotal = housingItems.reduce((sum, item) => sum + item.amount, 0)
  const farmlandTotal = farmlandItems.reduce((sum, item) => sum + item.amount, 0)
  const farmingTotal = farmingItems.reduce((sum, item) => sum + item.amount, 0)
  const farmPackageTotal = farmlandTotal + farmingTotal
  const housePackageTotal = housingTotal
  const total = housePackageTotal + farmPackageTotal

  const groups: CostGroup[] = [
    { key: 'housing', label: '주거비', amount: housingTotal, items: housingItems },
    { key: 'farmland', label: '농지', amount: farmlandTotal, items: farmlandItems },
    { key: 'farming', label: '영농 준비', amount: farmingTotal, items: farmingItems },
  ]

  const packages: CostPackage[] = [
    {
      key: 'house',
      label: '빈집(주거)',
      description: '보증금·임대료 — 빈집만 계약할 때',
      total: housePackageTotal,
      totalWithRepairMin: housePackageTotal + repair.min,
      totalWithRepairMax: housePackageTotal + repair.max,
      groupKeys: ['housing'],
    },
    {
      key: 'farm',
      label: '농지·영농',
      description: `농지 매입·영농 준비 — ${farmSizePyung}평 기준`,
      total: farmPackageTotal,
      totalWithRepairMin: farmPackageTotal,
      totalWithRepairMax: farmPackageTotal,
      groupKeys: ['farmland', 'farming'],
    },
  ]

  const items: CostLineItem[] = [...housingItems, ...farmlandItems, ...farmingItems]

  const totalWithRepairMin = total + repair.min
  const totalWithRepairMax = total + repair.max
  const houseWithRepairMin = housePackageTotal + repair.min
  const houseWithRepairMax = housePackageTotal + repair.max
  const budget = buildBudgetComparison(conditions.budget, total, repair)

  return {
    deposit: house.deposit,
    rentYearly,
    farmland,
    farmlandQuote: {
      unitPrice: farmlandQuoteData.unitPrice,
      minUnitPrice: farmlandQuoteData.minUnitPrice,
      maxUnitPrice: farmlandQuoteData.maxUnitPrice,
      minAmount: farmlandQuoteData.minAmount,
      maxAmount: farmlandQuoteData.maxAmount,
      farmSizeSqm: farmlandQuoteData.farmSizeSqm,
      sourceNote: farmlandQuoteData.sourceNote,
    },
    farmingPrep,
    machinery,
    repair,
    housingTotal,
    farmlandTotal,
    farmingTotal,
    farmPackageTotal,
    housePackageTotal,
    total,
    totalWithRepairMin,
    totalWithRepairMax,
    houseWithRepairMin,
    houseWithRepairMax,
    packages,
    groups,
    items,
    budget,
  }
}
