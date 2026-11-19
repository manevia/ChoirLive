import {useState} from 'react';
import {invitationLink,roles,sessionRequest,type Session,type InvitationRole} from './sessionInvitations';
import './ChoirRoom.css';
type Workspace={email:string;workspaceId:string;workspaceName:string;active:boolean};
type Login=Workspace&{authToken:string};
type Listing=Pick<Session,'room'|'title'|'expiresAt'>;
const labels:Record<InvitationRole,string>={singer:'Singer',conductor:'Conductor',engineer:'Sound engineer'};
export default function SessionManager(){
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [workspaceName,setWorkspaceName]=useState('');
 const [account,setAccount]=useState<Login|null>(null);
 const [title,setTitle]=useState('Choir rehearsal');
 const [minutes,setMinutes]=useState(120);
 const [sessions,setSessions]=useState<Listing[]>([]);
 const [selected,setSelected]=useState<Session|null>(null);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 const [approvalId,setApprovalId]=useState('');
 const [adminCode,setAdminCode]=useState('');
 const update=async (authToken:string)=>{
  const [workspace,list]=await Promise.all([sessionRequest<Workspace>('workspace',{authToken}),sessionRequest<Listing[]>('listSessions',{authToken})]);
  setAccount({...workspace,authToken});setSessions(list);
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
  setAccount(null);setSessions([]);setSelected(null);setPassword('');setStatus('Signed out.');
 });
 const create=()=>perform(async()=>{
  if(!account?.active)return;
  const result=await sessionRequest<Session>('createSession',{title:title.trim(),minutes,authToken:account.authToken});
  setSelected(result);await update(account.authToken);setStatus('Rehearsal created. Copy the role invitations below.');
 });
 const end=(room:string)=>perform(async()=>{
  if(!account||!window.confirm('End this rehearsal and disconnect its participants?'))return;
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
    <button disabled={busy||!title.trim()||minutes<15||minutes>480} onClick={()=>void create()}>Create session & invitations</button>
   </div>}
   <div className="choir-panel"><h3>Active rehearsals</h3>{sessions.length===0&&<p>No active rehearsals.</p>}{sessions.map(s=><div className="choir-person" key={s.room}><span>{s.title}<small>Expires {new Date(s.expiresAt).toLocaleString()}</small></span><div className="choir-actions"><button disabled={busy} onClick={()=>void rotate(s.room)}>Regenerate links</button><button disabled={busy} className="danger" onClick={()=>void end(s.room)}>End</button></div></div>)}</div>
   {selected&&<div className="choir-panel"><h3>Invitations: {selected.title}</h3>{roles.map(role=><div key={role} className="choir-person"><span>{labels[role]}</span><div className="choir-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(invitationLink(selected,role));setStatus(labels[role]+' invitation copied.');}catch{setStatus('Clipboard unavailable; open the invitation in a new tab.');}}}>Copy {labels[role]} link</button><a href={invitationLink(selected,role)} target="_blank" rel="noreferrer">Open invitation</a></div></div>)}
    <p className="choir-hint">Share links privately with their intended roles. A server restart ends active sessions; accounts and workspaces are retained with persistent storage.</p></div>}
  </>}
  <details className="choir-panel"><summary>Administrator activation</summary><div className="choir-form">
   <label>Workspace ID<input value={approvalId} onChange={e=>setApprovalId(e.target.value)}/></label>
   <label>Administrator authorization code<input type="password" autoComplete="off" value={adminCode} onChange={e=>setAdminCode(e.target.value)}/></label>
   <button disabled={busy||!approvalId||!adminCode} onClick={()=>void perform(async()=>{await sessionRequest('approveWorkspace',{workspaceId:approvalId.trim(),adminCode});setAdminCode('');setApprovalId('');if(account)await update(account.authToken);setStatus('Workspace activated. The owner can refresh and create rehearsals.');})}>Activate workspace</button>
   <p className="choir-hint">Verify the subscriber's identity and payment separately; activation is not a payment transaction.</p></div></details>
  <p className="choir-status" role="status">{status}</p>
 </div></section>;
}
