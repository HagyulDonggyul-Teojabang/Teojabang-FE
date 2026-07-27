/** dev: same-origin `/api` → Vite proxy. prod: VITE_API_BASE_URL 또는 `/api` */
export const API_BASE = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL ?? '/api')

export function parseApiError(data: unknown, fallback = '요청에 실패했습니다'): string {
  if (!data || typeof data !== 'object') return fallback

  const body = data as { detail?: unknown; error?: string; message?: string }
  if (typeof body.error === 'string') return body.error
  if (typeof body.message === 'string') return body.message
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail)) {
    return body.detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return fallback
      })
      .join(', ')
  }

  return fallback
}

export async function readJsonResponse<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text()

  if (!text.trim()) {
    if (res.status === 502 || res.status === 503) {
      throw new Error(
        `${fallback} (HTTP ${res.status}). 백엔드(Teojabang-BE)가 http://localhost:8000 에서 실행 중인지, 터미널에 에러가 없는지 확인해 주세요.`,
      )
    }
    if (!res.ok) {
      throw new Error(`${fallback} (HTTP ${res.status}, 빈 응답)`)
    }
    throw new Error(`${fallback} (빈 응답)`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`${fallback} (HTTP ${res.status}, JSON 아님)`)
  }
}
