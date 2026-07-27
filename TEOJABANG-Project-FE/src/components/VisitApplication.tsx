import { useState } from 'react'
import type { House, VisitApplication } from '../types'
import { STATUS_LABEL } from '../utils/format'

interface VisitApplicationFormProps {
  house: House
  onSubmit: (application: Omit<VisitApplication, 'submittedAt'>) => void | Promise<void>
  onBack: () => void
  submitting?: boolean
  submitError?: string | null
}

export default function VisitApplicationForm({
  house,
  onSubmit,
  onBack,
  submitting = false,
  submitError = null,
}: VisitApplicationFormProps) {
  const checklistItems = house.diagnosis.filter((d) => d.status === 'onsite')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  function toggleChecklistItem(category: string) {
    setCheckedItems((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSubmit({
      houseId: house.id,
      houseName: house.name,
      visitDate: form.get('visitDate') as string,
      visitTime: form.get('visitTime') as string,
      name: form.get('name') as string,
      phone: form.get('phone') as string,
      memo: (form.get('memo') as string) || '',
      checklist: checklistItems.map((item) => ({
        category: item.category,
        note: item.note,
        checked: !!checkedItems[item.category],
      })),
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="step-badge">STEP 4</span>
        <h2>현장 방문 신청</h2>
        <p>
          <strong>{house.name}</strong> 방문을 신청합니다.
        </p>
      </div>

      <div className="checklist-box">
        <h3>방문 시 확인할 체크리스트</h3>
        <p className="checklist-desc">AI가 사진으로 판단하지 못한 항목입니다. 방문 시 꼭 확인하세요.</p>
        <ul className="checklist">
          {checklistItems.length > 0 ? (
            checklistItems.map((item) => (
              <li key={item.category}>
                <input
                  type="checkbox"
                  id={item.category}
                  checked={!!checkedItems[item.category]}
                  onChange={() => toggleChecklistItem(item.category)}
                />
                <label htmlFor={item.category}>
                  <strong>{item.category}</strong> — {item.note}
                  <span className={`status-badge status-${item.status}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </label>
              </li>
            ))
          ) : (
            <li>현장 확인 필요 항목 없음 — 일반 점검 진행</li>
          )}
        </ul>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          방문 희망일
          <input type="date" name="visitDate" required />
        </label>

        <label>
          방문 희망 시간
          <select name="visitTime" required defaultValue="10:00">
            <option value="10:00">오전 10:00</option>
            <option value="14:00">오후 2:00</option>
            <option value="16:00">오후 4:00</option>
          </select>
        </label>

        <label>
          이름
          <input type="text" name="name" placeholder="홍길동" required />
        </label>

        <label>
          연락처
          <input type="tel" name="phone" placeholder="010-0000-0000" required />
        </label>

        <label className="full-width">
          메모 (선택)
          <textarea name="memo" rows={3} placeholder="추가 문의사항을 입력하세요" />
        </label>

        {submitError && (
          <p className="form-error full-width" role="alert">
            {submitError}
          </p>
        )}

        <div className="action-row full-width">
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={submitting}>
            이전
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '접수 중…' : '방문 신청하기'}
          </button>
        </div>
      </form>
    </section>
  )
}

interface VisitCompleteProps {
  application: VisitApplication
  house: House
  onRestart: () => void
}

export function VisitComplete({ application, house, onRestart }: VisitCompleteProps) {
  const checklistItems =
    application.checklist?.length
      ? application.checklist
      : house.diagnosis
          .filter((d) => d.status === 'onsite')
          .map((item) => ({
            category: item.category,
            note: item.note,
            checked: false,
          }))

  return (
    <section className="panel complete-panel">
      <div className="complete-icon">✓</div>
      <h2>방문 신청이 접수되었습니다</h2>
      <p>담당자(소유자·공인중개사·귀농지원기관)가 확인 후 연락드립니다.</p>

      <div className="receipt">
        <h3>접수 내역</h3>
        <dl>
          <dt>빈집</dt>
          <dd>{application.houseName}</dd>
          <dt>방문 일시</dt>
          <dd>
            {application.visitDate} {application.visitTime}
          </dd>
          <dt>신청자</dt>
          <dd>
            {application.name} ({application.phone})
          </dd>
          <dt>접수 시간</dt>
          <dd>{new Date(application.submittedAt).toLocaleString('ko-KR')}</dd>
        </dl>
      </div>

      <div className="checklist-box">
        <h3>방문 시 확인 체크리스트</h3>
        <ul className="checklist">
          {checklistItems.length > 0 ? (
            checklistItems.map((item) => (
              <li key={item.category} className={item.checked ? 'checklist-item-checked' : ''}>
                <span className="checklist-mark" aria-hidden="true">
                  {item.checked ? '☑' : '☐'}
                </span>
                <span>
                  <strong>{item.category}</strong> — {item.note}
                </span>
              </li>
            ))
          ) : (
            <li>현장 확인 필요 항목 없음 — 일반 점검 진행</li>
          )}
        </ul>
      </div>

      <button type="button" className="btn btn-primary" onClick={onRestart}>
        처음부터 다시 시작
      </button>
    </section>
  )
}
