import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, CalendarDays, Download, LockKeyhole, LogIn, Plus, RefreshCw} from 'lucide-react';
import {exportFile, isNative} from '../platform';
import {ThemeControl} from './Theme';
import './account-planner.css';

const hostedPlanner = 'https://careroute-visit-planner-warad.asarewarad.chatgpt.site/#/account';
const signIn = '/signin-with-chatgpt?return_to=%2F%23%2Faccount';
const checklist = [
  ['confirmed', 'Confirmed arrangements with the provider'],
  ['documents', 'Gathered the required documents'],
  ['questions', 'Prepared my questions'],
  ['travel', 'Planned travel and support'],
] as const;
type Check = typeof checklist[number][0];
type VisitInput = {title: string; facility: string; date: string; time: string; checks: Check[]; status: 'planned' | 'complete' | 'cancelled'};
type Visit = VisitInput & {id: string; revision: number; updated_at: string};
type Session = {state: 'loading' | 'guest' | 'unavailable'} | {state: 'signed-in'; email: string};

class PlannerError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/account/' + path, {credentials: 'same-origin', cache: 'no-store', ...options});
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new PlannerError('Open the hosted planner and sign in to use account storage.', response.status);
  }
  const body = await response.json();
  if (!response.ok) throw new PlannerError(body.error ?? 'The request could not be completed.', response.status);
  return body as T;
}

function useAccountSession() {
  const [session, setSession] = useState<Session>({state: 'loading'});
  useEffect(() => {
    const controller = new AbortController();
    void api<{account: {email: string} | null}>('session', {signal: controller.signal})
      .then(({account}) => {
        if (!controller.signal.aborted) setSession(account?.email ? {state: 'signed-in', email: account.email} : {state: 'guest'});
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession({state: 'unavailable'});
      });
    return () => controller.abort();
  }, []);
  return session;
}

export function AccountLink() {
  const session = useAccountSession();
  return <a className="button account-link" href="#/account"><LogIn size={16}/> {session.state === 'signed-in' ? 'My visits' : 'Sign in'}</a>;
}

function blankVisit(): VisitInput {
  return {title: '', facility: '', date: '', time: '', checks: [], status: 'planned'};
}

function storedFields(visit: Visit): VisitInput {
  const {title, facility, date, time, checks, status} = visit;
  return {title, facility, date, time, checks, status};
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(date));
}

function VisitPlanner({email}: {email: string}) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [input, setInput] = useState<VisitInput>(blankVisit);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestId = useRef('');
  const formHeading = useRef<HTMLHeadingElement>(null);

  const reportError = (reason: unknown) => {
    if (reason instanceof PlannerError && (reason.status === 401 || reason.status === 403)) {
      setVisits(null);
      setShowForm(false);
    }
    setError(reason instanceof PlannerError ? reason.message : 'Could not reach CareRoute. Reconnect and try again.');
  };

  useEffect(() => {
    const controller = new AbortController();
    void api<{visits: Visit[]}>('visits', {signal: controller.signal})
      .then(result => { if (!controller.signal.aborted) setVisits(result.visits); })
      .catch(reason => { if (!controller.signal.aborted) reportError(reason); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (showForm) formHeading.current?.focus();
  }, [showForm, editing?.id]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try { await action(); }
    catch (reason) { reportError(reason); }
    finally { lock.current = false; setBusy(false); }
  }

  function openForm(visit?: Visit) {
    requestId.current = visit ? '' : crypto.randomUUID();
    setEditing(visit ?? null);
    setInput(visit ? storedFields(visit) : blankVisit());
    setShowForm(true);
    setConfirmDelete(null);
    setMessage('');
    setError('');
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setInput(blankVisit());
  }

  function reloadVisits() {
    return run(async () => {
      const {visits: current} = await api<{visits: Visit[]}>('visits');
      setVisits(current);
      setConfirmDelete(null);
      closeForm();
      setMessage('Visits refreshed.');
    });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return run(async () => {
      const {visit} = await api<{visit: Visit}>(editing ? 'visits/' + editing.id : 'visits', {
        method: editing ? 'PUT' : 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(editing ? {...input, revision: editing.revision} : {...input, requestId: requestId.current}),
      });
      setVisits(current => [...(current ?? []).filter(item => item.id !== visit.id), visit]);
      closeForm();
      setMessage('Visit saved to your account.');
    });
  }

  function remove(visit: Visit) {
    return run(async () => {
      await api('visits/' + visit.id, {
        method: 'DELETE', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision: visit.revision}),
      });
      setVisits(current => current?.filter(item => item.id !== visit.id) ?? []);
      setConfirmDelete(null);
      if (editing?.id === visit.id) closeForm();
      setMessage('Visit deleted.');
    });
  }

  const sortedVisits = [...(visits ?? [])].sort((first, second) =>
    (first.date + first.time).localeCompare(second.date + second.time));
  return <>
    <div className="account-page-heading">
      <div><div className="eyebrow"><LockKeyhole size={14}/> PERSONAL WORKSPACE</div><h1>My visits</h1><p>Signed in as {email}</p></div>
      <div className="actions">
        <button disabled={busy} onClick={() => void reloadVisits()}><RefreshCw size={16}/> Refresh visits</button>
        <button className="dark" disabled={busy || visits === null || visits.length >= 100} onClick={() => openForm()}><Plus size={17}/> Add a visit</button>
      </div>
    </div>
    <p className="quiet-banner">Save appointment logistics for yourself. Confirm dates with your provider and keep medical reports, diagnoses and prescriptions out of this planner.</p>
    {message && <p className="save-status" role="status">{message}</p>}
    {error && <p className="form-errors" role="alert">{error}</p>}
    {showForm && <form className="panel account-form" onSubmit={save}>
      <h2 tabIndex={-1} ref={formHeading}>{editing ? 'Edit visit' : 'Add a visit'}</h2>
      <fieldset disabled={busy}>
        <div className="account-fields">
          <label className="field">Visit label<input required maxLength={100} value={input.title} onChange={event => setInput({...input, title: event.target.value})} placeholder="Example: Follow-up visit"/></label>
          <label className="field">Facility or provider<input required maxLength={120} value={input.facility} onChange={event => setInput({...input, facility: event.target.value})}/></label>
          <label className="field">Date<input required type="date" min="1900-01-01" max="2199-12-31" value={input.date} onChange={event => setInput({...input, date: event.target.value})}/></label>
          <label className="field">Local appointment time (optional)<input type="time" value={input.time} onChange={event => setInput({...input, time: event.target.value})}/></label>
          <label className="field">Visit status<select value={input.status} onChange={event => setInput({...input, status: event.target.value as VisitInput['status']})}><option value="planned">Planned</option><option value="complete">Completed</option><option value="cancelled">Cancelled</option></select></label>
        </div>
        <h3>Preparation checklist</h3>
        {checklist.map(([key, label]) => <label className="checklist-item" key={key}><input type="checkbox" checked={input.checks.includes(key)} onChange={event => setInput({...input, checks: event.target.checked ? [...input.checks, key] : input.checks.filter(check => check !== key)})}/>{label}</label>)}
        <div className="actions"><button className="dark" type="submit">{busy ? 'Saving…' : 'Save visit'}</button><button type="button" onClick={closeForm}>Cancel</button></div>
      </fieldset>
    </form>}
    {visits === null && !error && <p role="status">Loading visits…</p>}
    {visits?.length === 0 && <section className="panel account-empty"><CalendarDays size={28}/><h2>Your next visit starts here</h2><p>Add a date, facility and preparation checklist.</p></section>}
    <div className="account-visits">
      {sortedVisits.map(visit => <article className="panel account-visit" key={visit.id}>
        <div><div className="eyebrow">{displayDate(visit.date)}{visit.time ? ' · ' + visit.time : ''}</div><h2>{visit.title}</h2><p>{visit.facility}</p></div>
        <div><span className="soft-tag">{visit.status === 'complete' ? 'Completed' : visit.status === 'cancelled' ? 'Cancelled' : 'Planned'}</span><p>{visit.checks.length} of {checklist.length} preparation steps checked</p></div>
        {confirmDelete === visit.id ? <div className="actions"><button className="danger" disabled={busy} onClick={() => void remove(visit)}>Confirm deletion</button><button disabled={busy} onClick={() => setConfirmDelete(null)}>Keep visit</button></div> :
          <div className="actions"><button disabled={busy} onClick={() => openForm(visit)}>Edit</button><button disabled={busy} onClick={() => setConfirmDelete(visit.id)}>Delete</button></div>}
      </article>)}
    </div>
    <footer className="account-footer">
      <button disabled={busy || visits === null} onClick={() => void run(async () => {
        const {visits: current} = await api<{visits: Visit[]}>('visits');
        await exportFile('careroute-visits.json', JSON.stringify({visits: current}, null, 2));
        setMessage('Visit export prepared.');
      })}><Download size={16}/> Export my visits</button>
      <a className="button" target="_top" href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
    </footer>
  </>;
}

export function AccountPlanner() {
  const session = useAccountSession();
  return <div className="resource-shell account-shell">
    <header><a className="logo" href="#/"><img src="/icon.svg" alt=""/>CareRoute</a><ThemeControl/></header>
    <main>
      <a className="back" href="#/"><ArrowLeft size={15}/> Back to CareRoute</a>
      {session.state === 'signed-in' ? <VisitPlanner key={session.email} email={session.email}/> :
        <section className="panel account-welcome">
          <span className="feature-icon"><LockKeyhole size={24}/></span>
          <h1>Sign in to CareRoute</h1>
          <p>Save visit dates and preparation checklists to your account and open them on another device.</p>
          {session.state === 'loading' && <p role="status">Checking your sign-in…</p>}
          {session.state === 'guest' && <a className="button dark" target="_top" href={signIn}><LogIn size={17}/> Continue with ChatGPT</a>}
          {session.state === 'unavailable' && (location.hostname === 'careroute-visit-planner-warad.asarewarad.chatgpt.site'
            ? <button className="dark" onClick={() => location.reload()}>Retry connection</button>
            : <a className="button dark" href={hostedPlanner} target={isNative() ? '_blank' : '_top'}><LogIn size={17}/> Open the hosted sign-in</a>)}
          <a className="button" href="#/app">Explore the demo</a>
        </section>}
    </main>
    <footer>CareRoute <a href="#/privacy">Privacy information</a></footer>
  </div>;
}
