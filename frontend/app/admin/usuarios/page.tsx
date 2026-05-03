'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { ExportButtons } from '../../../components/ui/ExportButtons'
import { adminClient } from '../../../lib/admin-api'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  credits: number
  isActive: boolean
  createdAt: string
}

interface UserDetail {
  user: User
  consultations: any[]
  transactions: any[]
}

export default function AdminUsuariosPage() {
  const [items, setItems] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<UserDetail | null>(null)

  function load() {
    setLoading(true)
    adminClient()
      .get('/admin/users', { params: q ? { q } : {} })
      .then((r) => {
        setItems(r.data.items)
        setTotal(r.data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function viewDetail(id: string) {
    const r = await adminClient().get(`/admin/users/${id}`)
    setDetail(r.data)
  }

  async function toggleActive(u: User) {
    await adminClient().patch(`/admin/users/${u.id}/status`, {
      isActive: !u.isActive,
    })
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Usuários</h1>
          <p className="text-ink-200/80">{total} cadastrados</p>
        </div>
        <ExportButtons
          data={items}
          filename={`usuarios-${new Date().toISOString().slice(0, 10)}`}
          title="Usuários"
          columns={[
            { header: 'Nome', accessor: (u) => u.name, width: 28 },
            { header: 'E-mail', accessor: (u) => u.email, width: 30 },
            { header: 'Telefone', accessor: (u) => u.phone || '', width: 16 },
            { header: 'Créditos', accessor: (u) => Number(u.credits || 0).toFixed(2) },
            { header: 'Status', accessor: (u) => (u.isActive ? 'Ativo' : 'Inativo') },
            { header: 'Cadastro', accessor: (u) => new Date(u.createdAt).toLocaleString('pt-BR') },
          ]}
        />
      </div>

      <Card className="p-4 flex gap-3">
        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <Button variant="ghost" onClick={load}>
          Buscar
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-ink-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Cadastro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-ink-300">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-ink-300">
                    Nenhum usuário.
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr key={u.id} className="text-white">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-ink-200">{u.email}</td>
                  <td className="px-4 py-3 text-ink-200">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-right text-gold-300">
                    R$ {Number(u.credits).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="neutral">Bloqueado</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-300 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      className="text-mystic-200 hover:text-white text-xs mr-3"
                      onClick={() => viewDetail(u.id)}
                    >
                      Ver
                    </button>
                    <button
                      className="text-red-300 hover:text-red-200 text-xs"
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? 'Bloquear' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Usuário · ${detail.user.name}` : ''}
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-2 text-ink-200">
              <div>E-mail: <span className="text-white">{detail.user.email}</span></div>
              <div>Telefone: <span className="text-white">{detail.user.phone || '—'}</span></div>
              <div>Créditos: <span className="text-gold-300">R$ {Number(detail.user.credits).toFixed(2)}</span></div>
              <div>Cadastro: <span className="text-white">{new Date(detail.user.createdAt).toLocaleString('pt-BR')}</span></div>
            </div>
            <div>
              <h3 className="text-white font-semibold mt-3 mb-1">
                Últimas atendimentos ({detail.consultations.length})
              </h3>
              <ul className="text-ink-200 text-xs space-y-1 max-h-40 overflow-auto">
                {detail.consultations.map((c: any) => (
                  <li key={c.id}>
                    {new Date(c.createdAt).toLocaleString('pt-BR')} — {c.status} — R$ {Number(c.creditsUsed || 0).toFixed(2)}
                  </li>
                ))}
                {detail.consultations.length === 0 && <li>Nenhuma.</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mt-3 mb-1">
                Últimas transações ({detail.transactions.length})
              </h3>
              <ul className="text-ink-200 text-xs space-y-1 max-h-40 overflow-auto">
                {detail.transactions.map((t: any) => (
                  <li key={t.id}>
                    {new Date(t.createdAt).toLocaleString('pt-BR')} — {t.method.toUpperCase()} — {t.status} — R$ {Number(t.gross || 0).toFixed(2)}
                  </li>
                ))}
                {detail.transactions.length === 0 && <li>Nenhuma.</li>}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
