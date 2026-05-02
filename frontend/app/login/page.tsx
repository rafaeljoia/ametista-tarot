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
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        email,
        password,
      })
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
    <main className="min-h-screen bg-mystic-gradient flex flex-col">
      <div className="starfield" />
      <div className="relative flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <Card variant="elevated" className="p-8">
            <h1 className="font-display text-2xl text-white text-center mb-1">Bem-vinda(o) de volta</h1>
            <p className="text-ink-200/80 text-center mb-7 text-sm">Entre para conversar com seu(a) consultor(a).</p>

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
                    className="text-xs text-mystic-300 hover:text-white"
                  >
                    {showPwd ? 'ocultar' : 'mostrar'}
                  </button>
                }
              />

              <Button type="submit" loading={loading} fullWidth size="lg">
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-200/80">
              Não tem conta?{' '}
              <Link href="/register" className="text-mystic-200 hover:text-white font-semibold">
                Crie a sua aqui
              </Link>
            </p>
          </Card>

          <p className="text-center mt-6 text-sm text-ink-300/70">
            É consultor(a)?{' '}
            <Link href="/consultant-login" className="text-gold-300 hover:text-gold-200">
              Acesso restrito
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
