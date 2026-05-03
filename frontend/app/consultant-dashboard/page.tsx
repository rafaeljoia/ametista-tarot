'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Navbar } from '../../components/Navbar'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface Consultant {
  id: string
  name: string
  specialty: string
  isAvailable: boolean
  rating?: number
  availabilityStatus?: AvailabilityStatus
}

type AvailabilityStatus = 'online' | 'busy' | 'in_consultation' | 'offline'

interface IncomingCall {
  callId: string
  clientId: string
  clientName: string
}

interface Stats {
  consultationsToday: number
  consultationsWeek: number
  consultationsMonth: number
  totalConsultations: number
  earningsToday: number
  earningsWeek: number
  earningsMonth: number
  rating: number
  recentConsultations: {
    id: string
    startedAt: string
    endedAt: string | null
    minutesUsed: number
    creditsUsed: number
  }[]
}

function playBell() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.5, 1.0].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4)
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.4)
    })
  } catch {}
}

export default function ConsultantDashboardPage() {
  const router = useRouter()
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [connected, setConnected] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState<'waiting' | 'in-call'>('waiting')

  const [myStatus, setMyStatus] = useState<AvailabilityStatus>('online')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusToast, setStatusToast] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const bellInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('consultant-token')
    const consultantData = localStorage.getItem('consultant')
    if (!token || !consultantData) { router.push('/consultant-login'); return }

    const parsed = JSON.parse(consultantData)
    setConsultant(parsed)
    fetchStats(token)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace(/\/api$/, '')

    // Revalidate consultant (incl. availabilityStatus) from server.
    axios
      .get(`${apiUrl}/consultants/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        setConsultant(r.data)
        localStorage.setItem('consultant', JSON.stringify(r.data))
        const s = (r.data?.availabilityStatus as AvailabilityStatus) || 'online'
        setMyStatus(s)
      })
      .catch(() => {})

    const socket = io(baseUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('consultant-online', { consultantId: parsed.id })
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('incoming-call', (data: IncomingCall) => {
      setIncomingCall(data); playBell()
      bellInterval.current = setInterval(playBell, 3000)
    })
    socket.on('call-cancelled', () => {
      setIncomingCall(null)
      if (bellInterval.current) clearInterval(bellInterval.current)
    })
    socket.on('call-started', (data: { consultationId: string; clientId: string; kind?: 'chat' | 'voice' | 'video' }) => {
      setStatus('in-call'); setIncomingCall(null)
      setMyStatus('in_consultation')
      if (bellInterval.current) clearInterval(bellInterval.current)
      // Roteia conforme tipo de atendimento. Chat → tela legacy; voz/vídeo → /consultant-call
      if (data.kind === 'voice' || data.kind === 'video') {
        router.push(`/consultant-call/${data.consultationId}?kind=${data.kind}&clientId=${data.clientId}`)
      } else {
        router.push(`/consultant-chat/${data.consultationId}?clientId=${data.clientId}`)
      }
    })

    // Server forced this session out (e.g. 20min in 'busy' → auto-logout).
    socket.on('force-logout', (data: { reason?: string; message?: string }) => {
      try { socket.disconnect() } catch {}
      localStorage.removeItem('consultant-token')
      localStorage.removeItem('consultant')
      const msg = encodeURIComponent(data?.message || 'Sessão encerrada.')
      router.push(`/consultant-login?notice=${msg}`)
    })

    socketRef.current = socket

    return () => {
      if (bellInterval.current) clearInterval(bellInterval.current)
      socket.disconnect()
    }
  }, [router])

  const fetchStats = async (token: string) => {
    try {
      const r = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/me/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setStats(r.data)
    } catch (e) {
      console.error('stats error', e)
    }
  }

  const handleChangeStatus = async (next: 'online' | 'busy') => {
    if (myStatus === 'in_consultation') {
      setStatusToast('Você está em atendimento. O status muda automaticamente ao fim da atendimento.')
      setTimeout(() => setStatusToast(null), 3500)
      return
    }
    if (next === myStatus) return
    const token = localStorage.getItem('consultant-token')
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    setStatusSaving(true)
    const prev = myStatus
    setMyStatus(next) // optimistic
    try {
      await axios.patch(
        `${apiUrl}/consultants/me/status`,
        { status: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setStatusToast(
        next === 'busy'
          ? 'Status: Ocupado. Após 20 min sem mudança, sua sessão será encerrada.'
          : 'Status: Online — você está visível para os clientes.',
      )
      setTimeout(() => setStatusToast(null), 3500)
    } catch {
      setMyStatus(prev) // revert
      setStatusToast('Falha ao atualizar status. Tente novamente.')
      setTimeout(() => setStatusToast(null), 3500)
    } finally {
      setStatusSaving(false)
    }
  }

  const handleAccept = () => {
    if (!incomingCall || !consultant || !socketRef.current) return
    if (bellInterval.current) clearInterval(bellInterval.current)
    socketRef.current.emit('accept-call', {
      callId: incomingCall.callId,
      clientId: incomingCall.clientId,
      consultantId: consultant.id,
    })
  }
  const handleDecline = () => {
    if (!incomingCall || !socketRef.current) return
    if (bellInterval.current) clearInterval(bellInterval.current)
    socketRef.current.emit('decline-call', {
      callId: incomingCall.callId,
      clientId: incomingCall.clientId,
    })
    setIncomingCall(null)
  }

  return (
    <main className="min-h-screen bg-ink-900">
      <Navbar variant="consultant" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Status header */}
        <div className="grid lg:grid-cols-3 gap-5 mb-8">
          <Card variant="elevated" className="lg:col-span-2 p-7">
            <p className="text-ink-300 text-sm">Painel do consultor</p>
            <h1 className="font-display text-3xl text-white mt-1 tracking-tight">Olá, {consultant?.name?.split(' ')[0]}</h1>
            <p className="text-ink-200/80 mt-2">
              {status === 'in-call'
                ? 'Você está em atendimento.'
                : connected
                  ? 'Você está online e visível para os clientes.'
                  : 'Reconectando...'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!connected ? (
                <Badge variant="danger">Reconectando…</Badge>
              ) : myStatus === 'in_consultation' ? (
                <Badge variant="gold" pulse>Em atendimento</Badge>
              ) : myStatus === 'busy' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-200 border border-amber-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  Ocupado
                </span>
              ) : (
                <Badge variant="success" pulse>Online</Badge>
              )}
            </div>

            {/* Status switcher */}
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-xs uppercase tracking-wider text-ink-300/80 mb-3">
                Definir disponibilidade
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeStatus('online')}
                  disabled={statusSaving || myStatus === 'in_consultation'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    myStatus === 'online'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-white/[0.02] border-white/10 text-ink-200 hover:bg-white/[0.05]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus('busy')}
                  disabled={statusSaving || myStatus === 'in_consultation'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    myStatus === 'busy'
                      ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                      : 'bg-white/[0.02] border-white/10 text-ink-200 hover:bg-white/[0.05]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Ocupado
                </button>
                <div
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    myStatus === 'in_consultation'
                      ? 'bg-mystic-500/15 border-mystic-400/40 text-mystic-100'
                      : 'bg-white/[0.02] border-white/10 text-ink-300/60'
                  }`}
                  title="Definido automaticamente quando você atende uma chamada"
                >
                  Em atendimento (auto)
                </div>
              </div>
              {myStatus === 'busy' && (
                <p className="text-xs text-amber-200/80 mt-3">
                  Ocupado por mais de 20 minutos sem mudança encerra sua sessão automaticamente.
                </p>
              )}
              {statusToast && (
                <p className="text-xs text-ink-200 mt-3">{statusToast}</p>
              )}
            </div>
          </Card>

          <Card variant="gold" className="p-7">
            <p className="text-ink-100/80 text-xs uppercase tracking-wider">Avaliação</p>
            <p className="font-display text-4xl text-gradient-gold mt-1">
              ★ {Number(stats?.rating ?? 5).toFixed(1)}
            </p>
            <p className="text-ink-200/80 text-sm mt-1">
              {stats?.totalConsultations || 0} atendimentos no total
            </p>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Atendimentos hoje" value={stats?.consultationsToday ?? 0} accent="mystic" />
          <StatCard label="Esta semana" value={stats?.consultationsWeek ?? 0} accent="mystic" />
          <StatCard label="Este mês" value={stats?.consultationsMonth ?? 0} accent="mystic" />
          <StatCard
            label="Créditos no mês"
            value={`${Number(stats?.earningsMonth ?? 0).toFixed(0)}`}
            accent="gold"
          />
        </div>

        {/* History */}
        <Card variant="elevated" className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl text-white">Últimas atendimentos</h2>
            <Badge variant="neutral">{stats?.recentConsultations?.length || 0} recentes</Badge>
          </div>

          {!stats?.recentConsultations?.length ? (
            <div className="py-10 text-center text-ink-300">
              <p className="text-sm">Nenhuma atendimento concluída ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-300/80 text-xs uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Data</th>
                    <th className="text-left py-2 px-3">Início</th>
                    <th className="text-right py-2 px-3">Duração</th>
                    <th className="text-right py-2 px-3">Créditos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentConsultations.map((c) => (
                    <tr key={c.id} className="border-t border-white/5">
                      <td className="py-3 px-3 text-ink-100">
                        {new Date(c.startedAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 text-ink-100">
                        {new Date(c.startedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right text-ink-100">
                        {Number(c.minutesUsed).toFixed(1)} min
                      </td>
                      <td className="py-3 px-3 text-right text-gold-300 font-semibold">
                        {Number(c.creditsUsed).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!incomingCall} onClose={handleDecline} size="sm" hideClose>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-mystic-200">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 ring-2 ring-ink-900" />
            </span>
          </div>
          <h3 className="font-display text-2xl text-white mb-1">Chamada recebida</h3>
          <p className="text-ink-200 mb-6">
            <span className="text-mystic-200 font-semibold">{incomingCall?.clientName}</span> quer
            falar com você
          </p>
          <div className="flex gap-3">
            <Button variant="danger" fullWidth size="lg" onClick={handleDecline}>
              Recusar
            </Button>
            <Button variant="success" fullWidth size="lg" onClick={handleAccept}>
              Atender
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  )
}

function StatCard({
  label,
  value,
  accent = 'mystic',
}: {
  label: string
  value: number | string
  accent?: 'mystic' | 'gold'
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-ink-300/80">{label}</p>
      <p
        className={`font-display text-3xl mt-1 ${
          accent === 'gold' ? 'text-gradient-gold' : 'text-white'
        }`}
      >
        {value}
      </p>
    </Card>
  )
}
