import styles from './EmptyState.module.css'

export function EmptyState({ query }: { query: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.text}>Aucun service ne correspond à « {query} ».</p>
    </div>
  )
}
