'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Footnote } from '@/components/Footnote'
import { Header } from '@/components/Header'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SiteGroupAccordion } from '@/components/SiteGroupAccordion'
import { Toolbar } from '@/components/Toolbar'
import { filterByStatus, filterGroups, type StatusFilterValue } from '@/lib/filter'
import type { SiteGroup, SitesResponse } from '@/lib/types'
import { useTheme } from '@/lib/useTheme'
import styles from './page.module.css'

type Phase = 'loading' | 'ready' | 'error'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()
  const [phase, setPhase] = useState<Phase>('loading')
  const [groups, setGroups] = useState<SiteGroup[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilterValue>('all')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  async function load() {
    setPhase('loading')
    try {
      const response = await fetch('/api/sites')
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        setErrorMessage(body.error ?? 'Erreur inconnue')
        setPhase('error')
        return
      }
      const data = (await response.json()) as SitesResponse
      setGroups(data.groups)
      setOpenGroups((current) => {
        const next = { ...current }
        for (const group of data.groups) {
          if (!(group.name in next)) next[group.name] = true
        }
        return next
      })
      setPhase('ready')
    } catch {
      setErrorMessage('Impossible de contacter le serveur')
      setPhase('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredGroups = useMemo(
    () => filterGroups(filterByStatus(groups, filter), query),
    [groups, filter, query]
  )

  const isFiltering = query.trim().length > 0 || filter !== 'all'
  const anyOpen = Object.values(openGroups).some(Boolean)

  function isGroupOpen(group: SiteGroup): boolean {
    if (isFiltering) return true
    return openGroups[group.name] ?? true
  }

  function toggleGroup(name: string) {
    setOpenGroups((current) => ({ ...current, [name]: !current[name] }))
  }

  function toggleAll() {
    const next = !anyOpen
    setOpenGroups((current) => {
      const updated: Record<string, boolean> = { ...current }
      for (const group of groups) updated[group.name] = next
      return updated
    })
  }

  const allServices = groups.flatMap((group) => group.services)
  const upCount = allServices.filter((service) => service.status === 'up').length

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Header upCount={upCount} totalCount={allServices.length} onRefresh={load} theme={theme} onToggleTheme={toggleTheme} />
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          anyOpen={anyOpen}
          onToggleAll={toggleAll}
        />
        {phase === 'error' ? <ErrorBanner message={errorMessage} onRetry={load} /> : null}
        {phase === 'loading' ? <LoadingSkeleton /> : null}
        {phase !== 'loading' && groups.length > 0 ? (
          filteredGroups.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className={styles.groups}>
              {filteredGroups.map((group) => (
                <SiteGroupAccordion
                  key={group.name}
                  group={group}
                  isOpen={isGroupOpen(group)}
                  onToggle={() => toggleGroup(group.name)}
                />
              ))}
            </div>
          )
        ) : null}
        <Footnote />
      </div>
    </main>
  )
}
