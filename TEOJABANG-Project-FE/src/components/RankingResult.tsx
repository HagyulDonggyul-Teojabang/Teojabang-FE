import type { DiagnosisItem, RankedHouse } from '../types'
import { STATUS_LABEL } from '../utils/format'

interface RankingResultProps {
  ranked: RankedHouse[]
  selectedId: string | null
  onSelect: (houseId: string) => void
  onNext: () => void
  onBack: () => void
}

function DiagnosisBadge({ item }: { item: DiagnosisItem }) {
  return (
    <div className={`diagnosis-item status-${item.status}`}>
      <span className="diagnosis-category">{item.category}</span>
      <span className={`status-badge status-${item.status}`}>{STATUS_LABEL[item.status]}</span>
      <p className="diagnosis-note">{item.note}</p>
    </div>
  )
}

export default function RankingResult({
  ranked,
  selectedId,
  onSelect,
  onNext,
  onBack,
}: RankingResultProps) {
  const selected = ranked.find((r) => r.house.id === selectedId)

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="step-badge">STEP 2</span>
        <h2>AI 분석 · 적합도 순위</h2>
        <p>입력하신 조건 기준으로 업로드한 빈집 3채를 비교·매칭했습니다.</p>
      </div>

      <div className="ranking-list">
        {ranked.map((item, index) => (
          <article
            key={item.house.id}
            className={`house-card ${selectedId === item.house.id ? 'selected' : ''}`}
            onClick={() => onSelect(item.house.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(item.house.id)}
            role="button"
            tabIndex={0}
          >
            <div className="rank-badge">{index + 1}위</div>
            <img src={item.house.imageUrl} alt={item.house.name} className="house-image" />
            <div className="house-info">
              <h3>{item.house.name}</h3>
              <p className="house-address">{item.house.address}</p>
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${item.score}%` }} />
                <span className="score-text">적합도 {item.score}점</span>
              </div>
              <ul className="reason-list">
                {item.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="house-meta">
                <span>월 임대 {item.house.rent.toLocaleString()}원</span>
                <span>{item.house.area}㎡</span>
                <span>농지 {item.house.farmlandDistanceMin}분</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div className="diagnosis-panel">
          <h3>항목별 상태 진단 — {selected.house.name}</h3>
          <div className="diagnosis-grid">
            {selected.house.diagnosis.map((item) => (
              <DiagnosisBadge key={item.category} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="action-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          조건 다시 입력
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedId}
          onClick={onNext}
        >
          선택한 빈집 정착비용 보기
        </button>
      </div>
    </section>
  )
}
