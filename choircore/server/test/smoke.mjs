import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const port = 18090;
const origin = 'https://choirlive.example.test';
const codeSinger = 'test-singer-code-12345';
const codeConductor = 'test-conductor-code-12345';
const codeEngineer = 'test-engineer-code-12345';
const adminCode='disposable-admin-code-for-ci-12345';
const child = spawn(process.execPath, ['index.mjs'], {
 cwd: new URL('..', import.meta.url),
 env: {...process.env, PORT:String(port), ANNOUNCED_IP:'127.0.0.1',
  CHOIRCORE_SINGER_CODE:codeSinger, CHOIRCORE_CONDUCTOR_CODE:codeConductor,
  CHOIRCORE_ENGINEER_CODE:codeEngineer, CHOIRCORE_ADMIN_CODE:adminCode, CHOIRCORE_ACCOUNT_DB:':memory:',
  CHOIRCORE_ALLOWED_ORIGINS:origin, MAX_PEERS_PER_ROOM:'2', MAX_ROOMS:'3', MAX_AUTH_FAILURES:'4'},
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
 const host=await connect(origin);
 const created=await request(host,100,'createSession',{hostCode:codeConductor,title:'Choir practice',minutes:60});
 assert.ok(created.data?.room && created.data?.expiresAt>Date.now());
 assert.ok(created.data.invitations.singer!==created.data.invitations.engineer);
 const invitee=await connect(origin);
 const invited=await request(invitee,101,'join',{room:created.data.room,name:'Invited Singer',secret:created.data.invitations.singer,role:'singer'});
 assert.ok(invited.data?.routerRtpCapabilities);
 const roleCheck=await connect(origin);
 const roleRestricted=await request(roleCheck,105,'join',{room:created.data.room,name:'Invited Singer',secret:created.data.invitations.singer,role:'engineer'});
 assert.match(roleRestricted.error,/Unauthorized/);
 roleCheck.terminate();
 const deskInvite=await connect(origin);
 const deskJoin=await request(deskInvite,102,'join',{room:created.data.room,name:'Sound Engineer',secret:created.data.invitations.engineer,role:'engineer'});
 assert.ok(deskJoin.data?.routerRtpCapabilities);
 const ended=await request(host,103,'endSession',{room:created.data.room,managerToken:created.data.managerToken});
 assert.equal(ended.data.ok,true);
 const afterEnd=await connect(origin);
 const expired=await request(afterEnd,104,'join',{room:created.data.room,name:'Invited Singer',secret:created.data.invitations.singer,role:'singer'});
 assert.match(expired.error,/expired or ended/);
 for(const ws of [host,invitee,deskInvite,afterEnd])ws.terminate();
 const workspaceHost=await connect(origin);
 const w1=await request(workspaceHost,200,'registerAccount',{email:'owner1@example.test',password:'disposable-password-001',workspaceName:'First Choir'});
 const w2=await request(workspaceHost,201,'registerAccount',{email:'owner2@example.test',password:'disposable-password-002',workspaceName:'Second Choir'});
 assert.ok(w1.data?.workspaceId&&w2.data?.workspaceId);
 assert.notEqual(w1.data.workspaceId,w2.data.workspaceId);
 assert.equal(w1.data.active,false);
 const pending=await request(workspaceHost,202,'createSession',{authToken:w1.data.authToken,title:'Pending Choir',minutes:60});
 assert.match(pending.error,/activation/);
 const approved=await request(workspaceHost,203,'approveWorkspace',{workspaceId:w1.data.workspaceId,adminCode});
 assert.equal(approved.data.ok,true);
 const owned=await request(workspaceHost,204,'createSession',{authToken:w1.data.authToken,title:'First Choir',minutes:60});
 assert.ok(owned.data?.room);
 const list1=await request(workspaceHost,205,'listSessions',{authToken:w1.data.authToken});
 const list2=await request(workspaceHost,206,'listSessions',{authToken:w2.data.authToken});
 assert.equal(list1.data.length,1);
 assert.equal(list2.data.length,0);
 const cannotEnd=await request(workspaceHost,207,'endSession',{authToken:w2.data.authToken,room:owned.data.room});
 assert.match(cannotEnd.error,/authorization/);
 const endedOwned=await request(workspaceHost,208,'endSession',{authToken:w1.data.authToken,room:owned.data.room});
 assert.equal(endedOwned.data.ok,true);
 const history=await request(workspaceHost,209,'rehearsalHistory',{authToken:w1.data.authToken});assert.equal(history.data[0].status,'ended');
 const otherHistory=await request(workspaceHost,210,'rehearsalHistory',{authToken:w2.data.authToken});assert.equal(otherHistory.data.length,0);
 const scheduled=await request(workspaceHost,211,'createSession',{authToken:w1.data.authToken,title:'Future session',minutes:60,startsAt:Date.now()+3600000});assert.ok(scheduled.data.room);
 const earlyPeer=await connect(origin);
 const early=await request(earlyPeer,212,'join',{room:scheduled.data.room,name:'Early Singer',secret:scheduled.data.invitations.singer,role:'singer'});assert.match(early.error,/not started/);
 earlyPeer.terminate();
 const cancelled=await request(workspaceHost,213,'endSession',{authToken:w1.data.authToken,room:scheduled.data.room});assert.equal(cancelled.data.ok,true);
 const afterCancel=await request(workspaceHost,214,'rehearsalHistory',{authToken:w1.data.authToken});assert.ok(afterCancel.data.some(s=>s.room===scheduled.data.room&&s.status==='cancelled'));
 workspaceHost.terminate();
 const a=await connect(origin);
 const bad=await request(a,1,'join',{room:'TEST',name:'SingerA',secret:'wrong'});
 assert.match(bad.error,/Unauthorized/);
 const joined=await request(a,2,'join',{room:'TEST',name:'Mogana S. Flomo, Jr.',secret:codeSinger,role:'singer',section:'Alto'});
 assert.ok(joined.data.routerRtpCapabilities);
 const forbidden=await request(a,3,'cue',{message:'STOP'});
 assert.match(forbidden.error,/Conductor only/);
 const b=await connect(origin);
 const conductor=await request(b,4,'join',{room:'TEST',name:'Director',secret:codeConductor,role:'conductor'});
 assert.ok(conductor.data.routerRtpCapabilities);
 const singerRecording=await request(a,50,'startRecording',{consentConfirmed:true,revision:2});
 assert.match(singerRecording.error,/Only the conductor or sound engineer/);
 const noConsent=await request(b,51,'startRecording',{consentConfirmed:false,revision:2});
 assert.match(noConsent.error,/consent/);
 const conductorRecording=await request(b,52,'startRecording',{consentConfirmed:true,revision:2});
 assert.equal(conductorRecording.data.ok,true);
 const stopped=await request(b,53,'stopRecording');assert.equal(stopped.data.ok,true);
 const reactionReceived=new Promise(resolve=>{const listener=raw=>{const m=JSON.parse(String(raw));if(m.event==='reaction'){b.off('message',listener);resolve(m.data);}};b.on('message',listener);});
 const reaction=await request(a,54,'reaction',{emoji:'👏'});assert.equal(reaction.data.ok,true);
 assert.equal((await reactionReceived).emoji,'👏');
 const c=await connect(origin);
 const overflow=await request(c,5,'join',{room:'TEST',name:'SingerC',secret:codeSinger});
 assert.match(overflow.error,/capacity/);
 const engineer=await connect(origin);
 const engineerResult=await request(engineer,7,'join',{room:'ENGINEER',name:'Sound Engineer',secret:codeEngineer,role:'engineer'});
 assert.ok(engineerResult.data.routerRtpCapabilities);
 const engineerRecording=await request(engineer,55,'startRecording',{consentConfirmed:true,revision:1});
 assert.equal(engineerRecording.data.ok,true);
 const newMember=await connect(origin);
 const notice=new Promise(resolve=>{const listener=raw=>{const m=JSON.parse(String(raw));if(m.event==='recordingState'&&!m.data.active){engineer.off('message',listener);resolve(m.data);}};engineer.on('message',listener);});
 const newMemberJoin=await request(newMember,56,'join',{room:'ENGINEER',name:'New Singer',secret:codeSinger,role:'singer'});assert.ok(newMemberJoin.data.routerRtpCapabilities);
 assert.equal((await notice).revision,2);
 const oldConsent=await request(engineer,57,'startRecording',{consentConfirmed:true,revision:1});assert.match(oldConsent.error,/consent/);
 newMember.terminate();
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
 // Invalid secrets across separate sockets share a bounded per-address limit.
 const attackOne=await connect(origin);
 const badTwo=await request(attackOne,15,'join',{room:'TEST',name:'Guess',secret:'incorrect-secret'});
 assert.match(badTwo.error,/Unauthorized/);
 const attackTwo=await connect(origin);
 const badThree=await request(attackTwo,16,'join',{room:'TEST',name:'Guess',secret:'incorrect-secret'});
 assert.match(badThree.error,/Unauthorized/);
 const blocked=await connect(origin);
 const blockedResult=await request(blocked,17,'join',{room:'TEST',name:'SingerValid',secret:codeSinger});
 assert.match(blockedResult.error,/Too many failed access-code attempts/);
 console.log('ChoirCore smoke test passed: health, origin, roles, room capacity, concurrent joins, auth throttling, cues');
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
