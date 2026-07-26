export type DiagnosisStatus = 'good' | 'caution' | 'danger' | 'onsite'

export type Region = '서귀포' | '제주시' | '성산' | '한림' | '구좌'

export type Crop = '감귤' | '당근' | '브로콜리' | '마늘' | '기타'

export interface DiagnosisItem {
  category: string
  status: DiagnosisStatus
  note: string
}

export interface House {
  id: string
  name: string
  region: Region
  address: string
  area: number
  rent: number
  deposit: number
  imageUrl: string
  farmlandDistanceMin: number
  vehicleAccess: boolean
  hasWarehouse: boolean
  hasYard: boolean
  publicTransportScore: number
  diagnosis: DiagnosisItem[]
}

export interface UserConditions {
  region: Region
  crop: Crop
  farmSize: number
  budget: number
  hasVehicle: boolean
  needsWarehouse: boolean
  needsYard: boolean
}

export interface RankedHouse {
  house: House
  score: number
  reasons: string[]
}

export interface CostBreakdown {
  deposit: number
  rentYearly: number
  farmland: number
  farmingPrep: number
  machinery: number
  total: number
  items: { label: string; amount: number; note?: string }[]
}

export interface VisitApplication {
  houseId: string
  houseName: string
  visitDate: string
  visitTime: string
  name: string
  phone: string
  memo: string
  submittedAt: string
}

export type AppStep = 'conditions' | 'ranking' | 'cost' | 'visit' | 'complete'
