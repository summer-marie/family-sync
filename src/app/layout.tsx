import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/nav/nav-bar'

export const metadata: Metadata = {
  title: 'Family Sync',
  description: 'Privacy-first family calendar hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
