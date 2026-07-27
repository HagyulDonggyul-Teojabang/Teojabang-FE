import type { House } from '../types'
import { buildHouseRegisterMeta } from './buildHouseFromUpload'
import { API_BASE, parseApiError, readJsonResponse } from './apiClient'

type ApiHouse = Omit<House, 'farmlandDistanceMin'> & {
  farmlandDistanceMin?: number
  photoDir?: string
}

/** BE가 반환하는 localhost URL을 dev 프록시 경로로 변환 */
export function resolveAssetUrl(url: string): string {
  if (import.meta.env.DEV) {
    return url
      .replace('http://localhost:8000', '/api')
      .replace('http://127.0.0.1:8000', '/api')
  }
  return url
}

function normalizeHouse(raw: ApiHouse, index: number): House {
  return {
    ...raw,
    imageUrl: resolveAssetUrl(raw.imageUrl),
    farmlandDistanceMin: raw.farmlandDistanceMin ?? 10 + index * 3,
  }
}

export async function fetchHouses(): Promise<House[]> {
  const res = await fetch(`${API_BASE}/houses`)
  const data = await readJsonResponse<ApiHouse[]>(res, '빈집 목록을 불러오지 못했습니다')

  if (!res.ok) {
    throw new Error(parseApiError(data, '빈집 목록을 불러오지 못했습니다'))
  }

  if (!Array.isArray(data)) {
    throw new Error('빈집 목록 형식이 올바르지 않습니다')
  }

  return data.map((house, index) => normalizeHouse(house, index))
}

export async function registerHouse(files: File[], slotIndex: number): Promise<House> {
  const meta = buildHouseRegisterMeta(slotIndex)
  const formData = new FormData()

  formData.append('name', meta.name)
  formData.append('region', meta.region)
  formData.append('address', meta.address)
  formData.append('area', String(meta.area))
  formData.append('rent', String(meta.rent))
  formData.append('deposit', String(meta.deposit))
  formData.append('vehicleAccess', String(meta.vehicleAccess))
  formData.append('hasWarehouse', String(meta.hasWarehouse))
  formData.append('hasYard', String(meta.hasYard))
  formData.append('publicTransportScore', String(meta.publicTransportScore))

  for (const file of files) {
    formData.append('files', file)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/houses`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(
      '백엔드 서버에 연결할 수 없습니다. Teojabang-BE가 http://localhost:8000 에서 실행 중인지 확인해 주세요.',
    )
  }

  const data = await readJsonResponse<ApiHouse>(res, '빈집 등록에 실패했습니다')

  if (!res.ok) {
    throw new Error(parseApiError(data, '빈집 등록에 실패했습니다'))
  }

  return normalizeHouse(data, slotIndex)
}

export async function resetAllHouses(): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/houses`, { method: 'DELETE' })
  } catch {
    throw new Error(
      '백엔드 서버에 연결할 수 없습니다. Teojabang-BE가 http://localhost:8000 에서 실행 중인지 확인해 주세요.',
    )
  }

  const data = await readJsonResponse<{ message?: string }>(res, '빈집 초기화에 실패했습니다')

  if (!res.ok) {
    throw new Error(parseApiError(data, '빈집 초기화에 실패했습니다'))
  }
}
