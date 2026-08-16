'use client'

import type { Theme } from '@/lib/useTheme'
import styles from './Header.module.css'

interface HeaderProps {
  upCount: number
  totalCount: number
  onRefresh: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function Header({ upCount, totalCount, onRefresh, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <span className={styles.eyebrow}>Sites déployés</span>
        <h1 className={styles.title}>Alex hub</h1>
      </div>
      <div className={styles.actions}>
        <span className={styles.counter}>
          {upCount}/{totalCount} up
        </span>
        <button type="button" onClick={onRefresh} className={styles.actionButton}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 3v6h-6" />
          </svg>
          Rafraîchir
        </button>
        <button type="button" onClick={onToggleTheme} className={styles.actionButton}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}
