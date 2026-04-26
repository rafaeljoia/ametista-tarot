'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Consultant {
  id: string
  name: string
  specialty: string
  rating: number
  pricePerMinute: number
  isAvailable: boolean
  consultationsCount: number
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

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token) {
      router.push('/login')
      return
    }

    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchConsultants()
  }, [router])

  const fetchConsultants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/consultants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      setConsultants(response.data)
    } catch (err) {
      console.error('Erro ao buscar consultores:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
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
              <Link
                href="/buy-credits"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Comprar Créditos
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
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
                      <span className="text-purple-200">{consultant.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-purple-300">
                      {consultant.consultationsCount} consultas
                    </span>
                  </div>

                  <div className="mb-4 pb-4 border-b border-purple-500/20">
                    <p className="text-purple-200 text-sm">
                      R$ {consultant.pricePerMinute.toFixed(2)}/min
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        consultant.isAvailable
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {consultant.isAvailable ? '🟢 Disponível' : '🔴 Ocupado'}
                    </span>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Link
                      href={`/chat/${consultant.id}`}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-center disabled:opacity-50"
                    >
                      Chat
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
