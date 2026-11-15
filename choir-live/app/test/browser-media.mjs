import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import { chromium } from 'playwright';

const codeSinger='integration-singer-secret-123';
const codeEngineer='integration-engineer-secret-789';
const serverPort=18100;
const sitePort=5178;
const server=spawn(process.execPath,['../../choircore/server/index.mjs'],{
 cwd:process.cwd(),
 env:{...process.env,PORT:String(serverPort),ANNOUNCED_IP:'127.0.0.1',
 CHOIRCORE_SINGER_CODE:codeSinger,
 CHOIRCORE_CONDUCTOR_CODE:'integration-conductor-secret-456',
 CHOIRCORE_ENGINEER_CODE:codeEngineer,
 CHOIRCORE_ALLOWED_ORIGINS:`http://127.0.0.1:${sitePort}`},
 stdio:['ignore','pipe','pipe']
});
const vite=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(sitePort),'--strictPort'],{
 cwd:process.cwd(),stdio:['ignore','pipe','pipe']
});
let logs='';
for(const [label,child] of [['server',server],['vite',vite]]) {
 child.stdout.on('data',d=>{logs+=`[${label}] ${d}`;});
 child.stderr.on('data',d=>{logs+=`[${label} ERR] ${d}`;});
}
let browser;
const stop=()=>{vite.kill('SIGTERM');server.kill('SIGTERM');};
const watchdog=setTimeout(()=>{console.error('Browser media check exceeded 90 seconds',logs);stop();process.exit(1)},90000);
try{
 let ready=false;
 for(let i=0;i<100;i++){
  if(server.exitCode!==null||vite.exitCode!==null)throw Error('A test process stopped early: '+logs);
  try{
   const [h,page]=await Promise.all([
    fetch(`http://127.0.0.1:${serverPort}/health`),
    fetch(`http://127.0.0.1:${sitePort}/media-test.html`)
   ]);
   if(h.ok&&page.ok){ready=true;break;}
  }catch{}
  await sleep(200);
 }
 if(!ready)throw Error('Servers not ready: '+logs);
 browser=await chromium.launch({headless:true,args:[
  '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required','--no-sandbox'
 ]});
 const singer=await browser.newPage();
 const receiver=await browser.newPage();
 const engineer=await browser.newPage();
 const pages=[singer,receiver,engineer];
 for(const p of pages){
  p.on('pageerror',error=>console.error('[browser]',error.message));
  await p.goto(`http://127.0.0.1:${sitePort}/media-test.html`);
  await p.waitForFunction(()=>window.choirMediaTest?.ready,{timeout:20000});
 }
 const wsUrl=`ws://127.0.0.1:${serverPort}`;
 // Join three browsers before publishing, to test newProducer subscription
 // from both singers and ensure the receive-only desk hears both tracks.
 await Promise.all([
  singer.evaluate(args=>window.choirMediaTest.join(args),{url:wsUrl,room:'BROWSER',name:'SingerOne',secret:codeSinger,publish:false}),
  receiver.evaluate(args=>window.choirMediaTest.join(args),{url:wsUrl,room:'BROWSER',name:'SingerTwo',secret:codeSinger,publish:false}),
  engineer.evaluate(args=>window.choirMediaTest.join(args),{url:wsUrl,room:'BROWSER',name:'SoundDesk',secret:codeEngineer,role:'engineer',publish:false})
 ]);
 await Promise.all([
  singer.evaluate(()=>window.choirMediaTest.publishMic()),
  receiver.evaluate(()=>window.choirMediaTest.publishMic())
 ]);
 await Promise.all([
  singer.waitForFunction(()=>window.choirMediaTest.receivedTrackCount>=1,{timeout:20000}),
  receiver.waitForFunction(()=>window.choirMediaTest.receivedTrackCount>=1,{timeout:20000}),
  engineer.waitForFunction(()=>window.choirMediaTest.receivedTrackCount>=2,{timeout:20000})
 ]);
 const deadline=Date.now()+22000;
 let one, two, desk;
 while(Date.now()<deadline){
  [one,two,desk]=await Promise.all(pages.map(page=>page.evaluate(()=>window.choirMediaTest.stats())));
  if(one.packetsReceived>=30&&two.packetsReceived>=30&&desk.packetsReceived>=60)break;
  await sleep(500);
 }
 if(!one||!two||!desk||one.packetsReceived<30||two.packetsReceived<30||desk.packetsReceived<60)
  throw Error('Bidirectional RTP under threshold: '+JSON.stringify({one,two,desk}));
 console.log('BIDIRECTIONAL AUDIO PASS: singer A=',one.packetsReceived,'singer B=',two.packetsReceived,'sound engineer=',desk.packetsReceived);
 for(const p of pages)await p.evaluate(()=>window.choirMediaTest.leave());
}catch(error){console.error('BROWSER AUDIO FAILED:',error,logs);process.exitCode=1;}
finally{
 await browser?.close();
 stop();
 clearTimeout(watchdog);
 // mediasoup native workers may keep open handles after the test child exits.
 await sleep(350);
 process.exit(process.exitCode||0);
}
