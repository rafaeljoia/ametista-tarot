'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'

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
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/consultant-login`, {
        email,
        password,
      })
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
    <main className="min-h-screen bg-mystic-gradient flex flex-col">
      <div className="starfield" />
      <div className="relative flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <Card variant="gold" className="p-8">
            <div className="flex justify-center mb-3">
              <Badge variant="gold">Acesso restrito · Consultor(a)</Badge>
            </div>
            <h1 className="font-display text-2xl text-white text-center mb-1">Painel do consultor</h1>
            <p className="text-ink-200/80 text-center mb-7 text-sm">
              Entre para receber chamadas e atender seus clientes.
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />

              <Button type="submit" loading={loading} fullWidth size="lg" variant="gold">
                {loading ? 'Entrando...' : 'Entrar como consultor(a)'}
              </Button>
            </form>
          </Card>

          <p className="text-center mt-6 text-sm text-ink-300/70">
            Sou cliente —{' '}
            <Link href="/login" className="text-mystic-200 hover:text-white">
              entrar como cliente
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
