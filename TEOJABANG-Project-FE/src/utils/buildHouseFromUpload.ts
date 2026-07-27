import type { DiagnosisItem, DiagnosisStatus, House, Region } from '../types'

export interface InferredHouseFlags {
  vehicleAccess?: boolean
  hasWarehouse?: boolean
  hasYard?: boolean
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
  flags: InferredHouseFlags = {},
): House {
  const vehicleStatus = inferFromDiagnosis(diagnosis, '차량')
  const storageStatus = inferFromDiagnosis(diagnosis, '창고')

  const vehicleAccess =
    flags.vehicleAccess ?? statusImpliesGood(vehicleStatus ?? 'onsite')
  const hasWarehouse = flags.hasWarehouse ?? statusImpliesGood(storageStatus ?? 'onsite')
  const hasYard = flags.hasYard ?? hasWarehouse

  return {
    id: `upload-${index + 1}`,
    name: `업로드 빈집 ${index + 1}`,
    region: '제주시' as Region,
    address: '제주 (사용자 업로드 · 사진 분석)',
    area: 70 + index * 5,
    rent: 280000 + index * 40000,
    deposit: 5000000 + index * 2000000,
    imageUrl: previewUrl,
    farmlandDistanceMin: 10 + index * 3,
    vehicleAccess,
    hasWarehouse,
    hasYard,
    publicTransportScore: 3,
    diagnosis,
  }
}
