'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { LinkButton, Button } from '../../../components/ui/Button'
import { PageLoader } from '../../../components/ui/Spinner'

interface Consultant {
  id: string
  name: string
  specialty: string
  bio: string
  rating: number
  pricePerMinute: number
  isAvailable: boolean
  consultationsCount: number
  isOnline?: boolean
}

interface Stats {
  consultationsMonth: number
  totalConsultations: number
  rating: number
}

export default function ConsultantProfilePage() {
  const router = useRouter()
  const params = useParams()
  const consultantId = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)

    Promise.all([
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}/stats`)
        .catch(() => null),
    ])
      .then(([cRes, sRes]) => {
        setConsultant(cRes.data)
        if (sRes) setStats(sRes.data)
      })
      .catch(() => setError('Consultor não encontrado'))
      .finally(() => setLoading(false))
  }, [consultantId])

  if (loading) return <PageLoader label="Carregando perfil…" />
  if (error || !consultant) {
    return (
      <main className="min-h-screen bg-mystic-gradient flex items-center justify-center">
        <Card className="p-10 text-center">
          <div className="text-5xl mb-3">🔮</div>
          <p className="text-white mb-3">{error || 'Consultor não encontrado'}</p>
          <Link href="/dashboard" className="text-mystic-200 hover:text-white">
            ← Voltar
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-mystic-gradient">
      <Navbar variant={isLoggedIn ? 'client' : 'public'} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href={isLoggedIn ? '/dashboard' : '/'}
          className="inline-flex items-center text-ink-200 hover:text-white text-sm mb-5"
        >
          ← Voltar
        </Link>

        <Card variant="elevated" className="overflow-hidden">
          {/* Cover */}
          <div className="h-44 bg-gradient-to-br from-mystic-700 via-mystic-500 to-gold-500 relative">
            <div className="absolute inset-0 opacity-30 starfield" />
          </div>

          <div className="px-6 sm:px-10 pb-8 -mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6">
              <Avatar
                name={consultant.name}
                emoji="🔮"
                size="2xl"
                online={consultant.isOnline}
                className="ring-4 ring-ink-900"
              />
              <div className="mt-4 sm:mt-0 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {consultant.isOnline ? (
                    <Badge variant="success" pulse>Online agora</Badge>
                  ) : (
                    <Badge variant="neutral">Offline</Badge>
                  )}
                  <Badge variant="gold">★ {Number(consultant.rating).toFixed(1)}</Badge>
                </div>
                <h1 className="font-display text-3xl text-white truncate">{consultant.name}</h1>
                <p className="text-mystic-300">{consultant.specialty}</p>
              </div>
              <div className="mt-5 sm:mt-0 sm:text-right">
                <p className="text-xs text-ink-300 uppercase tracking-wider">Tarifa</p>
                <p className="font-display text-2xl text-gradient-gold">
                  R$ {Number(consultant.pricePerMinute).toFixed(2)}
                  <span className="text-sm text-ink-200/80">/min</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-8">
              <MiniStat label="Consultas" value={stats?.totalConsultations ?? consultant.consultationsCount} />
              <MiniStat label="Este mês" value={stats?.consultationsMonth ?? 0} />
              <MiniStat label="Avaliação" value={`★ ${Number(consultant.rating).toFixed(1)}`} accent="gold" />
            </div>

            {/* Bio */}
            {consultant.bio && (
              <div className="mt-8">
                <h2 className="text-white font-semibold mb-2">Sobre mim</h2>
                <p className="text-ink-100/90 leading-relaxed whitespace-pre-line">{consultant.bio}</p>
              </div>
            )}

            {/* Action */}
            <div className="mt-10 grid sm:grid-cols-2 gap-3">
              {isLoggedIn ? (
                consultant.isOnline ? (
                  <LinkButton href={`/calling/${consultant.id}`} variant="primary" size="lg">
                    📞 Iniciar chamada
                  </LinkButton>
                ) : (
                  <Button variant="ghost" size="lg" disabled>
                    Consultor(a) indisponível
                  </Button>
                )
              ) : (
                <LinkButton href="/register" variant="primary" size="lg">
                  Criar conta para conversar
                </LinkButton>
              )}
              <LinkButton
                href={isLoggedIn ? '/dashboard' : '/#consultores'}
                variant="outline"
                size="lg"
              >
                Ver outros consultores
              </LinkButton>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'gold'
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center">
      <p
        className={`font-display text-xl ${
          accent === 'gold' ? 'text-gradient-gold' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-ink-300 mt-0.5">{label}</p>
    </div>
  )
}
