'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './ui/Avatar'

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

const navLink = (active: boolean) =>
  [
    'px-3 py-1.5 text-sm rounded-md transition-colors',
    active ? 'text-white bg-white/[0.06]' : 'text-ink-200 hover:text-white',
  ].join(' ')

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

export function Navbar({ variant = 'public' }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserShape | null>(null)
  const [consultant, setConsultant] = useState<ConsultantShape | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    if (variant === 'client' || variant === 'public') {
      const u = localStorage.getItem('user')
      if (u) setUser(JSON.parse(u))
    }
    if (variant === 'consultant') {
      const c = localStorage.getItem('consultant')
      if (c) setConsultant(JSON.parse(c))
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
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-900/80 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo size="md" href={variant === 'consultant' ? '/consultant-dashboard' : '/'} />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5 relative">
          {variant === 'public' && !user && (
            <>
              <Link href="/#como-funciona" className={navLink(false)}>Como funciona</Link>
              <Link href="/#consultores" className={navLink(false)}>Consultores</Link>
              <Link href="/consultant-login" className={navLink(false)}>Sou consultor</Link>
              <span className="w-px h-5 bg-white/10 mx-1" />
              <Link href="/login" className={navLink(false)}>Entrar</Link>
              <Link
                href="/register"
                className="ml-1 px-3.5 py-1.5 text-sm font-medium text-white bg-mystic-600 hover:bg-mystic-500 rounded-md transition-colors"
              >
                Criar conta
              </Link>
            </>
          )}

          {variant === 'public' && user && (
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 text-sm font-medium text-white bg-mystic-600 hover:bg-mystic-500 rounded-md transition-colors"
            >
              Ir para meu painel
            </Link>
          )}

          {variant === 'client' && user && (
            <>
              <Link href="/dashboard" className={navLink(pathname === '/dashboard')}>Consultores</Link>
              <Link href="/dashboard/oferendas" className={navLink(pathname === '/dashboard/oferendas')}>Minhas orientações</Link>
              <Link href="/dashboard/inbox" className={navLink(pathname === '/dashboard/inbox')}>Caixa de entrada</Link>
              <Link href="/perfil" className={navLink(pathname === '/perfil')}>Meu perfil</Link>

              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/10 ml-2">
                <span className="text-xs text-ink-300">Créditos</span>
                <span className="text-ink-100 font-medium tabular-nums">
                  {Number(user?.credits ?? 0).toFixed(0)}
                </span>
              </div>

              <Link
                href="/comprar-creditos"
                className="ml-1 px-3.5 py-1.5 text-sm text-ink-100 border border-white/15 hover:bg-white/[0.04] rounded-md transition-colors"
              >
                Adicionar créditos
              </Link>

              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="ml-2 relative"
                aria-label="Menu do usuário"
              >
                <Avatar name={user.name} size="sm" />
              </button>
              {accountOpen && (
                <div
                  className="absolute right-0 top-12 w-60 glass-strong rounded-lg p-1.5 shadow-soft"
                  onClick={() => setAccountOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <p className="text-sm text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-ink-300 truncate">{user.email}</p>
                  </div>
                  <Link href="/perfil" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/[0.05] rounded-md">
                    Meu perfil
                  </Link>
                  <Link href="/comprar-creditos" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/[0.05] rounded-md">
                    Comprar créditos
                  </Link>
                  <button
                    onClick={logoutClient}
                    className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-md"
                  >
                    Sair
                  </button>
                </div>
              )}
            </>
          )}

          {variant === 'consultant' && consultant && (
            <>
              <Link href="/consultant-dashboard" className={navLink(pathname === '/consultant-dashboard')}>
                Painel
              </Link>
              <Link href="/consultor/perfil" className={navLink(pathname === '/consultor/perfil')}>
                Meu perfil
              </Link>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="ml-2 relative"
                aria-label="Menu"
              >
                <Avatar name={consultant.name} size="sm" />
              </button>
              {accountOpen && (
                <div
                  className="absolute right-0 top-12 w-60 glass-strong rounded-lg p-1.5 shadow-soft"
                  onClick={() => setAccountOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <p className="text-sm text-white font-medium truncate">{consultant.name}</p>
                    <p className="text-xs text-ink-300 truncate">{consultant.email}</p>
                  </div>
                  <Link href="/consultor/perfil" className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/[0.05] rounded-md">
                    Editar perfil
                  </Link>
                  <button
                    onClick={logoutConsultant}
                    className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-md"
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
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          className="md:hidden w-9 h-9 rounded-md hover:bg-white/[0.06] text-ink-100 flex items-center justify-center"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] px-3 py-2 space-y-1 bg-ink-900/95">
          {variant === 'public' && !user && (
            <>
              <Link href="/login" className="block px-3 py-2 rounded-md hover:bg-white/[0.05] text-ink-100">Entrar</Link>
              <Link href="/register" className="block px-3 py-2 rounded-md hover:bg-white/[0.05] text-mystic-200">Criar conta</Link>
              <Link href="/consultant-login" className="block px-3 py-2 rounded-md hover:bg-white/[0.05] text-ink-100">Sou consultor</Link>
            </>
          )}
          {variant === 'public' && user && (
            <Link href="/dashboard" className="block px-3 py-2 rounded-md hover:bg-white/[0.05] text-mystic-200">
              Ir para meu painel
            </Link>
          )}
          {variant === 'client' && user && (
            <>
              <div className="px-3 py-2 text-ink-300 text-sm border-b border-white/[0.06]">
                {user.name} · <span className="text-ink-100 tabular-nums">{Number(user.credits ?? 0)} créditos</span>
              </div>
              <Link href="/dashboard" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Consultores</Link>
              <Link href="/dashboard/oferendas" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Minhas orientações</Link>
              <Link href="/dashboard/inbox" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Caixa de entrada</Link>
              <Link href="/perfil" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Meu perfil</Link>
              <Link href="/comprar-creditos" className="block px-3 py-2 rounded-md hover:bg-white/[0.05] text-ink-100">Comprar créditos</Link>
              <button onClick={logoutClient} className="block w-full text-left px-3 py-2 rounded-md text-red-300 hover:bg-red-500/10">
                Sair
              </button>
            </>
          )}
          {variant === 'consultant' && consultant && (
            <>
              <div className="px-3 py-2 text-ink-300 text-sm border-b border-white/[0.06]">{consultant.name}</div>
              <Link href="/consultant-dashboard" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Painel</Link>
              <Link href="/consultor/perfil" className="block px-3 py-2 rounded-md hover:bg-white/[0.05]">Meu perfil</Link>
              <button onClick={logoutConsultant} className="block w-full text-left px-3 py-2 rounded-md text-red-300 hover:bg-red-500/10">
                Sair
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
