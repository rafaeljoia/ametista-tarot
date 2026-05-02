'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import axios from 'axios'
import { Navbar } from '../../components/Navbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'

interface Pkg {
  id: string
  label: string
  gross: number
  credits: number
  bonus: number
  highlight?: boolean
}

interface PixResponse {
  transactionId: string
  status: string
  qrCode: string
  qrCodeBase64: string
  copyPaste: string
  expiresAt: string
}

const API = process.env.NEXT_PUBLIC_API_URL

declare global {
  interface Window { MercadoPago?: any }
}

export default function ComprarCreditosPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<Pkg[]>([])
  const [mpPublicKey, setMpPublicKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Pkg | null>(null)
  const [method, setMethod] = useState<'pix' | 'card'>('pix')
  const [globalErr, setGlobalErr] = useState<string | null>(null)

  // PIX state
  const [pix, setPix] = useState<PixResponse | null>(null)
  const [pixStatus, setPixStatus] = useState<string>('pending')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Card state
  const [card, setCard] = useState({
    number: '', name: '', expiry: '', cvv: '', identification: '', email: '',
  })
  const [cardErr, setCardErr] = useState<string | null>(null)
  const [cardSubmitting, setCardSubmitting] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    axios
      .get(`${API}/payments/config`)
      .then((r) => {
        setPackages(r.data.packages || [])
        setMpPublicKey(r.data.mpPublicKey || '')
        const featured = (r.data.packages || []).find((p: Pkg) => p.highlight)
        setSelected(featured || (r.data.packages || [])[0] || null)
      })
      .catch(() => setGlobalErr('Não foi possível carregar os pacotes.'))
      .finally(() => setLoading(false))

    const u = localStorage.getItem('user')
    if (u) try { setCard((c) => ({ ...c, email: JSON.parse(u).email || '' })) } catch {}

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [router])

  // Poll PIX status every 3s while modal is open and pending.
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (!pix || pixStatus !== 'pending') return

    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const r = await axios.get(`${API}/payments/transactions/${pix.transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const next = r.data?.status as string
        setPixStatus(next)
        if (next === 'approved') {
          // refresh user credits in localStorage
          await refreshUserBalance()
          setTimeout(() => router.push('/dashboard?paid=1'), 1500)
        } else if (next === 'rejected' || next === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pix, pixStatus, router])

  async function refreshUserBalance() {
    try {
      const token = localStorage.getItem('token')
      const r = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      localStorage.setItem('user', JSON.stringify(r.data))
    } catch {}
  }

  async function startPix() {
    if (!selected) return
    setSubmitting(true); setGlobalErr(null)
    try {
      const token = localStorage.getItem('token')
      const r = await axios.post(`${API}/payments/pix`,
        { packageId: selected.id },
        { headers: { Authorization: `Bearer ${token}` } })
      setPix(r.data)
      setPixStatus(r.data.status || 'pending')
    } catch (err: any) {
      setGlobalErr(err.response?.data?.message || 'Não foi possível gerar o PIX. Tente novamente.')
    } finally { setSubmitting(false) }
  }

  async function payCard() {
    if (!selected) return
    setCardErr(null)

    if (!window.MercadoPago) {
      setCardErr('SDK do Mercado Pago ainda não carregou — aguarde um instante.')
      return
    }
    if (!mpPublicKey) {
      setCardErr('Pagamento por cartão indisponível no momento.')
      return
    }
    if (card.number.length < 12 || !card.name || card.cvv.length < 3 || !card.expiry.match(/^\d{2}\/\d{2,4}$/)) {
      setCardErr('Confira os dados do cartão.')
      return
    }
    const [mm, yyRaw] = card.expiry.split('/')
    const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw

    setCardSubmitting(true)
    try {
      const mp = new window.MercadoPago(mpPublicKey)

      const cardNumber = card.number.replace(/\s+/g, '')
      const tokenResp = await mp.createCardToken({
        cardNumber,
        cardholderName: card.name,
        cardExpirationMonth: mm,
        cardExpirationYear: yy,
        securityCode: card.cvv,
        identificationType: 'CPF',
        identificationNumber: card.identification.replace(/\D/g, '') || '00000000000',
      })
      if (!tokenResp?.id) throw new Error('Falha ao tokenizar o cartão.')

      // Detect payment method (visa, master, elo, hipercard, amex…)
      const methods = await mp.getPaymentMethods({ bin: cardNumber.slice(0, 6) })
      const paymentMethodId = methods?.results?.[0]?.id || 'visa'

      const token = localStorage.getItem('token')
      // Clear sensitive data from React state immediately after tokenization;
      // the token is single-use and bound to the original card.
      setCard((c) => ({ ...c, number: '', cvv: '' }))

      const r = await axios.post(`${API}/payments/card`, {
        packageId: selected.id,
        cardToken: tokenResp.id,
        paymentMethodId,
        installments: 1,
        payerEmail: card.email,
        identification: card.identification
          ? { type: 'CPF', number: card.identification.replace(/\D/g, '') }
          : undefined,
      }, { headers: { Authorization: `Bearer ${token}` } })

      if (r.data?.status === 'approved') {
        await refreshUserBalance()
        router.push('/dashboard?paid=1')
      } else if (r.data?.status === 'pending') {
        await refreshUserBalance()
        setCardErr('Pagamento em análise — você será notificado por e-mail quando aprovado.')
      } else {
        setCardErr('Pagamento recusado. Tente outro cartão ou método.')
      }
    } catch (err: any) {
      setCardErr(err.response?.data?.message || err?.message || 'Falha ao processar o pagamento.')
    } finally { setCardSubmitting(false) }
  }

  function closePixModal() {
    setPix(null)
    setPixStatus('pending')
    if (pollRef.current) clearInterval(pollRef.current)
  }

  async function copyPix() {
    if (!pix?.copyPaste) return
    try {
      await navigator.clipboard.writeText(pix.copyPaste)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const expiresLabel = useMemo(() => {
    if (!pix?.expiresAt) return ''
    const d = new Date(pix.expiresAt)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }, [pix])

  if (loading) return <PageLoader label="Carregando pacotes…" />

  return (
    <main className="min-h-screen bg-ink-900">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" />
      <Navbar variant="client" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <Badge variant="gold" className="mb-3">Comprar créditos</Badge>
          <h1 className="font-display text-3xl md:text-4xl text-white">
            Escolha seu pacote
          </h1>
          <p className="text-ink-200/80 mt-2">
            1 crédito = 1 minuto na consulta-padrão. Pacotes maiores incluem bônus.
          </p>
        </div>

        {globalErr && <Alert variant="error" className="mb-5">{globalErr}</Alert>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={[
                'text-left rounded-2xl p-5 border transition relative',
                selected?.id === p.id
                  ? 'border-gold-400/70 bg-gold-400/5 shadow-gold'
                  : 'border-white/10 bg-white/5 hover:border-mystic-400/40',
              ].join(' ')}
            >
              {p.highlight && (
                <Badge variant="gold" className="absolute -top-2 left-4">Mais escolhido</Badge>
              )}
              <p className="text-mystic-300 text-xs uppercase tracking-wider">{p.label}</p>
              <p className="font-display text-3xl text-white mt-1">R$ {p.gross.toFixed(0)}</p>
              <p className="text-gold-300 mt-2 text-lg font-semibold">{p.credits} créditos</p>
              {p.bonus > 0 && (
                <p className="text-emerald-300 text-xs mt-1">+ {p.bonus} bônus</p>
              )}
            </button>
          ))}
        </div>

        <Card variant="elevated" className="p-7">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="font-display text-xl text-white">Forma de pagamento</h2>
            <div className="flex bg-white/5 rounded-xl p-1 ml-auto border border-white/10">
              <MethodBtn active={method === 'pix'} onClick={() => setMethod('pix')}>PIX</MethodBtn>
              <MethodBtn active={method === 'card'} onClick={() => setMethod('card')}>Cartão</MethodBtn>
            </div>
          </div>

          {method === 'pix' && (
            <div>
              <p className="text-ink-200">
                Pagamento instantâneo via PIX. Após confirmar, você verá o QR Code
                e o código copia-e-cola. Os créditos caem na sua conta automaticamente
                quando o pagamento é confirmado pelo banco.
              </p>
              <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-ink-100">
                  Total: <span className="text-gold-300 font-semibold">
                    R$ {selected ? selected.gross.toFixed(2) : '—'}
                  </span>
                  {selected && (
                    <span className="text-ink-300 text-sm ml-2">
                      ({selected.credits} créditos)
                    </span>
                  )}
                </div>
                <Button onClick={startPix} loading={submitting} disabled={!selected} size="lg">
                  Gerar PIX
                </Button>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="space-y-4">
              <p className="text-ink-200 text-sm">
                Os dados do cartão são tokenizados localmente pelo SDK do Mercado Pago —
                nunca passam pelos nossos servidores.
              </p>
              {cardErr && <Alert variant="error">{cardErr}</Alert>}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Número do cartão"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    maxLength={23}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Nome impresso no cartão"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                    placeholder="COMO ESTÁ NO CARTÃO"
                  />
                </div>
                <Input
                  label="Validade"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  placeholder="MM/AA"
                  inputMode="numeric"
                  maxLength={7}
                />
                <Input
                  label="CVV"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })}
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                />
                <Input
                  label="CPF do titular"
                  value={card.identification}
                  onChange={(e) => setCard({ ...card, identification: e.target.value })}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={card.email}
                  onChange={(e) => setCard({ ...card, email: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <div className="text-ink-100">
                  Total: <span className="text-gold-300 font-semibold">
                    R$ {selected ? selected.gross.toFixed(2) : '—'}
                  </span>
                </div>
                <Button onClick={payCard} loading={cardSubmitting} disabled={!selected} size="lg">
                  Pagar com cartão
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!pix}
        onClose={closePixModal}
        title={pixStatus === 'approved' ? 'Pagamento confirmado!' : 'Pague com PIX'}
        size="md"
      >
        {pixStatus === 'approved' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-white font-display text-xl">Créditos adicionados à sua conta.</p>
            <p className="text-ink-200 text-sm mt-2">Redirecionando para o painel…</p>
          </div>
        ) : pixStatus === 'rejected' || pixStatus === 'cancelled' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/15 border border-red-400/30 flex items-center justify-center text-red-300">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
            </div>
            <p className="text-white">Pagamento não concluído.</p>
            <p className="text-ink-200 text-sm mt-2">Você pode tentar novamente.</p>
          </div>
        ) : (
          <div>
            {pix?.qrCodeBase64 && (
              <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-4">
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56"
                />
              </div>
            )}
            <p className="text-ink-200 text-sm mb-2">
              Aponte a câmera do app do banco ou copie o código abaixo:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-ink-100 text-xs break-all font-mono leading-relaxed">
                {pix?.copyPaste}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="gold" onClick={copyPix}>
                {copied ? 'Copiado' : 'Copiar código'}
              </Button>
              <Badge variant="mystic">Aguardando pagamento…</Badge>
              {expiresLabel && (
                <span className="text-ink-300 text-xs">Expira às {expiresLabel}</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}

function MethodBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium transition',
        active ? 'bg-mystic-500/30 text-white' : 'text-ink-200 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
