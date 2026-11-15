import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import * as mediasoup from 'mediasoup';
const port = Number(process.env.PORT || 8090);
const singerCode = process.env.CHOIRCORE_SINGER_CODE;
const conductorCode = process.env.CHOIRCORE_CONDUCTOR_CODE;
const engineerCode = process.env.CHOIRCORE_ENGINEER_CODE;
if (!singerCode || singerCode.length < 12 || !conductorCode || conductorCode.length < 12 || !engineerCode || engineerCode.length < 12 || new Set([singerCode,conductorCode,engineerCode]).size!==3) throw new Error('Set three distinct CHOIRCORE_SINGER_CODE, CHOIRCORE_CONDUCTOR_CODE and CHOIRCORE_ENGINEER_CODE secrets (12+ chars)');
const announcedAddress = process.env.ANNOUNCED_IP;
if (!announcedAddress) throw new Error('Set ANNOUNCED_IP to the public IP or reachable DNS name');
const worker = await mediasoup.createWorker({rtcMinPort:40000,rtcMaxPort:40100,logLevel:'warn'});
worker.on('died',()=>process.exit(1));
const rooms = new Map();
const pendingRooms = new Map();
// If a client closes before an asynchronous room join completes, allow other
// concurrent admissions to finish before cleaning the orphaned empty router.
const orphanCleanup = setInterval(() => {
 for (const [name,room] of rooms) {
  if (room.peers.size===0 && !pendingRooms.has(name)) {
   room.router.close();
   rooms.delete(name);
  }
 }
}, 60000);
orphanCleanup.unref();
const mediaCodecs = [{kind:'audio',mimeType:'audio/opus',clockRate:48000,channels:2,parameters:{useinbandfec:1}}];
const server = http.createServer((req,res)=>{
 const pathname = new URL(req.url || '/', 'http://localhost').pathname;
 if (req.method === 'GET' && (pathname === '/health' || pathname === '/ready')) {
  res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify({service:'ChoirCore',status:'ok'}));return;
 }
 res.writeHead(404, {'content-type':'application/json','cache-control':'no-store'});
 res.end(JSON.stringify({error:'Not found'}));
});
// Limit abusive signaling traffic and idle sockets before allocating media resources.
const MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS || 100);
const MAX_MESSAGES_PER_10S = Number(process.env.MAX_MESSAGES_PER_10S || 80);
const MAX_PEERS_PER_ROOM = Number(process.env.MAX_PEERS_PER_ROOM || 32);
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 20);
if (![port,MAX_CONNECTIONS,MAX_MESSAGES_PER_10S,MAX_PEERS_PER_ROOM,MAX_ROOMS].every(Number.isSafeInteger) ||
    port < 1 || port > 65535 || MAX_CONNECTIONS < 1 || MAX_MESSAGES_PER_10S < 1 ||
    MAX_PEERS_PER_ROOM < 1 || MAX_ROOMS < 1) throw new Error('Invalid ChoirCore server capacity configuration');
const allowedOrigins = new Set((process.env.CHOIRCORE_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean));
if (process.env.NODE_ENV === 'production' && allowedOrigins.size === 0) {
 throw new Error('CHOIRCORE_ALLOWED_ORIGINS must be configured in production');
}
// Rate limits are based on the actual TCP peer, not an untrusted forwarded header.
const MAX_AUTH_FAILURES = Number(process.env.MAX_AUTH_FAILURES || 10);
const AUTH_WINDOW_MS = 60000;
if (!Number.isSafeInteger(MAX_AUTH_FAILURES) || MAX_AUTH_FAILURES < 1) throw new Error('Invalid MAX_AUTH_FAILURES');
const authFailures = new Map();
const authSweep = setInterval(() => {
 const now = Date.now();
 for (const [address,record] of authFailures) if (now - record.start >= AUTH_WINDOW_MS) authFailures.delete(address);
},AUTH_WINDOW_MS);
authSweep.unref();
function failedAuth(ip) {
 const now=Date.now();
 let record=authFailures.get(ip);
 if (!record || now - record.start >= AUTH_WINDOW_MS) record={start:now,count:0};
 record.count++;
 authFailures.set(ip,record);
 return record.count >= MAX_AUTH_FAILURES;
}
function authBlocked(ip) {
 const record=authFailures.get(ip);
 if (!record) return false;
 if (Date.now()-record.start >= AUTH_WINDOW_MS) { authFailures.delete(ip); return false; }
 return record.count >= MAX_AUTH_FAILURES;
}
const wss = new WebSocketServer({
 server, maxPayload:16384,
 verifyClient: ({origin}, cb) => {
  // Browser Origin restrictions supplement authentication, not replace it.
  if (!allowedOrigins.size || (origin && allowedOrigins.has(origin))) cb(true);
  else cb(false, 403, 'Origin not allowed');
 }
});
const heartbeat = setInterval(() => {
 for (const ws of wss.clients) {
  if (ws.isAlive === false) { ws.terminate(); continue; }
  ws.isAlive = false; ws.ping();
 }
}, 30000);
heartbeat.unref();
function reply(ws,id,data,error){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({id,...(error?{error:String(error)}:{data})}));}
function notify(ws,event,data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({event,data}));}
function safeId(s){return typeof s==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(s)}
async function getRoom(name) {
 const existing = rooms.get(name);
 if (existing) return existing;
 if (pendingRooms.has(name)) return pendingRooms.get(name);
 if (rooms.size + pendingRooms.size >= MAX_ROOMS) throw Error('Room limit reached');
 const opening = worker.createRouter({mediaCodecs}).then(router => {
  const room = {router, peers:new Set()};
  rooms.set(name, room);
  return room;
 }).finally(() => pendingRooms.delete(name));
 pendingRooms.set(name, opening);
 return opening;
}
function closePeer(peer){
 if(!peer.room)return;
 const r=peer.room;
 for(const prod of peer.producers.values())for(const p of r.peers)if(p!==peer)notify(p.ws,'producerClosed',{producerId:prod.id});
 for(const t of peer.transports.values())t.close();
 peer.transports.clear();peer.producers.clear();peer.consumers.clear();
 r.peers.delete(peer);
 if(r.peers.size===0){r.router.close();if(rooms.get(peer.roomName)===r)rooms.delete(peer.roomName);}
 peer.room=null;peer.roomName=null;
}
wss.on('connection',ws=>{
 if (wss.clients.size > MAX_CONNECTIONS) { ws.close(1013, 'Server busy'); return; }
 ws.isAlive = true;
 ws.on('pong', () => { ws.isAlive = true; });
 let windowStart = Date.now(), messageCount = 0;
 let joining = false;
 let socketClosed = false;
 const remoteAddress = ws._socket?.remoteAddress || 'unknown';
 const peer={ws,room:null,roomName:null,transports:new Map(),producers:new Map(),consumers:new Map()};
 ws.on('message',async raw=>{
  const now = Date.now();
  if (now - windowStart >= 10000) { windowStart = now; messageCount = 0; }
  if (++messageCount > MAX_MESSAGES_PER_10S) { ws.close(1008, 'Rate limit exceeded'); return; }
  let msg;try{msg=JSON.parse(raw.toString());}catch{return;}const {id,action,data={}}=msg;try{
  if(action==='join'){
   if(peer.room || joining)throw Error('Already joining or joined');
   joining = true;
   try {
   if(authBlocked(remoteAddress)) throw Error('Too many failed access-code attempts. Try again later');
   if(!safeId(data.room)||!safeId(data.name))throw Error('Invalid room or name');
   const role=['singer','conductor','engineer'].includes(data.role)?data.role:'singer';
   const a=Buffer.from(String(data.secret||'')),b=Buffer.from(role==='conductor'?conductorCode:role==='engineer'?engineerCode:singerCode);
   if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) {
    failedAuth(remoteAddress);
    throw Error('Unauthorized');
   }
   const selectedRoom = await getRoom(data.room);
   if (socketClosed || ws.readyState !== WebSocket.OPEN) throw Error('Connection closed');
   if (selectedRoom.peers.size >= MAX_PEERS_PER_ROOM) throw Error('Room at capacity');
   peer.roomName=data.room;peer.name=data.name;peer.role=role;peer.section=['Soprano','Alto','Tenor','Bass','Other'].includes(data.section)?data.section:'Other';peer.room=selectedRoom;peer.room.peers.add(peer);
   reply(ws,id,{routerRtpCapabilities:peer.room.router.rtpCapabilities,existingProducers:[...peer.room.peers].filter(p=>p!==peer).flatMap(p=>[...p.producers.values()].map(x=>({producerId:x.id,name:p.name,section:p.section}))) });return;
   } finally { joining = false; }
  }
  if(!peer.room)throw Error('Join first');
  if(action==='createTransport'){
   if(peer.transports.size >= 4)throw Error('Transport limit reached');
   const t=await peer.room.router.createWebRtcTransport({listenInfos:[{protocol:'udp',ip:'0.0.0.0',announcedAddress},{protocol:'tcp',ip:'0.0.0.0',announcedAddress}],enableUdp:true,enableTcp:true,preferUdp:true,initialAvailableOutgoingBitrate:300000});
   peer.transports.set(t.id,t);reply(ws,id,{id:t.id,iceParameters:t.iceParameters,iceCandidates:t.iceCandidates,dtlsParameters:t.dtlsParameters});return;
  }
  if(action==='connectTransport'){
   const t=peer.transports.get(data.transportId);if(!t)throw Error('Unknown transport');await t.connect({dtlsParameters:data.dtlsParameters});reply(ws,id,{ok:true});return;
  }
  if(action==='produce'){
   if(peer.role==='engineer')throw Error('Engineers are receive-only');
   if(peer.producers.size >= 1)throw Error('Only one microphone track is allowed');
   const t=peer.transports.get(data.transportId);if(!t)throw Error('Unknown transport');if(data.kind!=='audio')throw Error('Audio only');
   const prod=await t.produce({kind:'audio',rtpParameters:data.rtpParameters,appData:{section:peer.section}});peer.producers.set(prod.id,prod);
   prod.on('transportclose',()=>peer.producers.delete(prod.id));reply(ws,id,{id:prod.id});
   for(const p of peer.room.peers)if(p!==peer)notify(p.ws,'newProducer',{producerId:prod.id,name:peer.name,section:prod.appData.section});return;
  }
  if(action==='consume'){
   if(peer.consumers.size >= MAX_PEERS_PER_ROOM)throw Error('Consumer limit reached');
   const t=peer.transports.get(data.transportId);if(!t)throw Error('Unknown transport');
   if(!peer.room.router.canConsume({producerId:data.producerId,rtpCapabilities:data.rtpCapabilities}))throw Error('Cannot consume');
   const c=await t.consume({producerId:data.producerId,rtpCapabilities:data.rtpCapabilities,paused:true});peer.consumers.set(c.id,c);c.on('transportclose',()=>peer.consumers.delete(c.id));
   reply(ws,id,{id:c.id,producerId:c.producerId,kind:c.kind,rtpParameters:c.rtpParameters});return;
  }
  if(action==='resumeConsumer'){const c=peer.consumers.get(data.consumerId);if(!c)throw Error('Unknown consumer');await c.resume();reply(ws,id,{ok:true});return;}
  if(action==='cue'){if(peer.role!=='conductor')throw Error('Conductor only');const message=String(data.message||'').slice(0,120);for(const p of peer.room.peers)notify(p.ws,'cue',{message,from:peer.name});reply(ws,id,{ok:true});return;}
  if(action==='leave'){closePeer(peer);reply(ws,id,{ok:true});return;}
  throw Error('Unknown action');
 }catch(e){reply(ws,id,null,e.message);}});
 ws.on('close',()=>{socketClosed=true;closePeer(peer);});
 ws.on('error',()=>{socketClosed=true;closePeer(peer);});
});
server.listen(port,'0.0.0.0',()=>console.log(`ChoirCore signaling listening on ${port}`));
