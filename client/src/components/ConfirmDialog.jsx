import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', onConfirm, onClose, danger = false }) {
  const { t } = useLanguage();
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="icon-button modal-close" onClick={onClose} aria-label={t('Close')}><X size={18} /></button><div className="modal-mark">{danger ? <span className="coral-dot" /> : <span className="teal-dot" />}</div><h2 id="confirm-title">{t(title)}</h2><p>{t(message)}</p><div className="modal-actions"><button className="btn btn-outline" onClick={onClose}>{t('Cancel')}</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{t(confirmLabel)}</button></div></div></div>;
}
