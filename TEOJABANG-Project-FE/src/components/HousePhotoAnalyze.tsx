import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { DiagnosisItem, House } from '../types'
import { buildHouseFromUpload, type InferredHouseFlags } from '../utils/buildHouseFromUpload'
import { formatDiagnosisSummary } from '../utils/format'
import { ANALYZE_MAX_PHOTOS, analyzeHouseImages } from '../utils/geminiAnalyze'

const MAX_ROWS = 3
const PROGRESS_CAP = 90
const COMPLETE_ANIM_MS = 500
const STAGGER_MS = 2_000

const ESTIMATE_BASE_MS = 8_000
const ESTIMATE_PER_IMAGE_MS = 2_000
const ESTIMATE_PER_MB_MS = 800

function estimateAnalysisMs(files: File[]): number {
  const analyzeFiles = files.slice(0, ANALYZE_MAX_PHOTOS)
  const totalMb = analyzeFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)
  return ESTIMATE_BASE_MS + analyzeFiles.length * ESTIMATE_PER_IMAGE_MS + totalMb * ESTIMATE_PER_MB_MS
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
  files: File[]
  previewUrls: string[]
  status: RowStatus
  progress: number
  summary: string | null
  diagnosis: DiagnosisItem[] | null
  flags: InferredHouseFlags | null
  error: string | null
}

function createRow(): UploadRow {
  return {
    id: crypto.randomUUID(),
    files: [],
    previewUrls: [],
    status: 'idle',
    progress: 0,
    summary: null,
    diagnosis: null,
    flags: null,
    error: null,
  }
}

interface HousePhotoAnalyzeProps {
  onHousesChange: (houses: House[]) => void
  onReadyChange: (ready: boolean) => void
}

export default function HousePhotoAnalyze({ onHousesChange, onReadyChange }: HousePhotoAnalyzeProps) {
  const [rows, setRows] = useState<UploadRow[]>([createRow()])
  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)

  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const progressControllers = useRef<Map<string, { cancel: () => void }>>(new Map())
  const displayProgressRef = useRef<Map<string, number>>(new Map())

  const isLocked =
    isBatchRunning || rows.some((row) => row.status === 'analyzing')

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
      const houses: House[] = []
      nextRows.forEach((row, index) => {
        if (row.status === 'done' && row.diagnosis && row.previewUrls[0]) {
          houses.push(
            buildHouseFromUpload(index, row.diagnosis, row.previewUrls[0], row.flags ?? {}),
          )
        }
      })
      onHousesChange(houses)
      const ready =
        nextRows.length === MAX_ROWS &&
        nextRows.every((row) => row.status === 'done' && row.diagnosis !== null)
      onReadyChange(ready)
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

  async function runAnalysis(rowId: string, files: File[]): Promise<void> {
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
      const { diagnosis, summary, flags } = await analyzeHouseImages(files)
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
                diagnosis,
                summary: summary || formatDiagnosisSummary(diagnosis),
                flags: flags ?? null,
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

    stopProgress(rowId)
    const files = Array.from(fileList).slice(0, 8)
    const previewUrls = files.map((file) => URL.createObjectURL(file))

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        row.previewUrls.forEach((url) => URL.revokeObjectURL(url))
        return {
          ...row,
          files,
          previewUrls,
          status: 'idle',
          progress: 0,
          summary: null,
          diagnosis: null,
          flags: null,
          error: null,
        }
      }),
    )
  }

  async function handleAnalyzeAll() {
    if (isLocked) return

    const targets = rowsRef.current.filter(
      (row) => row.files.length > 0 && row.status !== 'analyzing',
    )
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
        if (!row?.files.length) continue

        await runAnalysis(row.id, row.files)
      }
    } finally {
      setIsBatchRunning(false)
      setBatchProgress(null)
    }
  }

  function handleAnalyzeOne(rowId: string) {
    if (isLocked) return

    const row = rowsRef.current.find((item) => item.id === rowId)
    if (!row?.files.length || row.status === 'analyzing') return

    void runAnalysis(rowId, row.files)
  }

  function addRow() {
    if (isLocked) return
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, createRow()]))
  }

  const uploadedCount = rows.filter((row) => row.files.length > 0).length
  const completedCount = rows.filter((row) => row.status === 'done').length

  return (
    <section className="panel analyze-panel">
      <div className="panel-header">
        <span className="step-badge">STEP 1</span>
        <h2>빈집 사진 업로드</h2>
        <p>
          사진을 올린 뒤 전체 분석을 실행하세요. 대표 사진 1~2장씩 · 순차 분석 ({completedCount}/
          {MAX_ROWS} 완료)
        </p>
      </div>

      {batchProgress && (
        <p className="analyze-batch-banner" role="status">
          빈집 {batchProgress.current}/{batchProgress.total} 분석 중…
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
            onAnalyzeOne={() => handleAnalyzeOne(row.id)}
          />
        ))}
      </div>

      <div className="analyze-actions">
        <button
          type="button"
          className="btn-analyze-all"
          disabled={uploadedCount === 0 || isLocked}
          onClick={() => void handleAnalyzeAll()}
        >
          전체 분석 ({uploadedCount}/{rows.length})
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
  onAnalyzeOne,
}: {
  row: UploadRow
  index: number
  uploadLocked: boolean
  onFiles: (files: FileList | null) => void
  onAnalyzeOne: () => void
}) {
  const inputId = useId()
  const hasPhotos = row.files.length > 0
  const canAnalyzeOne =
    hasPhotos && !uploadLocked && row.status !== 'analyzing'

  return (
    <div className="upload-row">
      <div className="upload-row-label">빈집 {index + 1}</div>

      <label
        htmlFor={inputId}
        className={`upload-box${uploadLocked ? ' upload-box-locked' : ''}`}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="upload-input"
          disabled={uploadLocked}
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {row.previewUrls[0] ? (
          <img src={row.previewUrls[0]} alt={`빈집 ${index + 1} 미리보기`} className="upload-thumb" />
        ) : (
          <span className="upload-placeholder">업로드</span>
        )}
        {row.files.length > 1 && (
          <span className="upload-count">+{row.files.length - 1}</span>
        )}
        {row.files.length > ANALYZE_MAX_PHOTOS && (
          <span className="upload-analyze-hint">분석 {ANALYZE_MAX_PHOTOS}장</span>
        )}
      </label>

      <div className="analyze-result-box">
        {row.status === 'idle' && !row.summary && (
          <div className="analyze-result-idle">
            <p className="analyze-result-empty">
              {hasPhotos
                ? '분석 준비 완료 · 전체 분석 또는 이 빈집만 분석'
                : '사진을 올린 뒤 분석을 실행하세요'}
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
            <p className="analyze-progress-label">Gemini 분석 중…</p>
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
            {canAnalyzeOne && (
              <button type="button" className="btn-analyze-row" onClick={onAnalyzeOne}>
                다시 분석
              </button>
            )}
          </div>
        )}
        {row.status === 'error' && (
          <div className="analyze-result-idle">
            <p className="analyze-result-error">{row.error}</p>
            {canAnalyzeOne && (
              <button type="button" className="btn-analyze-row" onClick={onAnalyzeOne}>
                다시 분석
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
