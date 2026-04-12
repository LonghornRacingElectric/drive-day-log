import { useEffect } from 'react'
import { Download } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onExportPDF: () => void
  onExportXLSX: () => void
}

export default function ExportModal({ open, onClose, onExportPDF, onExportXLSX }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-icon-row">
          <div className="modal-icon" style={{ color: 'var(--orange-light)', background: 'var(--orange-dim)' }}>
            <Download size={20} />
          </div>
        </div>

        <h3 className="modal-title">Export Log</h3>
        <p className="modal-message">Choose the format you would like to export.</p>

        <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => { onExportPDF(); onClose(); }} style={{ width: '100%', justifyContent: 'center' }}>
            Export as PDF
          </button>
          <button className="btn btn-ghost" onClick={() => { onExportXLSX(); onClose(); }} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-mid)' }}>
            Export as XSLX
          </button>
          <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
