import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, CircleHelp, Clock3, FilePlus2, Files, FolderHeart, LayoutDashboard, LogOut, Menu, Settings2, ShieldCheck, UsersRound, X, HeartHandshake, History, UserRound, AlertTriangle, Tags } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/format.js';
import { LanguageToggle, useLanguage } from '../context/LanguageContext.jsx';
import { notificationCopy } from '../utils/localize.js';

const navItems = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'All documents', to: '/documents', icon: Files },
  { label: 'Categories', to: '/categories', icon: Tags },
  { label: 'Upcoming renewals', to: '/upcoming', icon: Clock3 },
  { label: 'Expired documents', to: '/expired', icon: AlertTriangle },
  { label: 'Reminder center', to: '/reminders', icon: Bell },
];
const familyItems = [
  { label: 'Family members', to: '/family', icon: UsersRound },
  { label: 'Invitations', to: '/invitations', icon: HeartHandshake },
  { label: 'Activity history', to: '/activity', icon: History },
];
const settingItems = [
  { label: 'Profile settings', to: '/settings/profile', icon: UserRound },
  { label: 'Security settings', to: '/settings/security', icon: ShieldCheck },
  { label: 'Application settings', to: '/settings/application', icon: Settings2 },
];

export default function AppLayout() {
  const { t, language } = useLanguage();
  const { user, families, selectedFamily, selectFamily } = useAuth(); const [mobileNav, setMobileNav] = useState(false); const [notificationsOpen, setNotificationsOpen] = useState(false); const [notifications, setNotifications] = useState([]); const [unread, setUnread] = useState(0); const navigate = useNavigate();
  const loadNotifications = () => api.get('/notifications?limit=5').then(({ data }) => { setNotifications(data.notifications); setUnread(data.unread); }).catch(() => {});
  useEffect(() => { loadNotifications(); const timer = window.setInterval(loadNotifications, 60000); return () => window.clearInterval(timer); }, []);
  const logout = async () => { await api.post('/auth/logout').catch(() => {}); window.location.href = '/login'; };
  const navLink = (item) => <NavLink key={item.to} to={item.to} onClick={() => setMobileNav(false)} className={({ isActive }) => `side-link ${isActive ? 'side-link-active' : ''}`}><item.icon size={18} strokeWidth={1.8} /><span>{t(item.label)}</span></NavLink>;
  return <div className="app-shell">
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label={t('Close navigation')} />}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><Link to="/dashboard" className="brand-mark"><FolderHeart size={20} /></Link><span className="brand-name">hearth<small>{t('family documents')}</small></span><button className="icon-button close-sidebar" aria-label={t('Close menu')} onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="family-switcher"><span className="switcher-caption">{t('YOUR WORKSPACE')}</span>{families.length ? <label className="family-select-wrap"><span className="family-avatar">{(selectedFamily?.familyName || 'F').slice(0, 1).toUpperCase()}</span><select value={selectedFamily?._id || ''} onChange={(e) => { const item = families.find((f) => (f.familyId?._id || f._id) === e.target.value); selectFamily(item?.familyId || item); }} aria-label={t('Select family workspace')}>{families.map((item) => { const family = item.familyId || item; return <option key={family._id} value={family._id}>{family.familyName}</option>; })}</select><ChevronDown size={15} /></label> : <Link className="create-family-link" to="/dashboard">{t('Create your family')} <span>＋</span></Link>}</div>
      <nav className="side-nav"><span className="nav-caption">{t('LIBRARY')}</span>{navItems.map(navLink)}<span className="nav-caption nav-caption-spaced">{t('YOUR FAMILY')}</span>{familyItems.map(navLink)}<span className="nav-caption nav-caption-spaced">{t('PREFERENCES')}</span>{settingItems.map(navLink)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>{t('Need a hand?')}</strong><small>{t('Keep every renewal in view.')}</small></div><Link to="/reminders" aria-label={t('Open reminders')}>↗</Link></div><div className="user-chip"><button className="user-profile-button" onClick={() => navigate('/settings/profile')}><span className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span><span className="user-name"><strong>{user?.name || t('Your account')}</strong><small>{user?.email}</small></span></button><button className="icon-button logout-button" title={t('Sign out')} onClick={logout}><LogOut size={16} /></button></div></div>
    </aside>
    <div className="workspace-main"><header className="topbar"><button className="icon-button mobile-menu" aria-label={t('Open navigation')} onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>{t('Workspace')}</span><span className="crumb-slash">/</span><strong>{selectedFamily?.familyName || t('My family')}</strong></div><div className="topbar-actions"><LanguageToggle /><Link to="/documents/new" className="btn btn-primary btn-small"><FilePlus2 size={16} /><span>{t('Add document')}</span></Link><div className="notification-wrap"><button className={`icon-button notification-button ${notificationsOpen ? 'is-open' : ''}`} aria-label={t('Notifications')} onClick={() => { setNotificationsOpen((v) => !v); if (!notificationsOpen) loadNotifications(); }}><Bell size={18} />{unread > 0 && <i />}</button>{notificationsOpen && <><button className="click-away" aria-label={t('Close notifications')} onClick={() => setNotificationsOpen(false)} /><div className="notification-popover"><div className="popover-head"><div><strong>{t('Notifications')}</strong><small>{unread ? `${unread} ${t('unread')}` : t('You’re all caught up')}</small></div><Link to="/notifications" onClick={() => setNotificationsOpen(false)}>{t('View all')}</Link></div>{notifications.length ? notifications.map((item) => { const copy = notificationCopy(item, language); return <Link className={`mini-notification ${item.isRead ? '' : 'mini-unread'}`} key={item._id} to={item.documentId?._id ? `/documents/${item.documentId._id}` : '/notifications'} onClick={() => setNotificationsOpen(false)}><span className="mini-notification-dot" /><span><strong>{copy.title}</strong><small>{copy.message}</small><small className="mini-time">{timeAgo(item.createdAt, language)}</small></span></Link>; }) : <div className="popover-empty">{t('No notifications yet.')}</div>}</div></>}</div><button className="user-avatar top-avatar" title={user?.name}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</button></div></header><main className="main-content"><Outlet /></main><footer className="app-footer"><span>{t('Made for the people you care about.')}</span><span>{t('Private by design')} <i /></span></footer></div>
  </div>;
}
