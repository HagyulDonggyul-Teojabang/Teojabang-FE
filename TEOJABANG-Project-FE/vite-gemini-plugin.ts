import type { Connect } from 'vite'
import type { Plugin } from 'vite'

const DIAGNOSIS_CATEGORIES = [
  '지붕',
  '창호',
  '난방',
  '누수',
  '곰팡이',
  '바닥',
  '화장실',
  '수도·전기',
  '차량 진입',
  '창고·마당',
  '단열·결로',
] as const

const MODEL_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
]

const PROMPT = `제주 농촌 빈집 내부·외부 사진을 분석하세요.

다음 항목 각각 diagnosis 배열에 포함:
${DIAGNOSIS_CATEGORIES.join(', ')}

status: good(양호) | caution(주의) | danger(위험) | onsite(현장 확인 필요)

추가로 summary(한 줄 요약, 예: "지붕 양호 · 누수 주의")와
houseMeta(사진에서 추정 가능한 경우만):
- region: 서귀포|제주시|성산|한림|구좌 중 하나 또는 null
- vehicleAccess, hasWarehouse, hasYard: boolean
- farmlandDistanceMin: number (농지까지 추정 분)
- publicTransportScore: 1~5
- area: ㎡ 추정
- rent: 월 임대료 추정(원)
- deposit: 보증금 추정(원)

반드시 JSON만 출력:
{"summary":"...","diagnosis":[{"category":"지붕","status":"good","note":"..."}],"houseMeta":{"region":"제주시","vehicleAccess":true}}`

interface AnalyzeImage {
  mimeType: string
  data: string
}

interface DiagnosisItem {
  category: string
  status: string
  note: string
}

interface HouseMeta {
  region?: string
  vehicleAccess?: boolean
  hasWarehouse?: boolean
  hasYard?: boolean
  farmlandDistanceMin?: number
  publicTransportScore?: number
  area?: number
  rent?: number
  deposit?: number
}

interface AnalyzeResult {
  diagnosis: DiagnosisItem[]
  summary: string
  houseMeta?: HouseMeta
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function parseJsonResponse(text: string): AnalyzeResult {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  const parsed = JSON.parse(cleaned) as {
    diagnosis?: DiagnosisItem[]
    summary?: string
    houseMeta?: HouseMeta
  }
  if (!Array.isArray(parsed.diagnosis)) {
    throw new Error('diagnosis 배열이 없습니다')
  }
  const validStatuses = new Set(['good', 'caution', 'danger', 'onsite'])
  for (const item of parsed.diagnosis) {
    if (!validStatuses.has(item.status)) {
      item.status = 'onsite'
    }
  }
  const summary =
    parsed.summary ??
    parsed.diagnosis.map((d) => `${d.category} ${d.status}`).join(' · ')
  return { diagnosis: parsed.diagnosis, summary, houseMeta: parsed.houseMeta }
}

async function callGemini(
  apiKey: string,
  model: string,
  images: AnalyzeImage[],
): Promise<AnalyzeResult> {
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: PROMPT },
  ]
  for (const img of images) {
    parts.push({
      inline_data: {
        mime_type: img.mimeType,
        data: img.data,
      },
    })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })

  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string; code?: number }
  }

  if (!res.ok) {
    throw new Error(body.error?.message ?? `Gemini API 오류 (${res.status})`)
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다')
  }

  return parseJsonResponse(text)
}

async function analyzeWithFallback(
  apiKey: string,
  preferredModel: string | undefined,
  images: AnalyzeImage[],
): Promise<{ diagnosis: DiagnosisItem[]; summary: string; houseMeta?: HouseMeta; model: string }> {
  const models = [
    ...(preferredModel ? [preferredModel] : []),
    ...MODEL_FALLBACKS.filter((m) => m !== preferredModel),
  ]

  let lastError: Error | null = null
  for (const model of models) {
    try {
      const result = await callGemini(apiKey, model, images)
      return { ...result, model }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const msg = lastError.message.toLowerCase()
      const retryable =
        msg.includes('quota') ||
        msg.includes('429') ||
        msg.includes('not found') ||
        msg.includes('404') ||
        msg.includes('unavailable')
      if (!retryable) break
    }
  }
  throw lastError ?? new Error('Gemini 분석에 실패했습니다')
}

export function geminiAnalyzePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'gemini-analyze-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/analyze' || req.method !== 'POST') {
          return next()
        }

        const apiKey = env.GEMINI_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY가 .env에 설정되지 않았습니다' }))
          return
        }

        try {
          const raw = await readBody(req)
          const payload = JSON.parse(raw) as { images?: AnalyzeImage[] }
          const images = payload.images ?? []

          if (images.length === 0) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '분석할 이미지가 필요합니다' }))
            return
          }

          if (images.length > 8) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '이미지는 최대 8장까지 업로드할 수 있습니다' }))
            return
          }

          const { diagnosis, summary, houseMeta, model } = await analyzeWithFallback(
            apiKey,
            env.GEMINI_MODEL,
            images,
          )

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ diagnosis, summary, houseMeta, model }))
        } catch (err) {
          const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}
