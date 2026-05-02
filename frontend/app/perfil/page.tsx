'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Navbar } from '../../components/Navbar'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  birthDate?: string | null
  credits: number
  createdAt?: string
}

interface CreditEntry {
  id: string
  amount: number
  type: string
  totalPrice: number
  status: string
  createdAt: string
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
  counterpartSpecialty?: string | null
}

interface TransactionItem {
  id: string
  packageId: string
  gross: number
  creditsAmount: number
  method: 'pix' | 'card'
  status: string
  gatewayId?: string | null
  createdAt: string
  creditedAt?: string | null
}

const API = process.env.NEXT_PUBLIC_API_URL

type Tab = 'profile' | 'security' | 'consultations' | 'history' | 'transactions'

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [history, setHistory] = useState<CreditEntry[]>([])
  const [consultations, setConsultations] = useState<ConsultationItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    const auth = { headers: { Authorization: `Bearer ${token}` } }

    Promise.all([
      axios.get(`${API}/users/me`, auth),
      axios.get(`${API}/users/me/credits/history`, auth).catch(() => ({ data: [] })),
      axios.get(`${API}/consultations`, auth).catch(() => ({ data: [] })),
      axios.get(`${API}/payments/transactions`, auth).catch(() => ({ data: [] })),
    ])
      .then(([uRes, hRes, cRes, tRes]) => {
        setUser(uRes.data)
        setHistory(hRes.data || [])
        setConsultations(cRes.data || [])
        setTransactions(tRes.data || [])
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading || !user) return <PageLoader label="Carregando seu perfil…" />

  return (
    <main className="min-h-screen bg-mystic-gradient">
      <Navbar variant="client" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card variant="elevated" className="p-7 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar name={user.name} size="2xl" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl text-white truncate">{user.name}</h1>
              <p className="text-ink-200/80 truncate">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="gold">{Number(user.credits).toFixed(0)} créditos</Badge>
                {user.createdAt && (
                  <Badge variant="neutral">
                    Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-1 mb-5 overflow-x-auto bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>Dados pessoais</TabBtn>
          <TabBtn active={tab === 'security'} onClick={() => setTab('security')}>Segurança</TabBtn>
          <TabBtn active={tab === 'consultations'} onClick={() => setTab('consultations')}>Consultas</TabBtn>
          <TabBtn active={tab === 'transactions'} onClick={() => setTab('transactions')}>Transações</TabBtn>
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>Créditos</TabBtn>
        </div>

        {tab === 'profile' && <ProfileForm user={user} onUpdated={(u) => setUser(u)} />}
        {tab === 'security' && <SecurityForm />}
        {tab === 'consultations' && <ConsultationsView items={consultations} />}
        {tab === 'transactions' && <TransactionsView items={transactions} />}
        {tab === 'history' && <HistoryView history={history} />}
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

function ProfileForm({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const r = await axios.patch(`${API}/users/me`, form, { headers: { Authorization: `Bearer ${token}` } })
      onUpdated(r.data)
      localStorage.setItem('user', JSON.stringify(r.data))
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso.' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar' })
    } finally { setSaving(false) }
  }

  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-white mb-1">Dados pessoais</h2>
      <p className="text-ink-200/80 text-sm mb-6">Atualize suas informações de cadastro.</p>
      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} className="mb-5">{msg.text}</Alert>}
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Nome completo" name="name" value={form.name} onChange={onChange} required />
        </div>
        <Input label="E-mail" type="email" name="email" value={form.email} onChange={onChange} required />
        <Input label="Telefone" type="tel" name="phone" value={form.phone} onChange={onChange} />
        <Input label="Data de nascimento" type="date" name="birthDate" value={form.birthDate} onChange={onChange} />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={saving} size="lg">Salvar alterações</Button>
        </div>
      </form>
    </Card>
  )
}

function SecurityForm() {
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
      const token = localStorage.getItem('token')
      await axios.post(`${API}/users/me/change-password`,
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
      <p className="text-ink-200/80 text-sm mb-6">Mantenha sua conta protegida com uma senha forte.</p>
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

function ConsultationsView({ items }: { items: ConsultationItem[] }) {
  const formatDuration = (mins: number) => {
    const total = Math.max(0, Math.round(Number(mins || 0) * 60))
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}min ${s.toString().padStart(2, '0')}s`
  }

  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-white mb-1">Suas consultas</h2>
      <p className="text-ink-200/80 text-sm mb-6">Histórico completo de atendimentos.</p>

      {items.length === 0 ? (
        <div className="py-12 text-center text-ink-200/70">
          <div className="text-4xl mb-2">🔮</div>
          Você ainda não realizou nenhuma consulta.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const date = c.startedAt || c.createdAt
            const isCompleted = c.status === 'completed'
            return (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">
                      {c.counterpartName || 'Consultor'}
                    </span>
                    {c.counterpartSpecialty && (
                      <span className="text-ink-300 text-xs">· {c.counterpartSpecialty}</span>
                    )}
                  </div>
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
                    href={`/consulta/finalizada/${c.id}?reason=ended`}
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

function TransactionsView({ items }: { items: TransactionItem[] }) {
  const statusBadge = (s: string): 'success' | 'mystic' | 'neutral' | 'gold' => {
    if (s === 'approved') return 'success'
    if (s === 'pending') return 'mystic'
    if (s === 'rejected' || s === 'cancelled') return 'neutral'
    if (s === 'refunded') return 'gold'
    return 'neutral'
  }
  const statusLabel = (s: string) =>
    ({ approved: 'Aprovado', pending: 'Pendente', rejected: 'Recusado', cancelled: 'Cancelado', refunded: 'Estornado' } as any)[s] || s

  return (
    <Card className="p-7">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl text-white">Transações</h2>
          <p className="text-ink-200/80 text-sm">Pagamentos via PIX e cartão (Mercado Pago).</p>
        </div>
        <Link href="/comprar-creditos" className="text-gold-300 hover:text-white text-sm underline">
          + Comprar créditos
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-ink-200/70 mt-4">
          <div className="text-4xl mb-2">💳</div>
          Você ainda não realizou nenhuma compra.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 mt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-300/80 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3">Data</th>
                <th className="text-left py-2 px-3">Forma</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-right py-2 px-3">Créditos</th>
                <th className="text-right py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-3 px-3 text-ink-100">
                    {new Date(t.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={t.method === 'pix' ? 'mystic' : 'gold'}>
                      {t.method === 'pix' ? 'PIX' : 'Cartão'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right text-ink-100 font-medium">
                    R$ {Number(t.gross).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300 font-medium">
                    +{t.creditsAmount}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant={statusBadge(t.status)}>{statusLabel(t.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function HistoryView({ history }: { history: CreditEntry[] }) {
  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-white mb-1">Histórico de créditos</h2>
      <p className="text-ink-200/80 text-sm mb-6">Suas compras e usos recentes.</p>

      {history.length === 0 ? (
        <div className="py-12 text-center text-ink-200/70">
          <div className="text-4xl mb-2">📭</div>
          Nenhum movimento ainda.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-300/80 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3">Data</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-right py-2 px-3">Quantidade</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-right py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-white/5">
                  <td className="py-3 px-3 text-ink-100">
                    {new Date(h.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={h.type === 'purchase' ? 'gold' : 'mystic'}>
                      {h.type === 'purchase' ? 'Compra' : 'Uso'}
                    </Badge>
                  </td>
                  <td className={`py-3 px-3 text-right font-medium ${Number(h.amount) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {Number(h.amount) >= 0 ? '+' : ''}{Number(h.amount).toFixed(0)}
                  </td>
                  <td className="py-3 px-3 text-right text-ink-100">
                    {Number(h.totalPrice) > 0 ? `R$ ${Number(h.totalPrice).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant={h.status === 'completed' ? 'success' : 'neutral'}>{h.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
