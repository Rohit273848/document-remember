import { createContext, useContext, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from './LanguageContext.jsx';
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const { t } = useLanguage();
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 3600); };
  return <ToastContext.Provider value={showToast}>{children}{toast && <div className={`toast toast-${toast.type}`}><span className="toast-icon">{toast.type === 'success' ? <Check size={16} /> : <X size={16} />}</span>{t(toast.message)}</div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
