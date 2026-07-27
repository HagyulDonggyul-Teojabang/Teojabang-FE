import type { DiagnosisItem, DiagnosisStatus, House, HouseRegisterInput, Region } from '../types'

export interface InferredHouseFlags {
  vehicleAccess?: boolean
  hasWarehouse?: boolean
  hasYard?: boolean
}

const REGIONS: Region[] = ['서귀포', '제주시', '성산', '한림', '구좌']

function inferRegion(address: string): Region {
  if (address.includes('서귀포')) return '서귀포'
  for (const region of REGIONS) {
    if (address.includes(region)) return region
  }
  return '제주시'
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

export function buildHouseRegisterMeta(index: number, input: HouseRegisterInput) {
  const otherFeatures = input.otherFeatures?.trim()
  return {
    name: input.name.trim(),
    address: input.address.trim(),
    region: inferRegion(input.address),
    area: 70 + index * 5,
    rent: Math.max(1, Math.round(input.rentYearly / 12)),
    deposit: input.deposit,
    vehicleAccess: input.vehicleAccess,
    hasWarehouse: input.hasWarehouse,
    hasYard: input.hasYard,
    otherFeatures: otherFeatures || undefined,
    publicTransportScore: 3,
  }
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
