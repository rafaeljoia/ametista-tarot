'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { adminClient, clearAdminToken, hasAdminToken } from '../../lib/admin-api'

type IconKey =
  | 'overview' | 'consultants' | 'users' | 'finance' | 'transactions' | 'sessions' | 'reviews' | 'pricing'

const NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: '/admin', label: 'Visão geral', icon: 'overview' },
  { href: '/admin/consultores', label: 'Consultores', icon: 'consultants' },
  { href: '/admin/usuarios', label: 'Usuários', icon: 'users' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: 'finance' },
  { href: '/admin/transacoes', label: 'Transações', icon: 'transactions' },
  { href: '/admin/consultas', label: 'Consultas', icon: 'sessions' },
  { href: '/admin/reviews', label: 'Avaliações', icon: 'reviews' },
  { href: '/admin/pricing', label: 'Preços', icon: 'pricing' },
]

function NavIcon({ name, className = 'w-4 h-4' }: { name: IconKey; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'overview':     return <svg {...common}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-6" /></svg>
    case 'consultants':  return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    case 'users':        return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'finance':      return <svg {...common}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    case 'transactions': return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
    case 'sessions':     return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    case 'reviews':      return <svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
    case 'pricing':      return <svg {...common}><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v14a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg>
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<{ name?: string; email?: string } | null>(null)
  const [ready, setReady] = useState(false)

  const isLogin = pathname === '/admin/login'

  useEffect(() => {
    if (isLogin) {
      setReady(true)
      return
    }
    if (!hasAdminToken()) {
      router.replace('/admin/login')
      return
    }
    adminClient()
      .get('/admin/me')
      .then((r) => setMe(r.data))
      .catch(() => router.replace('/admin/login'))
      .finally(() => setReady(true))
  }, [isLogin, router])

  if (isLogin) return <>{children}</>
  if (!ready) {
    return (
      <main className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-200">
        Carregando…
      </main>
    )
  }

  function logout() {
    clearAdminToken()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-ink-900/80 border-r border-white/[0.06] backdrop-blur-md">
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <div className="font-display text-xl text-white tracking-tight">
            Ametista
          </div>
          <p className="text-xs text-ink-300 mt-0.5">Painel administrativo</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((n) => {
            const active =
              n.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-white/[0.06] text-white'
                    : 'text-ink-200 hover:text-white hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <NavIcon name={n.icon} />
                <span>{n.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-ink-300 truncate">{me?.email}</p>
          <p className="text-sm text-white truncate mb-2">{me?.name}</p>
          <button
            onClick={logout}
            className="w-full text-left text-sm text-red-300 hover:text-red-200"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-ink-900/80 border-b border-white/[0.06]">
          <div className="font-display text-white tracking-tight">Ametista · Admin</div>
          <button onClick={logout} className="text-sm text-red-300">
            Sair
          </button>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-ink-900/60">
          {NAV.map((n) => {
            const active =
              n.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors',
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'bg-white/[0.03] text-ink-200',
                ].join(' ')}
              >
                <NavIcon name={n.icon} className="w-3.5 h-3.5" /> {n.label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
