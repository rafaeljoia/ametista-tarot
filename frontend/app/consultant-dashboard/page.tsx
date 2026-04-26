'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

interface Consultant {
  id: string
  name: string
  specialty: string
  isAvailable: boolean
}

interface IncomingCall {
  callId: string
  clientId: string
  clientName: string
}

function playBell() {
  try {
    const ctx = new AudioContext()
    const times = [0, 0.5, 1.0]
    times.forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.4)
    })
  } catch {}
}

export default function ConsultantDashboardPage() {
  const router = useRouter()
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [connected, setConnected] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [status, setStatus] = useState<'waiting' | 'in-call'>('waiting')

  const socketRef = useRef<Socket | null>(null)
  const bellInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('consultant-token')
    const consultantData = localStorage.getItem('consultant')

    if (!token || !consultantData) {
      router.push('/consultant-login')
      return
    }

    const parsed = JSON.parse(consultantData)
    setConsultant(parsed)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || apiUrl.replace(/\/api$/, '')

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('consultant-online', { consultantId: parsed.id })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('incoming-call', (data: IncomingCall) => {
      setIncomingCall(data)
      playBell()
      bellInterval.current = setInterval(playBell, 3000)
    })

    socket.on('call-cancelled', () => {
      setIncomingCall(null)
      if (bellInterval.current) clearInterval(bellInterval.current)
    })

    socket.on('call-started', (data: { consultationId: string; clientId: string }) => {
      setStatus('in-call')
      setIncomingCall(null)
      if (bellInterval.current) clearInterval(bellInterval.current)
      router.push(`/consultant-chat/${data.consultationId}?clientId=${data.clientId}`)
    })

    socketRef.current = socket

    return () => {
      if (bellInterval.current) clearInterval(bellInterval.current)
      socket.disconnect()
    }
  }, [router])

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

  const handleLogout = () => {
    socketRef.current?.disconnect()
    localStorage.removeItem('consultant-token')
    localStorage.removeItem('consultant')
    router.push('/consultant-login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white">🔮</span>
          </div>
          <div>
            <p className="text-white font-semibold">{consultant?.name}</p>
            <p className="text-purple-300 text-xs">{consultant?.specialty}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-purple-200">{connected ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 bg-red-600/70 hover:bg-red-700 text-white text-sm rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {status === 'waiting' ? (
          <div>
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🔮</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Aguardando chamadas</h2>
            <p className="text-purple-300">Você está online e visível para os clientes</p>
          </div>
        ) : (
          <div>
            <p className="text-white text-xl">Consulta em andamento...</p>
          </div>
        )}
      </div>

      {incomingCall && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-purple-500/40 rounded-2xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-4xl">📞</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Chamada recebida</h3>
            <p className="text-purple-300 mb-6 text-lg">{incomingCall.clientName} quer falar com você</p>

            <div className="flex space-x-4">
              <button
                onClick={handleDecline}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
              >
                Recusar
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition"
              >
                Atender
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
