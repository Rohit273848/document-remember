import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarClock, Check, FileCheck2, FolderHeart, History, LockKeyhole, Mail, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LanguageToggle, useLanguage } from '../context/LanguageContext.jsx';

const examples = {
  passport: { label: 'Passport', owner: 'Shubham', email: 'shubham@example.com', category: 'ID & Travel' },
  insurance: { label: 'Vehicle insurance', owner: 'Rohit', email: 'rohit@example.com', category: 'Vehicles' },
  school: { label: 'School admission form', owner: 'Aisha', email: 'aisha@example.com', category: 'School & Work' },
};

const milestones = [
  { days: 180, label: '6 months', detail: 'Plan ahead for appointments' },
  { days: 90, label: '90 days', detail: 'Start getting ready' },
  { days: 30, label: '30 days', detail: 'Gather papers and book appointments' },
  { days: 7, label: '7 days', detail: 'Make the final arrangements' },
  { days: 1, label: '1 day', detail: 'A gentle last reminder' },
  { days: 0, label: 'Due today', detail: 'The renewal date is here' },
];

function expiryDateAfter(days, language) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function reminderMessage(title, days, date, language, t) {
  if (language === 'hi') {
    if (days === 0) return `${title} की नवीनीकरण तारीख़ आज (${date}) है।`;
    if (days === 1) return `${title} की समय-सीमा कल (${date}) है।`;
    return `${title} की समय-सीमा ${days} दिन बाद (${date}) है।`;
  }
  if (days === 0) return `${title} is due today (${date}).`;
  if (days === 1) return `${title} expires tomorrow (${date}).`;
  return `${title} expires in ${days} days (${date}).`;
}

export function LandingPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [exampleKey, setExampleKey] = useState('passport');
  const [reminderDays, setReminderDays] = useState(30);
  const [previewMode, setPreviewMode] = useState('email');
  if (user) return <Navigate to="/dashboard" replace />;

  const example = examples[exampleKey];
  const milestone = milestones.find((item) => item.days === reminderDays);
  const expiryDate = expiryDateAfter(reminderDays, language);
  const message = reminderMessage(t(example.label), reminderDays, expiryDate, language, t);

  return <div className="landing-page">
    <header className="landing-nav">
      <Link to="/" className="brand-lockup"><span className="brand-mark"><FolderHeart size={20} /></span><span className="brand-name">hearth<small>family documents</small></span></Link>
      <nav aria-label={t('Main navigation')}><LanguageToggle /><a className="nav-signin" href="#how-it-works">{t('How it works')}</a><Link to="/login" className="nav-signin">{t('Sign in')}</Link><Link to="/register" className="btn btn-primary btn-small">{t('Create your space')} <ArrowRight size={15} /></Link></nav>
    </header>

    <main className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <span className="eyebrow"><CalendarClock size={15} /> {t('Family documents and renewal reminders')}</span>
          <h1 id="landing-title">{language === 'hi' ? <>{t('Know what’s due.')} <em>{t('Keep it moving.')}</em></> : <>Know what’s due. <em>Keep it moving.</em></>}</h1>
          <p>{t('Store important family documents, choose who looks after each one, and get a timely nudge before renewal dates arrive.')}</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">{t('Create your family space')} <ArrowRight size={17} /></Link>
            <Link to="/login" className="text-link">{t('I already have an account')}</Link>
          </div>
          <div className="landing-points"><span><ShieldCheck size={17} /> {t('Private family access')}</span><span><BellRing size={17} /> {t('Email and in-app reminders')}</span></div>
        </div>

        <section className="reminder-demo" aria-labelledby="demo-title">
          <div className="demo-heading">
            <div><span className="demo-kicker"><Mail size={14} /> {t('INTERACTIVE PREVIEW')}</span><h2 id="demo-title">{t('See the reminder your family gets')}</h2></div>
            <span className="demo-label"><span /> {t('Sample')}</span>
          </div>
          <div className="demo-controls">
            <div className="demo-control">
              <span className="demo-control-label">{t('Example document')}</span>
              <div className="demo-choice-row" role="group" aria-label={t('Choose an example document')}>
                {Object.entries(examples).map(([key, item]) => <button key={key} type="button" className={`demo-choice ${exampleKey === key ? 'is-selected' : ''}`} aria-pressed={exampleKey === key} onClick={() => setExampleKey(key)}>{t(item.label)}</button>)}
              </div>
            </div>
            <div className="demo-control">
              <span className="demo-control-label">{t('Show the reminder sent')}</span>
              <div className="milestone-choices" role="group" aria-label={t('Choose reminder timing')}>
                {milestones.map((item) => <button key={item.days} type="button" className={`milestone-choice ${reminderDays === item.days ? 'is-selected' : ''}`} aria-pressed={reminderDays === item.days} onClick={() => setReminderDays(item.days)}>{t(item.label)}</button>)}
              </div>
              <small className="demo-hint">{t(milestone.detail)}</small>
            </div>
          </div>

          <div className="preview-tabs" role="group" aria-label={t('Choose reminder delivery preview')}>
            <button type="button" aria-pressed={previewMode === 'email'} className={previewMode === 'email' ? 'is-active' : ''} onClick={() => setPreviewMode('email')}><Mail size={15} /> {t('Email')}</button>
            <button type="button" aria-pressed={previewMode === 'app'} className={previewMode === 'app' ? 'is-active' : ''} onClick={() => setPreviewMode('app')}><BellRing size={15} /> {t('In Hearth')}</button>
          </div>

          {previewMode === 'email' ? <article className="email-preview" role="region" aria-live="polite" aria-label={t('Example reminder email')}>
            <div className="email-window-bar"><span><i /><i /><i /> {t('Mail preview')}</span><small>{t('Sample message')}</small></div>
            <div className="email-message">
              <div className="email-sender"><span className="email-avatar"><FolderHeart size={18} /></span><span><strong>{t('Hearth Family Documents')}</strong><small>{t('to')} {example.owner} · {example.email}</small></span><time>{t('Reminder preview')}</time></div>
              <div className="email-subject"><small>{t('Subject')}</small><strong>{t('Renewal reminder:')} {t(example.label)}</strong></div>
              <div className="email-body">
                <span className="email-status"><CalendarClock size={14} /> {t(milestone.label)} {t('before renewal')}</span>
                <p>{message}</p>
                <Link to="/login" className="email-cta">{t('Open family documents')} <ArrowRight size={16} /></Link>
                <p className="email-security"><LockKeyhole size={14} /> {t('Sign in to review the document. Hearth checks your family access before opening it.')}</p>
              </div>
              <div className="email-signoff">Hearth <span>·</span> {t('Family documents, in order')}</div>
            </div>
          </article> : <article className="inapp-preview" role="region" aria-live="polite" aria-label={t('Example in-app reminder')}>
            <div className="inapp-preview-top"><span><BellRing size={16} /> {t('REMINDER CENTER')}</span><span className="unread-pill">{t('Unread')}</span></div>
            <div className="inapp-notification"><span className="inapp-icon"><CalendarClock size={20} /></span><div><strong>{t('Renewal reminder:')} {t(example.label)}</strong><p>{message}</p><small>{example.owner} · {t(example.category)} · {t(milestone.label)} {t('notice')}</small></div></div>
            <Link to="/login" className="inapp-link">{t('Open Hearth to review')} <ArrowRight size={15} /></Link>
          </article>}
          <p className="preview-disclaimer">{t('Sample data only—nothing is sent. Email reminders work when SMTP is configured; in-app reminders appear in Hearth.')}</p>
        </section>
      </section>

      <section className="landing-workflow" id="how-it-works" aria-labelledby="workflow-title">
        <div className="landing-section-heading"><span className="eyebrow">{t('A SIMPLE, REPEATABLE FLOW')}</span><h2 id="workflow-title">{t('From upload to renewal, in four steps.')}</h2><p>{t('Keep the document, its owner, and the next action together.')}</p></div>
        <div className="workflow-grid">
          <article className="workflow-card"><span className="workflow-number">01</span><span className="workflow-icon"><FileCheck2 size={19} /></span><h3>{t('Add and assign')}</h3><p>{t('Upload a PDF or image, add its renewal date, and assign a family member to look after it.')}</p></article>
          <article className="workflow-card"><span className="workflow-number">02</span><span className="workflow-icon coral-workflow-icon"><CalendarClock size={19} /></span><h3>{t('Choose the timing')}</h3><p>{t('Use the default 90, 30, 7, 1, and due-day reminders. Add a six-month notice for longer appointments.')}</p></article>
          <article className="workflow-card"><span className="workflow-number">03</span><span className="workflow-icon sand-workflow-icon"><Mail size={19} /></span><h3>{t('Get a useful nudge')}</h3><p>{t('The family gets an in-app notification and, when email is set up, an email at 9 AM in the family time zone.')}</p></article>
          <article className="workflow-card"><span className="workflow-number">04</span><span className="workflow-icon sage-workflow-icon"><History size={19} /></span><h3>{t('Renew and keep history')}</h3><p>{t('Upload the replacement and update the date. Hearth keeps the previous version and schedules the next reminders.')}</p></article>
        </div>
        <div className="history-callout"><History size={18} /><span><strong>{t('Renewals don’t erase the past.')}</strong> {t('Previous files and expiry dates remain in the document’s version history.')}</span></div>
      </section>

      <section className="landing-trust" aria-labelledby="trust-title">
        <div className="landing-section-heading"><span className="eyebrow">{t('BUILT FOR FAMILY RECORDS')}</span><h2 id="trust-title">{t('Shared clearly. Kept private.')}</h2></div>
        <div className="trust-grid">
          <div><UsersRound size={19} /><h3>{t('Access follows family roles')}</h3><p>{t('Keepers, Backup People, and document owners have permissions checked by the server.')}</p></div>
          <div><LockKeyhole size={19} /><h3>{t('Files stay private')}</h3><p>{t('Documents use authenticated storage. Only authorized family members can request a short-lived file link.')}</p></div>
          <div><Check size={19} /><h3>{t('Every reminder is tracked')}</h3><p>{t('See upcoming notices and delivery history in one place, with duplicate reminders prevented.')}</p></div>
        </div>
      </section>

      <section className="landing-cta"><div><span className="eyebrow">{t('A CALMER WAY TO KEEP UP')}</span><h2>{t('Start with one family document.')}</h2><p>{t('Add a workspace, invite your family, and try the reminder flow with a real renewal date.')}</p></div><Link to="/register" className="btn btn-primary">{t('Create your family space')} <ArrowRight size={17} /></Link></section>
    </main>

    <footer className="landing-footer"><span>hearth <i>·</i> {t('Family documents, in order')}</span><span>{t('Private by design')}</span></footer>
  </div>;
}
