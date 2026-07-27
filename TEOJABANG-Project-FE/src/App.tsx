import { useEffect, useMemo, useState } from 'react'
import ConditionForm from './components/ConditionForm'
import CostReport from './components/CostReport'
import HousePhotoAnalyze from './components/HousePhotoAnalyze'
import RankingResult from './components/RankingResult'
import VisitApplicationForm, { VisitComplete } from './components/VisitApplication'
import type { AppStep, House, UserConditions, VisitApplication } from './types'
import { calculateCost } from './utils/costCalculator'
import { fetchHouses } from './utils/houseApi'
import { rankHouses } from './utils/scoring'
import { saveVisitApplication } from './utils/visitStorage'

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'conditions', label: '조건 입력' },
  { key: 'ranking', label: 'AI 분석' },
  { key: 'cost', label: '정착비용' },
  { key: 'visit', label: '방문 신청' },
]

export default function App() {
  const [step, setStep] = useState<AppStep>('conditions')
  const [conditions, setConditions] = useState<UserConditions | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [housesReady, setHousesReady] = useState(false)
  const [housesLoading, setHousesLoading] = useState(true)
  const [analyzeKey, setAnalyzeKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [application, setApplication] = useState<VisitApplication | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchHouses()
      .then((loaded) => {
        if (!cancelled) {
          setHouses(loaded)
          setHousesReady(loaded.length >= 3)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHouses([])
          setHousesReady(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHousesLoading(false)
          setAnalyzeKey((key) => key + 1)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const ranked = useMemo(
    () => (conditions && houses.length > 0 ? rankHouses(houses, conditions) : []),
    [conditions, houses],
  )

  const selectedHouse = houses.find((h) => h.id === selectedId) ?? null

  const cost = useMemo(() => {
    if (!selectedHouse || !conditions) return null
    return calculateCost(selectedHouse, conditions)
  }, [selectedHouse, conditions])

  function handleConditionsSubmit(data: UserConditions) {
    if (!housesReady || houses.length < 3) return
    setConditions(data)
    setSelectedId(null)
    setApplication(null)
    setStep('ranking')
  }

  function handleVisitSubmit(data: Omit<VisitApplication, 'submittedAt'>) {
    const full: VisitApplication = { ...data, submittedAt: new Date().toISOString() }
    saveVisitApplication(full)
    setApplication(full)
    setStep('complete')
  }

  function handleRestart() {
    setStep('conditions')
    setConditions(null)
    setSelectedId(null)
    setApplication(null)
    setHousesLoading(true)
    fetchHouses()
      .then((loaded) => {
        setHouses(loaded)
        setHousesReady(loaded.length >= 3)
      })
      .catch(() => {
        setHouses([])
        setHousesReady(false)
      })
      .finally(() => {
        setHousesLoading(false)
        setAnalyzeKey((key) => key + 1)
      })
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🏠</span>
          <div>
            <h1>터잡앙</h1>
            <p className="tagline">AI 기반 청년농 맞춤 빈집 분석·비교</p>
          </div>
        </div>

        {step !== 'complete' && (
          <nav className="step-nav" aria-label="진행 단계">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`step-item ${i <= stepIndex ? 'active' : ''} ${i === stepIndex ? 'current' : ''}`}
              >
                <span className="step-num">{i + 1}</span>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </nav>
        )}
      </header>

      <main className="app-main">
        {step === 'conditions' && (
          <>
            {housesLoading ? (
              <p className="analyze-result-empty">저장된 빈집 불러오는 중…</p>
            ) : (
              <HousePhotoAnalyze
                key={analyzeKey}
                initialHouses={houses}
                onHousesChange={setHouses}
                onReadyChange={setHousesReady}
              />
            )}
            <ConditionForm
              initial={conditions ?? undefined}
              housesReady={housesReady}
              onSubmit={handleConditionsSubmit}
            />
          </>
        )}

        {step === 'ranking' && conditions && (
          <RankingResult
            ranked={ranked}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNext={() => setStep('cost')}
            onBack={() => setStep('conditions')}
          />
        )}

        {step === 'cost' && selectedHouse && cost && conditions && (
          <CostReport
            house={selectedHouse}
            conditions={conditions}
            cost={cost}
            onNext={() => setStep('visit')}
            onBack={() => setStep('ranking')}
          />
        )}

        {step === 'visit' && selectedHouse && (
          <VisitApplicationForm
            house={selectedHouse}
            onSubmit={handleVisitSubmit}
            onBack={() => setStep('cost')}
          />
        )}

        {step === 'complete' && application && selectedHouse && (
          <VisitComplete
            application={application}
            house={selectedHouse}
            onRestart={handleRestart}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>2026 제주 지역대학 연합 창업 캠프 · 터잡앙 MVP 데모</p>
      </footer>
    </div>
  )
}
