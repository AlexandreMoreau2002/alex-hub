'use client'

import type { StatusFilterValue } from '@/lib/filter'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  filter: StatusFilterValue
  onFilterChange: (value: StatusFilterValue) => void
  anyOpen: boolean
  onToggleAll: () => void
}

const FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'up', label: 'En ligne' },
  { value: 'down', label: 'Hors ligne' },
]

export function Toolbar({ query, onQueryChange, filter, onFilterChange, anyOpen, onToggleAll }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={styles.searchIcon}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filtrer par site, projet ou domaine…"
          className={styles.searchInput}
        />
      </div>
      <div className={styles.segmented}>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange(value)}
            className={value === filter ? styles.chipActive : styles.chip}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button" onClick={onToggleAll} className={styles.expandButton}>
        {anyOpen ? 'Tout replier' : 'Tout déplier'}
      </button>
    </div>
  )
}
