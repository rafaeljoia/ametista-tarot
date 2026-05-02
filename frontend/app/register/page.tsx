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
  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80'

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
    <main className="min-h-screen bg-ink-900 grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-ink-900/10" />
        <div className="relative h-full flex flex-col justify-between p-10">
          <Logo size="md" />
          <div className="max-w-md">
            <p className="text-mystic-200 text-xs uppercase tracking-[0.18em] mb-3">Crie sua conta</p>
            <h2 className="font-display text-3xl text-white leading-tight tracking-tight">
              Comece a conversar com nossos consultores em minutos.
            </h2>
            <p className="text-ink-300 mt-3 text-sm leading-relaxed">
              Cadastro gratuito. Pague apenas pelos minutos da sessão. Cancele quando quiser.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          <h1 className="font-display text-2xl text-white tracking-tight mb-1">Criar conta</h1>
          <p className="text-ink-300 text-sm mb-7">
            Já tem conta?{' '}
            <Link href="/login" className="text-mystic-300 hover:text-white">
              Entrar aqui
            </Link>
            .
          </p>

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
              {loading ? 'Criando conta…' : 'Criar minha conta'}
            </Button>

            <p className="text-xs text-ink-400 text-center leading-relaxed">
              Ao continuar você concorda com nossos Termos e Política de Privacidade.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
