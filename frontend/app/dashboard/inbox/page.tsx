'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'
import { PageLoader } from '../../../components/ui/Spinner'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface InboxItem {
  id: string
  kind: string
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

export default function InboxPage() {
  const router = useRouter()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.replace('/login'); return }
      const { data } = await axios.get(`${API}/me/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(data?.items || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar caixa de entrada')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function markRead(id: string) {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      await axios.patch(`${API}/me/inbox/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((curr) => curr.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)))
    } catch { /* noop */ }
  }

  async function readAll() {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      await axios.post(`${API}/me/inbox/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const now = new Date().toISOString()
      setItems((curr) => curr.map((i) => (i.readAt ? i : { ...i, readAt: now })))
    } catch { /* noop */ }
  }

  if (loading) return <PageLoader label="Carregando…" />

  const unread = items.filter((i) => !i.readAt).length

  return (
    <div className="min-h-screen bg-ink-900">
      <Navbar variant="client" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display text-white">Caixa de entrada</h1>
            <p className="text-ink-300 text-sm mt-1">
              Mensagens da plataforma — entregas de orientações, avisos, etc.
            </p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={readAll}>
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {items.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-ink-300 text-sm">
              Sua caixa de entrada está vazia.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.id}>
                <div className={`p-5 ${i.readAt ? '' : 'border-l-2 border-mystic-400'}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {!i.readAt && <Badge variant="mystic">Nova</Badge>}
                      <h3 className="text-white font-medium">{i.title}</h3>
                    </div>
                    <span className="text-xs text-ink-300 whitespace-nowrap">
                      {new Date(i.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-ink-100 text-sm whitespace-pre-line leading-relaxed">
                    {i.body}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    {i.link && (
                      <Link
                        href={i.link}
                        className="text-mystic-300 hover:text-white text-xs"
                        onClick={() => !i.readAt && markRead(i.id)}
                      >
                        Abrir →
                      </Link>
                    )}
                    {!i.readAt && (
                      <button
                        onClick={() => markRead(i.id)}
                        className="text-xs text-ink-300 hover:text-white"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
