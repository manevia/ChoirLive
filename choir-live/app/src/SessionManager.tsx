import {useState} from 'react';
import {invitationLink,roles,sessionRequest,type Session,type InvitationRole} from './sessionInvitations';
import './ChoirRoom.css';
const labels:Record<InvitationRole,string>={singer:'Singer',conductor:'Conductor',engineer:'Sound engineer'};
export default function SessionManager(){
 const [title,setTitle]=useState('Choir rehearsal');
 const [minutes,setMinutes]=useState(120);
 const [hostCode,setHostCode]=useState('');
 const [session,setSession]=useState<Session|null>(null);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 async function create(){
  if(busy||!title.trim()||!hostCode)return;
  setBusy(true);setStatus('Creating rehearsal…');
  try{
   const result=await sessionRequest<Session>('createSession',{title:title.trim(),minutes,hostCode});
   setSession(result);setHostCode('');setStatus('Rehearsal created. Copy the invitations below and share each only with its intended role.');
  }catch(e){setStatus(String(e));}finally{setBusy(false);}
 }
 async function end(){
  if(!session||busy)return;
  if(!window.confirm('End this rehearsal and disconnect its participants?'))return;
  setBusy(true);
  try{await sessionRequest('endSession',{room:session.room,managerToken:session.managerToken});setSession(null);setStatus('Rehearsal ended. Invitations are no longer valid.');}
  catch(e){setStatus(String(e));}finally{setBusy(false);}
 }
 return <section id="sessions" className="choir-app"><div className="choir-shell">
  <div className="choir-top"><div><span className="choir-kicker">CHOIRLIVE · SESSION MANAGEMENT</span><h2>Create a rehearsal</h2><p>Generate separate, time-limited invitations for your choir.</p></div></div>
  {!session?<div className="choir-form">
   <label>Rehearsal title<input maxLength={64} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Duration (minutes)<input type="number" min={15} max={480} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
   <label>Host authorization (conductor code)<input type="password" autoComplete="off" value={hostCode} onChange={e=>setHostCode(e.target.value)}/></label>
   <button disabled={busy||!title.trim()||!hostCode||minutes<15||minutes>480} onClick={()=>void create()}>{busy?'Creating…':'Create session & invitations'}</button>
   <p className="choir-hint">Only the host needs the existing conductor code. Do not share it with participants.</p>
  </div>:<div className="choir-panel">
   <h3>{session.title}</h3><p>Expires {new Date(session.expiresAt).toLocaleString()}</p>
   {roles.map(role=><div key={role} className="choir-person"><span>{labels[role]}</span><div className="choir-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(invitationLink(session,role));setStatus(labels[role]+' invitation copied.');}catch{setStatus('Clipboard unavailable. Open the invitation in a new tab to use it.');}}}>Copy {labels[role]} link</button><a href={invitationLink(session,role)} target="_blank" rel="noreferrer">Open invitation</a></div></div>)}
   <div className="choir-actions"><button disabled={busy} className="danger" onClick={()=>void end()}>End rehearsal</button></div>
   <p className="choir-hint">Keep this host page open to end the session manually. Invitations are reusable only for this session until expiry. A server restart ends all active sessions. Anyone with a role link can use that role; share privately.</p>
  </div>}
  <p className="choir-status" role="status">{status}</p>
 </div></section>;
}
