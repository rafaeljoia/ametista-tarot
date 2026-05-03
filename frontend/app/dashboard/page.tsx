'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Navbar } from '../../components/Navbar'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button, LinkButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'

interface Consultant {
  id: string
  name: string
  specialty: string
  rating: number
  pricePerMinute: number
  isAvailable: boolean
  consultationsCount: number
  isOnline?: boolean
}

interface User {
  id: string
  name: string
  email: string
  credits: number
}

type FilterMode = 'all' | 'online'
type SortMode = 'rating' | 'price-asc' | 'price-desc' | 'consultations'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sort, setSort] = useState<SortMode>('rating')
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set())
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    if (userData) setUser(JSON.parse(userData))

    // Always revalidate user (credits, name, etc.) from the server.
    axios
      .get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        setUser(r.data)
        localStorage.setItem('user', JSON.stringify(r.data))
      })
      .catch(() => {})

    fetchConsultants(token)
    fetchActiveAlerts(token)
    connectPresence(token)

    return () => { socketRef.current?.disconnect() }
  }, [router])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const fetchConsultants = async (token: string) => {
    try {
      const [list, online] = await Promise.all([
        axios.get(`${API}/consultants`, { headers: { Authorization: `Bearer ${token}` } }),
        axios
          .get(`${API}/consultants/online`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: { ids: [] } })),
      ])
      const onlineIds: string[] = online.data.ids || []
      setConsultants(
        (list.data || []).map((c: Consultant) => ({ ...c, isOnline: onlineIds.includes(c.id) })),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveAlerts = async (token: string) => {
    try {
      const r = await axios.get(`${API}/consultants/me/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const ids: string[] = r.data?.consultantIds || []
      setAlertedIds(new Set(ids))
    } catch {
      // silencia: a UI ainda funciona via estado local conforme o usuário interage.
    }
  }

  const connectPresence = (token: string) => {
    const baseUrl = API.replace(/\/api$/, '')
    const socket = io(baseUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => socket.emit('get-online-consultants'))
    socket.on('online-consultants', ({ ids }: { ids: string[] }) => {
      setConsultants((prev) => prev.map((c) => ({ ...c, isOnline: ids.includes(c.id) })))
    })
    socket.on('consultant-status', ({ consultantId, isOnline }: { consultantId: string; isOnline: boolean }) => {
      setConsultants((prev) => prev.map((c) => (c.id === consultantId ? { ...c, isOnline } : c)))
      if (isOnline) {
        // Se eu tinha alerta ativo, remove (foi notificado server-side).
        setAlertedIds((prev) => {
          if (!prev.has(consultantId)) return prev
          const next = new Set(prev)
          next.delete(consultantId)
          return next
        })
      }
    })

    socketRef.current = socket
  }

  const requestNotifyMe = useCallback(async (consultantId: string) => {
    setPendingAlertId(consultantId)
    try {
      const token = localStorage.getItem('token')
      const r = await axios.post(
        `${API}/consultants/${consultantId}/notify-me`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (r.data?.alreadyOnline) {
        setToast('Esse consultor já está online. Inicie a chamada agora.')
      } else if (r.data?.alreadyActive) {
        setAlertedIds((prev) => new Set(prev).add(consultantId))
        setToast('Você já tem um aviso ativo para esse consultor.')
      } else {
        setAlertedIds((prev) => new Set(prev).add(consultantId))
        setToast('Avisaremos por e-mail quando ele(a) ficar disponível.')
      }
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Não foi possível registrar o aviso.')
    } finally {
      setPendingAlertId(null)
    }
  }, [])

  const filtered = useMemo(() => {
    let list = [...consultants]
    if (filter === 'online') list = list.filter((c) => c.isOnline)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.specialty || '').toLowerCase().includes(q),
      )
    }
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => Number(a.pricePerMinute) - Number(b.pricePerMinute))
        break
      case 'price-desc':
        list.sort((a, b) => Number(b.pricePerMinute) - Number(a.pricePerMinute))
        break
      case 'consultations':
        list.sort((a, b) => b.consultationsCount - a.consultationsCount)
        break
      default:
        list.sort((a, b) => Number(b.rating) - Number(a.rating))
    }
    list.sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
    return list
  }, [consultants, filter, search, sort])

  if (loading) return <PageLoader label="Buscando consultores..." />

  const onlineCount = consultants.filter((c) => c.isOnline).length

  return (
    <main className="min-h-screen bg-ink-900">
      <Navbar variant="client" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-5 mb-10">
          <Card variant="elevated" className="lg:col-span-2 p-7">
            <p className="text-ink-300 text-sm">Bem-vinda(o) de volta</p>
            <h1 className="font-display text-3xl text-white mt-1 tracking-tight">Olá, {user?.name?.split(' ')[0]}</h1>
            <p className="text-ink-200/80 mt-2 max-w-xl">
              Escolha um(a) consultor(a) abaixo para iniciar sua atendimento.
              {onlineCount > 0 && (
                <>
                  {' '}
                  <span className="text-emerald-300 font-medium">{onlineCount}</span>{' '}
                  online agora.
                </>
              )}
            </p>
          </Card>

          <Card variant="gold" className="p-7 flex flex-col justify-between">
            <div>
              <p className="text-ink-100/80 text-xs uppercase tracking-wider">Seu saldo</p>
              <p className="font-display text-3xl text-gradient-gold mt-1">
                {Number(user?.credits ?? 0).toFixed(0)}
                <span className="text-base text-ink-200/80 ml-1">créditos</span>
              </p>
            </div>
            <LinkButton href="/comprar-creditos" variant="gold" className="mt-5" fullWidth>
              + Comprar créditos
            </LinkButton>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou especialidade…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                }
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                Todos
              </FilterChip>
              <FilterChip active={filter === 'online'} onClick={() => setFilter('online')}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5" /> Online ({onlineCount})
              </FilterChip>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="px-3 py-2.5 bg-ink-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-mystic-400"
            >
              <option value="rating">Melhor avaliação</option>
              <option value="consultations">Mais atendimentos</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-14 text-center">
            <p className="text-white font-medium">Nenhum consultor encontrado</p>
            <p className="text-ink-300 text-sm mt-1">Tente ajustar os filtros ou buscar por outro termo.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <ConsultantCard
                key={c.id}
                c={c}
                hasCredits={Number(user?.credits ?? 0) > 0}
                alerted={alertedIds.has(c.id)}
                pendingAlert={pendingAlertId === c.id}
                onNotifyMe={() => requestNotifyMe(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-900/95 border border-white/10 text-white px-5 py-3 rounded-xl shadow-2xl text-sm max-w-md text-center">
          {toast}
        </div>
      )}
    </main>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3.5 py-2 rounded-xl text-sm border transition flex items-center',
        active
          ? 'bg-mystic-500/20 border-mystic-400/60 text-white'
          : 'bg-white/5 border-white/10 text-ink-200 hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function ConsultantCard({
  c,
  hasCredits,
  alerted,
  pendingAlert,
  onNotifyMe,
}: {
  c: Consultant
  hasCredits: boolean
  alerted: boolean
  pendingAlert: boolean
  onNotifyMe: () => void
}) {
  return (
    <Card hoverable className="p-6 flex flex-col">
      <div className="flex items-start gap-4">
        <Avatar name={c.name} size="lg" online={c.isOnline} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold truncate">{c.name}</h3>
            {c.isOnline ? (
              <Badge variant="success" pulse>Online</Badge>
            ) : (
              <Badge variant="neutral">Offline</Badge>
            )}
          </div>
          <p className="text-mystic-300 text-sm truncate">{c.specialty}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-ink-300">
            <span className="text-gold-300">★ {Number(c.rating).toFixed(1)}</span>
            <span>·</span>
            <span>{c.consultationsCount} atendimentos</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="text-sm text-ink-200/80">Tarifa</span>
        <span className="font-display text-lg text-gradient-gold">
          R$ {Number(c.pricePerMinute).toFixed(2)}
          <span className="text-xs text-ink-300 ml-1">/min</span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <LinkButton href={`/consultor/${c.id}`} variant="outline" size="sm">Perfil</LinkButton>
        {c.isOnline ? (
          <LinkButton
            href={hasCredits ? `/calling/${c.id}` : '/comprar-creditos'}
            variant="primary"
            size="sm"
          >
            {hasCredits ? 'Iniciar chamada' : 'Comprar créditos'}
          </LinkButton>
        ) : alerted ? (
          <Button variant="ghost" size="sm" disabled>
            Aviso ativo
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onNotifyMe}
            loading={pendingAlert}
          >
            Avise-me
          </Button>
        )}
      </div>
    </Card>
  )
}
