import type { UserConditions } from '../types'
import { CROPS, REGIONS } from '../data/mockHouses'
import { useEffect, useState } from 'react'

interface ConditionFormProps {
  initial?: UserConditions
  housesReady: boolean
  onSubmit: (conditions: UserConditions) => void
}

const defaultConditions: UserConditions = {
  region: '서귀포',
  crop: '감귤',
  farmSize: 300,
  budget: 50000000,
  hasVehicle: true,
  needsWarehouse: true,
  needsYard: true,
}

const FARM_SIZE_PRESETS = [100, 200, 300, 500] as const

export default function ConditionForm({
  initial,
  housesReady,
  onSubmit,
}: ConditionFormProps) {
  const conditions = initial ?? defaultConditions
  const [farmSize, setFarmSize] = useState(conditions.farmSize)

  useEffect(() => {
    if (initial) setFarmSize(initial.farmSize)
  }, [initial])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSubmit({
      region: form.get('region') as UserConditions['region'],
      crop: form.get('crop') as UserConditions['crop'],
      farmSize: Number(form.get('farmSize')),
      budget: Number(form.get('budget')),
      hasVehicle: defaultConditions.hasVehicle,
      needsWarehouse: defaultConditions.needsWarehouse,
      needsYard: defaultConditions.needsYard,
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="step-badge">STEP 1</span>
        <h2>영농 조건 입력</h2>
        <p>희망 조건을 입력하면 등록된 빈집 3채를 비교·매칭합니다.</p>
        {!housesReady && (
          <p className="panel-notice" role="status">
            관리자가 빈집 등록을 완료하면 비교를 시작할 수 있습니다.
          </p>
        )}
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          희망 지역
          <select name="region" defaultValue={conditions.region}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label>
          작목
          <select name="crop" defaultValue={conditions.crop}>
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="full-width">
          농지 크기 (평)
          <input
            type="number"
            name="farmSize"
            value={farmSize}
            onChange={(e) => setFarmSize(Number(e.target.value))}
            min={50}
            max={1000}
            step={10}
          />
          <div className="farm-size-presets">
            {FARM_SIZE_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                className={`farm-size-preset${farmSize === size ? ' active' : ''}`}
                onClick={() => setFarmSize(size)}
              >
                {size}평
              </button>
            ))}
          </div>
        </label>

        <label>
          초기 예산 (원)
          <input
            type="number"
            name="budget"
            defaultValue={conditions.budget}
            min={10000000}
            step={1000000}
          />
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={!housesReady}
        >
          업로드한 3채 비교하기
        </button>
      </form>
    </section>
  )
}
