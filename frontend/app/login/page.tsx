'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

const AUTH_PHOTO =
  'https://images.unsplash.com/photo-1518551933037-91b2f5f229cc?auto=format&fit=crop&w=1400&q=80'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, { email, password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink-900 grid lg:grid-cols-2">
      {/* Left — photography panel */}
      <div className="hidden lg:block relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-ink-900/10" />
        <div className="relative h-full flex flex-col justify-between p-10">
          <Logo size="md" />
          <div className="max-w-md">
            <p className="text-mystic-200 text-xs uppercase tracking-[0.18em] mb-3">Bem-vinda(o) de volta</p>
            <h2 className="font-display text-3xl text-white leading-tight tracking-tight">
              Sua próxima conversa começa aqui.
            </h2>
            <p className="text-ink-300 mt-3 text-sm leading-relaxed">
              Entre para conversar com seu(a) consultor(a) e ver seu histórico de sessões.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          <h1 className="font-display text-2xl text-white tracking-tight mb-1">Entrar</h1>
          <p className="text-ink-300 text-sm mb-7">
            Não tem conta?{' '}
            <Link href="/register" className="text-mystic-300 hover:text-white">
              Crie a sua aqui
            </Link>
            .
          </p>

          {error && <Alert variant="error" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-xs text-ink-300 hover:text-white"
                >
                  {showPwd ? 'ocultar' : 'mostrar'}
                </button>
              }
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-ink-400">
            É consultor(a)?{' '}
            <Link href="/consultant-login" className="text-ink-200 hover:text-white">
              Acesso restrito
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
