import { useEffect, useRef, useState } from 'react';
import { ChoirCoreClient } from '../../../choircore/sdk/index.mjs';
import './ChoirRoom.css';

type Remote = {producerId:string;name:string;section:string};
const sections=['Soprano','Alto','Tenor','Bass','Other'];

export default function ChoirCoreRoom(){
 const [name,setName]=useState('');
 const [room,setRoom]=useState('CHOIR-101');
 const [secret,setSecret]=useState('');
 const [role,setRole]=useState('singer');
 const [section,setSection]=useState('Soprano');
 const [status,setStatus]=useState('Disconnected');
 const [joined,setJoined]=useState(false);
 const [connecting,setConnecting]=useState(false);
 const [muted,setMuted]=useState(false);
 const [cue,setCue]=useState('');
 const [lastCue,setLastCue]=useState('');
 const [remotes,setRemotes]=useState<Remote[]>([]);
 const [network,setNetwork]=useState('Network measurements pending');
 const client=useRef<ChoirCoreClient|null>(null);
 const mic=useRef<MediaStream|null>(null);
 const audio=useRef<Map<string,HTMLAudioElement>>(new Map());
 const attempt=useRef(0);
 const mounted=useRef(true);

 const clearAudio=()=>{
  audio.current.forEach(element=>{element.pause();element.srcObject=null;element.remove();});
  audio.current.clear();
  setRemotes([]);
 };
 const disconnect=()=>{
  // Invalidate asynchronous connects before tearing down.
  attempt.current++;
  client.current?.close();client.current=null;
  mic.current?.getTracks().forEach(track=>track.stop());mic.current=null;
  clearAudio();setJoined(false);setConnecting(false);setMuted(false);
 };
 const leave=()=>{disconnect();setStatus('Disconnected');};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;disconnect();}},[]);

 const join=async()=>{
  if(!name.trim()||!room.trim()||!secret){setStatus('Enter name, room and access code');return;}
  if(connecting||joined)return;
  const id=++attempt.current;
  setConnecting(true);setStatus('Connecting to ChoirCore…');
  const c=new ChoirCoreClient(import.meta.env.VITE_CHOIRCORE_URL||'ws://localhost:8090');
  client.current=c;
  let stream:MediaStream|null=null;
  try{
   c.on('track',({track,producerId,name,section})=>{
    if(id!==attempt.current||!mounted.current)return;
    const existing=audio.current.get(producerId);
    existing?.pause();existing?.remove();
    const element=document.createElement('audio');
    element.autoplay=true;element.srcObject=new MediaStream([track]);
    document.body.appendChild(element);audio.current.set(producerId,element);
    void element.play().catch(()=>setStatus('Click Enable playback to hear singers'));
    setRemotes(current=>[...current.filter(x=>x.producerId!==producerId),{producerId,name,section}]);
   });
   c.on('trackClosed',({producerId})=>{
    const element=audio.current.get(producerId);
    element?.pause();element?.remove();audio.current.delete(producerId);
    if(mounted.current)setRemotes(current=>current.filter(x=>x.producerId!==producerId));
   });
   c.on('cue',({message})=>{if(mounted.current)setLastCue(message);});
   c.on('error',error=>{if(id===attempt.current&&mounted.current)setStatus('Audio connection issue: '+String(error));});
   c.on('disconnected',()=>{
    if(id!==attempt.current||!mounted.current)return;
    disconnect();
    setStatus('Connection lost. Select Rejoin room to reconnect.');
   });
   await c.connect({room:room.trim(),name:name.trim(),secret,role,section});
   if(id!==attempt.current)throw new Error('Join canceled');
   setStatus('Signaling connected. Requesting microphone permission…');
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone unavailable in this browser');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
   if(id!==attempt.current)throw new Error('Join canceled');
   mic.current=stream;
   setStatus('Microphone ready. Connecting media transport…');
   await c.publish(stream.getAudioTracks()[0],section);
   if(id!==attempt.current)throw new Error('Join canceled');
   setJoined(true);setConnecting(false);setStatus('Connected — wear headphones');
  }catch(error){
   stream?.getTracks().forEach(track=>track.stop());
   c.close();
   if(id===attempt.current&&mounted.current){disconnect();setStatus('Connection failed: '+String(error));}
  }
 };
 useEffect(()=>{
  if(!joined)return;
  let active=true;
  const measure=async()=>{
   try{
    const result=await client.current?.getNetworkStats();
    if(result&&active)setNetwork(`RTT: ${result.roundTripMs===null?'unavailable':result.roundTripMs+' ms'} · jitter: ${result.jitterMs===null?'unavailable':result.jitterMs+' ms'} · packets lost: ${result.packetsLost} / received: ${result.packetsReceived}`);
   }catch{if(active)setNetwork('Network measurements unavailable');}
  };
  void measure();const timer=window.setInterval(()=>void measure(),5000);
  return()=>{active=false;window.clearInterval(timer);};
 },[joined]);

 return <section className="choir-app" id="choircore-room"><div className="choir-shell">
  <div className="choir-top"><div><span className="choir-kicker"><img src={`${import.meta.env.BASE_URL}choir-mark.svg`} alt="" className="inline-block w-6 h-6 align-middle mr-2" />CHOIRCORE · INDEPENDENT ENGINE</span><h2>ChoirCore rehearsal room</h2><p>Self-hosted WebRTC · headphones recommended</p></div><span className="choir-pill">{joined?'● CONNECTED':connecting?'◌ CONNECTING':'○ OFFLINE'}</span></div>
  {!joined?<div className="choir-form">
   <label>Your name<input maxLength={64} autoComplete="name" value={name} disabled={connecting} onChange={e=>setName(e.target.value)}/></label>
   <label>Room<input maxLength={64} value={room} disabled={connecting} onChange={e=>setRoom(e.target.value)}/></label>
   <label>Access code<input type="password" value={secret} disabled={connecting} onChange={e=>setSecret(e.target.value)}/></label>
   <label>Role<select value={role} disabled={connecting} onChange={e=>setRole(e.target.value)}><option value="singer">Singer</option><option value="conductor">Conductor</option></select></label>
   <label>Section<select value={section} disabled={connecting} onChange={e=>setSection(e.target.value)}>{sections.map(s=><option key={s}>{s}</option>)}</select></label>
   <div className="choir-actions"><button disabled={connecting} onClick={()=>void join()}>{connecting?'Connecting…':'Join / Rejoin room'}</button>{connecting&&<button onClick={leave}>Cancel connection</button>}</div>
   <p className="choir-hint">Joining enables your microphone. First <a href="#microphone-test" className="underline">check your microphone and record a test</a>. If a network disconnect occurs, use Rejoin room.</p>
  </div>:<div className="choir-panel">
   <h3>Connected singers ({remotes.length})</h3>
   {remotes.map(participant=><p key={participant.producerId}>{participant.name} — {participant.section}</p>)}
   <div className="choir-actions"><button onClick={()=>{mic.current?.getAudioTracks().forEach(t=>t.enabled=muted);setMuted(!muted);}}>{muted?'Unmute microphone':'Mute microphone'}</button>
   <button onClick={()=>audio.current.forEach(element=>void element.play().catch(()=>setStatus('Browser blocked audio playback')))}>Enable playback</button>
   <button onClick={leave}>Leave room</button></div>
   {role==='conductor'&&<div><label>Conductor cue<input value={cue} maxLength={120} onChange={e=>setCue(e.target.value)}/></label><button disabled={!cue.trim()} onClick={()=>void client.current?.cue(cue).catch(error=>setStatus(String(error)))}>Broadcast cue</button></div>}
   {lastCue&&<p role="status">Conductor: {lastCue}</p>}
   <p className="choir-hint" role="status">{network}</p>
   <p className="choir-hint">RTT and jitter are network indicators, not guaranteed choir synchronization or end-to-end audio latency.</p>
  </div>}
  <p role="status" className="choir-status">{status}</p>
 </div></section>;
}
