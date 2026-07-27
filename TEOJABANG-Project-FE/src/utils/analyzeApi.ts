import type { DiagnosisItem } from '../types'
import { API_BASE, parseApiError, readJsonResponse } from './apiClient'
import { compressImageForAnalysis } from './compressImage'
import { formatDiagnosisSummary } from './format'

export const ANALYZE_MAX_PHOTOS = 2

export interface AnalyzeResponse {
  diagnosis: DiagnosisItem[]
  summary: string
}

export async function analyzeHouseImages(files: File[]): Promise<AnalyzeResponse> {
  const toAnalyze = files.slice(0, ANALYZE_MAX_PHOTOS)
  const compressed = await Promise.all(toAnalyze.map(compressImageForAnalysis))

  const formData = new FormData()
  for (const file of compressed) {
    formData.append('files', file)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(
      '백엔드 서버에 연결할 수 없습니다. Teojabang-BE가 http://localhost:8000 에서 실행 중인지 확인해 주세요.',
    )
  }

  const data = await readJsonResponse<{ diagnosis?: DiagnosisItem[] }>(
    res,
    '빈집 AI 분석에 실패했습니다',
  )

  if (!res.ok) {
    throw new Error(parseApiError(data, '빈집 AI 분석에 실패했습니다'))
  }

  if (!Array.isArray(data.diagnosis)) {
    throw new Error('분석 결과 형식이 올바르지 않습니다')
  }

  return {
    diagnosis: data.diagnosis,
    summary: formatDiagnosisSummary(data.diagnosis),
  }
}
