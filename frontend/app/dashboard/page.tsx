'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

interface Consultant {
  id: string
  name: string
  specialty: string
  rating: number
  pricePerMinute: number
  isAvailable: boolean
  consultationsCount: number
  isOnline?: boolean
}

interface User {
  id: string
  name: string
  email: string
  credits: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token) { router.push('/login'); return }
    if (userData) setUser(JSON.parse(userData))

    fetchConsultants(token)
    connectPresence(token)

    return () => { socketRef.current?.disconnect() }
  }, [router])

  const fetchConsultants = async (token: string) => {
    try {
      const [consultantsRes, onlineRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/consultants`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/online`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { ids: [] } })),
      ])

      const onlineIds: string[] = onlineRes.data.ids || []
      const data: Consultant[] = consultantsRes.data.map((c: Consultant) => ({
        ...c,
        isOnline: onlineIds.includes(c.id),
      }))
      setConsultants(data)
    } catch (err) {
      console.error('Erro ao buscar consultores:', err)
    } finally {
      setLoading(false)
    }
  }

  const connectPresence = (token: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace(/\/api$/, '')

    const socket = io(baseUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket.emit('get-online-consultants')
    })

    socket.on('online-consultants', ({ ids }: { ids: string[] }) => {
      setConsultants((prev) =>
        prev.map((c) => ({ ...c, isOnline: ids.includes(c.id) }))
      )
    })

    socket.on('consultant-status', ({ consultantId, isOnline }: { consultantId: string; isOnline: boolean }) => {
      setConsultants((prev) =>
        prev.map((c) => (c.id === consultantId ? { ...c, isOnline } : c))
      )
    })

    socketRef.current = socket
  }

  const handleLogout = () => {
    socketRef.current?.disconnect()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✨</span>
              </div>
              <h1 className="text-xl font-bold text-white">Ametista Tarot</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-purple-200">
                Créditos: <span className="font-bold text-purple-400">{user?.credits || 0}</span>
              </div>
              <Link href="/buy-credits" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                Comprar Créditos
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo, {user?.name}!</h2>
          <p className="text-purple-200">Escolha um consultor para começar sua sessão</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-purple-200">Carregando consultores...</p>
          </div>
        ) : consultants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-purple-200">Nenhum consultor disponível no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consultants.map((consultant) => (
              <div
                key={consultant.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/50 transition"
              >
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 h-24 flex items-center justify-center">
                  <span className="text-5xl">🔮</span>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{consultant.name}</h3>
                  <p className="text-purple-300 text-sm mb-4">{consultant.specialty}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-purple-200">{Number(consultant.rating).toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-purple-300">
                      {consultant.consultationsCount} consultas
                    </span>
                  </div>

                  <div className="mb-4 pb-4 border-b border-purple-500/20">
                    <p className="text-purple-200 text-sm">
                      R$ {Number(consultant.pricePerMinute).toFixed(2)}/min
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1 ${
                      consultant.isOnline ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/40 text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${consultant.isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{consultant.isOnline ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={consultant.isOnline ? `/calling/${consultant.id}` : '#'}
                      className={`flex-1 px-4 py-2 text-white rounded-lg transition text-center font-semibold ${
                        consultant.isOnline
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-slate-600/50 cursor-not-allowed opacity-60 pointer-events-none'
                      }`}
                    >
                      {consultant.isOnline ? '📞 Chamar' : 'Indisponível'}
                    </Link>
                    <Link
                      href={`/consultant/${consultant.id}`}
                      className="flex-1 px-4 py-2 border border-purple-500 text-purple-300 hover:bg-purple-500/10 rounded-lg transition text-center"
                    >
                      Perfil
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
