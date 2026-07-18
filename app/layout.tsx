import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'LeadPipeline — Restaurant Outreach CRM',
  description: 'Cold call outreach CRM for restaurant leads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex' }}>
        <Sidebar />
        <main className="layout-main">
          {children}
        </main>
      </body>
    </html>
  )
}
