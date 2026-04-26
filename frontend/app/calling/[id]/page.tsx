'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

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
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

export default function CallingPage() {
  const router = useRouter()
  const params = useParams()
  const consultantId = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [callStatus, setCallStatus] = useState<'calling' | 'declined' | 'failed' | 'accepted'>('calling')
  const [dots, setDots] = useState('.')

  const socketRef = useRef<Socket | null>(null)
  const ringInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

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
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConsultant(res.data)
    } catch {}
  }

  const startCalling = (user: any, token: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const baseUrl = apiUrl.replace('/api', '')

    const socket = io(baseUrl, {
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
        })
      }, 300)

      playRing()
      ringInterval.current = setInterval(playRing, 4000)
    })

    socket.on('calling', () => {
      setCallStatus('calling')
    })

    socket.on('call-failed', () => {
      setCallStatus('failed')
      if (ringInterval.current) clearInterval(ringInterval.current)
    })

    socket.on('call-accepted', (data: { consultationId: string; consultantId: string }) => {
      setCallStatus('accepted')
      if (ringInterval.current) clearInterval(ringInterval.current)
      if (dotsInterval.current) clearInterval(dotsInterval.current)
      setTimeout(() => {
        router.push(`/chat/${consultantId}?consultationId=${data.consultationId}`)
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center px-6">
        <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center
          ${callStatus === 'calling' ? 'bg-purple-600/20 border-2 border-purple-500/50 animate-pulse' : ''}
          ${callStatus === 'accepted' ? 'bg-green-600/20 border-2 border-green-500/50' : ''}
          ${callStatus === 'declined' || callStatus === 'failed' ? 'bg-red-600/20 border-2 border-red-500/50' : ''}
        `}>
          <span className="text-6xl">
            {callStatus === 'calling' && '📞'}
            {callStatus === 'accepted' && '✅'}
            {callStatus === 'declined' && '❌'}
            {callStatus === 'failed' && '📵'}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {consultant?.name || 'Consultor'}
        </h2>
        <p className="text-purple-300 mb-6">{consultant?.specialty}</p>

        {callStatus === 'calling' && (
          <>
            <p className="text-purple-200 text-lg mb-8">Chamando{dots}</p>
            <button
              onClick={handleCancel}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition"
            >
              Cancelar
            </button>
          </>
        )}

        {callStatus === 'accepted' && (
          <p className="text-green-400 text-lg font-semibold">Chamada aceita! Iniciando chat...</p>
        )}

        {callStatus === 'declined' && (
          <div>
            <p className="text-red-300 text-lg mb-6">O consultor não atendeu</p>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition"
            >
              Voltar ao início
            </Link>
          </div>
        )}

        {callStatus === 'failed' && (
          <div>
            <p className="text-red-300 text-lg mb-2">Consultor está offline</p>
            <p className="text-purple-400 text-sm mb-6">Tente outro consultor disponível</p>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition"
            >
              Voltar ao início
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
