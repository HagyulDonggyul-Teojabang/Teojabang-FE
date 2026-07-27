import type { DiagnosisItem, DiagnosisStatus, House, Region } from '../types'

const REGIONS: Region[] = ['서귀포', '제주시', '성산', '한림', '구좌']

export interface InferredHouseMeta {
  region?: Region
  vehicleAccess?: boolean
  hasWarehouse?: boolean
  hasYard?: boolean
  farmlandDistanceMin?: number
  publicTransportScore?: number
  area?: number
  rent?: number
  deposit?: number
}

function statusImpliesGood(status: DiagnosisStatus | undefined): boolean {
  return status === 'good' || status === 'caution'
}

function inferFromDiagnosis(
  diagnosis: DiagnosisItem[],
  categoryIncludes: string,
): DiagnosisStatus | undefined {
  return diagnosis.find((d) => d.category.includes(categoryIncludes))?.status
}

export function buildHouseFromUpload(
  index: number,
  diagnosis: DiagnosisItem[],
  previewUrl: string,
  meta: InferredHouseMeta = {},
): House {
  const vehicleStatus = inferFromDiagnosis(diagnosis, '차량')
  const storageStatus = inferFromDiagnosis(diagnosis, '창고')

  const vehicleAccess =
    meta.vehicleAccess ?? statusImpliesGood(vehicleStatus ?? 'onsite')
  const hasWarehouse = meta.hasWarehouse ?? statusImpliesGood(storageStatus ?? 'onsite')
  const hasYard = meta.hasYard ?? hasWarehouse

  const region =
    meta.region && REGIONS.includes(meta.region) ? meta.region : ('제주시' as Region)

  return {
    id: `upload-${index + 1}`,
    name: `업로드 빈집 ${index + 1}`,
    region,
    address: '제주 (사용자 업로드 · 사진 분석)',
    area: meta.area ?? 70 + index * 5,
    rent: meta.rent ?? 280000 + index * 40000,
    deposit: meta.deposit ?? 5000000 + index * 2000000,
    imageUrl: previewUrl,
    farmlandDistanceMin: meta.farmlandDistanceMin ?? 10 + index * 3,
    vehicleAccess,
    hasWarehouse,
    hasYard,
    publicTransportScore: meta.publicTransportScore ?? 3,
    diagnosis,
  }
}
