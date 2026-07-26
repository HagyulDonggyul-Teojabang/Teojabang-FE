import type { House, RankedHouse, UserConditions } from '../types'

function regionScore(house: House, preferred: string): number {
  if (house.region === preferred) return 25
  const nearby: Record<string, string[]> = {
    서귀포: ['성산'],
    성산: ['서귀포'],
    제주시: ['한림', '구좌'],
    한림: ['제주시'],
    구좌: ['제주시'],
  }
  if (nearby[preferred]?.includes(house.region)) return 15
  return 5
}

function budgetScore(house: House, budget: number): number {
  const yearlyCost = house.deposit + house.rent * 12
  if (yearlyCost <= budget) return 20
  if (yearlyCost <= budget * 1.2) return 12
  if (yearlyCost <= budget * 1.5) return 5
  return 0
}

function conditionScore(
  house: House,
  conditions: UserConditions,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  score += regionScore(house, conditions.region)
  if (house.region === conditions.region) {
    reasons.push(`${conditions.region} 희망 지역과 일치`)
  }

  score += budgetScore(house, conditions.budget)
  if (house.deposit + house.rent * 12 <= conditions.budget) {
    reasons.push('예산 범위 내 주거비')
  }

  if (conditions.hasVehicle) {
    if (house.vehicleAccess) {
      score += 15
      reasons.push('1톤 트럭 진입·주차 가능')
    } else {
      score -= 5
    }
    if (house.farmlandDistanceMin <= 10) {
      score += 10
      reasons.push(`농지까지 약 ${house.farmlandDistanceMin}분 거리`)
    }
  } else {
    score += house.publicTransportScore * 3
    if (house.publicTransportScore >= 3) {
      reasons.push('대중교통·생활시설 접근성 양호')
    }
  }

  if (conditions.needsWarehouse && house.hasWarehouse) {
    score += 10
    reasons.push('농기구·수확물 보관 창고 있음')
  } else if (conditions.needsWarehouse && !house.hasWarehouse) {
    score -= 5
  }

  if (conditions.needsYard && house.hasYard) {
    score += 8
    reasons.push('마당·작업 공간 확보')
  }

  const dangerCount = house.diagnosis.filter((d) => d.status === 'danger').length
  const cautionCount = house.diagnosis.filter((d) => d.status === 'caution').length
  score -= dangerCount * 8
  score -= cautionCount * 2

  if (dangerCount === 0 && cautionCount <= 2) {
    reasons.push('집 상태 전반적으로 양호')
  } else if (dangerCount >= 2) {
    reasons.push('수리 필요 항목 다수 — 방문 전 참고')
  }

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

export function rankHouses(houses: House[], conditions: UserConditions): RankedHouse[] {
  return houses
    .map((house) => {
      const { score, reasons } = conditionScore(house, conditions)
      return { house, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
}
