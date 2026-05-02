'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './ui/Avatar'
import { Badge } from './ui/Badge'

interface UserShape {
  id: string
  name: string
  email: string
  credits?: number
}

interface ConsultantShape {
  id: string
  name: string
  email: string
  specialty?: string
}

interface NavbarProps {
  variant?: 'public' | 'client' | 'consultant'
}

export function Navbar({ variant = 'public' }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserShape | null>(null)
  const [consultant, setConsultant] = useState<ConsultantShape | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (variant === 'client') {
      const u = localStorage.getItem('user')
      if (u) setUser(JSON.parse(u))
    }
    if (variant === 'consultant') {
      const c = localStorage.getItem('consultant')
      if (c) setConsultant(JSON.parse(c))
    }
    if (variant === 'public') {
      const u = localStorage.getItem('user')
      if (u) setUser(JSON.parse(u))
    }
  }, [variant, pathname])

  const logoutClient = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }
  const logoutConsultant = () => {
    localStorage.removeItem('consultant-token')
    localStorage.removeItem('consultant')
    router.push('/consultant-login')
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-900/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo size="md" href={variant === 'consultant' ? '/consultant-dashboard' : '/'} />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {variant === 'public' && !user && (
            <>
              <Link href="/#como-funciona" className="px-3 py-2 text-sm text-ink-100 hover:text-white">
                Como funciona
              </Link>
              <Link href="/#consultores" className="px-3 py-2 text-sm text-ink-100 hover:text-white">
                Consultores
              </Link>
              <Link href="/consultant-login" className="px-3 py-2 text-sm text-ink-100 hover:text-white">
                Sou consultor
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-mystic-100 hover:text-white border border-mystic-400/40 rounded-xl"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm text-white bg-gradient-to-r from-mystic-500 to-mystic-700 hover:from-mystic-400 hover:to-mystic-600 rounded-xl shadow-glow"
              >
                Criar conta
              </Link>
            </>
          )}

          {variant === 'public' && user && (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-mystic-500 to-mystic-700 hover:from-mystic-400 hover:to-mystic-600 rounded-xl shadow-glow"
            >
              Ir para meu painel
            </Link>
          )}

          {variant === 'client' && user && (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-2 text-sm rounded-lg ${pathname === '/dashboard' ? 'text-white bg-white/5' : 'text-ink-100 hover:text-white'}`}
              >
                Consultores
              </Link>
              <Link
                href="/perfil"
                className={`px-3 py-2 text-sm rounded-lg ${pathname === '/perfil' ? 'text-white bg-white/5' : 'text-ink-100 hover:text-white'}`}
              >
                Meu perfil
              </Link>

              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 ml-2">
                <span className="text-xs text-ink-200">Créditos</span>
                <span className="text-gold-300 font-semibold">{Number(user?.credits ?? 0).toFixed(0)}</span>
              </div>

              <Link
                href="/comprar-creditos"
                className="px-4 py-2 text-sm text-ink-900 bg-gold-gradient hover:brightness-110 rounded-xl font-semibold shadow-gold"
              >
                + Créditos
              </Link>

              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="ml-2 relative"
                aria-label="Menu do usuário"
              >
                <Avatar name={user.name} size="md" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-4 top-14 mt-2 w-56 glass-strong rounded-2xl p-2 shadow-soft"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-ink-300 truncate">{user.email}</p>
                  </div>
                  <Link href="/perfil" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 rounded-lg">
                    Meu perfil
                  </Link>
                  <Link href="/comprar-creditos" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 rounded-lg">
                    Comprar créditos
                  </Link>
                  <button
                    onClick={logoutClient}
                    className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
                  >
                    Sair
                  </button>
                </div>
              )}
            </>
          )}

          {variant === 'consultant' && consultant && (
            <>
              <Link
                href="/consultant-dashboard"
                className={`px-3 py-2 text-sm rounded-lg ${pathname === '/consultant-dashboard' ? 'text-white bg-white/5' : 'text-ink-100 hover:text-white'}`}
              >
                Painel
              </Link>
              <Link
                href="/consultor/perfil"
                className={`px-3 py-2 text-sm rounded-lg ${pathname === '/consultor/perfil' ? 'text-white bg-white/5' : 'text-ink-100 hover:text-white'}`}
              >
                Meu perfil
              </Link>
              <Badge variant="gold" className="ml-2">Consultor(a)</Badge>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="ml-2 relative"
                aria-label="Menu"
              >
                <Avatar name={consultant.name} emoji="🔮" size="md" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-4 top-14 mt-2 w-56 glass-strong rounded-2xl p-2 shadow-soft"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm text-white font-medium truncate">{consultant.name}</p>
                    <p className="text-xs text-ink-300 truncate">{consultant.email}</p>
                  </div>
                  <Link href="/consultor/perfil" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 rounded-lg">
                    Editar perfil
                  </Link>
                  <button
                    onClick={logoutConsultant}
                    className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
                  >
                    Sair
                  </button>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menu"
          className="md:hidden w-10 h-10 rounded-lg hover:bg-white/10 text-ink-100 flex items-center justify-center"
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-3 space-y-2 bg-ink-900/95">
          {variant === 'public' && !user && (
            <>
              <Link href="/login" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-ink-100">
                Entrar
              </Link>
              <Link href="/register" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-mystic-200">
                Criar conta
              </Link>
              <Link href="/consultant-login" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-ink-100">
                Sou consultor
              </Link>
            </>
          )}
          {variant === 'public' && user && (
            <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-mystic-200">
              Ir para meu painel
            </Link>
          )}
          {variant === 'client' && user && (
            <>
              <div className="px-3 py-2 text-ink-200 text-sm border-b border-white/10">
                {user.name} · <span className="text-gold-300">{Number(user.credits ?? 0)} créditos</span>
              </div>
              <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5">Consultores</Link>
              <Link href="/perfil" className="block px-3 py-2 rounded-lg hover:bg-white/5">Meu perfil</Link>
              <Link href="/comprar-creditos" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-gold-300">Comprar créditos</Link>
              <button onClick={logoutClient} className="block w-full text-left px-3 py-2 rounded-lg text-red-300 hover:bg-red-500/10">
                Sair
              </button>
            </>
          )}
          {variant === 'consultant' && consultant && (
            <>
              <div className="px-3 py-2 text-ink-200 text-sm border-b border-white/10">{consultant.name}</div>
              <Link href="/consultant-dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/5">Painel</Link>
              <Link href="/consultor/perfil" className="block px-3 py-2 rounded-lg hover:bg-white/5">Meu perfil</Link>
              <button onClick={logoutConsultant} className="block w-full text-left px-3 py-2 rounded-lg text-red-300 hover:bg-red-500/10">
                Sair
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
