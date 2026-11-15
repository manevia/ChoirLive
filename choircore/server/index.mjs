import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import * as mediasoup from 'mediasoup';
const port = Number(process.env.PORT || 8090);
const singerCode = process.env.CHOIRCORE_SINGER_CODE;
const conductorCode = process.env.CHOIRCORE_CONDUCTOR_CODE;
if (!singerCode || singerCode.length < 12 || !conductorCode || conductorCode.length < 12 || singerCode === conductorCode) throw new Error('Set distinct CHOIRCORE_SINGER_CODE and CHOIRCORE_CONDUCTOR_CODE (12+ chars)');
const announcedAddress = process.env.ANNOUNCED_IP;
if (!announcedAddress) throw new Error('Set ANNOUNCED_IP to the public IP or reachable DNS name');
const worker = await mediasoup.createWorker({rtcMinPort:40000,rtcMaxPort:40100,logLevel:'warn'});
worker.on('died',()=>process.exit(1));
const rooms = new Map();
const mediaCodecs = [{kind:'audio',mimeType:'audio/opus',clockRate:48000,channels:2,parameters:{useinbandfec:1}}];
const server = http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({service:'ChoirCore',status:'ok',rooms:rooms.size}));});
const wss = new WebSocketServer({server,maxPayload:65536});
function reply(ws,id,data,error){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({id,...(error?{error:String(error)}:{data})}));}
function notify(ws,event,data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({event,data}));}
function safeId(s){return typeof s==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(s)}
async function getRoom(name){let room=rooms.get(name);if(!room){room={router:await worker.createRouter({mediaCodecs}),peers:new Set()};rooms.set(name,room);}return room;}
function closePeer(peer){if(!peer.room)return;const r=peer.room;for(const prod of peer.producers.values()){for(const p of r.peers)if(p!==peer)notify(p.ws,'producerClosed',{producerId:prod.id});}for(const t of peer.transports.values())t.close();r.peers.delete(peer);if(r.peers.size===0){r.router.close();rooms.delete(peer.roomName);}peer.room=null;}
wss.on('connection',ws=>{
 const peer={ws,room:null,roomName:null,transports:new Map(),producers:new Map(),consumers:new Map()};
 ws.on('message',async raw=>{let msg;try{msg=JSON.parse(raw.toString());}catch{return;}const {id,action,data={}}=msg;try{
  if(action==='join'){
   if(peer.room)throw Error('Already joined');
   if(!safeId(data.room)||!safeId(data.name))throw Error('Invalid room or name');
   const role=data.role==='conductor'?'conductor':'singer';
   const a=Buffer.from(String(data.secret||'')),b=Buffer.from(role==='conductor'?conductorCode:singerCode);
   if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw Error('Unauthorized');
   peer.roomName=data.room;peer.name=data.name;peer.role=role;peer.section=['Soprano','Alto','Tenor','Bass','Other'].includes(data.section)?data.section:'Other';peer.room=await getRoom(data.room);peer.room.peers.add(peer);
   reply(ws,id,{routerRtpCapabilities:peer.room.router.rtpCapabilities,existingProducers:[...peer.room.peers].filter(p=>p!==peer).flatMap(p=>[...p.producers.values()].map(x=>({producerId:x.id,name:p.name,section:p.section}))) });return;
  }
  if(!peer.room)throw Error('Join first');
  if(action==='createTransport'){
   const t=await peer.room.router.createWebRtcTransport({listenInfos:[{protocol:'udp',ip:'0.0.0.0',announcedAddress},{protocol:'tcp',ip:'0.0.0.0',announcedAddress}],enableUdp:true,enableTcp:true,preferUdp:true,initialAvailableOutgoingBitrate:300000});
   peer.transports.set(t.id,t);reply(ws,id,{id:t.id,iceParameters:t.iceParameters,iceCandidates:t.iceCandidates,dtlsParameters:t.dtlsParameters});return;
  }
  if(action==='connectTransport'){
   const t=peer.transports.get(data.transportId);if(!t)throw Error('Unknown transport');await t.connect({dtlsParameters:data.dtlsParameters});reply(ws,id,{ok:true});return;
  }
  if(action==='produce'){
   const t=peer.transports.get(data.transportId);if(!t)throw Error('Unknown transport');if(data.kind!=='audio')throw Error('Audio only');
   const prod=await t.produce({kind:'audio',rtpParameters:data.rtpParameters,appData:{section:peer.section}});peer.producers.set(prod.id,prod);
   prod.on('transportclose',()=>peer.producers.delete(prod.id));reply(ws,id,{id:prod.id});
   for(const p of peer.room.peers)if(p!==peer)notify(p.ws,'newProducer',{producerId:prod.id,name:peer.name,section:prod.appData.section});return;
  }
  if(action==='consume'){
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
 ws.on('close',()=>closePeer(peer));ws.on('error',()=>closePeer(peer));
});
server.listen(port,'0.0.0.0',()=>console.log(`ChoirCore signaling listening on ${port}`));
