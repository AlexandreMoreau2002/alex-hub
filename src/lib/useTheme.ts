'use client'

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'alex-hub-theme'

function getPreferredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const preferred = getPreferredTheme()
    setTheme(preferred)
    document.documentElement.setAttribute('data-theme', preferred)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
