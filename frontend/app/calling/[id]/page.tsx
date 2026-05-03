'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Avatar } from '../../../components/ui/Avatar'
import { Button, LinkButton } from '../../../components/ui/Button'

interface Consultant {
  id: string
  name: string
  specialty: string
}

function playRing() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 660; osc.type = 'sine'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(); osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

const STATUS_RING: Record<string, string> = {
  calling:  'border-white/10',
  accepted: 'border-emerald-400/40',
  declined: 'border-red-500/30',
  failed:   'border-red-500/30',
}

const STATUS_DOT: Record<string, string> = {
  calling:  'bg-mystic-400',
  accepted: 'bg-emerald-400',
  declined: 'bg-red-400',
  failed:   'bg-red-400',
}

export default function CallingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const consultantId = params.id as string
  const kindParam = searchParams.get('kind')
  const kind: 'chat' | 'voice' | 'video' =
    kindParam === 'voice' || kindParam === 'video' ? kindParam : 'chat'

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [callStatus, setCallStatus] = useState<'calling' | 'declined' | 'failed' | 'accepted'>('calling')
  const [dots, setDots] = useState('.')

  const socketRef = useRef<Socket | null>(null)
  const ringInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    const user = JSON.parse(userData)

    fetchConsultant(token)
    startCalling(user, token)

    dotsInterval.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 500)

    return () => {
      if (ringInterval.current) clearInterval(ringInterval.current)
      if (dotsInterval.current) clearInterval(dotsInterval.current)
      socketRef.current?.disconnect()
    }
  }, [consultantId, router])

  const fetchConsultant = async (token: string) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setConsultant(res.data)
    } catch {}
  }

  const startCalling = (user: any, token: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace(/\/api$/, '')

    const socket = io(baseUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket.emit('register-user', { userId: user.id })
      setTimeout(() => {
        socket.emit('call-consultant', {
          consultantId,
          clientId: user.id,
          clientName: user.name,
          kind,
        })
      }, 300)
      playRing()
      ringInterval.current = setInterval(playRing, 4000)
    })

    socket.on('calling', () => setCallStatus('calling'))
    socket.on('call-failed', () => {
      setCallStatus('failed')
      if (ringInterval.current) clearInterval(ringInterval.current)
    })
    socket.on('call-accepted', (data: { consultationId: string; consultantId: string }) => {
      setCallStatus('accepted')
      if (ringInterval.current) clearInterval(ringInterval.current)
      if (dotsInterval.current) clearInterval(dotsInterval.current)
      setTimeout(() => {
        // Roteia conforme o tipo de atendimento. Chat → tela atual; voz/vídeo → /call.
        if (kind === 'voice' || kind === 'video') {
          router.push(`/call/${data.consultationId}?kind=${kind}`)
        } else {
          router.push(`/chat/${consultantId}?consultationId=${data.consultationId}`)
        }
      }, 800)
    })
    socket.on('call-declined', () => {
      setCallStatus('declined')
      if (ringInterval.current) clearInterval(ringInterval.current)
    })

    socketRef.current = socket
  }

  const handleCancel = () => {
    if (socketRef.current) {
      socketRef.current.emit('cancel-call', { callId: '', consultantId })
    }
    if (ringInterval.current) clearInterval(ringInterval.current)
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div
            className={[
              'w-32 h-32 rounded-full flex items-center justify-center border bg-ink-800/60',
              STATUS_RING[callStatus],
            ].join(' ')}
          >
            <Avatar name={consultant?.name || 'C'} size="2xl" />
          </div>
          <span className="absolute right-1 bottom-1 flex h-3 w-3">
            {callStatus === 'calling' && (
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${STATUS_DOT[callStatus]}`} />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ring-2 ring-ink-900 ${STATUS_DOT[callStatus]}`} />
          </span>
        </div>

        <h2 className="font-display text-2xl text-white tracking-tight">
          {consultant?.name || 'Consultor'}
        </h2>
        {consultant?.specialty && (
          <p className="text-ink-300 mt-1">{consultant.specialty}</p>
        )}

        {callStatus === 'calling' && (
          <>
            <p className="text-ink-200 text-base mt-6 mb-6">
              Chamando<span className="tabular-nums">{dots}</span>
            </p>
            <Button onClick={handleCancel} variant="danger" size="lg" fullWidth>
              Cancelar chamada
            </Button>
          </>
        )}

        {callStatus === 'accepted' && (
          <p className="text-emerald-300 text-base font-medium mt-6">
            Chamada aceita. Iniciando chat…
          </p>
        )}

        {callStatus === 'declined' && (
          <div className="mt-6">
            <p className="text-ink-200 mb-6">O consultor não atendeu.</p>
            <LinkButton href="/dashboard" variant="primary" size="lg" fullWidth>
              Voltar ao painel
            </LinkButton>
          </div>
        )}

        {callStatus === 'failed' && (
          <div className="mt-6">
            <p className="text-ink-200 mb-1">Consultor está offline.</p>
            <p className="text-ink-400 text-sm mb-6">Tente outro consultor disponível.</p>
            <LinkButton href="/dashboard" variant="primary" size="lg" fullWidth>
              Voltar ao painel
            </LinkButton>
          </div>
        )}

        <Link
          href="/dashboard"
          className="inline-block mt-6 text-ink-400 hover:text-ink-200 text-sm"
        >
          ← Voltar
        </Link>
      </div>
    </main>
  )
}
