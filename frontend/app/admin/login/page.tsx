'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { setAdminToken } from '../../../lib/admin-api'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const r = await axios.post(`${API}/admin/login`, { email, password })
      setAdminToken(r.data.access_token)
      router.push('/admin')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-mystic-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🔐</div>
          <h1 className="font-display text-3xl text-white">Painel Administrativo</h1>
          <p className="text-ink-200/80 mt-2">Acesso restrito</p>
        </div>

        <Card variant="elevated" className="p-7">
          <form onSubmit={submit} className="space-y-4">
            <Input
              type="email"
              label="E-mail"
              placeholder="admin@ametista.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="password"
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
