'use client'

/**
 * Tela única de chamada (cliente). Suporta voice e video via ?kind=voice|video.
 * Para chat puro o cliente continua em /chat/[id] (não migrado para esta tela).
 *
 * Fluxo:
 *  - Cliente já passou pelo accept-call e foi redirecionado para cá com
 *    ?clientId=...&consultantId=...
 *  - Faz socket.connect → join-consultation → useCall (role=caller).
 *  - Mostra timer + créditos consumidos (valor cheio cobrado do cliente).
 *  - Botão encerrar chama POST /consultations/:id/end (regra: só cliente encerra).
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { useCall } from '../../../lib/webrtc/use-call'
import type { CallKind } from '../../../lib/webrtc/peer-connection'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const SOCKET_URL = API.replace(/\/api$/, '')

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export default function CallPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const consultationId = params.id as string
  const kindParam = (searchParams.get('kind') || 'voice') as CallKind
  const kind: CallKind = kindParam === 'video' ? 'video' : 'voice'

  const [socket, setSocket] = useState<Socket | null>(null)
  const [token, setToken] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [costSoFar, setCostSoFar] = useState(0)
  const [ending, setEnding] = useState(false)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const startedAtRef = useRef<number>(Date.now())

  // Bootstrap: auth + socket
  useEffect(() => {
    const t = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!t || !userData) {
      router.push('/login')
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
      const u = JSON.parse(userData)
      s.emit('register-user', { userId: u.id })
      s.emit('join-consultation', { userId: u.id, consultationId })
    })
    s.on('disconnect', () => setConnected(false))
    s.on('billing-tick', (d: any) => {
      if (typeof d.costSoFar === 'number') setCostSoFar(d.costSoFar)
    })
    s.on('consultation-ended', () => router.push('/dashboard'))
    setSocket(s)

    // Pega startedAt da consulta
    axios
      .get(`${API}/consultations/${consultationId}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      .then((r) => {
        if (r.data?.startedAt) {
          startedAtRef.current = new Date(r.data.startedAt).getTime()
        }
        if (typeof r.data?.creditsUsed === 'number') setCostSoFar(r.data.creditsUsed)
      })
      .catch(() => {})

    return () => {
      s.disconnect()
    }
  }, [consultationId, router])

  // Timer
  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const call = useCall({
    socket,
    consultationId,
    kind,
    role: 'caller',
    authToken: token,
  })

  // Wire remote stream → <video>
  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream
    }
  }, [call.remoteStream])
  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream
    }
  }, [call.localStream])

  async function handleEnd() {
    if (ending) return
    setEnding(true)
    try {
      call.end('user-ended')
      await axios.post(
        `${API}/consultations/${consultationId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (e) {
      console.error(e)
    } finally {
      router.push('/dashboard')
    }
  }

  const statusLabel: Record<string, string> = {
    idle: 'Iniciando…',
    initializing: 'Pedindo microfone…',
    'waiting-offer': 'Aguardando consultor…',
    connecting: 'Conectando áudio…',
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
              Chamada de {kind === 'video' ? 'Vídeo' : 'Voz'}
            </p>
            <p className="text-xs text-ink-300">
              {statusLabel[call.status]}{' '}
              {connected ? '· socket ok' : '· reconectando socket…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="gold">R$ {costSoFar.toFixed(2)}</Badge>
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
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-2xl bg-black ring-1 ring-white/10"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-6 right-6 w-32 h-44 rounded-xl bg-black ring-1 ring-white/20 object-cover"
            />
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-32 h-32 rounded-full bg-mystic-600/40 mx-auto flex items-center justify-center animate-pulse">
              <span className="text-4xl">🎙️</span>
            </div>
            <p className="text-white font-display text-xl">
              {call.status === 'connected' ? 'Em conversa' : 'Aguardando áudio…'}
            </p>
            {/* Áudio remoto invisível */}
            <audio
              ref={remoteVideoRef as any}
              autoPlay
              playsInline
              className="hidden"
            />
          </div>
        )}
      </div>

      <footer className="bg-ink-900/80 backdrop-blur border-t border-white/10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          <CtrlButton
            onClick={call.toggleMic}
            active={call.micEnabled}
            label={call.micEnabled ? 'Mic on' : 'Mic off'}
          >
            {call.micEnabled ? '🎤' : '🔇'}
          </CtrlButton>
          {kind === 'video' && (
            <CtrlButton
              onClick={call.toggleCamera}
              active={call.cameraEnabled}
              label={call.cameraEnabled ? 'Câmera on' : 'Câmera off'}
            >
              {call.cameraEnabled ? '📹' : '📷'}
            </CtrlButton>
          )}
          <Button
            onClick={handleEnd}
            disabled={ending}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {ending ? 'Encerrando…' : 'Encerrar chamada'}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function CtrlButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
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
