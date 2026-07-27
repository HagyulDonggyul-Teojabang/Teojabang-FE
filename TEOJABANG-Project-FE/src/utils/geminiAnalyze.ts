import type { DiagnosisItem } from '../types'
import type { InferredHouseFlags } from './buildHouseFromUpload'
import { compressImageForAnalysis } from './compressImage'

export const ANALYZE_MAX_PHOTOS = 2

export interface AnalyzeImagePayload {
  mimeType: string
  data: string
}

export interface AnalyzeResponse {
  diagnosis: DiagnosisItem[]
  summary: string
  flags?: InferredHouseFlags
  model: string
}

async function fileToBase64(file: File): Promise<AnalyzeImagePayload> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return {
    mimeType: file.type || 'image/jpeg',
    data: btoa(binary),
  }
}

export async function analyzeHouseImages(files: File[]): Promise<AnalyzeResponse> {
  const toAnalyze = files.slice(0, ANALYZE_MAX_PHOTOS)
  const compressed = await Promise.all(toAnalyze.map(compressImageForAnalysis))
  const images = await Promise.all(compressed.map(fileToBase64))

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  })

  const data = (await res.json()) as AnalyzeResponse & { error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? '빈집 AI 분석에 실패했습니다')
  }

  return data
}
