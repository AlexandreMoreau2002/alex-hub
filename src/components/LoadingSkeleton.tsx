import styles from './LoadingSkeleton.module.css'

export function LoadingSkeleton() {
  return (
    <div className={styles.stack} aria-label="Chargement">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.card}>
          <div className={styles.headerRow}>
            <div className={styles.dot} />
            <div className={styles.barWide} />
            <div className={styles.barNarrow} />
          </div>
          <div className={styles.rows}>
            {[0, 1].map((j) => (
              <div key={j} className={styles.row}>
                <div className={styles.avatar} />
                <div className={styles.rowText}>
                  <div className={styles.lineWide} />
                  <div className={styles.lineNarrow} />
                </div>
                <div className={styles.pill} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
