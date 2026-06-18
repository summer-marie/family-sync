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
      <body className="bg-canvas text-primary">
        <div className="flex min-h-screen">
          <NavBar />
          {/* Offset right of fixed sidebar on desktop; pad bottom for mobile tab bar */}
          <div className="min-w-0 flex-1 bg-canvas pb-16 lg:ml-64 lg:pb-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
