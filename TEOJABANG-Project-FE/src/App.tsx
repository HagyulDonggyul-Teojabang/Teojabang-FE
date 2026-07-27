import { useEffect, useMemo, useState } from 'react'
import BrandLogo from './components/BrandLogo'
import ConditionForm from './components/ConditionForm'
import CostReport from './components/CostReport'
import HousePhotoAnalyze from './components/HousePhotoAnalyze'
import LandingPage from './components/LandingPage'
import RankingResult from './components/RankingResult'
import VisitApplicationForm, { VisitComplete } from './components/VisitApplication'
import type { AppStep, House, UserConditions, VisitApplication } from './types'
import { calculateCost } from './utils/costCalculator'
import { fetchHouses } from './utils/houseApi'
import { hasValidAiDiagnosis } from './utils/format'
import { rankHouses } from './utils/scoring'
import { saveVisitApplication } from './utils/visitStorage'
import { submitVisitApplication } from './utils/visitApi'

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'conditions', label: '조건 입력' },
  { key: 'ranking', label: 'AI 분석' },
  { key: 'cost', label: '정착비용' },
  { key: 'visit', label: '방문 신청' },
]

export default function App() {
  const [step, setStep] = useState<AppStep>('landing')
  const [conditions, setConditions] = useState<UserConditions | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [housesReady, setHousesReady] = useState(false)
  const [housesLoading, setHousesLoading] = useState(false)
  const [analyzeKey, setAnalyzeKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [application, setApplication] = useState<VisitApplication | null>(null)
  const [visitSubmitting, setVisitSubmitting] = useState(false)
  const [visitSubmitError, setVisitSubmitError] = useState<string | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [step])

  function loadHouses() {
    setHousesLoading(true)
    return fetchHouses()
      .then((loaded) => {
        setHouses(loaded)
        setHousesReady(loaded.filter(hasValidAiDiagnosis).length >= 3)
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

  function handleStart() {
    setStep('conditions')
    void loadHouses()
  }

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

  async function handleVisitSubmit(data: Omit<VisitApplication, 'submittedAt'>) {
    const full: VisitApplication = { ...data, submittedAt: new Date().toISOString() }
    setVisitSubmitting(true)
    setVisitSubmitError(null)
    try {
      await submitVisitApplication(full)
      saveVisitApplication(full)
      setApplication(full)
      setStep('complete')
    } catch (err) {
      setVisitSubmitError(
        err instanceof Error ? err.message : '방문 신청 접수에 실패했습니다',
      )
    } finally {
      setVisitSubmitting(false)
    }
  }

  function handleRestart() {
    setStep('landing')
    setConditions(null)
    setSelectedId(null)
    setApplication(null)
    setVisitSubmitError(null)
    setHouses([])
    setHousesReady(false)
    setHousesLoading(false)
    setIsAdminMode(false)
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  if (step === 'landing') {
    return <LandingPage onStart={handleStart} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="logo">
            <BrandLogo />
            <p className="tagline">AI 기반 청년농 맞춤 빈집 분석·비교</p>
          </div>

          {step === 'conditions' && (
            <label className="admin-mode-toggle">
              <span className="admin-mode-label">관리자 시점으로 보기</span>
              <input
                type="checkbox"
                checked={isAdminMode}
                onChange={(e) => setIsAdminMode(e.target.checked)}
                aria-label="관리자 시점으로 보기"
              />
              <span className="admin-mode-switch" aria-hidden="true" />
            </label>
          )}
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
            <div
              className={`step-view${isAdminMode ? ' step-view--hidden' : ''}`}
              aria-hidden={isAdminMode}
            >
              <ConditionForm
                initial={conditions ?? undefined}
                housesReady={housesReady}
                onSubmit={handleConditionsSubmit}
              />
            </div>
            <div
              className={`step-view${!isAdminMode ? ' step-view--hidden' : ''}`}
              aria-hidden={!isAdminMode}
            >
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
            </div>
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
            submitting={visitSubmitting}
            submitError={visitSubmitError}
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
