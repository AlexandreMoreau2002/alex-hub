'use client'

import type { SiteGroup } from '@/lib/types'
import { ServiceRow } from './ServiceRow'
import styles from './SiteGroupAccordion.module.css'

interface SiteGroupAccordionProps {
  group: SiteGroup
  isOpen: boolean
  onToggle: () => void
}

// Un nom de groupe peut contenir des espaces et un point médian (ex: "Snoroc · Dev"),
// invalides dans un attribut `id` HTML — on le simplifie pour l'usage id/aria-controls.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents décomposés (é → e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function SiteGroupAccordion({ group, isOpen, onToggle }: SiteGroupAccordionProps) {
  const downCount = group.services.filter((service) => service.status === 'down').length
  const countLabel = `${group.services.length} ${group.services.length > 1 ? 'services' : 'service'}`
  const bodyId = `group-body-${slugify(group.name)}`

  return (
    <section className={styles.card}>
      <button type="button" onClick={onToggle} className={styles.header} aria-expanded={isOpen} aria-controls={bodyId}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.chevron}
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className={styles.name}>{group.name}</span>
        <span className={styles.count}>{countLabel}</span>
        {downCount > 0 ? (
          <span className={styles.downLabel}>
            <span className={styles.downDot} />
            {downCount} hors ligne
          </span>
        ) : null}
      </button>
      <div
        id={bodyId}
        className={styles.body}
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
      >
        <div className={styles.bodyInner}>
          <div className={styles.bodyPadding}>
            {group.services.map((service) => (
              <ServiceRow key={service.url} site={service} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
