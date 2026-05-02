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

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password.length < 6) {
      setError('Senha deve ter ao menos 6 caracteres')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        birthDate: formData.birthDate,
      })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar')
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
            <h1 className="font-display text-2xl text-white text-center mb-1">Crie sua conta</h1>
            <p className="text-ink-200/80 text-center mb-7 text-sm">É grátis e leva menos de um minuto.</p>

            {error && <Alert variant="error" className="mb-5">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Como prefere ser chamada(o)"
                required
              />
              <Input
                label="E-mail"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Telefone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />
                <Input
                  label="Nascimento"
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
              <Input
                label="Senha"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                hint="Use ao menos 6 caracteres"
              />
              <Input
                label="Confirmar senha"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />

              <Button type="submit" loading={loading} fullWidth size="lg">
                {loading ? 'Criando conta...' : 'Criar minha conta'}
              </Button>

              <p className="text-xs text-ink-300/70 text-center">
                Ao continuar você concorda com nossos Termos e Política de Privacidade.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-ink-200/80">
              Já tem conta?{' '}
              <Link href="/login" className="text-mystic-200 hover:text-white font-semibold">
                Entrar aqui
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </main>
  )
}
