'use client'

/**
 * Tela de chamada do CONSULTOR para voz/vídeo.
 * Diferenças da /call/[id]:
 *  - Auth com consultant-token / consultant
 *  - role='callee' (espera offer)
 *  - Sem botão "Encerrar" (regra: só cliente encerra a atendimento)
 *  - Mostra apenas ganho LÍQUIDO do consultor (consultantEarnings do tick)
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Badge } from '../../../components/ui/Badge'
import { useCall } from '../../../lib/webrtc/use-call'
import type { CallKind } from '../../../lib/webrtc/peer-connection'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const SOCKET_URL = API.replace(/\/api$/, '')

function formatMMSS(s: number) {
  const v = Math.max(0, Math.floor(s))
  return `${Math.floor(v / 60).toString().padStart(2, '0')}:${(v % 60).toString().padStart(2, '0')}`
}

export default function ConsultantCallPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const consultationId = params.id as string
  const kind: CallKind =
    (searchParams.get('kind') as CallKind) === 'video' ? 'video' : 'voice'

  const [socket, setSocket] = useState<Socket | null>(null)
  const [token, setToken] = useState('')
  const [connected, setConnected] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [earned, setEarned] = useState(0)
  const startedAtRef = useRef<number>(Date.now())
  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const t = localStorage.getItem('consultant-token')
    const data = localStorage.getItem('consultant')
    if (!t || !data) {
      router.push('/consultant-login')
      return
    }
    setToken(t)

    const s = io(SOCKET_URL, {
      path: '/api/socket.io',
      auth: { token: t },
      transports: ['websocket', 'polling'],
    })
    s.on('connect', () => {
      setConnected(true)
      const c = JSON.parse(data)
      s.emit('consultant-online', { consultantId: c.id })
      s.emit('join-consultation', { userId: c.id, consultationId })
    })
    s.on('disconnect', () => setConnected(false))
    s.on('billing-tick-consultant', (d: any) => {
      if (typeof d.consultantEarnings === 'number') setEarned(d.consultantEarnings)
    })
    s.on('consultation-ended', () => router.push('/consultant-dashboard'))
    setSocket(s)

    axios
      .get(`${API}/consultations/${consultationId}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      .then((r) => {
        if (r.data?.startedAt) {
          startedAtRef.current = new Date(r.data.startedAt).getTime()
        }
        // creditsUsed já vem net (backend transforma para consultor).
        if (typeof r.data?.creditsUsed === 'number') setEarned(r.data.creditsUsed)
      })
      .catch(() => {})

    return () => {
      s.disconnect()
    }
  }, [consultationId, router])

  useEffect(() => {
    const t = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    )
    return () => clearInterval(t)
  }, [])

  const call = useCall({
    socket,
    consultationId,
    kind,
    role: 'callee',
    authToken: token,
  })

  useEffect(() => {
    if (remoteRef.current && call.remoteStream) {
      remoteRef.current.srcObject = call.remoteStream
    }
  }, [call.remoteStream])
  useEffect(() => {
    if (localRef.current && call.localStream) {
      localRef.current.srcObject = call.localStream
    }
  }, [call.localStream])

  const statusLabel: Record<string, string> = {
    idle: 'Iniciando…',
    initializing: 'Pedindo microfone…',
    'waiting-offer': 'Aguardando cliente…',
    connecting: 'Conectando…',
    connected: 'Conectado',
    failed: 'Falha na conexão',
    ended: 'Encerrada',
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <header className="bg-ink-900/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-white font-display text-lg">
              {kind === 'video' ? 'Vídeo' : 'Voz'} · Cliente
            </p>
            <p className="text-xs text-ink-300">
              {statusLabel[call.status]} {connected ? '· socket ok' : '· reconectando…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="gold">Ganho: R$ {earned.toFixed(2)}</Badge>
            <span className="font-mono text-lg text-gold-300 tabular-nums">
              {formatMMSS(seconds)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        {kind === 'video' ? (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-2xl bg-black ring-1 ring-white/10"
            />
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-6 right-6 w-32 h-44 rounded-xl bg-black ring-1 ring-white/20 object-cover"
            />
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-32 h-32 rounded-full bg-mystic-600/40 mx-auto flex items-center justify-center animate-pulse">
              <span className="text-4xl">🎧</span>
            </div>
            <p className="text-white font-display text-xl">
              {call.status === 'connected' ? 'Em atendimento' : 'Conectando…'}
            </p>
            <audio ref={remoteRef as any} autoPlay playsInline className="hidden" />
          </div>
        )}
      </div>

      <footer className="bg-ink-900/80 backdrop-blur border-t border-white/10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          <Ctrl onClick={call.toggleMic} active={call.micEnabled}>
            {call.micEnabled ? '🎤' : '🔇'}
          </Ctrl>
          {kind === 'video' && (
            <Ctrl onClick={call.toggleCamera} active={call.cameraEnabled}>
              {call.cameraEnabled ? '📹' : '📷'}
            </Ctrl>
          )}
          <p className="text-xs text-ink-400 ml-3">
            Apenas o cliente pode encerrar a atendimento.
          </p>
        </div>
      </footer>
    </div>
  )
}

function Ctrl({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-12 rounded-full text-xl flex items-center justify-center ring-1 ${
        active
          ? 'bg-mystic-600/30 ring-mystic-400/40 text-white'
          : 'bg-red-600/30 ring-red-400/40 text-white'
      }`}
    >
      {children}
    </button>
  )
}
