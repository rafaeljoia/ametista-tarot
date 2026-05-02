'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Badge } from '../../../../components/ui/Badge'
import { PageLoader } from '../../../../components/ui/Spinner'
import { ReviewForm } from '../../../../components/ReviewForm'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface ConsultationDetail {
  id: string
  status: string
  minutesUsed: number
  creditsUsed: number
  startedAt?: string
  endedAt?: string
  consultant?: {
    id: string
    name: string
    specialty: string
    pricePerMinute: number
  } | null
  client?: { id: string; name: string } | null
}

const REASON_LABEL: Record<string, string> = {
  'user-ended': 'Você encerrou a consulta',
  'consultant-ended': 'Encerrada pelo consultor',
  'out-of-credits': 'Créditos esgotados',
  ended: 'Consulta finalizada',
}

export default function ConsultaFinalizadaPage() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const id = params.id as string
  const reason = search.get('reason') || 'ended'
  const role = search.get('role') === 'consultant' ? 'consultant' : 'user'

  const [data, setData] = useState<ConsultationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token =
      role === 'consultant'
        ? localStorage.getItem('consultant-token')
        : localStorage.getItem('token')

    if (!token) {
      router.push(role === 'consultant' ? '/consultant-login' : '/login')
      return
    }

    axios
      .get(`${API}/consultations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setData(r.data))
      .catch((err) => {
        setError(err.response?.data?.message || 'Não foi possível carregar a consulta.')
      })
      .finally(() => setLoading(false))
  }, [id, role, router])

  if (loading) return <PageLoader label="Carregando resumo…" />

  const formatDuration = (mins: number) => {
    const total = Math.max(0, Math.round(mins * 60))
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}min ${s.toString().padStart(2, '0')}s`
  }

  return (
    <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Card variant="elevated" className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-mystic-500/15 border border-mystic-400/30 flex items-center justify-center text-mystic-200">
            {reason === 'out-of-credits' ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </div>
          <h1 className="font-display text-3xl text-white tracking-tight">Consulta finalizada</h1>
          <p className="text-ink-200 mt-2">{REASON_LABEL[reason] || REASON_LABEL.ended}</p>

          {error && <p className="text-red-300 mt-4">{error}</p>}

          {data && (
            <>
              <div className="mt-7 grid grid-cols-2 gap-3 text-left">
                <Stat label="Tempo">
                  {formatDuration(Number(data.minutesUsed || 0))}
                </Stat>
                <Stat label={role === 'consultant' ? 'Receita bruta' : 'Total cobrado'}>
                  R$ {Number(data.creditsUsed || 0).toFixed(2)}
                </Stat>
                {role === 'user' && data.consultant && (
                  <>
                    <Stat label="Consultor" full>
                      <div className="font-display text-lg text-white">
                        {data.consultant.name}
                      </div>
                      <div className="text-ink-300 text-xs">
                        {data.consultant.specialty}
                      </div>
                    </Stat>
                  </>
                )}
                {role === 'consultant' && data.client && (
                  <Stat label="Cliente" full>
                    <div className="font-display text-lg text-white">
                      {data.client.name}
                    </div>
                  </Stat>
                )}
                <Stat label="Status" full>
                  <Badge variant="success">Finalizada</Badge>
                </Stat>
              </div>

              {role === 'user' && data.status === 'completed' && (
                <div className="mt-8">
                  <ReviewForm
                    consultationId={data.id}
                    consultantName={data.consultant?.name}
                  />
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                {role === 'user' && data.consultant && (
                  <Link href={`/consultor/${data.consultant.id}`}>
                    <Button variant="ghost">Ver consultor novamente</Button>
                  </Link>
                )}
                <Link
                  href={role === 'consultant' ? '/consultor/perfil' : '/perfil'}
                >
                  <Button variant="ghost">Ver histórico</Button>
                </Link>
                <Link
                  href={role === 'consultant' ? '/consultant-dashboard' : '/dashboard'}
                >
                  <Button>Voltar ao painel</Button>
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

function Stat({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl border border-white/10 bg-white/5 px-4 py-3',
        full ? 'col-span-2' : '',
      ].join(' ')}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-300">
        {label}
      </div>
      <div className="text-white text-lg font-medium mt-0.5">{children}</div>
    </div>
  )
}
