import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alex Hub',
  description: 'Tous mes sites déployés, en un coup d’œil.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
