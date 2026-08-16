import styles from './ErrorBanner.module.css'

interface ErrorBannerProps {
  message: string
  onRetry: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className={styles.banner}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={styles.icon}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5" />
        <path d="M12 16.2v.1" />
      </svg>
      <div className={styles.text}>
        <span className={styles.title}>Impossible de charger les services</span>
        <span className={styles.detail}>{message}</span>
      </div>
      <button type="button" onClick={onRetry} className={styles.retry}>
        Réessayer
      </button>
    </div>
  )
}
