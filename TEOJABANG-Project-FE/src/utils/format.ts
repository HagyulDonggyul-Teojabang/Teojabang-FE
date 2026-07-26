import type { DiagnosisStatus } from '../types'

export const STATUS_LABEL: Record<DiagnosisStatus, string> = {
  good: '양호',
  caution: '주의',
  danger: '위험',
  onsite: '현장 확인 필요',
}

export function formatWon(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`
  }
  if (amount >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}
