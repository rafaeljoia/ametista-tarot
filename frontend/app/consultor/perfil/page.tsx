'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ConsultantNavbar } from '../../../components/ConsultantNavbar'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { PageLoader } from '../../../components/ui/Spinner'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const API_BASE = API.replace(/\/api$/, '')

interface ConsultantMe {
  id: string
  name: string
  email: string
  specialty: string
  bio: string | null
  pricePerMinute: number
  commissionPercent: number
  rating: number
  totalConsultations: number
  isAvailable: boolean
  avatarUrl?: string | null
}

interface Stats {
  consultationsToday: number
  consultationsWeek: number
  consultationsMonth: number
  totalConsultations: number
  earningsToday: number
  earningsWeek: number
  earningsMonth: number
  totalEarnings: number
  rating: number
}

function avatarSrc(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export default function ConsultorPerfilReadOnlyPage() {
  const router = useRouter()
  const [me, setMe] = useState<ConsultantMe | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('consultant-token')
    if (!token) {
      router.push('/consultant-login')
      return
    }
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      axios.get(`${API}/consultants/me`, { headers }),
      axios.get(`${API}/consultants/me/stats`, { headers }).catch(() => ({ data: null })),
    ])
      .then(([m, s]) => {
        setMe(m.data)
        setStats(s.data)
      })
      .catch(() => router.push('/consultant-login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <PageLoader />
  if (!me) return null

  return (
    <div className="min-h-screen bg-ink-950">
      <ConsultantNavbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-white">Meu Perfil</h1>
          <Badge variant="gold">Somente leitura</Badge>
        </div>

        <Card>
          <div className="p-5 flex flex-col sm:flex-row gap-5 items-start">
            <div className="shrink-0">
              {me.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc(me.avatarUrl)}
                  alt={me.name}
                  className="w-28 h-28 rounded-full object-cover ring-2 ring-mystic-500/40"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-ink-700 ring-2 ring-mystic-500/40 flex items-center justify-center text-3xl text-ink-100">
                  {me.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-xl text-white font-display">{me.name}</h2>
              <p className="text-sm text-mystic-300">{me.specialty}</p>
              <p className="text-xs text-ink-300">{me.email}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge>{me.totalConsultations} consultas</Badge>
                <Badge>★ {Number(me.rating || 0).toFixed(1)}</Badge>
                <Badge variant="gold">
                  Comissão: {Number(me.commissionPercent || 0).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 space-y-2">
            <h3 className="text-sm uppercase tracking-wider text-ink-300">Bio</h3>
            <p className="text-ink-100 whitespace-pre-wrap leading-relaxed">
              {me.bio?.trim() || (
                <span className="text-ink-400 italic">
                  Nenhuma biografia cadastrada. O administrador pode editar este campo.
                </span>
              )}
            </p>
          </div>
        </Card>

        {stats && (
          <Card>
            <div className="p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-ink-300">
                Seus ganhos (já com comissão aplicada)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Hoje" value={stats.earningsToday} />
                <Stat label="Semana" value={stats.earningsWeek} />
                <Stat label="Mês" value={stats.earningsMonth} />
                <Stat label="Total" value={stats.totalEarnings} highlight />
              </div>
              <p className="text-[11px] text-ink-400 leading-snug">
                Os valores acima refletem apenas a sua parte (após o desconto da
                comissão da plataforma). O valor cheio cobrado do cliente não é
                exibido nesta tela.
              </p>
            </div>
          </Card>
        )}

        <p className="text-[11px] text-ink-400 text-center">
          Para alterar nome, especialidade, foto ou bio, fale com o administrador.
        </p>
      </main>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`p-3 rounded-xl border ${
        highlight
          ? 'bg-gold-500/10 border-gold-400/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-ink-300">{label}</p>
      <p
        className={`text-lg font-mono ${
          highlight ? 'text-gold-200' : 'text-white'
        }`}
      >
        R$ {Number(value || 0).toFixed(2)}
      </p>
    </div>
  )
}
