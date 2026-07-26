import type { VisitApplication } from '../types'

const STORAGE_KEY = 'teojabang_visit_applications'

export function saveVisitApplication(application: VisitApplication): void {
  const existing = getVisitApplications()
  existing.push(application)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getVisitApplications(): VisitApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VisitApplication[]) : []
  } catch {
    return []
  }
}
