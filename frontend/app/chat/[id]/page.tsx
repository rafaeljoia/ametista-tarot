'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

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

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const consultationId = useRef<string>('')
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    consultationId.current = consultationIdFromUrl || `${parsedUser.id}-${consultantId}`

    fetchConsultant(token)
    connectSocket(parsedUser, token)

    return () => { socketRef.current?.disconnect() }
  }, [consultantId, router, consultationIdFromUrl])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConsultant = async (token: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConsultant(response.data)
    } catch {
      console.error('Erro ao buscar consultor')
    } finally {
      setLoading(false)
    }
  }

  const connectSocket = (parsedUser: User, token: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const baseUrl = apiUrl.replace('/api', '')

    const socket = io(baseUrl, {
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
          isOwn: msg.senderId === parsedUser.id,
        },
      ])
    })

    socket.on('user-typing', () => setIsTyping(true))
    socket.on('user-stop-typing', () => setIsTyping(false))

    socketRef.current = socket
  }

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !user) return

    setMessages((prev) => [
      ...prev,
      { content: input.trim(), senderId: user.id, createdAt: new Date().toISOString(), isOwn: true },
    ])

    socketRef.current.emit('send-message', {
      consultationId: consultationId.current,
      senderId: user.id,
      recipientId: consultantId,
      content: input.trim(),
    })
    socketRef.current.emit('stop-typing', { consultationId: consultationId.current, userId: user.id })
    setInput('')
  }

  const handleTyping = (value: string) => {
    setInput(value)
    if (!socketRef.current || !user) return
    socketRef.current.emit('typing', { consultationId: consultationId.current, userId: user.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { consultationId: consultationId.current, userId: user.id })
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-purple-200">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 flex items-center space-x-4">
        <Link href="/dashboard" className="text-purple-300 hover:text-white transition">← Voltar</Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-lg">🔮</span>
          </div>
          <div>
            <p className="text-white font-semibold">{consultant?.name || 'Consultor'}</p>
            <p className="text-purple-300 text-xs">{consultant?.specialty}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-purple-300">{connected ? 'Conectado' : 'Desconectado'}</span>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl">🔮</span>
            <p className="text-purple-200 mt-4">Consulta iniciada com {consultant?.name}</p>
            <p className="text-purple-400 text-sm mt-1">R$ {Number(consultant?.pricePerMinute || 0).toFixed(2)}/min</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.isOwn ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-slate-700 text-purple-100 rounded-bl-sm'}`}>
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.isOwn ? 'text-purple-300' : 'text-slate-400'}`}>{formatTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-700 px-4 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex space-x-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border-t border-purple-500/20 px-4 py-4">
        <div className="max-w-3xl mx-auto flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2 bg-slate-700 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl transition font-semibold"
          >
            Enviar
          </button>
        </div>
      </div>
    </main>
  )
}
