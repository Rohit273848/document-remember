import { ArrowUpRight, FileText, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { daysLeft, formatDate } from '../utils/format.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function DocumentTable({ documents = [], compact = false, empty = 'No documents yet' }) {
  const { t, language } = useLanguage();
  if (!documents.length) return <div className="table-empty"><FileText size={20} /><span>{t(empty)}</span></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('Document')}</th><th>{t('Owner')}</th><th>{t('Category')}</th><th>{t('Renew by')}</th><th>{t('Status')}</th><th aria-label={t('Open')}></th></tr></thead><tbody>{documents.map((doc) => {
    const days = daysLeft(doc.expiryDateOnly || doc.expiryDate); const archived = doc.displayStatus === 'archived'; const expired = doc.displayStatus === 'expired' || (!archived && days < 0);
    const number = new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-US');
    return <tr key={doc._id}><td><Link to={`/documents/${doc._id}`} className="doc-cell"><span className="doc-type-icon"><FileText size={17} /></span><span><strong>{doc.title}</strong><small>{doc.issuingAuthority || t(doc.category)}</small></span></Link></td><td>{doc.ownerId?.name || doc.ownerId?.email || '—'}</td><td><span className="category-pill">{t(doc.category)}</span></td><td><span>{formatDate(doc.expiryDateOnly || doc.expiryDate, undefined, language === 'hi' ? 'hi-IN' : undefined)}</span><small className={`date-hint ${expired ? 'is-expired' : !archived && days <= 30 ? 'is-soon' : ''}`}>{archived ? t('In family history') : expired ? `${number.format(Math.abs(days))} ${t('days overdue')}` : days === 0 ? t('Due today') : `${number.format(days)} ${t('days left')}`}</small></td><td><span className={`status-pill ${archived ? 'status-archived' : expired ? 'status-expired' : days <= 30 ? 'status-soon' : 'status-active'}`}><i />{t(archived ? 'Archived' : expired ? 'Expired' : days <= 30 ? 'Due soon' : 'On track')}</span></td><td><Link className="table-action" to={`/documents/${doc._id}`} aria-label={`${t('Open')} ${doc.title}`}>{compact ? <ArrowUpRight size={17} /> : <MoreHorizontal size={17} />}</Link></td></tr>;
  })}</tbody></table></div>;
}
