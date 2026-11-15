import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const port = 18090;
const origin = 'https://choirlive.example.test';
const codeSinger = 'test-singer-code-12345';
const codeConductor = 'test-conductor-code-12345';
const codeEngineer = 'test-engineer-code-12345';
const child = spawn(process.execPath, ['index.mjs'], {
 cwd: new URL('..', import.meta.url),
 env: {...process.env, PORT:String(port), ANNOUNCED_IP:'127.0.0.1',
  CHOIRCORE_SINGER_CODE:codeSinger, CHOIRCORE_CONDUCTOR_CODE:codeConductor,
  CHOIRCORE_ENGINEER_CODE:codeEngineer,
  CHOIRCORE_ALLOWED_ORIGINS:origin, MAX_PEERS_PER_ROOM:'2', MAX_ROOMS:'3'},
 stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data', chunk => {logs += String(chunk);});
child.stderr.on('data', chunk => {logs += String(chunk);});
const peers=[];
const watchdog = setTimeout(() => {
 console.error('ChoirCore smoke test exceeded 25 seconds. Child output:\\n'+logs);
 for(const ws of peers)ws.terminate();
 child.kill('SIGKILL');
 process.exit(1);
}, 25000);
watchdog.unref();
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
 const engineer=await connect(origin);
 const engineerResult=await request(engineer,7,'join',{room:'ENGINEER',name:'Mixer',secret:codeEngineer,role:'engineer'});
 assert.ok(engineerResult.data.routerRtpCapabilities);
 const cannotPublish=await request(engineer,8,'produce',{kind:'audio'});
 assert.match(cannotPublish.error,/receive-only/);
 // Concurrent joins on one socket may never create two room memberships.
 const racer=await connect(origin);
 const [firstJoin,secondJoin]=await Promise.all([
  request(racer,10,'join',{room:'RACE',name:'Concurrent',secret:codeSinger}),
  request(racer,11,'join',{room:'RACE',name:'Concurrent',secret:codeSinger})
 ]);
 const successes=[firstJoin,secondJoin].filter(x=>Boolean(x.data));
 const rejections=[firstJoin,secondJoin].filter(x=>Boolean(x.error));
 assert.equal(successes.length,1,'Exactly one concurrent join should succeed');
 assert.equal(rejections.length,1,'Second concurrent join should fail');
 assert.match(rejections[0].error,/Already joining or joined/);
 const racerLeave=await request(racer,12,'leave');
 assert.equal(racerLeave.data.ok,true);
 // Reject a new room once the bounded room allocation is exhausted.
 const newRoomPeer=await connect(origin);
 const extraRoom=await request(newRoomPeer,13,'join',{room:'EXTRA',name:'Extra',secret:codeSinger});
 assert.ok(extraRoom.data.routerRtpCapabilities);
 const beyond=await connect(origin);
 const tooMany=await request(beyond,14,'join',{room:'TOO_MANY',name:'TooMany',secret:codeSinger});
 assert.match(tooMany.error,/Room limit reached/);
 const cue=await request(b,6,'cue',{message:'Bar 12'});
 assert.equal(cue.data.ok,true);
 console.log('ChoirCore smoke test passed: health, origin, roles, room capacity, cues');
} catch (error) {
 console.error('Smoke test failed:', error, '\\nChoirCore output:\\n'+logs);
 process.exitCode = 1;
} finally {
 for(const ws of peers)ws.terminate();
 child.kill('SIGTERM');
 await sleep(200);
 clearTimeout(watchdog);
 // mediasoup worker descendants may retain handles after signaling process exit.
 process.exit(process.exitCode || 0);
}
