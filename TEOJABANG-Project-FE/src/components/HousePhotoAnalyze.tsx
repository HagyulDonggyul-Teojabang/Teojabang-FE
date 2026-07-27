import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { DiagnosisItem, House, HouseRegisterInput } from '../types'
import { formatDiagnosisSummary } from '../utils/format'
import { registerHouse, resetAllHouses, resolveAssetUrl } from '../utils/houseApi'

const MAX_ROWS = 3
const PROGRESS_CAP = 90
const COMPLETE_ANIM_MS = 500
const STAGGER_MS = 2_000

const ESTIMATE_BASE_MS = 8_000
const ESTIMATE_PER_IMAGE_MS = 2_000
const ESTIMATE_PER_MB_MS = 800

function estimateAnalysisMs(files: File[]): number {
  const totalMb = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)
  return ESTIMATE_BASE_MS + files.length * ESTIMATE_PER_IMAGE_MS + totalMb * ESTIMATE_PER_MB_MS
}

function progressTarget(elapsedMs: number, estimatedMs: number): number {
  const tau = estimatedMs / 2.3
  return PROGRESS_CAP * (1 - Math.exp(-elapsedMs / tau))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type RowStatus = 'idle' | 'analyzing' | 'done' | 'error'

interface UploadRow {
  id: string
  name: string
  address: string
  deposit: number
  rentYearly: number
  vehicleAccess: boolean
  hasWarehouse: boolean
  hasYard: boolean
  otherEnabled: boolean
  otherFeatures: string
  files: File[]
  previewUrls: string[]
  status: RowStatus
  progress: number
  summary: string | null
  diagnosis: DiagnosisItem[] | null
  savedHouse: House | null
  error: string | null
}

function createRow(): UploadRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    address: '',
    deposit: 10_000_000,
    rentYearly: 4_200_000,
    vehicleAccess: false,
    hasWarehouse: false,
    hasYard: false,
    otherEnabled: false,
    otherFeatures: '',
    files: [],
    previewUrls: [],
    status: 'idle',
    progress: 0,
    summary: null,
    diagnosis: null,
    savedHouse: null,
    error: null,
  }
}

function rowFromHouse(house: House): UploadRow {
  return {
    id: house.id,
    name: house.name,
    address: house.address,
    deposit: house.deposit,
    rentYearly: house.rent * 12,
    vehicleAccess: house.vehicleAccess,
    hasWarehouse: house.hasWarehouse,
    hasYard: house.hasYard,
    otherEnabled: Boolean(house.otherFeatures),
    otherFeatures: house.otherFeatures ?? '',
    files: [],
    previewUrls: [resolveAssetUrl(house.imageUrl)],
    status: 'done',
    progress: 100,
    summary: formatDiagnosisSummary(house.diagnosis),
    diagnosis: house.diagnosis,
    savedHouse: house,
    error: null,
  }
}

function rowToRegisterInput(row: UploadRow): HouseRegisterInput {
  return {
    name: row.name.trim(),
    address: row.address.trim(),
    deposit: row.deposit,
    rentYearly: row.rentYearly,
    vehicleAccess: row.vehicleAccess,
    hasWarehouse: row.hasWarehouse,
    hasYard: row.hasYard,
    otherFeatures: row.otherEnabled ? row.otherFeatures.trim() : undefined,
  }
}

function initialRows(houses: House[]): UploadRow[] {
  const rows = houses.map(rowFromHouse)
  while (rows.length < MAX_ROWS) {
    rows.push(createRow())
  }
  return rows
}

function isRowReadyForAnalysis(row: UploadRow): boolean {
  return (
    row.files.length > 0 &&
    row.name.trim() !== '' &&
    row.address.trim() !== '' &&
    row.deposit > 0 &&
    row.rentYearly > 0 &&
    (!row.otherEnabled || row.otherFeatures.trim() !== '') &&
    !row.savedHouse &&
    row.status !== 'analyzing'
  )
}

function metaValidationError(row: UploadRow): string | null {
  if (row.files.length === 0) return null
  if (!row.name.trim()) return '집 이름을 입력해 주세요'
  if (!row.address.trim()) return '주소를 입력해 주세요'
  if (row.deposit <= 0) return '보증금을 입력해 주세요'
  if (row.rentYearly <= 0) return '연간 임대료를 입력해 주세요'
  if (row.otherEnabled && !row.otherFeatures.trim()) return '기타 확인 조건을 입력해 주세요'
  return null
}

interface HousePhotoAnalyzeProps {
  initialHouses: House[]
  onHousesChange: (houses: House[]) => void
  onReadyChange: (ready: boolean) => void
}

export default function HousePhotoAnalyze({
  initialHouses,
  onHousesChange,
  onReadyChange,
}: HousePhotoAnalyzeProps) {
  const [rows, setRows] = useState<UploadRow[]>(() => initialRows(initialHouses))
  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const progressControllers = useRef<Map<string, { cancel: () => void }>>(new Map())
  const displayProgressRef = useRef<Map<string, number>>(new Map())

  const isLocked =
    isBatchRunning || isResetting || rows.some((row) => row.status === 'analyzing')

  const stopProgress = useCallback((rowId: string) => {
    const controller = progressControllers.current.get(rowId)
    if (controller) {
      controller.cancel()
      progressControllers.current.delete(rowId)
    }
  }, [])

  useEffect(() => {
    const controllers = progressControllers.current
    return () => {
      controllers.forEach((controller) => controller.cancel())
      controllers.clear()
    }
  }, [])

  const syncParent = useCallback(
    (nextRows: UploadRow[]) => {
      const houses = nextRows
        .map((row) => row.savedHouse)
        .filter((house): house is House => house !== null)
      onHousesChange(houses)
      onReadyChange(houses.length === MAX_ROWS)
    },
    [onHousesChange, onReadyChange],
  )

  useEffect(() => {
    syncParent(rows)
  }, [rows, syncParent])

  function startProgress(rowId: string, files: File[]) {
    stopProgress(rowId)

    const startedAt = performance.now()
    const estimatedMs = estimateAnalysisMs(files)
    displayProgressRef.current.set(rowId, 0)

    let rafId = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return

      const elapsed = performance.now() - startedAt
      const next = progressTarget(elapsed, estimatedMs)
      displayProgressRef.current.set(rowId, next)

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === rowId && row.status === 'analyzing'
            ? { ...row, progress: next }
            : row,
        ),
      )

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    progressControllers.current.set(rowId, {
      cancel: () => {
        cancelled = true
        cancelAnimationFrame(rafId)
      },
    })
  }

  function animateProgressTo100(rowId: string): Promise<void> {
    const from = displayProgressRef.current.get(rowId) ?? 0
    const startedAt = performance.now()

    return new Promise((resolve) => {
      let rafId = 0

      const tick = () => {
        const t = Math.min(1, (performance.now() - startedAt) / COMPLETE_ANIM_MS)
        const eased = 1 - (1 - t) ** 3
        const next = from + (100 - from) * eased
        displayProgressRef.current.set(rowId, next)

        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === rowId ? { ...row, progress: next } : row,
          ),
        )

        if (t < 1) {
          rafId = requestAnimationFrame(tick)
        } else {
          displayProgressRef.current.set(rowId, 100)
          resolve()
        }
      }

      rafId = requestAnimationFrame(tick)
      progressControllers.current.set(rowId, {
        cancel: () => {
          cancelAnimationFrame(rafId)
          resolve()
        },
      })
    })
  }

  async function runAnalysis(rowId: string, files: File[], slotIndex: number, input: HouseRegisterInput): Promise<void> {
    displayProgressRef.current.set(rowId, 0)
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, status: 'analyzing', progress: 0, error: null }
          : row,
      ),
    )
    startProgress(rowId, files)

    try {
      const house = await registerHouse(files, slotIndex, input)
      stopProgress(rowId)
      await animateProgressTo100(rowId)
      progressControllers.current.delete(rowId)

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                status: 'done',
                progress: 100,
                name: house.name,
                address: house.address,
                deposit: house.deposit,
                rentYearly: house.rent * 12,
                vehicleAccess: house.vehicleAccess,
                hasWarehouse: house.hasWarehouse,
                hasYard: house.hasYard,
                otherEnabled: Boolean(house.otherFeatures),
                otherFeatures: house.otherFeatures ?? '',
                diagnosis: house.diagnosis,
                summary: formatDiagnosisSummary(house.diagnosis),
                previewUrls: [resolveAssetUrl(house.imageUrl)],
                savedHouse: house,
                error: null,
              }
            : row,
        ),
      )
    } catch (err) {
      stopProgress(rowId)
      displayProgressRef.current.delete(rowId)
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                status: 'error',
                progress: 0,
                error: err instanceof Error ? err.message : '분석에 실패했습니다',
              }
            : row,
        ),
      )
    }
  }

  function handleFiles(rowId: string, fileList: FileList | null) {
    if (!fileList?.length || isLocked) return

    const row = rowsRef.current.find((item) => item.id === rowId)
    if (row?.savedHouse) return

    stopProgress(rowId)
    const files = Array.from(fileList).slice(0, 8)
    const previewUrls = files.map((file) => URL.createObjectURL(file))

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        row.previewUrls.forEach((url) => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url)
        })
        return {
          ...row,
          files,
          previewUrls,
          status: 'idle',
          progress: 0,
          summary: null,
          diagnosis: null,
          savedHouse: null,
          error: null,
        }
      }),
    )
  }

  function countSavedHouses(nextRows: UploadRow[]): number {
    return nextRows.filter((row) => row.savedHouse !== null).length
  }

  function updateRow(rowId: string, patch: Partial<UploadRow>) {
    if (isLocked) return

    const row = rowsRef.current.find((item) => item.id === rowId)
    if (row?.savedHouse) return

    setRows((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, ...patch, error: null } : item)),
    )
  }

  async function handleAnalyzeAll() {
    if (isLocked) return

    const targets = rowsRef.current.filter(isRowReadyForAnalysis)
    if (targets.length === 0) return

    setIsBatchRunning(true)
    setBatchProgress({ current: 1, total: targets.length })

    try {
      for (let i = 0; i < targets.length; i++) {
        if (i > 0) {
          await sleep(STAGGER_MS)
          setBatchProgress({ current: i + 1, total: targets.length })
        }

        const row = rowsRef.current.find((item) => item.id === targets[i].id)
        if (!row || !isRowReadyForAnalysis(row)) continue

        const slotIndex = countSavedHouses(rowsRef.current)
        await runAnalysis(row.id, row.files, slotIndex, rowToRegisterInput(row))
      }
    } finally {
      setIsBatchRunning(false)
      setBatchProgress(null)
    }
  }

  function handleAnalyzeOne(rowId: string) {
    if (isLocked) return

    const row = rowsRef.current.find((item) => item.id === rowId)
    if (!row?.files.length || row.savedHouse || row.status === 'analyzing') return

    const validationError = metaValidationError(row)
    if (validationError) {
      setRows((prev) =>
        prev.map((item) => (item.id === rowId ? { ...item, error: validationError } : item)),
      )
      return
    }

    const slotIndex = countSavedHouses(rowsRef.current)
    void runAnalysis(rowId, row.files, slotIndex, rowToRegisterInput(row))
  }

  function addRow() {
    if (isLocked) return
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, createRow()]))
  }

  function clearRowPreviews(nextRows: UploadRow[]) {
    nextRows.forEach((row) => {
      row.previewUrls.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
    })
  }

  async function handleResetAll() {
    if (isLocked) return

    const hasContent = rowsRef.current.some(
      (row) => row.files.length > 0 || row.savedHouse !== null,
    )
    if (!hasContent) return

    if (
      !window.confirm(
        '등록된 빈집 사진과 AI 분석 결과를 모두 삭제할까요?\n서버에 저장된 데이터도 함께 지워집니다.',
      )
    ) {
      return
    }

    setIsResetting(true)
    try {
      await resetAllHouses()
      clearRowPreviews(rowsRef.current)
      setRows(initialRows([]))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '초기화에 실패했습니다')
    } finally {
      setIsResetting(false)
    }
  }

  const uploadedCount = rows.filter((row) => row.files.length > 0 || row.savedHouse).length
  const readyCount = rows.filter(isRowReadyForAnalysis).length
  const completedCount = rows.filter((row) => row.savedHouse !== null).length

  return (
    <section className="panel analyze-panel">
      <div className="panel-header">
        <span className="step-badge">STEP 1</span>
        <h2>빈집 사진 업로드</h2>
        <p>
          사진과 함께 집 정보·확인한 조건·임대 조건을 입력한 뒤 분석하세요 · ({completedCount}/
          {MAX_ROWS} 완료)
        </p>
      </div>

      {batchProgress && (
        <p className="analyze-batch-banner" role="status">
          빈집 {batchProgress.current}/{batchProgress.total} 분석·저장 중…
        </p>
      )}

      <div className="upload-rows">
        {rows.map((row, index) => (
          <UploadRowItem
            key={row.id}
            row={row}
            index={index}
            uploadLocked={isLocked}
            onFiles={(files) => handleFiles(row.id, files)}
            onRowUpdate={(patch) => updateRow(row.id, patch)}
            onAnalyzeOne={() => handleAnalyzeOne(row.id)}
          />
        ))}
      </div>

      <div className="analyze-actions">
        <button
          type="button"
          className="btn-analyze-all"
          disabled={readyCount === 0 || isLocked}
          onClick={() => void handleAnalyzeAll()}
        >
          전체 분석·저장 ({readyCount}/{rows.length})
        </button>
        <button
          type="button"
          className="btn-reset-houses"
          disabled={uploadedCount === 0 || isLocked}
          onClick={() => void handleResetAll()}
        >
          {isResetting ? '초기화 중…' : '사진 초기화'}
        </button>
      </div>

      {rows.length < MAX_ROWS && (
        <button
          type="button"
          className="btn-add-row"
          onClick={addRow}
          disabled={isLocked}
          aria-label="빈집 추가"
        >
          +
        </button>
      )}
    </section>
  )
}

function UploadRowItem({
  row,
  index,
  uploadLocked,
  onFiles,
  onRowUpdate,
  onAnalyzeOne,
}: {
  row: UploadRow
  index: number
  uploadLocked: boolean
  onFiles: (files: FileList | null) => void
  onRowUpdate: (patch: Partial<UploadRow>) => void
  onAnalyzeOne: () => void
}) {
  const inputId = useId()
  const nameId = useId()
  const addressId = useId()
  const depositId = useId()
  const rentYearlyId = useId()
  const otherId = useId()
  const isSaved = row.savedHouse !== null
  const hasPhotos = row.files.length > 0 || isSaved
  const canAnalyzeOne = isRowReadyForAnalysis(row) && !uploadLocked
  const validationHint = metaValidationError(row)
  const disabled = uploadLocked || isSaved

  return (
    <article className="upload-row-card">
      <div className="upload-row-header">빈집 {index + 1}</div>

      <div className="upload-row-body">
        <label
          htmlFor={inputId}
          className={`upload-box${disabled ? ' upload-box-locked' : ''}`}
        >
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="upload-input"
            disabled={disabled}
            onChange={(e) => {
              onFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {row.previewUrls[0] ? (
            <img src={row.previewUrls[0]} alt={`빈집 ${index + 1} 미리보기`} className="upload-thumb" />
          ) : (
            <span className="upload-placeholder">사진 업로드</span>
          )}
          {row.files.length > 1 && (
            <span className="upload-count">+{row.files.length - 1}</span>
          )}
        </label>

        <div className="upload-row-form">
          <div className="upload-meta-fields">
            <label htmlFor={nameId}>
              집 이름
              <input
                id={nameId}
                type="text"
                value={row.name}
                placeholder="예: 서귀포 감귤밭 인근 단독주택"
                disabled={disabled}
                onChange={(e) => onRowUpdate({ name: e.target.value })}
              />
            </label>
            <label htmlFor={addressId}>
              주소
              <input
                id={addressId}
                type="text"
                value={row.address}
                placeholder="예: 제주 서귀포시 남원읍 신례리 123-4"
                disabled={disabled}
                onChange={(e) => onRowUpdate({ address: e.target.value })}
              />
            </label>
            <label htmlFor={depositId}>
              보증금 (원)
              <input
                id={depositId}
                type="number"
                min={0}
                step={1000000}
                value={row.deposit}
                disabled={disabled}
                onChange={(e) => onRowUpdate({ deposit: Number(e.target.value) })}
              />
            </label>
            <label htmlFor={rentYearlyId}>
              연간 임대료 (원)
              <input
                id={rentYearlyId}
                type="number"
                min={0}
                step={100000}
                value={row.rentYearly}
                disabled={disabled}
                onChange={(e) => onRowUpdate({ rentYearly: Number(e.target.value) })}
              />
            </label>
          </div>

          <fieldset className="upload-verified-conditions" disabled={disabled}>
            <legend>확인한 조건</legend>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={row.vehicleAccess}
                onChange={(e) => onRowUpdate({ vehicleAccess: e.target.checked })}
              />
              1톤 트럭·농기계 진입 가능
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={row.hasWarehouse}
                onChange={(e) => onRowUpdate({ hasWarehouse: e.target.checked })}
              />
              창고 있음
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={row.hasYard}
                onChange={(e) => onRowUpdate({ hasYard: e.target.checked })}
              />
              마당 있음
            </label>
            <label className="checkbox upload-other-toggle">
              <input
                type="checkbox"
                checked={row.otherEnabled}
                onChange={(e) =>
                  onRowUpdate({
                    otherEnabled: e.target.checked,
                    otherFeatures: e.target.checked ? row.otherFeatures : '',
                  })
                }
              />
              기타
            </label>
            {row.otherEnabled && (
              <input
                id={otherId}
                type="text"
                className="upload-other-input"
                value={row.otherFeatures}
                placeholder="예: 대형 창고 2동, 온수 보일러"
                disabled={disabled}
                onChange={(e) => onRowUpdate({ otherFeatures: e.target.value })}
              />
            )}
          </fieldset>
        </div>
      </div>

      <div className="upload-row-footer">
        <div className="analyze-result-box">
          {row.status === 'idle' && !row.summary && (
            <div className="analyze-result-idle">
              <p className="analyze-result-empty">
                {isSaved
                  ? '저장 완료 · 새로고침해도 유지됩니다'
                  : hasPhotos
                    ? validationHint
                      ? validationHint
                      : '분석 준비 완료 · 전체 분석 또는 이 빈집만 분석'
                    : '사진·집 정보·확인한 조건을 입력한 뒤 분석을 실행하세요'}
              </p>
              {canAnalyzeOne && (
                <button type="button" className="btn-analyze-row" onClick={onAnalyzeOne}>
                  이 빈집만 분석
                </button>
              )}
            </div>
          )}
        {row.status === 'analyzing' && (
          <div className="analyze-progress">
            <p className="analyze-progress-label">AI 분석·저장 중…</p>
            <div
              className="analyze-progress-bar"
              role="progressbar"
              aria-valuenow={Math.round(row.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`빈집 ${index + 1} AI 분석 진행률`}
            >
              <div
                className="analyze-progress-fill"
                style={{ transform: `scaleX(${Math.min(1, row.progress / 100)})` }}
              />
            </div>
            <span className="analyze-progress-pct">{Math.round(row.progress)}%</span>
          </div>
        )}
        {row.status === 'done' && row.summary && (
          <div className="analyze-result-idle">
            <p className="analyze-result-text">{row.summary}</p>
          </div>
        )}
        {row.status === 'error' && (
          <div className="analyze-result-idle">
            <p className="analyze-result-error">{row.error}</p>
            {(row.files.length > 0 && !isSaved && !uploadLocked) && (
              <button type="button" className="btn-analyze-row" onClick={onAnalyzeOne}>
                다시 분석
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </article>
  )
}
