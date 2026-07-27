import BrandLogo from './BrandLogo'

interface LandingPageProps {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <BrandLogo variant="landing" />
        <button type="button" className="btn btn-primary landing-start-btn" onClick={onStart}>
          사용하러 가기
        </button>
      </div>
    </div>
  )
}
