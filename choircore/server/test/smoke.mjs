import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const port = 18090;
const origin = 'https://choirlive.example.test';
const codeSinger = 'test-singer-code-12345';
const codeConductor = 'test-conductor-code-12345';
const child = spawn(process.execPath, ['index.mjs'], {
 cwd: new URL('..', import.meta.url),
 env: {...process.env, PORT:String(port), ANNOUNCED_IP:'127.0.0.1',
  CHOIRCORE_SINGER_CODE:codeSinger, CHOIRCORE_CONDUCTOR_CODE:codeConductor,
  CHOIRCORE_ALLOWED_ORIGINS:origin, MAX_PEERS_PER_ROOM:'2'},
 stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data', chunk => {logs += String(chunk);});
child.stderr.on('data', chunk => {logs += String(chunk);});
const peers=[];
function request(ws, id, action, data={}) {
 return new Promise((resolve,reject) => {
  const timeout = setTimeout(() => {ws.off('message', onMessage);reject(Error('Request timed out'));}, 3000);
  function onMessage(raw) {
   let result;try {result=JSON.parse(String(raw));}catch{return;}
   if(result.id!==id)return;
   clearTimeout(timeout);ws.off('message',onMessage);resolve(result);
  }
  ws.on('message',onMessage);
  ws.send(JSON.stringify({id,action,data}));
 });
}
async function connect(originValue) {
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(`ws://127.0.0.1:${port}`,{origin:originValue});
  const timeout=setTimeout(()=>{ws.terminate();reject(Error('WebSocket handshake timeout'));},3000);
  ws.once('open',()=>{clearTimeout(timeout);peers.push(ws);resolve(ws)});
  ws.once('error',e=>{clearTimeout(timeout);reject(e)});
 });
}
try {
 let healthy=false;
 for(let i=0;i<50;i++) {
  if(child.exitCode!==null)throw Error('ChoirCore server exited: '+logs);
  try {
   const r=await fetch(`http://127.0.0.1:${port}/health`);
   if(r.ok && (await r.json()).status==='ok'){healthy=true;break;}
  }catch{}
  await sleep(150);
 }
 assert.ok(healthy,'ChoirCore health endpoint failed; '+logs);
 assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,404);
 await assert.rejects(connect('https://unauthorized.invalid'), /403|Unexpected server response/);
 const a=await connect(origin);
 const bad=await request(a,1,'join',{room:'TEST',name:'SingerA',secret:'wrong'});
 assert.match(bad.error,/Unauthorized/);
 const joined=await request(a,2,'join',{room:'TEST',name:'SingerA',secret:codeSinger,role:'singer',section:'Alto'});
 assert.ok(joined.data.routerRtpCapabilities);
 const forbidden=await request(a,3,'cue',{message:'STOP'});
 assert.match(forbidden.error,/Conductor only/);
 const b=await connect(origin);
 const conductor=await request(b,4,'join',{room:'TEST',name:'Director',secret:codeConductor,role:'conductor'});
 assert.ok(conductor.data.routerRtpCapabilities);
 const c=await connect(origin);
 const overflow=await request(c,5,'join',{room:'TEST',name:'SingerC',secret:codeSinger});
 assert.match(overflow.error,/capacity/);
 const cue=await request(b,6,'cue',{message:'Bar 12'});
 assert.equal(cue.data.ok,true);
 console.log('ChoirCore smoke test passed: health, origin, roles, room capacity, cues');
} finally {
 for(const ws of peers)ws.terminate();
 child.kill('SIGTERM');
 await sleep(200);
}
