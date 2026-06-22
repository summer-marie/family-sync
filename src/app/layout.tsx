import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/nav/nav-bar'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: 'Family Sync',
  description: 'Privacy-first family calendar hub',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAuthenticated = !!session?.user

  return (
    <html lang="en">
      <body className="bg-canvas text-primary">
        <div className="flex min-h-screen">
          {isAuthenticated && <NavBar />}
          {/* Offset right of fixed sidebar on desktop; pad bottom for mobile tab bar — only when nav is rendered */}
          <div
            className={`min-w-0 flex-1 bg-canvas ${isAuthenticated ? 'pb-16 lg:ml-64 lg:pb-0' : ''}`}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
