import type { VisitApplication } from '../types'
import { API_BASE, parseApiError, readJsonResponse } from './apiClient'

export async function submitVisitApplication(
  application: VisitApplication,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    })
  } catch {
    throw new Error(
      '백엔드 서버에 연결할 수 없습니다. Teojabang-BE가 http://localhost:8000 에서 실행 중인지 확인해 주세요.',
    )
  }

  const data = await readJsonResponse<{ message?: string }>(
    res,
    '방문 신청 접수에 실패했습니다',
  )

  if (!res.ok) {
    throw new Error(parseApiError(data, '방문 신청 접수에 실패했습니다'))
  }
}
