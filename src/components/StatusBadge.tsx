import { formatStatusMeta } from '@/lib/format'
import type { SiteEntry } from '@/lib/types'
import styles from './StatusBadge.module.css'

export function StatusBadge({ site }: { site: Pick<SiteEntry, 'status' | 'latencyMs' | 'httpStatus'> }) {
  const isUp = site.status === 'up'
  return (
    <span className={isUp ? styles.up : styles.down}>
      <span className={styles.dot} />
      {isUp ? 'up' : 'down'} · {formatStatusMeta(site)}
    </span>
  )
}
