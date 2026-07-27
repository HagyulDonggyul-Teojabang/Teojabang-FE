import type { DiagnosisItem, DiagnosisStatus, House } from '../types'

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

export function formatDiagnosisSummary(diagnosis: DiagnosisItem[]): string {
  return diagnosis
    .map((item, index) => {
      const status = STATUS_LABEL[item.status]
      const note = item.note.trim()
      const headline = note ? `${item.category} ${status} — ${note}` : `${item.category} ${status}`
      return `${index + 1}. ${headline}`
    })
    .join('\n')
}

const FALLBACK_NOTE = 'AI 분석 일시 불가'

export function isFallbackDiagnosis(diagnosis: DiagnosisItem[]): boolean {
  return (
    diagnosis.length > 0 &&
    diagnosis.every(
      (item) => item.status === 'onsite' && item.note.includes(FALLBACK_NOTE),
    )
  )
}

export function hasValidAiDiagnosis(house: Pick<House, 'diagnosis' | 'aiWarning'>): boolean {
  return !house.aiWarning && !isFallbackDiagnosis(house.diagnosis)
}
