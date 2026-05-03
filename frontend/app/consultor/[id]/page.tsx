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

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  clientFirstName: string
}

interface Pricing {
  chat: number
  voice: number
  video: number
}

export default function ConsultantProfilePage() {
  const router = useRouter()
  const params = useParams()
  const consultantId = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [pricing, setPricing] = useState<Pricing | null>(null)
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
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}/reviews?limit=10`)
        .catch(() => ({ data: [] })),
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/pricing`)
        .catch(() => ({ data: { chat: 1, voice: 3, video: 5 } })),
    ])
      .then(([cRes, sRes, rRes, pRes]) => {
        setConsultant(cRes.data)
        if (sRes) setStats(sRes.data)
        setReviews(rRes.data || [])
        setPricing({
          chat: Number(pRes.data.chat),
          voice: Number(pRes.data.voice),
          video: Number(pRes.data.video),
        })
      })
      .catch(() => setError('Consultor não encontrado'))
      .finally(() => setLoading(false))
  }, [consultantId])

  if (loading) return <PageLoader label="Carregando perfil…" />
  if (error || !consultant) {
    return (
      <main className="min-h-screen bg-ink-900 flex items-center justify-center">
        <Card className="p-10 text-center">
          <p className="text-white mb-3">{error || 'Consultor não encontrado'}</p>
          <Link href="/dashboard" className="text-mystic-200 hover:text-white">
            ← Voltar
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink-900">
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
          <div className="h-32 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 relative" />

          <div className="px-6 sm:px-10 pb-8 -mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6">
              <Avatar
                name={consultant.name}
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
                  a partir de R$ {Number(pricing?.chat ?? consultant.pricePerMinute).toFixed(2)}
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

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="mt-8">
                <h2 className="text-white font-semibold mb-3">
                  Avaliações de clientes ({reviews.length})
                </h2>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gold-300 font-semibold text-sm">
                            {'★'.repeat(r.rating)}
                            <span className="text-ink-400/50">
                              {'★'.repeat(5 - r.rating)}
                            </span>
                          </span>
                          <span className="text-white text-sm truncate">
                            {r.clientFirstName}
                          </span>
                        </div>
                        <span className="text-ink-300 text-xs whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-ink-100/90 text-sm leading-relaxed">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action */}
            {isLoggedIn ? (
              consultant.isOnline ? (
                <div className="mt-10 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-ink-300">
                    Escolha o tipo de consulta
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <LinkButton
                      href={`/calling/${consultant.id}?kind=chat`}
                      variant="primary"
                      size="lg"
                      className="flex-col items-stretch text-left"
                    >
                      <span className="block font-semibold">💬 Chat</span>
                      <span className="block text-xs opacity-80 mt-1">
                        R$ {(pricing?.chat ?? 1).toFixed(2)}/min
                      </span>
                    </LinkButton>
                    <button
                      type="button"
                      onClick={() =>
                        alert('Voz estará disponível em breve (Fase 3 do WebRTC).')
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-colors px-5 py-4 text-left opacity-70 cursor-not-allowed"
                      disabled
                    >
                      <span className="block font-semibold text-white">🎙️ Voz</span>
                      <span className="block text-xs text-ink-300 mt-1">
                        R$ {(pricing?.voice ?? 3).toFixed(2)}/min · em breve
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        alert('Vídeo estará disponível em breve (Fase 5 do WebRTC).')
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-colors px-5 py-4 text-left opacity-70 cursor-not-allowed"
                      disabled
                    >
                      <span className="block font-semibold text-white">📹 Vídeo</span>
                      <span className="block text-xs text-ink-300 mt-1">
                        R$ {(pricing?.video ?? 5).toFixed(2)}/min · em breve
                      </span>
                    </button>
                  </div>
                  <LinkButton
                    href="/dashboard"
                    variant="outline"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    Ver outros consultores
                  </LinkButton>
                </div>
              ) : (
                <div className="mt-10 grid sm:grid-cols-2 gap-3">
                  <Button variant="ghost" size="lg" disabled>
                    Consultor(a) indisponível
                  </Button>
                  <LinkButton href="/dashboard" variant="outline" size="lg">
                    Ver outros consultores
                  </LinkButton>
                </div>
              )
            ) : (
              <div className="mt-10 grid sm:grid-cols-2 gap-3">
                <LinkButton href="/register" variant="primary" size="lg">
                  Criar conta para conversar
                </LinkButton>
                <LinkButton href="/#consultores" variant="outline" size="lg">
                  Ver outros consultores
                </LinkButton>
              </div>
            )}
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
