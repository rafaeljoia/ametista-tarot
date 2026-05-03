'use client'

import { useEffect, useMemo, useState } from 'react'
import { adminClient } from '../../../lib/admin-api'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'
import { Modal } from '../../../components/ui/Modal'

interface Version {
  id: string
  version: number
  content: string
  isActive: boolean
  publishedByName: string | null
  publishedAt: string
}

interface Acceptance {
  id: string
  userName: string | null
  userEmail: string | null
  termsVersion: number
  ip: string | null
  acceptedAt: string
}

export default function AdminTermsPage() {
  const [tab, setTab] = useState<'versions' | 'audit'>('versions')
  const [versions, setVersions] = useState<Version[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewing, setViewing] = useState<Version | null>(null)

  const [acc, setAcc] = useState<{ items: Acceptance[]; total: number; page: number; pageSize: number } | null>(null)
  const [accSearch, setAccSearch] = useState('')

  async function loadVersions() {
    try {
      const { data } = await adminClient().get<Version[]>('/admin/terms')
      setVersions(data)
      const active = data.find((v) => v.isActive)
      if (active && !draft) setDraft(active.content)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar versões')
    }
  }

  async function loadAcceptances(page = 1, search = accSearch) {
    try {
      const { data } = await adminClient().get('/admin/terms/acceptances', {
        params: { page, pageSize: 20, search: search || undefined },
      })
      setAcc(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar aceitações')
    }
  }

  useEffect(() => { loadVersions() }, [])
  useEffect(() => { if (tab === 'audit' && !acc) loadAcceptances(1) }, [tab])

  const active = useMemo(() => versions.find((v) => v.isActive) || null, [versions])

  async function publish() {
    if (!confirm('Publicar uma nova versão dos termos? Todos os usuários atuais terão a versão antiga registrada como aceita.')) return
    setLoading(true); setError(''); setSuccess('')
    try {
      await adminClient().post('/admin/terms', { content: draft })
      setSuccess('Nova versão publicada com sucesso')
      await loadVersions()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao publicar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Termos de Uso</h1>
        <p className="text-ink-300 text-sm mt-1">
          Edite e publique novas versões. Todas as aceitações ficam auditáveis.
        </p>
      </div>

      <div className="flex gap-2 border-b border-white/[0.06]">
        <button
          onClick={() => setTab('versions')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === 'versions' ? 'border-mystic-400 text-white' : 'border-transparent text-ink-300 hover:text-white'}`}
        >Versões e editor</button>
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === 'audit' ? 'border-mystic-400 text-white' : 'border-transparent text-ink-300 hover:text-white'}`}
        >Auditoria de aceitações</button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {tab === 'versions' && (
        <>
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-medium">
                  Versão ativa: {active ? `v${active.version}` : '—'}
                </h2>
                <Button onClick={publish} loading={loading} size="sm">Publicar como nova versão</Button>
              </div>
              <p className="text-xs text-ink-300 mb-3">
                O conteúdo abaixo será salvo como uma <strong>nova versão (v{(active?.version ?? 0) + 1})</strong> e ativada. Aceite Markdown.
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={20}
                className="w-full bg-ink-900/60 border border-white/10 rounded-md p-3 text-ink-100 text-sm font-mono leading-relaxed"
                placeholder="# TERMOS DE USO ..."
              />
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h3 className="text-white font-medium mb-3">Histórico de versões</h3>
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-md bg-ink-900/40 border border-white/[0.04]">
                    <div>
                      <div className="text-white text-sm flex items-center gap-2">
                        v{v.version} {v.isActive && <Badge variant="gold">Ativa</Badge>}
                      </div>
                      <div className="text-xs text-ink-300">
                        {new Date(v.publishedAt).toLocaleString('pt-BR')} · por {v.publishedByName || '—'}
                      </div>
                    </div>
                    <button onClick={() => setViewing(v)} className="text-sm text-mystic-300 hover:text-white">Ver conteúdo</button>
                  </div>
                ))}
                {versions.length === 0 && <p className="text-sm text-ink-300">Nenhuma versão ainda.</p>}
              </div>
            </div>
          </Card>

          {viewing && (
            <Modal open onClose={() => setViewing(null)} title={`Termos v${viewing.version}`} size="lg">
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-ink-100 leading-relaxed">
                {viewing.content}
              </div>
            </Modal>
          )}
        </>
      )}

      {tab === 'audit' && (
        <Card>
          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              <input
                value={accSearch}
                onChange={(e) => setAccSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="flex-1 bg-ink-900/60 border border-white/10 rounded-md px-3 py-2 text-sm"
              />
              <Button onClick={() => loadAcceptances(1, accSearch)} size="sm">Buscar</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-300 uppercase">
                  <tr>
                    <th className="text-left py-2 px-2">Usuário</th>
                    <th className="text-left py-2 px-2">E-mail</th>
                    <th className="text-left py-2 px-2">Versão</th>
                    <th className="text-left py-2 px-2">IP</th>
                    <th className="text-left py-2 px-2">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {acc?.items?.map((a) => (
                    <tr key={a.id} className="border-t border-white/[0.04]">
                      <td className="py-2 px-2 text-white">{a.userName || '—'}</td>
                      <td className="py-2 px-2 text-ink-200">{a.userEmail || '—'}</td>
                      <td className="py-2 px-2">v{a.termsVersion}</td>
                      <td className="py-2 px-2 text-ink-300 font-mono text-xs">{a.ip || '—'}</td>
                      <td className="py-2 px-2 text-ink-300">{new Date(a.acceptedAt).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {(!acc || acc.items.length === 0) && (
                    <tr><td colSpan={5} className="text-center py-6 text-ink-300">Nenhuma aceitação encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {acc && acc.total > acc.pageSize && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-300">Total: {acc.total}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={acc.page <= 1} onClick={() => loadAcceptances(acc.page - 1)}>Anterior</Button>
                  <Button size="sm" variant="ghost" disabled={acc.page * acc.pageSize >= acc.total} onClick={() => loadAcceptances(acc.page + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
