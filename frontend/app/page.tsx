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

export default function Home() {
  const [consultants, setConsultants] = useState<Consultant[]>([])

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/consultants`)
      .then((r) => setConsultants((r.data || []).slice(0, 6)))
      .catch(() => setConsultants([]))
  }, [])

  return (
    <main className="min-h-screen bg-mystic-gradient text-ink-100">
      <Navbar variant="public" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="starfield" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="gold" className="mb-5">✨ Atendimento online em tempo real</Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
              Respostas que <span className="text-gradient-gold">acolhem</span>,
              <br />
              quando você <em className="not-italic text-gradient-mystic">precisar</em>.
            </h1>
            <p className="mt-6 text-lg text-ink-200/90 max-w-xl leading-relaxed">
              Conecte-se em segundos com cartomantes e taróloga(o)s especializados.
              Privacidade, escuta atenta e clareza para te orientar — pague apenas
              pelos minutos que usar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" variant="primary" size="lg">Começar agora</LinkButton>
              <LinkButton href="#consultores" variant="outline" size="lg">Ver consultores</LinkButton>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              <Stat value="500+" label="atendimentos" />
              <Stat value="4.9★" label="avaliação média" />
              <Stat value="24/7" label="online" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-mystic-500/20 blur-3xl rounded-full" />
            <Card variant="elevated" className="relative p-8 animate-float">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center text-3xl shadow-gold">
                  🔮
                </div>
                <div>
                  <p className="text-xs text-mystic-300/80 uppercase tracking-wider">Consulta ao vivo</p>
                  <p className="text-white font-display text-xl">Tarot dos Caminhos</p>
                </div>
                <Badge variant="success" pulse className="ml-auto">Online</Badge>
              </div>

              <div className="space-y-3">
                <Bubble side="left">
                  Olá! Vejo que você está em um momento de mudança. As cartas falam de
                  novos começos. Quer que aprofunde?
                </Bubble>
                <Bubble side="right" mine>
                  Sim, por favor 💜
                </Bubble>
                <Bubble side="left">
                  A Estrela apareceu — esperança e cura. Vou puxar mais uma para
                  detalhar...
                </Bubble>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-ink-200/70">Em andamento • 04:23</span>
                <span className="text-gold-300 font-semibold">R$ 2,50/min</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <Badge variant="mystic" className="mb-3">Como funciona</Badge>
          <h2 className="font-display text-3xl md:text-4xl text-white">Comece em 3 passos simples</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Step n={1} title="Crie sua conta" desc="Cadastro rápido e gratuito. Seus dados ficam protegidos." />
          <Step n={2} title="Compre créditos" desc="Pague seguro com PIX ou cartão. Use só o que precisar." />
          <Step n={3} title="Converse agora" desc="Escolha um(a) consultor(a) online e comece sua sessão." />
        </div>
      </section>

      {/* Featured consultants */}
      <section id="consultores" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="gold" className="mb-3">Nossos consultores</Badge>
            <h2 className="font-display text-3xl md:text-4xl text-white">Profissionais experientes</h2>
            <p className="text-ink-200/80 mt-2">Conheça quem está pronto para te atender.</p>
          </div>
          <Link href="/dashboard" className="hidden md:inline text-mystic-200 hover:text-white text-sm">
            Ver todos →
          </Link>
        </div>

        {consultants.length === 0 ? (
          <Card className="p-10 text-center text-ink-200/80">
            Nenhum consultor disponível no momento.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {consultants.map((c) => (
              <Card key={c.id} hoverable className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar name={c.name} emoji="🔮" size="lg" online={c.isOnline} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{c.name}</h3>
                    <p className="text-mystic-300 text-sm truncate">{c.specialty}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gold-300 text-sm">★ {Number(c.rating).toFixed(1)}</span>
                      <span className="text-ink-300 text-xs">· {c.consultationsCount} consultas</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-ink-200/80">
                    <span className="text-gold-300 font-semibold">R$ {Number(c.pricePerMinute).toFixed(2)}</span>/min
                  </span>
                  <Link
                    href={`/consultor/${c.id}`}
                    className="text-mystic-200 hover:text-white text-sm font-medium"
                  >
                    Ver perfil →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Trust */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-7">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-white font-semibold mb-2">Privacidade garantida</h3>
            <p className="text-ink-200/80 text-sm leading-relaxed">
              Conversas criptografadas. Seus dados nunca são compartilhados.
            </p>
          </Card>
          <Card className="p-7">
            <div className="text-3xl mb-3">💸</div>
            <h3 className="text-white font-semibold mb-2">Pague pelo que usar</h3>
            <p className="text-ink-200/80 text-sm leading-relaxed">
              Compre créditos e gaste apenas durante sua sessão, por minuto.
            </p>
          </Card>
          <Card className="p-7">
            <div className="text-3xl mb-3">🌙</div>
            <h3 className="text-white font-semibold mb-2">24h por dia</h3>
            <p className="text-ink-200/80 text-sm leading-relaxed">
              Há sempre alguém pronto para te ouvir, quando você precisar.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card variant="gold" className="p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-mystic-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gold-400/20 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Sua próxima resposta está a um clique.
            </h2>
            <p className="text-ink-100/90 max-w-xl mx-auto mb-8">
              Crie sua conta gratuita agora e ganhe acesso aos nossos consultores.
            </p>
            <LinkButton href="/register" variant="gold" size="lg">Quero começar →</LinkButton>
          </div>
        </Card>
      </section>

      <Footer />
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-gradient-gold">{value}</p>
      <p className="text-xs text-ink-300/70 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <Card hoverable className="p-7">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mystic-500 to-mystic-700 text-white font-display text-xl flex items-center justify-center mb-4 shadow-glow">
        {n}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-ink-200/80 text-sm leading-relaxed">{desc}</p>
    </Card>
  )
}

function Bubble({
  children,
  side,
  mine,
}: {
  children: React.ReactNode
  side: 'left' | 'right'
  mine?: boolean
}) {
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed',
          mine
            ? 'bg-gradient-to-br from-mystic-500 to-mystic-700 text-white rounded-br-sm'
            : 'bg-white/5 border border-white/10 text-ink-100 rounded-bl-sm',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
