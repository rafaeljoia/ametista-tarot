'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { EmojiPicker } from '../../../components/ui/EmojiPicker'
import { Lightbox } from '../../../components/ui/Lightbox'

type MsgType = 'text' | 'image'

interface Message {
  id?: string
  content: string
  senderId: string
  createdAt: string
  isOwn: boolean
  type: MsgType
  mediaUrl?: string | null
}

interface Consultant {
  id: string
  name: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const API_BASE = API.replace(/\/api$/, '')

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function absoluteMediaUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export default function ConsultantChatPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const consultationId = params.id as string
  const clientId = searchParams.get('clientId') || ''

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [seconds, setSeconds] = useState(0)
  const [earned, setEarned] = useState(0)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peerTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('consultant-token')
    const consultantData = localStorage.getItem('consultant')
    if (!token || !consultantData) { router.push('/consultant-login'); return }

    const parsed = JSON.parse(consultantData)
    setConsultant(parsed)

    axios
      .get(`${API}/consultations/${consultationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        if (r.data?.startedAt) {
          startedAtRef.current = new Date(r.data.startedAt).getTime()
        }
        if (typeof r.data?.creditsUsed === 'number') {
          setEarned(Number(r.data.creditsUsed))
        }
        if (r.data?.status === 'completed' && !endedRef.current) {
          endedRef.current = true
          router.replace(`/consulta/finalizada/${consultationId}?reason=ended&role=consultant`)
        }
      })
      .catch(() => {})

    connectSocket(parsed, token)

    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)

    return () => {
      socketRef.current?.disconnect()
      if (tickRef.current) clearInterval(tickRef.current)
      if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const triggerPeerTyping = () => {
    setIsTyping(true)
    if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current)
    peerTypingTimeout.current = setTimeout(() => setIsTyping(false), 3000)
  }

  const connectSocket = (parsed: Consultant, token: string) => {
    const socket = io(API_BASE, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-consultation', { userId: parsed.id, consultationId })
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
          type: (msg.type as MsgType) || 'text',
          mediaUrl: msg.mediaUrl || null,
        },
      ])
    })

    socket.on('message-sent', (ack: { id?: string; tempId?: string; createdAt?: string }) => {
      if (!ack?.tempId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ack.tempId
            ? { ...m, id: ack.id || m.id, createdAt: ack.createdAt || m.createdAt }
            : m,
        ),
      )
    })

    socket.on('user-typing', () => triggerPeerTyping())
    socket.on('user-stop-typing', () => {
      if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current)
      setIsTyping(false)
    })

    socket.on('billing-tick', (data: any) => {
      if (typeof data.costSoFar === 'number') setEarned(data.costSoFar)
    })

    socket.on('send-error', (data: any) => {
      setUploadError(`Falha ao enviar: ${data?.reason || 'erro desconhecido'}`)
      if (data?.tempId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.tempId))
      }
    })

    socket.on('consultation-ended', (data: any) => {
      if (endedRef.current) return
      endedRef.current = true
      const reason = data?.reason || 'ended'
      router.replace(`/consulta/finalizada/${consultationId}?reason=${reason}&role=consultant`)
    })

    socketRef.current = socket
  }

  const pushOwnMessage = (msg: Omit<Message, 'isOwn'>) => {
    setMessages((prev) => [...prev, { ...msg, isOwn: true }])
  }

  const newTempId = () =>
    `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !consultant) return
    const content = input.trim()
    const tempId = newTempId()
    socketRef.current.emit('send-message', {
      consultationId,
      senderId: consultant.id,
      recipientId: clientId,
      content,
      type: 'text',
      tempId,
    })
    socketRef.current.emit('stop-typing', { consultationId, userId: consultant.id })
    pushOwnMessage({
      id: tempId,
      content,
      senderId: consultant.id,
      createdAt: new Date().toISOString(),
      type: 'text',
    })
    setInput('')
  }

  const handleFile = async (file: File | undefined) => {
    setUploadError(null)
    if (!file || !socketRef.current || !consultant) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem maior que 5MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Formato não suportado (use JPG, PNG ou WEBP).')
      return
    }
    setUploading(true)
    try {
      const token = localStorage.getItem('consultant-token')
      const fd = new FormData()
      fd.append('file', file)
      const r = await axios.post(`${API}/uploads/chat-image`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      const url = r.data?.url as string
      if (!url) throw new Error('URL ausente')

      const tempId = newTempId()
      socketRef.current.emit('send-message', {
        consultationId,
        senderId: consultant.id,
        recipientId: clientId,
        content: '',
        type: 'image',
        mediaUrl: url,
        tempId,
      })
      pushOwnMessage({
        id: tempId,
        content: '',
        senderId: consultant.id,
        createdAt: new Date().toISOString(),
        type: 'image',
        mediaUrl: url,
      })
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Falha no envio da imagem.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleTyping = (value: string) => {
    setInput(value)
    if (!socketRef.current || !consultant) return
    socketRef.current.emit('typing', { consultationId, userId: consultant.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { consultationId, userId: consultant.id })
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
      const token = localStorage.getItem('consultant-token')
      await axios.post(
        `${API}/consultations/${consultationId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      endedRef.current = true
      router.replace(`/consulta/finalizada/${consultationId}?reason=consultant-ended&role=consultant`)
    } catch (err) {
      console.error(err)
      setEnding(false)
      setConfirmEnd(false)
    }
  }, [consultationId, router])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="min-h-screen bg-ink-900 flex flex-col">
      <nav className="bg-ink-900/80 backdrop-blur-md border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Avatar name="Cliente" size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">Consulta em andamento</p>
            <p className="text-mystic-300 text-xs truncate">
              {isTyping ? 'cliente digitando…' : 'Atendendo cliente'}
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
            <span className="text-[10px] uppercase tracking-wider text-ink-300">em chamada</span>
          </div>

          <Button size="sm" variant="danger" onClick={() => setConfirmEnd(true)} className="ml-2">
            Encerrar
          </Button>
        </div>

        <div className="max-w-4xl mx-auto mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="gold">Receita bruta: R$ {earned.toFixed(2)}</Badge>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-100 font-display text-lg">
                Aguardando mensagem do cliente…
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
                {msg.type === 'image' && msg.mediaUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(absoluteMediaUrl(msg.mediaUrl))}
                    className="block"
                    aria-label="Ampliar imagem"
                  >
                    <img
                      src={absoluteMediaUrl(msg.mediaUrl)}
                      alt="Imagem enviada"
                      className="max-w-full rounded-lg max-h-64 object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
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

      <div className="bg-black/30 backdrop-blur-md border-t border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {uploadError && (
            <p className="text-xs text-red-300 mb-2">{uploadError}</p>
          )}
          <div className="relative flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !connected}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-ink-200 hover:text-white hover:border-white/20 disabled:opacity-50 transition shrink-0"
              title="Anexar imagem"
              aria-label="Anexar imagem"
            >
              {uploading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <PaperclipIcon />
              )}
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-ink-200 hover:text-white hover:border-white/20 transition"
                title="Inserir emoji"
                aria-label="Inserir emoji"
              >
                <SmileIcon />
              </button>
              <EmojiPicker
                open={emojiOpen}
                onSelect={(e) => setInput((v) => v + e)}
                onClose={() => setEmojiOpen(false)}
              />
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta…"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-ink-300 focus:outline-none focus:border-mystic-400 transition"
            />
            <Button onClick={handleSend} disabled={!input.trim() || !connected}>
              Enviar
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => (ending ? null : setConfirmEnd(false))}
        title="Encerrar consulta?"
      >
        <p className="text-ink-200">
          A consulta está há {formatMMSS(seconds)} em andamento. Tem certeza que
          deseja encerrar?
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

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </main>
  )
}

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.84l-8.57 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function SmileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}
