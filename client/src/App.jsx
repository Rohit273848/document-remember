import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { Loading } from './components/Feedback.jsx';
import { FolderHeart } from 'lucide-react';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const DocumentsPage = lazy(() => import('./pages/DocumentPages.jsx').then((module) => ({ default: module.DocumentsPage })));
const CategoriesPage = lazy(() => import('./pages/DocumentPages.jsx').then((module) => ({ default: module.CategoriesPage })));
const DocumentFormPage = lazy(() => import('./pages/DocumentPages.jsx').then((module) => ({ default: module.DocumentFormPage })));
const DocumentDetailPage = lazy(() => import('./pages/DocumentPages.jsx').then((module) => ({ default: module.DocumentDetailPage })));
const ReminderCenterPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.ReminderCenterPage })));
const NotificationsPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.NotificationsPage })));
const FamilyMembersPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.FamilyMembersPage })));
const InvitationsPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.InvitationsPage })));
const ActivityPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.ActivityPage })));
const ProfileSettingsPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.ProfileSettingsPage })));
const SecuritySettingsPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.SecuritySettingsPage })));
const ApplicationSettingsPage = lazy(() => import('./pages/WorkspacePages.jsx').then((module) => ({ default: module.ApplicationSettingsPage })));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/PublicPages.jsx').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/PublicPages.jsx').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/PublicPages.jsx').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/PublicPages.jsx').then((module) => ({ default: module.ResetPasswordPage })));
const InvitationAcceptPage = lazy(() => import('./pages/PublicPages.jsx').then((module) => ({ default: module.InvitationAcceptPage })));

function Protected({ children }) { const { user, loading } = useAuth(); const { t } = useLanguage(); if (loading) return <Loading label={t('Opening Hearth')} />; return user ? children : <Navigate to="/login" replace />; }
function PublicOnly({ children }) { const { user, loading } = useAuth(); const { t } = useLanguage(); if (loading) return <Loading label={t('Opening Hearth')} />; return user ? <Navigate to="/dashboard" replace /> : children; }
function FamilyGuard({ children }) { const { selectedFamily, families } = useAuth(); const { t } = useLanguage(); if (!selectedFamily && families.length === 0) return <div className="no-family-state"><span className="brand-mark"><FolderHeart size={20} /></span><h2>{t('Make a home for your documents.')}</h2><p>{t('Create a family workspace before you add documents or renewals.')}</p><Link className="btn btn-primary" to="/dashboard">{t('Set up your family space')}</Link></div>; return children; }
function MissingPage() { const { t } = useLanguage(); return <div className="no-family-state"><h2>{t('We couldn’t find that page.')}</h2><p>{t('Let’s get you back to your family workspace.')}</p><Link className="btn btn-primary" to="/dashboard">{t('Go to overview')}</Link></div>; }
function AppRoutes() {
  return <Suspense fallback={<Loading label="Opening your family space" />}><Routes>
    <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
    <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
    <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
    <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/invitations/accept" element={<Protected><InvitationAcceptPage /></Protected>} />
    <Route element={<Protected><AppLayout /></Protected>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/documents" element={<FamilyGuard><DocumentsPage /></FamilyGuard>} />
      <Route path="/documents/new" element={<FamilyGuard><DocumentFormPage /></FamilyGuard>} />
      <Route path="/documents/:id/edit" element={<FamilyGuard><DocumentFormPage mode="edit" /></FamilyGuard>} />
      <Route path="/documents/:id/renew" element={<FamilyGuard><DocumentFormPage mode="renew" /></FamilyGuard>} />
      <Route path="/documents/:id" element={<FamilyGuard><DocumentDetailPage /></FamilyGuard>} />
      <Route path="/categories" element={<FamilyGuard><CategoriesPage /></FamilyGuard>} />
      <Route path="/upcoming" element={<FamilyGuard><DocumentsPage listMode="upcoming" /></FamilyGuard>} />
      <Route path="/expired" element={<FamilyGuard><DocumentsPage listMode="expired" /></FamilyGuard>} />
      <Route path="/reminders" element={<FamilyGuard><ReminderCenterPage /></FamilyGuard>} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/family" element={<FamilyGuard><FamilyMembersPage /></FamilyGuard>} />
      <Route path="/invitations" element={<InvitationsPage />} />
      <Route path="/activity" element={<FamilyGuard><ActivityPage /></FamilyGuard>} />
      <Route path="/settings/profile" element={<ProfileSettingsPage />} />
      <Route path="/settings/security" element={<SecuritySettingsPage />} />
      <Route path="/settings/application" element={<ApplicationSettingsPage />} />
    </Route>
    <Route path="*" element={<MissingPage />} />
  </Routes></Suspense>;
}
export default function App() { return <AuthProvider><LanguageProvider><ToastProvider><AppRoutes /></ToastProvider></LanguageProvider></AuthProvider>; }
