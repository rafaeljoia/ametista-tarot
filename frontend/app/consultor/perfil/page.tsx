'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Input, Textarea } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { PageLoader } from '../../../components/ui/Spinner'

interface Consultant {
  id: string
  name: string
  email: string
  specialty: string
  bio: string
  pricePerMinute: number
  rating: number
  consultationsCount: number
  isAvailable: boolean
  createdAt?: string
}

interface ConsultationItem {
  id: string
  status: string
  minutesUsed: number
  creditsUsed: number
  startedAt?: string
  endedAt?: string
  createdAt: string
  counterpartName?: string | null
}

const API = process.env.NEXT_PUBLIC_API_URL

export default function ConsultorPerfilPage() {
  const router = useRouter()
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [consultations, setConsultations] = useState<ConsultationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'profile' | 'security' | 'consultations'>('profile')

  useEffect(() => {
    const token = localStorage.getItem('consultant-token')
    if (!token) { router.push('/consultant-login'); return }
    const auth = { headers: { Authorization: `Bearer ${token}` } }

    Promise.all([
      axios.get(`${API}/consultants/me`, auth),
      axios.get(`${API}/consultations`, auth).catch(() => ({ data: [] })),
    ])
      .then(([cRes, listRes]) => {
        setConsultant(cRes.data)
        setConsultations(listRes.data || [])
      })
      .catch(() => router.push('/consultant-login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading || !consultant) return <PageLoader label="Carregando seu perfil…" />

  return (
    <main className="min-h-screen bg-mystic-gradient">
      <Navbar variant="consultant" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card variant="elevated" className="p-7 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar name={consultant.name} emoji="🔮" size="2xl" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl text-white truncate">{consultant.name}</h1>
              <p className="text-mystic-300 truncate">{consultant.specialty}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="gold">★ {Number(consultant.rating).toFixed(1)}</Badge>
                <Badge variant="mystic">{consultant.consultationsCount} consultas</Badge>
                <Badge variant="neutral">R$ {Number(consultant.pricePerMinute).toFixed(2)}/min</Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-1 mb-5 overflow-x-auto bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>Perfil público</TabBtn>
          <TabBtn active={tab === 'consultations'} onClick={() => setTab('consultations')}>Consultas</TabBtn>
          <TabBtn active={tab === 'security'} onClick={() => setTab('security')}>Segurança</TabBtn>
        </div>

        {tab === 'profile' && <ConsultantProfileForm consultant={consultant} onUpdated={setConsultant} />}
        {tab === 'consultations' && <ConsultationsView items={consultations} />}
        {tab === 'security' && <ConsultantSecurityForm />}
      </div>
    </main>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={['px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap',
        active ? 'bg-mystic-500/30 text-white' : 'text-ink-200 hover:text-white'].join(' ')}
    >
      {children}
    </button>
  )
}

function ConsultantProfileForm({ consultant, onUpdated }: { consultant: Consultant; onUpdated: (c: Consultant) => void }) {
  const [form, setForm] = useState({
    name: consultant.name,
    email: consultant.email,
    specialty: consultant.specialty || '',
    bio: consultant.bio || '',
    pricePerMinute: String(consultant.pricePerMinute || 1),
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setSaving(true)
    try {
      const token = localStorage.getItem('consultant-token')
      const r = await axios.patch(`${API}/consultants/me`,
        { ...form, pricePerMinute: Number(form.pricePerMinute) },
        { headers: { Authorization: `Bearer ${token}` } })
      onUpdated(r.data)
      localStorage.setItem('consultant', JSON.stringify(r.data))
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso.' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar' })
    } finally { setSaving(false) }
  }

  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-white mb-1">Perfil público</h2>
      <p className="text-ink-200/80 text-sm mb-6">
        Como os clientes te encontram. Capricha na bio — ela aparece no seu perfil público.
      </p>
      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} className="mb-5">{msg.text}</Alert>}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
        <Input label="Nome de exibição" name="name" value={form.name} onChange={onChange} required />
        <Input label="E-mail (privado)" type="email" name="email" value={form.email} onChange={onChange} required />
        <div className="sm:col-span-2">
          <Input label="Especialidade" name="specialty" value={form.specialty} onChange={onChange}
            placeholder="Ex.: Tarot dos Caminhos, Cartomancia, Astrologia" required />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Bio" name="bio" value={form.bio} onChange={onChange}
            placeholder="Conte um pouco sobre sua trajetória, especialidades e como você costuma atender."
            rows={6} hint="Dica: 2-3 parágrafos costumam funcionar bem." />
        </div>
        <Input label="Preço por minuto (R$)" type="number" name="pricePerMinute"
          value={form.pricePerMinute} onChange={onChange} min="0.5" step="0.5" required
          hint="Valor cobrado por minuto de consulta" />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={saving} size="lg">Salvar alterações</Button>
        </div>
      </form>
    </Card>
  )
}

function ConsultationsView({ items }: { items: ConsultationItem[] }) {
  const formatDuration = (mins: number) => {
    const total = Math.max(0, Math.round(Number(mins || 0) * 60))
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}min ${s.toString().padStart(2, '0')}s`
  }

  const totalEarnings = items
    .filter((c) => c.status === 'completed')
    .reduce((acc, c) => acc + Number(c.creditsUsed || 0), 0)

  const totalMinutes = items
    .filter((c) => c.status === 'completed')
    .reduce((acc, c) => acc + Number(c.minutesUsed || 0), 0)

  return (
    <Card className="p-7">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl text-white mb-1">Consultas realizadas</h2>
          <p className="text-ink-200/80 text-sm">Histórico de atendimentos e ganhos brutos.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="mystic">{items.length} consultas</Badge>
          <Badge variant="gold">R$ {totalEarnings.toFixed(2)} bruto</Badge>
          <Badge variant="neutral">{Math.round(totalMinutes)} min</Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-ink-200/70">
          <div className="text-4xl mb-2">🌙</div>
          Você ainda não realizou nenhuma consulta.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const date = c.startedAt || c.createdAt
            const isCompleted = c.status === 'completed'
            return (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{c.counterpartName || 'Cliente'}</div>
                  <div className="text-ink-300 text-xs mt-1">
                    {new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="mystic">{formatDuration(c.minutesUsed)}</Badge>
                  <Badge variant="gold">R$ {Number(c.creditsUsed || 0).toFixed(2)}</Badge>
                  <Badge variant={isCompleted ? 'success' : 'neutral'}>
                    {isCompleted ? 'Finalizada' : c.status}
                  </Badge>
                  <Link
                    href={`/consulta/finalizada/${c.id}?reason=ended&role=consultant`}
                    className="text-mystic-300 hover:text-white text-xs underline"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function ConsultantSecurityForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (form.newPassword.length < 6) { setMsg({ type: 'error', text: 'Nova senha deve ter ao menos 6 caracteres' }); return }
    if (form.newPassword !== form.confirm) { setMsg({ type: 'error', text: 'As senhas não coincidem' }); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('consultant-token')
      await axios.post(`${API}/consultants/me/change-password`,
        { currentPassword: form.currentPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${token}` } })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setMsg({ type: 'success', text: 'Senha alterada com sucesso.' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erro ao alterar senha' })
    } finally { setSaving(false) }
  }

  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-white mb-1">Segurança</h2>
      <p className="text-ink-200/80 text-sm mb-6">Atualize sua senha de acesso ao painel.</p>
      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} className="mb-5">{msg.text}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <Input label="Senha atual" type="password" name="currentPassword" value={form.currentPassword} onChange={onChange} required />
        <Input label="Nova senha" type="password" name="newPassword" value={form.newPassword} onChange={onChange} required hint="Mínimo 6 caracteres" />
        <Input label="Confirmar nova senha" type="password" name="confirm" value={form.confirm} onChange={onChange} required />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">Alterar senha</Button>
        </div>
      </form>
    </Card>
  )
}
