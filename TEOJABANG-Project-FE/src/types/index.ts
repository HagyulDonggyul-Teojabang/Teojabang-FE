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
  otherFeatures?: string
}

export interface HouseRegisterInput {
  name: string
  address: string
  deposit: number
  rentYearly: number
  vehicleAccess: boolean
  hasWarehouse: boolean
  hasYard: boolean
  otherFeatures?: string
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

export type CostGroupKey = 'housing' | 'farmland' | 'farming'

export type CostPackageKey = 'house' | 'farm'

export interface CostLineItem {
  label: string
  amount: number
  note?: string
  group: CostGroupKey
}

export interface CostGroup {
  key: CostGroupKey
  label: string
  amount: number
  items: CostLineItem[]
}

export interface RepairEstimate {
  min: number
  max: number
  cautionCount: number
  dangerCount: number
  onsiteCount: number
  flaggedItems: string[]
  note: string
}

export type BudgetStatus = 'within' | 'over' | 'over_with_repair'

export interface BudgetComparison {
  budget: number
  total: number
  totalWithRepairMin: number
  totalWithRepairMax: number
  status: BudgetStatus
  diff: number
  repairDiffMin: number
  repairDiffMax: number
  tips: string[]
}

export interface FarmlandQuote {
  unitPrice: number
  minUnitPrice: number
  maxUnitPrice: number
  minAmount: number
  maxAmount: number
  farmSizeSqm: number
  sourceNote: string
}

export interface CostPackage {
  key: CostPackageKey
  label: string
  description: string
  total: number
  totalWithRepairMin: number
  totalWithRepairMax: number
  groupKeys: CostGroupKey[]
}

export interface CostBreakdown {
  deposit: number
  rentYearly: number
  farmland: number
  farmlandQuote: FarmlandQuote
  farmingPrep: number
  machinery: number
  repair: RepairEstimate
  housingTotal: number
  farmlandTotal: number
  farmingTotal: number
  farmPackageTotal: number
  housePackageTotal: number
  total: number
  totalWithRepairMin: number
  totalWithRepairMax: number
  houseWithRepairMin: number
  houseWithRepairMax: number
  packages: CostPackage[]
  groups: CostGroup[]
  items: CostLineItem[]
  budget: BudgetComparison
}

export interface VisitChecklistEntry {
  category: string
  note: string
  checked: boolean
}

export interface VisitApplication {
  houseId: string
  houseName: string
  visitDate: string
  visitTime: string
  name: string
  phone: string
  memo: string
  checklist?: VisitChecklistEntry[]
  submittedAt: string
}

export type AppStep = 'conditions' | 'ranking' | 'cost' | 'visit' | 'complete'
