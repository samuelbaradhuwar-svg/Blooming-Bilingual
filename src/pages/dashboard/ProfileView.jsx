import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashHeader from '../../components/dashboard/DashHeader';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { COUNTRIES } from '../../data/constants';
import { timeZoneGroups, deviceTimeZone, timeIn, prettyZone } from '../../lib/time';
import Icon from '../../components/ui/Icon';
import Field from '../../components/ui/Field';

const MIN_PASSWORD = 6;   // the same rule as creating an account

/** "My profile": the same page for the tutor and for students. People edit their own name, country and time zone; the rest is shown, not editable. */
export default function ProfileView({ onSwitch }) {
  const { currentUser, updateProfile, logout, showToast } = useApp();
  const navigate = useNavigate();
  const isTutor = currentUser.role === 'admin';

  const [name, setName] = useState(currentUser.name === currentUser.email ? '' : currentUser.name);
  const [country, setCountry] = useState(currentUser.country || '');
  const [timezone, setTimezone] = useState(currentUser.timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [since, setSince] = useState(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('created_at').eq('id', currentUser.id).single().then(({ data }) => { if (data?.created_at) setSince(data.created_at); });
  }, [currentUser.id]);

  const zones = useMemo(() => timeZoneGroups(), []);
  const device = deviceTimeZone();
  // The chosen zone is always selectable, even if the browser's list does not include it.
  const known = Object.values(zones).some(list => list.includes(timezone));
  const countries = COUNTRIES.includes(country) || !country ? COUNTRIES : [country, ...COUNTRIES];

  const startName = currentUser.name === currentUser.email ? '' : currentUser.name;
  const dirty = name.trim() !== startName || country !== (currentUser.country || '') || timezone !== currentUser.timezone;

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) { setError('Please enter your name (at least 2 letters).'); return; }
    setSaving(true);
    const res = await updateProfile({ full_name: name, country, timezone });
    setSaving(false);
    if (res.ok) showToast('Your profile was saved.', 'success');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.length < MIN_PASSWORD) { setPwError(`Your new password needs at least ${MIN_PASSWORD} characters.`); return; }
    if (pw !== pw2) { setPwError('The two passwords do not match.'); return; }
    setPwBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (err) {
      setPwError(/different|same/i.test(err.message) ? 'Please choose a password you have not used before.' : err.message);
      return;
    }
    setPw(''); setPw2('');
    showToast('Your password was changed.', 'success');
  };

  const joined = since ? new Date(since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;
  const nowThere = (() => { try { return timeIn(timezone, new Date()); } catch { return null; } })();

  return (
    <>
      <DashHeader title="My profile" />
      <div className="dash-main">
        <section className="card profile-head" aria-label="You">
          <span className="avatar profile-avatar is-big" style={{ background: currentUser.color }} aria-hidden="true">{currentUser.initials}</span>
          <div className="profile-id">
            <h2>{currentUser.name === currentUser.email ? 'Welcome' : currentUser.name}</h2>
            <p className="profile-meta">
              <span><Icon name="mail" /> {currentUser.email}</span>
              {joined && <span><Icon name="user" /> Member since {joined}</span>}
            </p>
            <div className="profile-chips">
              <span className="chip chip-blue">{isTutor ? 'Tutor' : 'Student'}</span>
              {!isTutor && currentUser.englishLevel && <span className="chip chip-green" title="Set by Neeliën">Level {currentUser.englishLevel}</span>}
              {!isTutor && <span className="chip chip-orange">{currentUser.credits} credit{currentUser.credits === 1 ? '' : 's'}</span>}
            </div>
          </div>
          <div className="profile-actions">
            {!isTutor && <button type="button" className="btn btn-outline btn-sm" onClick={() => onSwitch('progress')}><Icon name="progress" /> My progress</button>}
            {!isTutor && <button type="button" className="btn btn-outline btn-sm" onClick={() => onSwitch('credits')}><Icon name="credits" /> Credits & billing</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/'); }}><Icon name="signout" /> Sign out</button>
          </div>
        </section>

        <div className="profile-grid">
          <form className="card card-pad" onSubmit={save} noValidate>
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="user" /> Personal details</div>

            <Field label="Full name">
              {id => <input id={id} name="name" autoComplete="name" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />}
            </Field>

            <div className="form-group">
              <span className="form-label-like">Email</span>
              <div className="field-readonly"><Icon name="lock" /> {currentUser.email}</div>
              <p className="fine-print" style={{ margin: '6px 0 0' }}>
                {isTutor ? 'This is what you sign in with.' : 'This is what you sign in with and where lesson invitations go. To change it, message Neeliën.'}
              </p>
            </div>

            <Field label="Country">
              {id => (
                <select id={id} name="country" autoComplete="country-name" value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="">Select your country</option>
                  {countries.map(c => <option key={c}>{c}</option>)}
                </select>
              )}
            </Field>

            <Field label="Time zone">
              {id => (
                <select id={id} name="timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {!known && <option value={timezone}>{prettyZone(timezone)}</option>}
                  {Object.entries(zones).map(([region, list]) => (
                    <optgroup key={region} label={region}>
                      {list.map(z => <option key={z} value={z}>{z.split('/').slice(1).join(' / ').replace(/_/g, ' ')}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
            </Field>
            <p className="tz-now">
              {nowThere && <><Icon name="clock" /> It is {nowThere} there now.</>}
              {device && device !== timezone && (
                <> Your device is set to {prettyZone(device)}. <button type="button" className="linkish" onClick={() => setTimezone(device)}>Use it</button></>
              )}
            </p>
            <p className="fine-print" style={{ margin: '4px 0 14px' }}>
              {isTutor
                ? 'This changes how times are shown to you. Your open teaching hours are set in Hours & leave.'
                : 'Lesson times are shown in this time zone, and Neeliën sees what that is in her own time.'}
            </p>

            {error && <p className="form-warn" role="alert"><Icon name="warning" weight="fill" /> {error}</p>}
            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </form>

          <form className="card card-pad" onSubmit={changePassword} noValidate>
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="lock" /> Password</div>
            <p className="fine-print" style={{ margin: '0 0 12px' }}>Choose a new password for signing in. You stay signed in on this device.</p>
            <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
              {id => <input id={id} name="new-password" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />}
            </Field>
            <Field label="Type it again">
              {id => <input id={id} name="confirm-password" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />}
            </Field>
            {pwError && <p className="form-warn" role="alert"><Icon name="warning" weight="fill" /> {pwError}</p>}
            <button type="submit" className="btn btn-primary" disabled={!pw || !pw2 || pwBusy}>{pwBusy ? 'Changing…' : 'Change password'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
