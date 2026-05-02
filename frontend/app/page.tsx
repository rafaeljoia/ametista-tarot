'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { LinkButton } from '../components/ui/Button'

interface Consultant {
  id: string
  name: string
  specialty: string
  rating: number
  pricePerMinute: number
  isOnline?: boolean
  consultationsCount: number
}

// Calm, neutral imagery — Unsplash editorial photography.
const HERO_PHOTO =
  'https://images.unsplash.com/photo-1518128958364-65859d70aa41?auto=format&fit=crop&w=1400&q=80'

export default function Home() {
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [topConsultants, setTopConsultants] = useState<Consultant[]>([])

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/consultants`)
      .then((r) => setConsultants((r.data || []).slice(0, 6)))
      .catch(() => setConsultants([]))
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/consultants/top`)
      .then((r) => setTopConsultants(r.data || []))
      .catch(() => setTopConsultants([]))
  }, [])

  return (
    <main className="min-h-screen bg-ink-900 text-ink-100">
      <Navbar variant="public" />

      {/* Hero */}
      <section className="relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs uppercase tracking-[0.18em] text-mystic-300 font-medium mb-4">
              Atendimento online · em tempo real
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight">
              Respostas que acolhem,
              <br />
              quando você precisar.
            </h1>
            <p className="mt-6 text-lg text-ink-200 max-w-xl leading-relaxed">
              Conecte-se em segundos com cartomantes e taróloga(o)s especializados.
              Privacidade, escuta atenta e clareza para te orientar — pague apenas
              pelos minutos que usar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" variant="primary" size="lg">Começar agora</LinkButton>
              <LinkButton href="#consultores" variant="outline" size="lg">Ver consultores</LinkButton>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <Stat value="500+" label="atendimentos" />
              <Stat value="4.9" label="avaliação média" />
              <Stat value="24/7" label="online" />
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] aspect-[4/5] lg:aspect-[5/6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_PHOTO}
                alt="Ambiente acolhedor com velas e cartas de tarot"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-transparent" />
              <div className="absolute left-5 right-5 bottom-5">
                <div className="bg-ink-900/80 backdrop-blur-md border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <p className="text-sm text-ink-100">
                    <span className="text-white font-medium">Consultores online</span>
                    <span className="text-ink-300"> · disponíveis agora</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/[0.06]">
        <div className="max-w-2xl mb-14">
          <p className="text-xs uppercase tracking-[0.18em] text-mystic-300 font-medium mb-3">
            Como funciona
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight">
            Comece em 3 passos simples
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <Step n={1} title="Crie sua conta" desc="Cadastro rápido e gratuito. Seus dados ficam protegidos." />
          <Step n={2} title="Compre créditos" desc="Pague seguro com PIX ou cartão. Use só o que precisar." />
          <Step n={3} title="Converse agora" desc="Escolha um(a) consultor(a) online e comece sua sessão." />
        </div>
      </section>

      {/* Featured consultants */}
      <section id="consultores" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.06]">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-mystic-300 font-medium mb-3">
              Consultores
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight">
              Profissionais experientes
            </h2>
            <p className="text-ink-300 mt-2">Conheça quem está pronto para te atender.</p>
          </div>
          <Link href="/dashboard" className="text-mystic-300 hover:text-white text-sm">
            Ver todos →
          </Link>
        </div>

        {consultants.length === 0 ? (
          <Card className="p-10 text-center text-ink-300">
            Nenhum consultor disponível no momento.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {consultants.map((c) => (
              <Link key={c.id} href={`/consultor/${c.id}`} className="block">
                <Card hoverable className="p-6 h-full">
                  <div className="flex items-start gap-4">
                    <Avatar name={c.name} size="lg" online={c.isOnline} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{c.name}</h3>
                      <p className="text-ink-300 text-sm truncate">{c.specialty}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-gold-300 tabular-nums">★ {Number(c.rating).toFixed(1)}</span>
                        <span className="text-ink-400">·</span>
                        <span className="text-ink-300">{c.consultationsCount} consultas</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-sm text-ink-300">
                      <span className="text-ink-100 font-medium tabular-nums">R$ {Number(c.pricePerMinute).toFixed(2)}</span>
                      <span className="text-ink-400"> /min</span>
                    </span>
                    <span className="text-mystic-300 text-sm font-medium">Ver perfil →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top 10 Ranking */}
      {topConsultants.length > 0 && (
        <section id="ranking" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.06]">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.18em] text-mystic-300 font-medium mb-3">
              Top consultores
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight">
              Os mais bem avaliados
            </h2>
            <p className="text-ink-300 mt-2">
              Ranking dos nossos consultores favoritos pelos clientes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {topConsultants.map((c, idx) => (
              <Link key={c.id} href={`/consultor/${c.id}`} className="block group">
                <Card hoverable className="p-5 flex items-center gap-4">
                  <div
                    className={[
                      'shrink-0 w-10 h-10 rounded-md flex items-center justify-center font-display text-base tabular-nums',
                      idx === 0
                        ? 'bg-gold-400 text-ink-900 font-medium'
                        : idx < 3
                        ? 'bg-gold-400/15 text-gold-200 border border-gold-400/30'
                        : 'bg-white/[0.04] text-ink-300 border border-white/10',
                    ].join(' ')}
                  >
                    {idx + 1}
                  </div>
                  <Avatar name={c.name} size="md" online={c.isOnline} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate group-hover:text-mystic-200 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-ink-300 text-xs truncate">{c.specialty}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-gold-300 tabular-nums">★ {Number(c.rating).toFixed(1)}</span>
                      <span className="text-ink-400">·</span>
                      <span className="text-ink-300">{c.consultationsCount} consultas</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-ink-100 font-medium text-sm tabular-nums">
                      R$ {Number(c.pricePerMinute).toFixed(2)}
                    </p>
                    <p className="text-ink-400 text-xs">/min</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trust */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.06]">
        <div className="grid md:grid-cols-3 gap-5">
          <TrustCard
            title="Privacidade garantida"
            desc="Conversas criptografadas. Seus dados nunca são compartilhados."
            icon={
              <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" />
            }
          />
          <TrustCard
            title="Pague pelo que usar"
            desc="Compre créditos e gaste apenas durante sua sessão, por minuto."
            icon={
              <>
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18" /><path d="M7 15h2" />
              </>
            }
          />
          <TrustCard
            title="24h por dia"
            desc="Há sempre alguém pronto para te ouvir, quando você precisar."
            icon={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            }
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card variant="elevated" className="p-10 md:p-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl text-white mb-4 tracking-tight">
            Sua próxima resposta está a um clique.
          </h2>
          <p className="text-ink-300 max-w-xl mx-auto mb-8 leading-relaxed">
            Crie sua conta gratuita agora e ganhe acesso aos nossos consultores.
          </p>
          <LinkButton href="/register" variant="primary" size="lg">Quero começar →</LinkButton>
        </Card>
      </section>

      <Footer />
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-white tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-ink-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <Card className="p-7">
      <div className="w-9 h-9 rounded-md bg-mystic-500/15 border border-mystic-400/25 text-mystic-200 font-display text-base flex items-center justify-center mb-5 tabular-nums">
        {n}
      </div>
      <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
      <p className="text-ink-300 text-sm leading-relaxed">{desc}</p>
    </Card>
  )
}

function TrustCard({
  title,
  desc,
  icon,
}: {
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-7">
      <div className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.08] text-mystic-300 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-ink-300 text-sm leading-relaxed">{desc}</p>
    </Card>
  )
}
