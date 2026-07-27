import type { CostBreakdown, CostGroupKey, CostPackage, House, UserConditions } from '../types'
import { formatWon } from '../utils/format'

interface CostReportProps {
  house: House
  conditions: UserConditions
  cost: CostBreakdown
  onNext: () => void
  onBack: () => void
}

const GROUP_COLORS: Record<CostGroupKey, string> = {
  housing: '#2d6a4f',
  farmland: '#40916c',
  farming: '#52b788',
}

function formatRange(min: number, max: number): string {
  if (min === 0 && max === 0) return '별도 없음'
  if (min === max) return formatWon(min)
  return `${formatWon(min)} ~ ${formatWon(max)}`
}

function BudgetBanner({ cost }: { cost: CostBreakdown }) {
  const { budget: b } = cost
  const statusClass =
    b.status === 'within' ? 'budget-ok' : b.status === 'over' ? 'budget-over' : 'budget-caution'

  const headline =
    b.status === 'within'
      ? `예산 ${formatWon(b.budget)} 대비 ${formatWon(Math.abs(b.diff))} 여유`
      : b.status === 'over'
        ? `예산 ${formatWon(b.budget)} 대비 ${formatWon(Math.abs(b.diff))} 초과`
        : `기본 비용은 예산 내, 수리비 반영 시 ${formatWon(Math.abs(b.repairDiffMin))}~${formatWon(Math.abs(b.repairDiffMax))} 초과 가능`

  return (
    <div className={`budget-banner ${statusClass}`}>
      <div className="budget-banner-main">
        <span className="budget-banner-label">예산 비교 (전체)</span>
        <strong>{headline}</strong>
      </div>
      <div className="budget-banner-detail">
        <span>입력 예산 {formatWon(b.budget)}</span>
        <span>전체 정착비 {formatWon(b.total)}</span>
        <span>빈집만 {formatWon(cost.housePackageTotal)}</span>
        <span>농지·영농 {formatWon(cost.farmPackageTotal)}</span>
      </div>
      {b.tips.length > 0 && (
        <ul className="budget-tips">
          {b.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PackageSummaryCard({ pkg, cost }: { pkg: CostPackage; cost: CostBreakdown }) {
  const hasRepair = pkg.key === 'house' && (cost.repair.min > 0 || cost.repair.max > 0)
  const packageGroups = cost.groups.filter((g) => pkg.groupKeys.includes(g.key))

  return (
    <article className={`cost-package-card cost-package-${pkg.key}`}>
      <div className="cost-package-header">
        <span className="cost-package-label">{pkg.label}</span>
        <p className="cost-package-desc">{pkg.description}</p>
      </div>
      <strong className="cost-package-amount">{formatWon(pkg.total)}</strong>
      {hasRepair && (
        <p className="cost-package-repair">
          수리비 포함 {formatRange(pkg.totalWithRepairMin, pkg.totalWithRepairMax)}
        </p>
      )}
      {pkg.key === 'farm' && (
        <p className="cost-package-range">
          농지 실거래 참고 범위 {formatRange(cost.farmlandQuote.minAmount, cost.farmlandQuote.maxAmount)}
        </p>
      )}
      <ul className="cost-package-items">
        {packageGroups.flatMap((group) =>
          group.items.map((item) => (
            <li key={item.label}>
              {item.label}
              <span>{formatWon(item.amount)}</span>
            </li>
          )),
        )}
      </ul>
    </article>
  )
}

function CostBreakdownChart({ cost }: { cost: CostBreakdown }) {
  const segments = cost.packages.map((pkg) => ({
    key: pkg.key,
    label: pkg.label,
    amount: pkg.total,
    color: pkg.key === 'house' ? GROUP_COLORS.housing : GROUP_COLORS.farmland,
  }))
  const chartTotal = segments.reduce((sum, g) => sum + g.amount, 0) || 1

  return (
    <div className="cost-chart">
      <h3 className="cost-section-title">빈집 vs 농지·영농 비율</h3>
      <div className="cost-chart-bar" role="img" aria-label="정착비용 패키지별 비율">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="cost-chart-segment"
            style={{
              width: `${(segment.amount / chartTotal) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label} ${formatWon(segment.amount)}`}
          />
        ))}
      </div>
      <ul className="cost-chart-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="legend-dot" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <strong>{formatWon(segment.amount)}</strong>
            <span className="legend-pct">{Math.round((segment.amount / chartTotal) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CostReport({ house, conditions, cost, onNext, onBack }: CostReportProps) {
  const { repair, farmlandQuote } = cost
  const hasRepairRange = repair.min > 0 || repair.max > 0

  function handlePrint() {
    window.print()
  }

  return (
    <section className="panel cost-report">
      <div className="cost-report-print-header">
        <h2>터잡앙 · 초기 정착비용 리포트</h2>
        <p>
          {house.name} · {conditions.region} · {conditions.crop} · {conditions.farmSize}평
        </p>
        <p className="cost-report-date">출력일 {new Date().toLocaleDateString('ko-KR')}</p>
      </div>

      <div className="panel-header">
        <span className="step-badge">STEP 3</span>
        <h2>초기 정착비용 계산</h2>
        <p>
          <strong>{house.name}</strong> 기준 — 빈집(주거)과 농지·영농 비용을 나눠 확인할 수 있습니다.
        </p>
      </div>

      <BudgetBanner cost={cost} />

      <div className="cost-package-cards">
        {cost.packages.map((pkg) => (
          <PackageSummaryCard key={pkg.key} pkg={pkg} cost={cost} />
        ))}
      </div>

      <div className="cost-summary">
        <div className="cost-total">
          <span className="cost-label">전체 초기 정착비용 (수리·농지 범위 제외)</span>
          <span className="cost-amount">{formatWon(cost.total)}</span>
          <span className="cost-note">
            빈집 {formatWon(cost.housePackageTotal)} + 농지·영농 {formatWon(cost.farmPackageTotal)}
          </span>
          {hasRepairRange && (
            <span className="cost-note">
              빈집 수리비 포함 시 {formatRange(cost.houseWithRepairMin, cost.houseWithRepairMax)}
            </span>
          )}
        </div>
      </div>

      <div className="cost-group-cards">
        {cost.groups.map((group) => (
          <article key={group.key} className={`cost-group-card cost-group-${group.key}`}>
            <span className="cost-group-label">{group.label}</span>
            <strong className="cost-group-amount">{formatWon(group.amount)}</strong>
            <ul className="cost-group-items">
              {group.items.map((item) => (
                <li key={item.label}>
                  {item.label}
                  <span>{formatWon(item.amount)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <CostBreakdownChart cost={cost} />

      <div className="farmland-source-box">
        <h3 className="cost-section-title">농지 실거래가 근거</h3>
        <p>{farmlandQuote.sourceNote}</p>
        <p className="farmland-source-detail">
          적용 단가 {farmlandQuote.unitPrice.toLocaleString()}원/㎡ · 참고 범위{' '}
          {farmlandQuote.minUnitPrice.toLocaleString()}~{farmlandQuote.maxUnitPrice.toLocaleString()}원/㎡ ·
          면적 {conditions.farmSize}평({farmlandQuote.farmSizeSqm.toFixed(1)}㎡)
        </p>
        <p className="farmland-source-detail">
          출처: 농림축산식품부 「'25년 2분기 농지실거래가」(전국) + 제주 시군구 보정 · 매입 기준 참고가
        </p>
      </div>

      <div className="repair-estimate-box">
        <h3 className="cost-section-title">AI 진단 기반 수리비 추정 (빈집)</h3>
        <div className="repair-estimate-main">
          <span className="repair-range">
            {hasRepairRange ? formatRange(repair.min, repair.max) : '추가 수리 부담 낮음'}
          </span>
          <p className="repair-note">{repair.note}</p>
        </div>
        <div className="repair-counts">
          {repair.dangerCount > 0 && <span className="repair-badge danger">위험 {repair.dangerCount}건</span>}
          {repair.cautionCount > 0 && (
            <span className="repair-badge caution">주의 {repair.cautionCount}건</span>
          )}
          {repair.onsiteCount > 0 && (
            <span className="repair-badge onsite">현장 확인 {repair.onsiteCount}건</span>
          )}
        </div>
        {repair.flaggedItems.length > 0 && (
          <p className="repair-flagged">주요 항목: {repair.flaggedItems.join(', ')}</p>
        )}
        <p className="repair-disclaimer">
          ※ 빈집 계약만 고려할 때 위 수리비를 「빈집(주거)」 합계에 더해 보세요.
        </p>
      </div>

      <table className="cost-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>항목</th>
            <th>금액</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {cost.items.map((item) => (
            <tr key={item.label}>
              <td>{cost.groups.find((g) => g.key === item.group)?.label}</td>
              <td>{item.label}</td>
              <td>{formatWon(item.amount)}</td>
              <td className="cost-remark">{item.note ?? '—'}</td>
            </tr>
          ))}
          <tr className="repair-row">
            <td>빈집</td>
            <td>예상 수리비 (AI 추정)</td>
            <td>{hasRepairRange ? formatRange(repair.min, repair.max) : '—'}</td>
            <td className="cost-remark">{repair.note}</td>
          </tr>
          <tr className="repair-row">
            <td>농지</td>
            <td>실거래 참고 범위</td>
            <td>{formatRange(farmlandQuote.minAmount, farmlandQuote.maxAmount)}</td>
            <td className="cost-remark">진흥지역·지목에 따른 편차</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>빈집(주거) 합계</td>
            <td colSpan={2}>{formatWon(cost.housePackageTotal)}</td>
          </tr>
          <tr>
            <td colSpan={2}>농지·영농 합계</td>
            <td colSpan={2}>{formatWon(cost.farmPackageTotal)}</td>
          </tr>
          <tr>
            <td colSpan={2}>전체 합계</td>
            <td colSpan={2}>{formatWon(cost.total)}</td>
          </tr>
          {hasRepairRange && (
            <tr>
              <td colSpan={2}>빈집 합계 (수리비 포함, 추정)</td>
              <td colSpan={2}>{formatRange(cost.houseWithRepairMin, cost.houseWithRepairMax)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      <div className="info-box">
        <p>
          💡 「농지·영농」은 입력하신 <strong>{conditions.farmSize}평</strong> 기준입니다. 빈집만
          계약하려면 「빈집(주거)」 금액만 확인하세요. 영농 준비비는 300평 기준 단가를 선택
          평수에 비례해 산출합니다.
        </p>
      </div>

      <div className="action-row cost-report-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          순위로 돌아가기
        </button>
        <button type="button" className="btn btn-secondary btn-print" onClick={handlePrint}>
          리포트 인쇄
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          현장 방문 신청
        </button>
      </div>
    </section>
  )
}
