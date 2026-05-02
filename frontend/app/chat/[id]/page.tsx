'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'

interface Message {
  id?: string
  content: string
  senderId: string
  createdAt: string
  isOwn: boolean
}

interface Consultant {
  id: string
  name: string
  specialty: string
  pricePerMinute: number
}

interface User {
  id: string
  name: string
  email: string
  credits: number
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const consultantId = params.id as string
  const consultationIdFromUrl = searchParams.get('consultationId')

  const [user, setUser] = useState<User | null>(null)
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)

  // Billing state
  const [seconds, setSeconds] = useState(0)
  const [credits, setCredits] = useState<number | null>(null)
  const [costSoFar, setCostSoFar] = useState(0)
  const [lowCredits, setLowCredits] = useState<{ minutesLeft: number } | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const consultationId = useRef<string>('')
  const startedAtRef = useRef<number>(Date.now())
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }

    const parsedUser = JSON.parse(userData) as User
    setUser(parsedUser)
    setCredits(Number(parsedUser.credits || 0))
    consultationId.current = consultationIdFromUrl || `${parsedUser.id}-${consultantId}`

    fetchConsultant(token)
    // Hydrate timer base from the server's startedAt so reloads/reconnects
    // don't reset MM:SS to 00:00.
    if (consultationIdFromUrl) {
      axios
        .get(`${API}/consultations/${consultationIdFromUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((r) => {
          if (r.data?.startedAt) {
            startedAtRef.current = new Date(r.data.startedAt).getTime()
          }
          if (typeof r.data?.creditsUsed === 'number') {
            setCostSoFar(Number(r.data.creditsUsed))
          }
          if (r.data?.status === 'completed' && !endedRef.current) {
            endedRef.current = true
            router.replace(`/consulta/finalizada/${consultationIdFromUrl}?reason=ended`)
          }
        })
        .catch(() => {})
    }
    connectSocket(parsedUser, token)

    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)

    return () => {
      socketRef.current?.disconnect()
      if (tickRef.current) clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantId, consultationIdFromUrl])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConsultant = async (token: string) => {
    try {
      const r = await axios.get(`${API}/consultants/${consultantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConsultant(r.data)
    } catch {
      console.error('Erro ao buscar consultor')
    } finally {
      setLoading(false)
    }
  }

  const connectSocket = (parsedUser: User, token: string) => {
    const baseUrl = API.replace(/\/api$/, '')
    const socket = io(baseUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-consultation', {
        userId: parsedUser.id,
        consultationId: consultationId.current,
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('message', (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt || new Date().toISOString(),
          isOwn: false,
        },
      ])
    })

    socket.on('message-sent', (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          content: msg.tempId,
          senderId: parsedUser.id,
          createdAt: new Date().toISOString(),
          isOwn: true,
        },
      ])
    })

    socket.on('user-typing', () => setIsTyping(true))
    socket.on('user-stop-typing', () => setIsTyping(false))

    socket.on('billing-tick', (data: any) => {
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      if (typeof data.costSoFar === 'number') setCostSoFar(data.costSoFar)
    })

    socket.on('low-credits', (data: any) => {
      setLowCredits({ minutesLeft: Number(data.minutesLeft || 0) })
    })

    socket.on('consultation-ended', (data: any) => {
      if (endedRef.current) return
      endedRef.current = true
      router.replace(`/consulta/finalizada/${consultationId.current}?reason=${data.reason || 'ended'}`)
    })

    socketRef.current = socket
  }

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !user) return
    socketRef.current.emit('send-message', {
      consultationId: consultationId.current,
      senderId: user.id,
      recipientId: consultantId,
      content: input.trim(),
    })
    socketRef.current.emit('stop-typing', {
      consultationId: consultationId.current,
      userId: user.id,
    })
    setInput('')
  }

  const handleTyping = (value: string) => {
    setInput(value)
    if (!socketRef.current || !user) return
    socketRef.current.emit('typing', {
      consultationId: consultationId.current,
      userId: user.id,
    })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', {
        consultationId: consultationId.current,
        userId: user.id,
      })
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const endConsultation = useCallback(async () => {
    if (endedRef.current) return
    setEnding(true)
    try {
      const token = localStorage.getItem('token')
      // Server computes elapsed time from its own startedAt — no client input.
      await axios.post(
        `${API}/consultations/${consultationId.current}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      endedRef.current = true
      router.replace(`/consulta/finalizada/${consultationId.current}?reason=user-ended`)
    } catch (err: any) {
      console.error(err)
      setEnding(false)
      setConfirmEnd(false)
    }
  }, [router])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <main className="min-h-screen bg-mystic-gradient flex items-center justify-center">
        <p className="text-ink-200">Carregando…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-mystic-gradient flex flex-col">
      {/* Top bar with timer + credits */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Avatar name={consultant?.name || 'C'} emoji="🔮" size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">
              {consultant?.name || 'Consultor'}
            </p>
            <p className="text-mystic-300 text-xs truncate">
              {consultant?.specialty} · R${' '}
              {Number(consultant?.pricePerMinute || 0).toFixed(2)}/min
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs text-ink-200">{connected ? 'Conectado' : 'Reconectando…'}</span>
          </div>

          <div className="flex flex-col items-end ml-2">
            <span className="font-mono text-lg text-gold-300 tabular-nums leading-none">
              {formatMMSS(seconds)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink-300">
              em chamada
            </span>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setConfirmEnd(true)}
            className="ml-2"
          >
            Encerrar
          </Button>
        </div>

        <div className="max-w-4xl mx-auto mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="gold">
            {credits !== null ? `${credits.toFixed(2)} créditos` : '— créditos'}
          </Badge>
          <Badge variant="mystic">Gasto: R$ {costSoFar.toFixed(2)}</Badge>
        </div>
      </nav>

      {/* Low-credits warning */}
      {lowCredits && credits !== null && credits > 0 && (
        <div className="px-4 pt-3">
          <div className="max-w-4xl mx-auto">
            <Alert variant="warning">
              Seus créditos estão acabando — restam aproximadamente{' '}
              <strong>{lowCredits.minutesLeft.toFixed(1)} min</strong>. A consulta
              será encerrada automaticamente quando zerar.
            </Alert>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="text-5xl">🔮</span>
              <p className="text-ink-100 mt-4 font-display text-lg">
                Consulta iniciada com {consultant?.name}
              </p>
              <p className="text-ink-300 text-sm mt-1">
                A cobrança ocorre por minuto utilizado.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={[
                  'max-w-[80%] sm:max-w-md px-4 py-2 rounded-2xl shadow',
                  msg.isOwn
                    ? 'bg-mystic-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-ink-100 rounded-bl-sm border border-white/10',
                ].join(' ')}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.isOwn ? 'text-mystic-200/80' : 'text-ink-300'
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex space-x-1">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 bg-mystic-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="bg-black/30 backdrop-blur-md border-t border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem…"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-ink-300 focus:outline-none focus:border-mystic-400 transition"
          />
          <Button onClick={handleSend} disabled={!input.trim() || !connected}>
            Enviar
          </Button>
        </div>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => (ending ? null : setConfirmEnd(false))}
        title="Encerrar consulta?"
      >
        <p className="text-ink-200">
          Você está a {formatMMSS(seconds)} em chamada. Ao encerrar, a cobrança final
          do tempo decorrido será aplicada.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)} disabled={ending}>
            Continuar
          </Button>
          <Button variant="danger" loading={ending} onClick={endConsultation}>
            Encerrar agora
          </Button>
        </div>
      </Modal>
    </main>
  )
}
