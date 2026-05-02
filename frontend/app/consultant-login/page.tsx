'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'

const AUTH_PHOTO =
  'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?auto=format&fit=crop&w=1400&q=80'

export default function ConsultantLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/consultant-login`, { email, password })
      localStorage.setItem('consultant-token', res.data.access_token)
      localStorage.setItem('consultant', JSON.stringify(res.data.consultant))
      router.push('/consultant-dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink-900 grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-ink-900/10" />
        <div className="relative h-full flex flex-col justify-between p-10">
          <Logo size="md" />
          <div className="max-w-md">
            <p className="text-gold-300 text-xs uppercase tracking-[0.18em] mb-3">Painel do consultor</p>
            <h2 className="font-display text-3xl text-white leading-tight tracking-tight">
              Receba chamadas e atenda seus clientes.
            </h2>
            <p className="text-ink-300 mt-3 text-sm leading-relaxed">
              Acesso restrito para consultoras(es) cadastrados na plataforma.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          <Badge variant="gold" className="mb-3">Acesso restrito · Consultor(a)</Badge>
          <h1 className="font-display text-2xl text-white tracking-tight mb-1">Entrar como consultor(a)</h1>
          <p className="text-ink-300 text-sm mb-7">Acesse seu painel para receber clientes.</p>

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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg" variant="gold">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-ink-400">
            Sou cliente —{' '}
            <Link href="/login" className="text-ink-200 hover:text-white">
              entrar como cliente
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
