import type { Connect } from 'vite'
import type { Plugin } from 'vite'

const DIAGNOSIS_CATEGORIES = [
  '지붕',
  '누수',
  '곰팡이',
  '차량 진입',
  '창고·마당',
  '수도·전기',
] as const

const ANALYZE_MAX_IMAGES = 2
const DEFAULT_MODEL = 'gemini-flash-latest'

const PROMPT = `제주 빈집 사진 분석. JSON만 출력.

diagnosis 6항목 각각 포함: ${DIAGNOSIS_CATEGORIES.join(', ')}
status: good|caution|danger|onsite
note: caution/danger/onsite만 20자 이내, good은 ""

flags(사진에서 보이는 것만): vehicleAccess, hasWarehouse, hasYard (boolean)

{"summary":"한줄요약","flags":{"vehicleAccess":true,"hasWarehouse":false,"hasYard":true},"diagnosis":[{"category":"지붕","status":"good","note":""}]}`

interface AnalyzeImage {
  mimeType: string
  data: string
}

interface DiagnosisItem {
  category: string
  status: string
  note: string
}

interface HouseFlags {
  vehicleAccess?: boolean
  hasWarehouse?: boolean
  hasYard?: boolean
}

interface AnalyzeResult {
  diagnosis: DiagnosisItem[]
  summary: string
  flags?: HouseFlags
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
    flags?: HouseFlags
    houseMeta?: HouseFlags
  }
  if (!Array.isArray(parsed.diagnosis)) {
    throw new Error('diagnosis 배열이 없습니다')
  }
  const validStatuses = new Set(['good', 'caution', 'danger', 'onsite'])
  for (const item of parsed.diagnosis) {
    if (!validStatuses.has(item.status)) {
      item.status = 'onsite'
    }
    if (item.status === 'good') {
      item.note = ''
    }
  }
  const summary =
    parsed.summary ??
    parsed.diagnosis.map((d) => `${d.category} ${d.status}`).join(' · ')
  const flags = parsed.flags ?? parsed.houseMeta
  return { diagnosis: parsed.diagnosis, summary, flags }
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

function formatGeminiError(message: string): string {
  const msg = message.toLowerCase()
  if (
    msg.includes('api key') ||
    msg.includes('permission denied') ||
    msg.includes('401') ||
    msg.includes('403')
  ) {
    return 'Gemini API 키가 유효하지 않습니다. .env의 GEMINI_API_KEY를 확인해 주세요.'
  }
  if (msg.includes('quota') || msg.includes('429')) {
    return 'Gemini API 사용 한도에 도달했습니다. 잠시 후 다시 시도하거나 Google AI Studio에서 quota를 확인해 주세요.'
  }
  return message
}

async function analyzeWithModel(
  apiKey: string,
  modelName: string | undefined,
  images: AnalyzeImage[],
): Promise<{ diagnosis: DiagnosisItem[]; summary: string; flags?: HouseFlags; model: string }> {
  const model = modelName?.trim() || DEFAULT_MODEL
  try {
    const result = await callGemini(apiKey, model, images)
    return { ...result, model }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(formatGeminiError(message))
  }
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

          if (images.length > ANALYZE_MAX_IMAGES) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `이미지는 최대 ${ANALYZE_MAX_IMAGES}장까지 분석할 수 있습니다` }))
            return
          }

          const { diagnosis, summary, flags, model } = await analyzeWithModel(
            apiKey,
            env.GEMINI_MODEL,
            images,
          )

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ diagnosis, summary, flags, model }))
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
