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
}

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
    socket.on('call-started', (data: { consultationId: string; clientId: string }) => {
      setStatus('in-call'); setIncomingCall(null)
      if (bellInterval.current) clearInterval(bellInterval.current)
      router.push(`/consultant-chat/${data.consultationId}?clientId=${data.clientId}`)
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
    <main className="min-h-screen bg-mystic-gradient">
      <Navbar variant="consultant" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Status header */}
        <div className="grid lg:grid-cols-3 gap-5 mb-8">
          <Card variant="elevated" className="lg:col-span-2 p-7">
            <p className="text-ink-200/80 text-sm">Olá,</p>
            <h1 className="font-display text-3xl text-white mt-1">{consultant?.name?.split(' ')[0]} 🔮</h1>
            <p className="text-ink-200/80 mt-2">
              {status === 'in-call'
                ? 'Você está em atendimento.'
                : connected
                  ? 'Você está online e visível para os clientes.'
                  : 'Reconectando...'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {connected ? (
                <Badge variant="success" pulse>Online</Badge>
              ) : (
                <Badge variant="danger">Reconectando…</Badge>
              )}
              {status === 'in-call' && <Badge variant="gold">Em atendimento</Badge>}
            </div>
          </Card>

          <Card variant="gold" className="p-7">
            <p className="text-ink-100/80 text-xs uppercase tracking-wider">Avaliação</p>
            <p className="font-display text-4xl text-gradient-gold mt-1">
              ★ {Number(stats?.rating ?? 5).toFixed(1)}
            </p>
            <p className="text-ink-200/80 text-sm mt-1">
              {stats?.totalConsultations || 0} consultas no total
            </p>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Consultas hoje" value={stats?.consultationsToday ?? 0} accent="mystic" />
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
            <h2 className="font-display text-xl text-white">Últimas consultas</h2>
            <Badge variant="neutral">{stats?.recentConsultations?.length || 0} recentes</Badge>
          </div>

          {!stats?.recentConsultations?.length ? (
            <div className="py-10 text-center text-ink-200/70">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">Nenhuma consulta concluída ainda.</p>
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
          <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-mystic-500/30 to-mystic-700/20 border border-mystic-400/40 flex items-center justify-center animate-pulse-ring">
            <span className="text-4xl">📞</span>
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
