import type { CostBreakdown, House } from '../types'
import { formatWon } from '../utils/format'

interface CostReportProps {
  house: House
  cost: CostBreakdown
  onNext: () => void
  onBack: () => void
}

export default function CostReport({ house, cost, onNext, onBack }: CostReportProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="step-badge">STEP 3</span>
        <h2>초기 정착비용 계산</h2>
        <p>
          <strong>{house.name}</strong> 기준 농지·영농·주거비를 합산했습니다.
        </p>
      </div>

      <div className="cost-summary">
        <div className="cost-total">
          <span className="cost-label">총 초기 정착비용</span>
          <span className="cost-amount">{formatWon(cost.total)}</span>
          <span className="cost-note">수리비는 현장 견적 후 별도</span>
        </div>
      </div>

      <table className="cost-table">
        <thead>
          <tr>
            <th>항목</th>
            <th>금액</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {cost.items.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.amount > 0 ? formatWon(item.amount) : '별도'}</td>
              <td className="cost-remark">{item.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>합계</td>
            <td colSpan={2}>{formatWon(cost.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="info-box">
        <p>
          💡 수리비는 AI 사진 분석 결과를 바탕으로 현장 견적이 필요합니다. 위험·주의 항목이
          많을수록 추가 비용이 발생할 수 있습니다.
        </p>
      </div>

      <div className="action-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          순위로 돌아가기
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          현장 방문 신청
        </button>
      </div>
    </section>
  )
}
