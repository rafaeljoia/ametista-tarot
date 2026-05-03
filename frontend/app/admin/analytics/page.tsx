'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { adminClient } from '../../../lib/admin-api'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

interface Analytics {
  generatedAt: string
  summary: {
    usersCount: number
    activeUsers: number
    consultantsCount: number
    activeConsultants: number
    consultationsLast30: number
    revenueLast30: number
    ticketAvgLast30: number
    pendingCommissions: number
  }
  revenueByDay: { date: string; revenue: number }[]
  consultationsByDay: { date: string; count: number }[]
  newUsersByDay: { date: string; count: number }[]
  consultationsByKind: { kind: string; count: number }[]
  topConsultantsByRevenue: { id: string; name: string; revenue: number; consultations: number }[]
}

const KIND_LABEL: Record<string, string> = {
  chat: 'Chat',
  voice: 'Voz',
  video: 'Vídeo',
}
const KIND_COLOR: Record<string, string> = {
  chat: '#a78bfa',
  voice: '#60a5fa',
  video: '#f472b6',
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminClient()
      .get<Analytics>('/admin/analytics/overview')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Não foi possível carregar os indicadores.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-ink-200">Carregando indicadores…</div>
  }
  if (error || !data) {
    return <div className="text-red-300">{error}</div>
  }

  const s = data.summary
  const revenueData = data.revenueByDay.map((r) => ({ x: fmtDateShort(r.date), revenue: r.revenue }))
  const consultData = data.consultationsByDay.map((r) => ({ x: fmtDateShort(r.date), atendimentos: r.count }))
  const newUsersData = data.newUsersByDay.map((r) => ({ x: fmtDateShort(r.date), novos: r.count }))
  const kindData = data.consultationsByKind.map((k) => ({
    name: KIND_LABEL[k.kind] || k.kind,
    value: k.count,
    color: KIND_COLOR[k.kind] || '#a78bfa',
  }))
  const topConsultData = data.topConsultantsByRevenue.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
    receita: c.revenue,
    atendimentos: c.consultations,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-white">Analytics</h1>
          <p className="text-ink-200/80">
            Visão dos últimos 30 dias • atualizado {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Receita (30d)" value={fmtBRL(s.revenueLast30)} accent />
        <Kpi label="Atendimentos (30d)" value={String(s.consultationsLast30)} />
        <Kpi label="Ticket médio (30d)" value={fmtBRL(s.ticketAvgLast30)} />
        <Kpi label="Comissões pendentes" value={fmtBRL(s.pendingCommissions)} />
        <Kpi label="Clientes" value={String(s.usersCount)} sub={`${s.activeUsers} ativos`} />
        <Kpi label="Consultores" value={String(s.consultantsCount)} sub={`${s.activeConsultants} ativos`} />
        <Kpi label="Conversão clientes ativos"
          value={s.usersCount ? `${Math.round((s.activeUsers / s.usersCount) * 100)}%` : '—'}
        />
        <Kpi label="Conversão consultores ativos"
          value={s.consultantsCount ? `${Math.round((s.activeConsultants / s.consultantsCount) * 100)}%` : '—'}
        />
      </div>

      {/* Gráficos linha — receita e atendimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Receita por dia (últimos 30d)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="x" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1e1b3a', border: '1px solid #4c1d95', borderRadius: 8, color: '#fff' }}
                formatter={(v: any) => fmtBRL(Number(v))}
              />
              <Line type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} dot={false} name="Receita" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Atendimentos por dia (últimos 30d)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={consultData}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="x" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e1b3a', border: '1px solid #4c1d95', borderRadius: 8, color: '#fff' }}
              />
              <Line type="monotone" dataKey="atendimentos" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Novos clientes por dia (últimos 30d)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={newUsersData}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="x" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e1b3a', border: '1px solid #4c1d95', borderRadius: 8, color: '#fff' }}
              />
              <Bar dataKey="novos" fill="#f472b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por tipo de atendimento (30d)">
          {kindData.reduce((s, k) => s + k.value, 0) === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-ink-300">
              Nenhum atendimento nos últimos 30 dias.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={kindData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {kindData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e1b3a', border: '1px solid #4c1d95', borderRadius: 8, color: '#fff' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Top 10 consultores por receita (geral)">
        {topConsultData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-ink-300">
            Sem receita registrada ainda.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, topConsultData.length * 36)}>
            <BarChart data={topConsultData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={140} />
              <Tooltip
                contentStyle={{ background: '#1e1b3a', border: '1px solid #4c1d95', borderRadius: 8, color: '#fff' }}
                formatter={(v: any, name: string) =>
                  name === 'receita' ? fmtBRL(Number(v)) : v
                }
              />
              <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              <Bar dataKey="receita" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              <Bar dataKey="atendimentos" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? 'ring-1 ring-purple-400/40' : ''}`}>
      <div className="text-xs text-ink-200 uppercase tracking-wider">{label}</div>
      <div className="text-2xl text-white font-display mt-1">{value}</div>
      {sub && <div className="text-xs text-ink-300 mt-0.5">{sub}</div>}
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-display text-lg">{title}</h2>
        <Badge variant="mystic">30d</Badge>
      </div>
      {children}
    </Card>
  )
}
