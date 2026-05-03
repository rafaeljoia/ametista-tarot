'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'consultant'>('user')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/auth/forgot-password`, { email, role })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível enviar o e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <div className="bg-ink-800/60 border border-white/[0.06] rounded-2xl p-8 backdrop-blur">
          <h1 className="font-display text-2xl text-white tracking-tight mb-1">
            Esqueceu sua senha?
          </h1>
          <p className="text-ink-300 text-sm mb-6">
            Informe seu e-mail e enviaremos um link para você criar uma nova senha.
          </p>

          {done ? (
            <Alert variant="success" className="mb-4">
              Se este e-mail estiver cadastrado, você receberá em instantes um link para redefinir sua senha.
              Verifique também a caixa de spam.
            </Alert>
          ) : (
            <>
              {error && <Alert variant="error" className="mb-4">{error}</Alert>}
              <form onSubmit={submit} className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                      role === 'user'
                        ? 'bg-mystic-500/20 border-mystic-400 text-white'
                        : 'border-white/10 text-ink-300 hover:text-white'
                    }`}
                  >
                    Sou cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('consultant')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                      role === 'consultant'
                        ? 'bg-mystic-500/20 border-mystic-400 text-white'
                        : 'border-white/10 text-ink-300 hover:text-white'
                    }`}
                  >
                    Sou consultor(a)
                  </button>
                </div>

                <Input
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
                <Button type="submit" loading={loading} fullWidth size="lg">
                  Enviar link de redefinição
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href={role === 'consultant' ? '/consultant-login' : '/login'} className="text-sm text-mystic-300 hover:text-white">
              Voltar para login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
