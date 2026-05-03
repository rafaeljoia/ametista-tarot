'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

function ResetPasswordInner() {
  const router = useRouter()
  const search = useSearchParams()
  const token = search.get('token') || ''
  const role = search.get('role') === 'consultant' ? 'consultant' : 'user'
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) return setError('Link inválido. Solicite um novo e-mail.')
    if (pw.length < 6) return setError('A senha deve ter ao menos 6 caracteres.')
    if (pw !== pw2) return setError('As senhas não coincidem.')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password: pw })
      setOk(true)
      setTimeout(() => {
        router.replace(role === 'consultant' ? '/consultant-login' : '/login')
      }, 2200)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="md" /></div>
        <div className="bg-ink-800/60 border border-white/[0.06] rounded-2xl p-8 backdrop-blur">
          <h1 className="font-display text-2xl text-white tracking-tight mb-1">Nova senha</h1>
          <p className="text-ink-300 text-sm mb-6">Crie uma senha nova e segura para sua conta.</p>

          {ok ? (
            <Alert variant="success">Senha redefinida! Redirecionando para o login…</Alert>
          ) : (
            <>
              {error && <Alert variant="error" className="mb-4">{error}</Alert>}
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Nova senha"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  hint="Mínimo 6 caracteres"
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} fullWidth size="lg">Salvar nova senha</Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-mystic-300 hover:text-white">Voltar para login</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ink-900" />}>
      <ResetPasswordInner />
    </Suspense>
  )
}
