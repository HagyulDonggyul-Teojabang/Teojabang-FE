import BrandLogo from './BrandLogo'

interface LandingPageProps {
  onStart: () => void
}

const FEATURES = [
  {
    icon: '🔍',
    title: 'AI 빈집 진단',
    desc: '사진만 올리면 AI가 지붕·벽·창호 상태를 분석하고, 수리가 필요한 항목을 알려드려요.',
  },
  {
    icon: '🏡',
    title: '맞춤 순위 비교',
    desc: '예산, 농지 규모, 거주 희망 지역 등 내 조건에 맞는 빈집 TOP 3를 한눈에 비교해요.',
  },
  {
    icon: '💰',
    title: '정착비용 시뮬레이션',
    desc: '집 수리비, 농지 임대, 영농 착수 비용까지 — 제주 정착에 드는 총비용을 미리 확인해요.',
  },
] as const

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <BrandLogo variant="header" />
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <BrandLogo variant="landing" />
          <p className="landing-hero-sub">제주에서 내 땅 찾기</p>
          <p className="landing-hero-desc">AI가 분석하는 청년농 맞춤 빈집</p>
          <h1 id="landing-hero-title" className="landing-hero-heading">
            나에게 맞는 제주 빈집,
            <br />
            데이터로 먼저 만나보세요
          </h1>
          <p className="landing-hero-body">
            터잡앙은 청년농의 조건에 맞춰 빈집을 AI로 분석하고, 정착 비용까지
            <br className="landing-br-desktop" />
            한 번에 비교할 수 있는 서비스입니다.
          </p>
        </section>

        <section className="landing-features" aria-labelledby="landing-features-title">
          <h2 id="landing-features-title" className="landing-section-title">
            터잡앙이 도와드리는 것
          </h2>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-cta-card">
            <h2 id="landing-cta-title" className="landing-cta-title">
              지금 바로 내 조건으로 시작해 보세요
            </h2>
            <p className="landing-cta-desc">
              4단계 — 조건 입력 → AI 분석 → 정착비용 → 방문 신청
            </p>
            <button type="button" className="btn btn-primary landing-cta-btn" onClick={onStart}>
              사용하러 가기
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>2026 제주 지역대학 연합 창업 캠프 · 터잡앙 MVP 데모</p>
      </footer>
    </div>
  )
}
