import {useState} from 'react';
import {invitationLink,roles,sessionRequest,type Session,type InvitationRole} from './sessionInvitations';
import './ChoirRoom.css';
type Workspace={email:string;workspaceId:string;workspaceName:string;active:boolean};
type Login=Workspace&{authToken:string};
type Listing=Pick<Session,'room'|'title'|'startsAt'|'expiresAt'>&{status:'active'|'scheduled'};
type Past=Pick<Session,'room'|'title'|'startsAt'|'expiresAt'>&{endedAt:number;status:'ended'|'expired'|'cancelled'};
const labels:Record<InvitationRole,string>={singer:'Singer',conductor:'Conductor',engineer:'Sound engineer'};
export default function SessionManager(){
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [workspaceName,setWorkspaceName]=useState('');
 const [account,setAccount]=useState<Login|null>(null);
 const [title,setTitle]=useState('Choir rehearsal');
 const [minutes,setMinutes]=useState(120);
 const [scheduled,setScheduled]=useState(false);
 const [scheduleDate,setScheduleDate]=useState('');
 const [history,setHistory]=useState<Past[]>([]);
 const [sessions,setSessions]=useState<Listing[]>([]);
 const [selected,setSelected]=useState<Session|null>(null);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 const [approvalId,setApprovalId]=useState('');
 const [adminCode,setAdminCode]=useState('');
 const update=async (authToken:string)=>{
  const [workspace,list,past]=await Promise.all([sessionRequest<Workspace>('workspace',{authToken}),sessionRequest<Listing[]>('listSessions',{authToken}),sessionRequest<Past[]>('rehearsalHistory',{authToken})]);
  setAccount({...workspace,authToken});setSessions(list);setHistory(past);
 };
 const perform=async(fn:()=>Promise<void>)=>{
  if(busy)return;setBusy(true);setStatus('');
  try{await fn();}catch(e){setStatus(String(e));}finally{setBusy(false);}
 };
 const signIn=()=>perform(async()=>{
  const result=await sessionRequest<Login>(mode==='register'?'registerAccount':'loginAccount',{email,password,workspaceName});
  setAccount(result);setPassword('');setSelected(null);await update(result.authToken);
  setStatus(result.active?'Welcome to your choir workspace.':'Workspace created. Request administrator activation before hosting rehearsals.');
 });
 const signOut=()=>perform(async()=>{
  if(account)await sessionRequest('logoutAccount',{authToken:account.authToken});
  setAccount(null);setSessions([]);setHistory([]);setSelected(null);setPassword('');setStatus('Signed out.');
 });
 const create=()=>perform(async()=>{
  if(!account?.active)return;
  const startsAt=scheduled?new Date(scheduleDate).getTime():undefined;
  if(scheduled&&(!startsAt||startsAt<=Date.now()))throw Error('Choose a future rehearsal date and time');
  const result=await sessionRequest<Session>('createSession',{title:title.trim(),minutes,startsAt,authToken:account.authToken});
  setSelected(result);await update(account.authToken);setStatus(scheduled?'Rehearsal scheduled. Share its invitations in advance.':'Rehearsal created. Copy the role invitations below.');
 });
 const end=(room:string)=>perform(async()=>{
  if(!account||!window.confirm('End or cancel this rehearsal and invalidate its invitations?'))return;
  await sessionRequest('endSession',{room,authToken:account.authToken});if(selected?.room===room)setSelected(null);await update(account.authToken);setStatus('Rehearsal ended.');
 });
 const rotate=(room:string)=>perform(async()=>{
  if(!account||!window.confirm('Replace the old invitation links with new ones? Existing connected participants can remain connected.'))return;
  const result=await sessionRequest<Session>('rotateInvitations',{room,authToken:account.authToken});
  setSelected(result);setStatus('New invitations created. Previous links no longer admit new participants.');
 });
 return <section id="sessions" className="choir-app"><div className="choir-shell">
  <div className="choir-top"><div><span className="choir-kicker">CHOIRLIVE · CHOIR WORKSPACES</span><h2>{account?'Your rehearsal workspace':'Create or sign into your choir workspace'}</h2><p>Independent workspaces, role invitations and account-based access.</p></div></div>
  {!account?<div className="choir-form">
   <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {mode==='register'&&<label>Choir or organization name<input maxLength={64} value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)}/></label>}
   <button disabled={busy||!email||!password||(mode==='register'&&!workspaceName.trim())} onClick={()=>void signIn()}>{mode==='register'?'Register workspace':'Sign in'}</button>
   <button disabled={busy} onClick={()=>{setMode(mode==='login'?'register':'login');setPassword('');}}>{mode==='login'?'Create an account':'Already registered? Sign in'}</button>
   <p className="choir-hint">New accounts need manual activation. Billing and email verification are not yet connected. Use a unique password of at least 12 characters.</p>
  </div>:<>
   <div className="choir-panel"><h3>{account.workspaceName}</h3><p>{account.email} · {account.active?'Hosting activated':'Awaiting activation'}</p>
   <p className="choir-hint">Workspace ID: {account.workspaceId}</p>
   <div className="choir-actions"><button disabled={busy} onClick={()=>void perform(()=>update(account.authToken))}>Refresh workspace</button><button disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>
   {!account.active&&<p>Send your workspace ID to the administrator for activation. You do not need a conductor code.</p>}
   </div>
   {account.active&&<div className="choir-form">
    <label>Rehearsal title<input maxLength={64} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Duration (minutes)<input type="number" min={15} max={480} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
    <label>Rehearsal start<select value={scheduled?'later':'now'} onChange={e=>setScheduled(e.target.value==='later')}><option value="now">Start now</option><option value="later">Schedule for later</option></select></label>
    {scheduled&&<label>Start date and time (your local time)<input type="datetime-local" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)}/></label>}
    <button disabled={busy||!title.trim()||minutes<15||minutes>480||(scheduled&&!scheduleDate)} onClick={()=>void create()}>{scheduled?'Schedule rehearsal & invitations':'Create session & invitations'}</button>
   </div>}
   <div className="choir-panel"><h3>Active and upcoming rehearsals</h3>{sessions.length===0&&<p>No active or upcoming rehearsals.</p>}{sessions.map(s=><div className="choir-person" key={s.room}><span>{s.title}<small>{s.status==='scheduled'?'Scheduled':'Active'} · {new Date(s.startsAt).toLocaleString()} – {new Date(s.expiresAt).toLocaleString()}</small></span><div className="choir-actions"><button disabled={busy} onClick={()=>void rotate(s.room)}>Regenerate links</button><button disabled={busy} className="danger" onClick={()=>void end(s.room)}>{s.status==='scheduled'?'Cancel':'End'}</button></div></div>)}</div>
   <div className="choir-panel"><h3>Rehearsal history</h3><p className="choir-hint">Last 50 completed rehearsals within 180 days. Recordings are not stored here.</p>{history.length===0&&<p>No completed rehearsals yet.</p>}{history.map(s=><div className="choir-person" key={s.room}><span>{s.title}<small>{new Date(s.startsAt).toLocaleString()} · {s.status}</small></span><small>{new Date(s.endedAt).toLocaleString()}</small></div>)}</div>
   {selected&&<div className="choir-panel"><h3>Invitations: {selected.title}</h3><p>Starts {new Date(selected.startsAt).toLocaleString()} · Expires {new Date(selected.expiresAt).toLocaleString()}</p>{roles.map(role=><div key={role} className="choir-person"><span>{labels[role]}</span><div className="choir-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(invitationLink(selected,role));setStatus(labels[role]+' invitation copied.');}catch{setStatus('Clipboard unavailable; open the invitation in a new tab.');}}}>Copy {labels[role]} link</button><a href={invitationLink(selected,role)} target="_blank" rel="noreferrer">Open invitation</a></div></div>)}
    <p className="choir-hint">Share links privately with their intended roles. Session invitations and schedule survive server restarts when persistent storage is available. Participants must rejoin after a restart. Regenerate links if you no longer have the original links.</p></div>}
  </>}
  <details className="choir-panel"><summary>Administrator activation</summary><div className="choir-form">
   <label>Workspace ID<input value={approvalId} onChange={e=>setApprovalId(e.target.value)}/></label>
   <label>Administrator authorization code<input type="password" autoComplete="off" value={adminCode} onChange={e=>setAdminCode(e.target.value)}/></label>
   <button disabled={busy||!approvalId||!adminCode} onClick={()=>void perform(async()=>{await sessionRequest('approveWorkspace',{workspaceId:approvalId.trim(),adminCode});setAdminCode('');setApprovalId('');if(account)await update(account.authToken);setStatus('Workspace activated. The owner can refresh and create rehearsals.');})}>Activate workspace</button>
   <p className="choir-hint">Verify the subscriber's identity and payment separately; activation is not a payment transaction.</p></div></details>
  <p className="choir-status" role="status">{status}</p>
 </div></section>;
}
