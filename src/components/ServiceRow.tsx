import { hostOf, initialOf } from '@/lib/format'
import type { SiteEntry } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import styles from './ServiceRow.module.css'

export function ServiceRow({ site }: { site: SiteEntry }) {
  return (
    <div className={styles.row}>
      <div className={styles.favicon}>
        <span className={styles.faviconFallback}>{initialOf(site.title)}</span>
        {site.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.favicon}
            alt=""
            className={styles.faviconImg}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </div>
      <div className={styles.text}>
        <span className={styles.title}>{site.title}</span>
        {site.description ? <span className={styles.description}>{site.description}</span> : null}
      </div>
      <StatusBadge site={site} />
      <a href={site.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
        {hostOf(site.url)}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4h6v6" />
          <path d="M20 4 10 14" />
          <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
    </div>
  )
}
