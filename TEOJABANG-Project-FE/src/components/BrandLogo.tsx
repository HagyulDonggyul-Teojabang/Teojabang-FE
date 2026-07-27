import { BRAND_NAME, LOGO_ALT, LOGO_IMAGE_SRC } from '../config/brand'

interface BrandLogoProps {
  variant?: 'default' | 'landing'
}

export default function BrandLogo({ variant = 'default' }: BrandLogoProps) {
  if (LOGO_IMAGE_SRC) {
    return (
      <img
        src={LOGO_IMAGE_SRC}
        alt={LOGO_ALT}
        className={`brand-logo brand-logo--image brand-logo--${variant}`}
      />
    )
  }

  return (
    <div className={`brand-logo brand-logo--text brand-logo--${variant}`}>
      <span className="brand-logo-icon" aria-hidden="true">
        🏠
      </span>
      <span className="brand-logo-name">{BRAND_NAME}</span>
    </div>
  )
}
