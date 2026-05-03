'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Modal } from '../../components/ui/Modal'

const AUTH_PHOTO =
  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface TermsView {
  id: string
  version: number
  content: string
  publishedAt: string
}

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
  const [accepted, setAccepted] = useState(false)
  const [terms, setTerms] = useState<TermsView | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get(`${API}/terms/current`).then((r) => setTerms(r.data)).catch(() => undefined)
  }, [])

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
    if (!accepted) {
      setError('Você precisa aceitar os Termos de Uso para continuar.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        birthDate: formData.birthDate,
        acceptedTermsVersionId: terms?.id,
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
            <Input label="Nome completo" name="name" value={formData.name} onChange={handleChange} placeholder="Como prefere ser chamada(o)" required />
            <Input label="E-mail" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required autoComplete="email" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
              <Input label="Nascimento" type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} />
            </div>
            <Input label="Senha" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" required hint="Use ao menos 6 caracteres" />
            <Input label="Confirmar senha" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-mystic-500"
              />
              <span className="text-sm text-ink-200 leading-relaxed">
                Li e aceito os{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-mystic-300 hover:text-white underline underline-offset-2">
                  Termos de Uso
                </button>
                {terms ? <span className="text-ink-400"> (versão {terms.version})</span> : null}
                {' '}da plataforma.
              </span>
            </label>

            <Button type="submit" loading={loading} fullWidth size="lg" disabled={!accepted}>
              {loading ? 'Criando conta…' : 'Criar minha conta'}
            </Button>
          </form>
        </div>
      </div>

      {showTerms && terms && (
        <Modal open onClose={() => setShowTerms(false)} title={`Termos de Uso — versão ${terms.version}`} size="lg">
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-ink-100 leading-relaxed pr-2">
            {terms.content}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowTerms(false)}>Fechar</Button>
            <Button onClick={() => { setAccepted(true); setShowTerms(false) }}>Aceitar e continuar</Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
