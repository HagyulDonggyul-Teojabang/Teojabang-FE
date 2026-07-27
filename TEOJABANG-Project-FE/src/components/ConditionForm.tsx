import type { UserConditions } from '../types'
import { CROPS, REGIONS } from '../data/mockHouses'

interface ConditionFormProps {
  initial?: UserConditions
  housesReady: boolean
  onSubmit: (conditions: UserConditions) => void
}

const defaultConditions: UserConditions = {
  region: '서귀포',
  crop: '감귤',
  farmSize: 3000,
  budget: 50000000,
  hasVehicle: true,
  needsWarehouse: true,
  needsYard: true,
}

export default function ConditionForm({ initial, housesReady, onSubmit }: ConditionFormProps) {
  const conditions = initial ?? defaultConditions

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSubmit({
      region: form.get('region') as UserConditions['region'],
      crop: form.get('crop') as UserConditions['crop'],
      farmSize: Number(form.get('farmSize')),
      budget: Number(form.get('budget')),
      hasVehicle: form.get('hasVehicle') === 'on',
      needsWarehouse: form.get('needsWarehouse') === 'on',
      needsYard: form.get('needsYard') === 'on',
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="step-badge">STEP 2</span>
        <h2>영농 조건 입력</h2>
        <p>희망 조건을 입력하면 업로드한 빈집 3채를 비교·매칭합니다.</p>
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

        <label>
          농지 크기 (평)
          <input
            type="number"
            name="farmSize"
            defaultValue={conditions.farmSize}
            min={100}
            max={20000}
            step={100}
          />
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

        <fieldset className="checkbox-group">
          <legend>필요 조건</legend>
          <label className="checkbox">
            <input type="checkbox" name="hasVehicle" defaultChecked={conditions.hasVehicle} />
            1톤 트럭·농기계 사용
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              name="needsWarehouse"
              defaultChecked={conditions.needsWarehouse}
            />
            창고 필요
          </label>
          <label className="checkbox">
            <input type="checkbox" name="needsYard" defaultChecked={conditions.needsYard} />
            마당 필요
          </label>
        </fieldset>

        {!housesReady && (
          <p className="form-hint">빈집 3채 사진 업로드·AI 분석을 모두 완료해 주세요.</p>
        )}

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
