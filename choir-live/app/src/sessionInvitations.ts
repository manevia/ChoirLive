export type InvitationRole = 'singer' | 'conductor' | 'engineer';
export type Invitation = {room:string;role:InvitationRole;token:string};
export type Session = {room:string;title:string;expiresAt:number;invitations:Record<InvitationRole,string>;managerToken?:string};
export const roles:InvitationRole[]=['singer','conductor','engineer'];
export function readInvitation():Invitation|null{
 const values=new URLSearchParams(window.location.hash.slice(1));
 const room=values.get('room'),role=values.get('role'),token=values.get('invite');
 if(!room||!/^CL-SESSION-[a-f0-9]{24}$/.test(room)||!role||!roles.includes(role as InvitationRole)||!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 return {room,role:role as InvitationRole,token};
}
export function invitationLink(session:Session,role:InvitationRole){
 const url=new URL(window.location.pathname,window.location.origin);
 url.hash=new URLSearchParams({room:session.room,role,invite:session.invitations[role]}).toString();
 return url.href;
}
export function sessionRequest<T>(action:string,data:object):Promise<T>{
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(import.meta.env.VITE_CHOIRCORE_URL||'ws://localhost:8090');
  const timer=window.setTimeout(()=>finish(new Error('Session service did not respond')),12000);
  let done=false;
  function finish(error?:Error,result?:T){
   if(done)return;done=true;window.clearTimeout(timer);ws.close();
   if(error)reject(error);else resolve(result as T);
  }
  ws.onopen=()=>ws.send(JSON.stringify({id:1,action,data}));
  ws.onmessage=e=>{try{const message=JSON.parse(e.data);if(message.id===1)finish(message.error?new Error(message.error):undefined,message.data);}catch{finish(new Error('Invalid session response'));}};
  ws.onerror=()=>finish(new Error('Cannot connect to ChoirCore'));
  ws.onclose=()=>finish(new Error('Session connection closed'));
 });
}
