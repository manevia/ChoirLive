import http from 'node:http';
import { WebSocketServer } from 'ws';
import { randomUUID, createHmac } from 'node:crypto';
const port=Number(process.env.PORT||3001);
const rooms=new Map();
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url||'/', 'http://localhost').pathname;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(pathname==='/healthz')return res.end(JSON.stringify({ok:true,rooms:rooms.size,participants:[...rooms.values()].reduce((n,r)=>n+r.size,0)}));
  if(pathname==='/ice-config'){
    const servers=[{urls:process.env.STUN_URL||'stun:stun.l.google.com:19302'}];
    if(process.env.TURN_SECRET&&process.env.TURN_URL){
      const username=`${Math.floor(Date.now()/1000)+3600}:choirlive`;
      const credential=createHmac('sha1',process.env.TURN_SECRET).update(username).digest('base64');
      servers.push({urls:process.env.TURN_URL.split(',').map(x=>x.trim()),username,credential});
    }
    return res.end(JSON.stringify({iceServers:servers,ttlSeconds:3600,relayConfigured:servers.length>1}));
  }
  res.statusCode=404;res.end(JSON.stringify({error:'Not found'}));
});
const wss=new WebSocketServer({server,maxPayload:65536});
const heartbeat=setInterval(()=>{for(const client of wss.clients){if(client.isAlive===false){client.terminate();continue;}client.isAlive=false;client.ping();}},30000);
wss.on('close',()=>clearInterval(heartbeat));
function send(ws,obj){if(ws.readyState===1)ws.send(JSON.stringify(obj));}
function members(room){return [...room.values()].map(p=>({id:p.id,name:p.name,section:p.section,conductor:p.conductor,muted:p.muted}));}
function broadcast(room,obj,except){for(const p of room.values())if(p.ws!==except)send(p.ws,obj);}
wss.on('connection',ws=>{ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true});let me=null;let room=null;ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw.toString());}catch{return;}if(!msg||typeof msg.type!=='string')return;
if(msg.type==='join'&&!me){const roomId=String(msg.room||'').trim().toUpperCase().slice(0,40);const name=String(msg.name||'').trim().slice(0,60);if(!/^[A-Z0-9_-]{3,40}$/.test(roomId)||!name)return send(ws,{type:'error',message:'Valid room code and name required'});room=rooms.get(roomId)||new Map();if(room.size>=12)return send(ws,{type:'error',message:'Pilot room limit is 12 singers'});rooms.set(roomId,room);me={id:randomUUID(),ws,name,section:['Soprano','Alto','Tenor','Bass','Other'].includes(msg.section)?msg.section:'Other',conductor:![...room.values()].some(p=>p.conductor),muted:false,roomId};send(ws,{type:'welcome',id:me.id,peers:members(room),conductor:me.conductor});room.set(me.id,me);broadcast(room,{type:'member-joined',member:members(room).find(p=>p.id===me.id)},ws);return;}
if(!me)return;
if(['offer','answer','ice'].includes(msg.type)){const target=room.get(msg.to);if(target&&JSON.stringify(msg.payload||{}).length<40000)send(target.ws,{type:msg.type,from:me.id,payload:msg.payload});return;}
if(msg.type==='mute'){me.muted=!!msg.muted;broadcast(room,{type:'members',members:members(room)});return;}
if(msg.type==='section'&&['Soprano','Alto','Tenor','Bass','Other'].includes(msg.section)){me.section=msg.section;broadcast(room,{type:'members',members:members(room)});return;}
if(msg.type==='cue'&&me.conductor){broadcast(room,{type:'cue',text:String(msg.text||'').slice(0,100)});return;}
if(msg.type==='remove'&&me.conductor&&msg.to!==me.id){const target=room.get(msg.to);if(target){send(target.ws,{type:'error',message:'Removed by conductor'});target.ws.close();}return;}
});ws.on('close',()=>{if(!me||!room)return;room.delete(me.id);broadcast(room,{type:'member-left',id:me.id});if(me.conductor&&room.size){const next=room.values().next().value;next.conductor=true;send(next.ws,{type:'conductor'});broadcast(room,{type:'members',members:members(room)});}if(!room.size)rooms.delete(me.roomId);});});
server.listen(port,'0.0.0.0',()=>console.log(`ChoirLive signaling on ${port}`));
