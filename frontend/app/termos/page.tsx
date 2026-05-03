'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Logo } from '../../components/Logo'
import { PageLoader } from '../../components/ui/Spinner'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Terms {
  id: string
  version: number
  content: string
  publishedAt: string
}

export default function TermsPage() {
  const [data, setData] = useState<Terms | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API}/terms/current`)
      .then((r) => setData(r.data))
      .catch(() => setError('Não foi possível carregar os termos no momento.'))
  }, [])

  if (!data && !error) return <PageLoader />

  return (
    <main className="min-h-screen bg-ink-900 text-ink-100">
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <Link href="/"><Logo size="sm" /></Link>
        <Link href="/" className="text-sm text-mystic-300 hover:text-white">Voltar</Link>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12">
        {error ? (
          <p className="text-red-300">{error}</p>
        ) : data ? (
          <>
            <p className="text-xs text-ink-300 uppercase tracking-[0.2em] mb-2">
              Versão {data.version} · publicada em {new Date(data.publishedAt).toLocaleDateString('pt-BR')}
            </p>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-ink-100 leading-relaxed text-[15px]">
              {data.content}
            </div>
          </>
        ) : null}
      </article>
    </main>
  )
}
