'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { adminClient, clearAdminToken, hasAdminToken } from '../../lib/admin-api'

const NAV = [
  { href: '/admin', label: 'Visão geral', icon: '📊' },
  { href: '/admin/consultores', label: 'Consultores', icon: '🔮' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/admin/transacoes', label: 'Transações', icon: '💳' },
  { href: '/admin/consultas', label: 'Consultas', icon: '💬' },
  { href: '/admin/reviews', label: 'Avaliações', icon: '⭐' },
]

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
      <main className="min-h-screen bg-mystic-gradient flex items-center justify-center text-ink-200">
        Carregando…
      </main>
    )
  }

  function logout() {
    clearAdminToken()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-mystic-gradient text-ink-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-ink-900/60 border-r border-white/10 backdrop-blur-md">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="font-display text-xl text-white">
            <span className="text-gradient-gold">Ametista</span>
          </div>
          <p className="text-xs text-ink-300 mt-0.5">Painel administrativo</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
                  active
                    ? 'bg-mystic-500/20 text-white border border-mystic-500/30'
                    : 'text-ink-200 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                <span>{n.icon}</span>
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-ink-900/60 border-b border-white/10">
          <div className="font-display text-white">Ametista · Admin</div>
          <button onClick={logout} className="text-sm text-red-300">
            Sair
          </button>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-2 px-3 py-2 border-b border-white/10 bg-ink-900/40">
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
                  'shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap',
                  active
                    ? 'bg-mystic-500/30 text-white'
                    : 'bg-white/5 text-ink-200',
                ].join(' ')}
              >
                {n.icon} {n.label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
