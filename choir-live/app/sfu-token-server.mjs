import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';

const port = Number(process.env.TOKEN_PORT || 3002);
const key = process.env.LIVEKIT_API_KEY;
const secret = process.env.LIVEKIT_API_SECRET;
const wsUrl = process.env.LIVEKIT_PUBLIC_URL || 'ws://localhost:7880';
const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const roomPassphrase = process.env.CHOIR_ROOM_PASSPHRASE;
const outputPassphrase = process.env.CHOIR_OUTPUT_PASSPHRASE;
const conductorPassphrase = process.env.CHOIR_CONDUCTOR_PASSPHRASE;
const production = process.env.NODE_ENV === 'production';
if (!key || !secret || (production && (!roomPassphrase || !outputPassphrase || !conductorPassphrase || secret.startsWith('devsecret')))) {
  console.error('Missing credentials or insecure production configuration'); process.exit(1);
}
const limiter = new Map();
const sections = new Set(['Soprano','Alto','Tenor','Bass','Other']);
function same(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x,y);
}
function send(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}
const server = http.createServer(async(req,res)=>{
  if(req.headers.origin === origin) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS') {res.writeHead(req.headers.origin === origin ? 204 : 403).end();return;}
  if(req.url==='/health' && req.method==='GET') {send(res,200,{ok:true});return;}
  if(req.method!=='POST' || req.url!=='/token') {send(res,404,{error:'Not found'});return;}
  if(req.headers.origin && req.headers.origin!==origin) {send(res,403,{error:'Origin denied'});return;}
  const ip=req.socket.remoteAddress||'unknown', now=Date.now();
  if(limiter.size>10000) for(const [k,v] of limiter) if(v.until<now)limiter.delete(k);
  const entry=limiter.get(ip)||{count:0,until:now+60000};
  if(now>entry.until){entry.count=0;entry.until=now+60000;}
  if(++entry.count>20){limiter.set(ip,entry);send(res,429,{error:'Rate limited'});return;}
  limiter.set(ip,entry);
  let raw='';
  try {
    for await (const part of req) {raw+=part;if(Buffer.byteLength(raw)>4096){send(res,413,{error:'Payload too large'});return;}}
    const {room,name,section,role='singer',passphrase}=JSON.parse(raw);
    if(typeof room!=='string'||!/^[A-Za-z0-9_-]{3,48}$/.test(room)||typeof name!=='string'||!name.trim()||name.length>60||!sections.has(section)||!['singer','output','conductor'].includes(role)) {send(res,400,{error:'Invalid room, name, section or role'});return;}
    const required=role==='output'?outputPassphrase:role==='conductor'?conductorPassphrase:roomPassphrase;
    if(required && !same(passphrase,required)){send(res,403,{error:'Invalid room access code'});return;}
    if(production && !required){send(res,503,{error:'Room access not configured'});return;}
    const identity=randomUUID();
    const token=new AccessToken(key,secret,{identity,name:name.trim(),ttl:'1h',metadata:JSON.stringify({section,role})});
    token.addGrant({roomJoin:true,room,canPublish:role!=='output',canSubscribe:true,canPublishData:role==='conductor'});
    send(res,200,{token:await token.toJwt(),url:wsUrl,identity});
  } catch {send(res,400,{error:'Invalid request'});}
});
server.listen(port,()=>console.log(`ChoirLive secure token service listening on ${port}`));
