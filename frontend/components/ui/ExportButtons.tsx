'use client'

import { useState } from 'react'
import { Button } from './Button'

export interface ExportColumn<T = any> {
  header: string
  accessor: (row: T) => string | number | null | undefined
  width?: number
}

interface Props<T> {
  data: T[]
  columns: ExportColumn<T>[]
  filename: string
  title?: string
  disabled?: boolean
}

export function ExportButtons<T>({
  data,
  columns,
  filename,
  title,
  disabled,
}: Props<T>) {
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null)

  function rowsAsMatrix(): { headers: string[]; rows: (string | number)[][] } {
    const headers = columns.map((c) => c.header)
    const rows = data.map((row) =>
      columns.map((c) => {
        const v = c.accessor(row)
        if (v === null || v === undefined) return ''
        return v as any
      }),
    )
    return { headers, rows }
  }

  async function exportXlsx() {
    if (!data.length) return
    setBusy('xlsx')
    try {
      const XLSX = await import('xlsx')
      const { headers, rows } = rowsAsMatrix()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = columns.map((c) => ({ wch: c.width || 18 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, (title || filename).slice(0, 30))
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    if (!data.length) return
    setBusy('pdf')
    try {
      const jsPDFmod = await import('jspdf')
      await import('jspdf-autotable')
      const jsPDF = (jsPDFmod as any).default || (jsPDFmod as any).jsPDF
      const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' })
      const { headers, rows } = rowsAsMatrix()

      if (title) {
        doc.setFontSize(14)
        doc.text(title, 14, 14)
      }
      doc.setFontSize(9)
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} • ${data.length} registros`,
        14,
        title ? 20 : 14,
      )
      ;(doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: title ? 26 : 20,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [76, 29, 149], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        margin: { left: 10, right: 10 },
      })
      doc.save(`${filename}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  const isDisabled = disabled || !data.length
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        onClick={exportXlsx}
        disabled={isDisabled}
        loading={busy === 'xlsx'}
        title={!data.length ? 'Sem dados para exportar' : 'Exportar para Excel'}
      >
        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13l3 3 5-5" />
        </svg>
        Excel
      </Button>
      <Button
        variant="ghost"
        onClick={exportPdf}
        disabled={isDisabled}
        loading={busy === 'pdf'}
        title={!data.length ? 'Sem dados para exportar' : 'Exportar para PDF'}
      >
        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 15h6M9 18h6M9 12h2" />
        </svg>
        PDF
      </Button>
    </div>
  )
}
