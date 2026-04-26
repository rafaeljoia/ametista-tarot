'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Consultant {
  id: string
  name: string
  specialty: string
  bio: string
  rating: number
  pricePerMinute: number
  isAvailable: boolean
  consultationsCount: number
  createdAt: string
}

export default function ConsultantProfilePage() {
  const router = useRouter()
  const params = useParams()
  const consultantId = params.id as string

  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchConsultant(token)
  }, [consultantId, router])

  const fetchConsultant = async (token: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/consultants/${consultantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConsultant(response.data)
    } catch {
      setError('Consultor não encontrado')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-purple-200">Carregando perfil...</p>
      </main>
    )
  }

  if (error || !consultant) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-300 mb-4">{error || 'Consultor não encontrado'}</p>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            ← Voltar ao dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20 px-6 py-4">
        <Link href="/dashboard" className="text-purple-300 hover:text-white transition">
          ← Voltar ao dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 h-40 flex items-center justify-center">
            <span className="text-7xl">🔮</span>
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{consultant.name}</h1>
                <p className="text-purple-300 text-lg">{consultant.specialty}</p>
              </div>
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

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">⭐ {Number(consultant.rating).toFixed(1)}</p>
                <p className="text-purple-300 text-sm mt-1">Avaliação</p>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">{consultant.consultationsCount}</p>
                <p className="text-purple-300 text-sm mt-1">Consultas</p>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">R${Number(consultant.pricePerMinute).toFixed(2)}</p>
                <p className="text-purple-300 text-sm mt-1">Por minuto</p>
              </div>
            </div>

            {consultant.bio && (
              <div className="mb-8">
                <h2 className="text-white font-semibold mb-2">Sobre</h2>
                <p className="text-purple-200 leading-relaxed">{consultant.bio}</p>
              </div>
            )}

            <Link
              href={`/chat/${consultant.id}`}
              className={`block w-full text-center px-6 py-3 rounded-xl font-bold text-white transition ${
                consultant.isAvailable
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-slate-600 cursor-not-allowed opacity-60 pointer-events-none'
              }`}
            >
              {consultant.isAvailable ? '💬 Iniciar Chat' : 'Consultor Indisponível'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
