'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { adminClient } from '../../../lib/admin-api'

interface Consultant {
  id: string
  name: string
  email: string
  specialty: string
  bio: string | null
  avatarUrl: string | null
  pricePerMinute: number
  commissionPercent: number
  rating: number
  consultationsCount: number
  isActive: boolean
  isAvailable: boolean
  createdAt: string
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')
function avatarSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url}`
}

const EMPTY: Partial<Consultant> & { password?: string } = {
  name: '',
  email: '',
  specialty: 'Tarot',
  bio: '',
  avatarUrl: null,
  pricePerMinute: 1,
  commissionPercent: 50,
  isActive: true,
  password: '',
}

export default function AdminConsultoresPage() {
  const [items, setItems] = useState<Consultant[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<(Partial<Consultant> & { password?: string }) | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  async function uploadAvatar(file: File) {
    if (!editing?.id) {
      setAvatarError('Salve o consultor antes de enviar o avatar.')
      return
    }
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await adminClient().post(
        `/admin/consultants/${editing.id}/avatar`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setEditing((e) => (e ? { ...e, avatarUrl: r.data?.avatarUrl ?? null } : e))
      load()
    } catch (e: any) {
      setAvatarError(e.response?.data?.message || 'Falha ao enviar avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function clearAvatar() {
    if (!editing?.id) return
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const r = await adminClient().delete(`/admin/consultants/${editing.id}/avatar`)
      setEditing((e) => (e ? { ...e, avatarUrl: r.data?.avatarUrl ?? null } : e))
      load()
    } catch (e: any) {
      setAvatarError(e.response?.data?.message || 'Falha ao remover avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  function load() {
    setLoading(true)
    adminClient()
      .get('/admin/consultants', { params: q ? { q } : {} })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      if (editing.id) {
        const { id, ...body } = editing
        if (!body.password) delete body.password
        await adminClient().patch(`/admin/consultants/${id}`, body)
      } else {
        await adminClient().post('/admin/consultants', editing)
      }
      setEditing(null)
      load()
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Consultores</h1>
          <p className="text-ink-200/80">Gerencie cadastros, tarifas e comissões.</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>+ Novo consultor</Button>
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
                <th className="px-4 py-3 text-left">Especialidade</th>
                <th className="px-4 py-3 text-right">R$/min</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-right">★</th>
                <th className="px-4 py-3 text-right">Atend.</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-300">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-300">
                    Nenhum consultor encontrado.
                  </td>
                </tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="text-white">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-ink-200">{c.email}</td>
                  <td className="px-4 py-3 text-ink-200">{c.specialty}</td>
                  <td className="px-4 py-3 text-right">
                    R$ {Number(c.pricePerMinute).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">{Number(c.commissionPercent)}%</td>
                  <td className="px-4 py-3 text-right text-gold-300">
                    {Number(c.rating).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">{c.consultationsCount}</td>
                  <td className="px-4 py-3 text-center">
                    {c.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="neutral">Inativo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-mystic-200 hover:text-white text-xs"
                      onClick={() => setEditing({ ...c, password: '' })}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar consultor' : 'Novo consultor'}
      >
        {editing && (
          <div className="space-y-3">
            {/* Avatar — só pode ser enviado depois que o consultor existe (precisa de id). */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="shrink-0">
                {editing.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc(editing.avatarUrl)}
                    alt={editing.name || 'avatar'}
                    className="w-16 h-16 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-ink-700 ring-1 ring-white/10 flex items-center justify-center text-ink-100 text-lg">
                    {(editing.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">Foto do consultor</p>
                <p className="text-xs text-ink-300 mt-0.5">
                  {editing.id
                    ? 'JPG, PNG ou WEBP, até 5MB. Substitui a foto atual.'
                    : 'Salve o consultor primeiro para enviar a foto.'}
                </p>
                {avatarError && (
                  <p className="text-xs text-red-300 mt-1">{avatarError}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <label
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${
                      editing.id && !avatarUploading
                        ? 'bg-mystic-500/20 border-mystic-400/30 text-mystic-100 hover:bg-mystic-500/30'
                        : 'bg-white/5 border-white/10 text-ink-400 cursor-not-allowed'
                    }`}
                  >
                    {avatarUploading ? 'Enviando…' : editing.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={!editing.id || avatarUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadAvatar(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {editing.avatarUrl && editing.id && (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      disabled={avatarUploading}
                      className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 text-ink-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Nome"
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <Input
                label="E-mail"
                type="email"
                value={editing.email || ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
              <Input
                label="Especialidade"
                value={editing.specialty || ''}
                onChange={(e) =>
                  setEditing({ ...editing, specialty: e.target.value })
                }
              />
              <Input
                label="Preço por minuto (R$)"
                type="number"
                step="0.01"
                min="0"
                value={String(editing.pricePerMinute ?? '')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    pricePerMinute: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="Comissão do consultor (%)"
                type="number"
                min="0"
                max="100"
                value={String(editing.commissionPercent ?? '')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    commissionPercent: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                label={editing.id ? 'Nova senha (opcional)' : 'Senha'}
                type="password"
                value={editing.password || ''}
                onChange={(e) =>
                  setEditing({ ...editing, password: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-ink-300 uppercase tracking-wider mb-1">
                Bio
              </label>
              <textarea
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
                rows={3}
                value={editing.bio || ''}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={editing.isActive ?? true}
                onChange={(e) =>
                  setEditing({ ...editing, isActive: e.target.checked })
                }
              />
              Ativo
            </label>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
