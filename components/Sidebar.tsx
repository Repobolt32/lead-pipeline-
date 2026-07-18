'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isPlaceholder } from '@/lib/supabase'
import styles from './Sidebar.module.css'

const navItems = [
  { href: '/import', label: 'Import Leads', icon: '⬆' },
  { href: '/scrape', label: 'Scrape & Clean', icon: '🧹' },
  { href: '/outreach', label: 'Outreach', icon: '📞' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <div className={styles.logoText}>LeadPipeline</div>
          <div className={styles.logoSub}>Restaurant Outreach</div>
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        {isPlaceholder && (
          <div
            className={styles.mockBanner}
            title="Running in Mock Mode using browser local storage. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your env settings and redeploy to connect to Supabase."
          >
            ⚠️ Mock Mode
          </div>
        )}
      </aside>
    </>
  )
}
