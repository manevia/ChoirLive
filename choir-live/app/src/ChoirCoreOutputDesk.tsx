import { useEffect, useRef, useState } from 'react';
import { ChoirCoreClient } from '../../../choircore/sdk/index.mjs';
import './ChoirRoom.css';
import type {Invitation} from './sessionInvitations';

const SECTION_NAMES = ['Soprano','Alto','Tenor','Bass','Other'] as const;
type Section = typeof SECTION_NAMES[number];
type StreamNode = { source: MediaStreamAudioSourceNode; gain: GainNode; section: Section };
type OutputDevice = { deviceId: string; label: string };
const safeSection = (value: string): Section => SECTION_NAMES.includes(value as Section) ? value as Section : 'Other';

export default function ChoirCoreOutputDesk({invitation}:{invitation?:Invitation}={}){
 const [room,setRoom] = useState(invitation?.room||'CHOIR-101');
 const [name,setName] = useState('Sound Engineer');
 const [secret,setSecret] = useState(invitation?.token||'');
 const [status,setStatus] = useState('Disconnected');
 const [connected,setConnected] = useState(false);
 const [connecting,setConnecting] = useState(false);
 const joining = useRef(false);
 const [counts,setCounts] = useState<Record<Section,number>>({Soprano:0,Alto:0,Tenor:0,Bass:0,Other:0});
 const [levels,setLevels] = useState<Record<Section,number>>({Soprano:100,Alto:100,Tenor:100,Bass:100,Other:100});
 const [master,setMaster] = useState(75);
 const [devices,setDevices] = useState<OutputDevice[]>([]);
 const [selectedDevice,setSelectedDevice] = useState('');
 const [recording,setRecording] = useState(false);
 const [recordedSeconds,setRecordedSeconds] = useState(0);
 const [consentConfirmed,setConsentConfirmed] = useState(false);
 const client = useRef<ChoirCoreClient|null>(null);
 const context = useRef<AudioContext|null>(null);
 const destination = useRef<MediaStreamAudioDestinationNode|null>(null);
 const output = useRef<HTMLAudioElement|null>(null);
 const buses = useRef<Map<Section,GainNode>>(new Map());
 const sources = useRef<Map<string,StreamNode>>(new Map());
 const main = useRef<GainNode|null>(null);
 const limiter = useRef<DynamicsCompressorNode|null>(null);
 const recorder = useRef<MediaRecorder|null>(null);
 const recordingStarted = useRef<number|null>(null);

 const refreshCounts = () => {
  const next: Record<Section,number> = {Soprano:0,Alto:0,Tenor:0,Bass:0,Other:0};
  sources.current.forEach(item => next[item.section]++);
  setCounts(next);
 };
 const removeSource = (producerId:string) => {
  const item = sources.current.get(producerId);
  if(!item)return;
  item.source.disconnect();
  item.gain.disconnect();
  sources.current.delete(producerId);
  refreshCounts();
 };
 const finishRecording = () => {
  const current=recorder.current;
  if(current?.state==='recording')current.stop();
  setRecording(false);
  recordingStarted.current=null;
 };
 const startRecording = () => {
  if(!consentConfirmed){setStatus('Confirm participant recording consent before starting');return;}
  if(!destination.current || typeof MediaRecorder==='undefined'){setStatus('Browser recording is unavailable');return;}
  if(recorder.current?.state==='recording')return;
  const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime){setStatus('This browser has no supported audio recording format');return;}
  const chunks:BlobPart[]=[];
  try{
   const mediaRecorder=new MediaRecorder(destination.current.stream,{mimeType:mime,audioBitsPerSecond:128000});
   recorder.current=mediaRecorder;
   mediaRecorder.ondataavailable=event=>{if(event.data.size>0)chunks.push(event.data);};
   mediaRecorder.onerror=()=>setStatus('Recording error: check browser audio permissions');
   mediaRecorder.onstop=()=>{
    const blob=new Blob(chunks,{type:mediaRecorder.mimeType});
    if(blob.size>0){
     const url=URL.createObjectURL(blob);
     const anchor=document.createElement('a');
     const stamp=new Date().toISOString().replace(/[:.]/g,'-');
     const safeRoom=room.replace(/[^a-zA-Z0-9_-]/g,'-');
     anchor.href=url;anchor.download=`choircore-${safeRoom}-${stamp}.${mime.includes('mp4')?'m4a':'webm'}`;
     document.body.appendChild(anchor);anchor.click();anchor.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),30000);
     setStatus('Recording finished. Check your browser downloads.');
    }else setStatus('No audio data was captured');
    if(recorder.current===mediaRecorder)recorder.current=null;
   };
   mediaRecorder.start(1000);recordingStarted.current=Date.now();setRecordedSeconds(0);setRecording(true);
   setStatus('Recording the browser SATB master mix locally');
  }catch(error){setStatus('Could not start recording: '+String(error));}
 };
 const stop = (reason='Disconnected') => {
  finishRecording();
  client.current?.close();client.current=null;
  for(const id of [...sources.current.keys()])removeSource(id);
  if(output.current){output.current.pause();output.current.srcObject=null;}
  void context.current?.close();context.current=null;
  destination.current=null;main.current=null;limiter.current=null;buses.current.clear();
  setConnected(false);setConnecting(false);joining.current=false;setConsentConfirmed(false);setStatus(reason);
 };
 useEffect(()=>{if(!recording)return;const interval=window.setInterval(()=>{if(recordingStarted.current!==null)setRecordedSeconds(Math.floor((Date.now()-recordingStarted.current)/1000))},1000);return()=>window.clearInterval(interval)},[recording]);
 useEffect(()=>()=>{stop();},[]);

 const refreshDevices = async () => {
  try{
   const devices = await navigator.mediaDevices.enumerateDevices();
   setDevices(devices.filter(d=>d.kind==='audiooutput').map(d=>({deviceId:d.deviceId,label:d.label||'Audio output device'})));
  }catch{setDevices([]);}
 };
 const join = async () => {
  if(!name.trim() || !room.trim() || !secret){setStatus('Enter the engineer name, room and room access code');return;}
  if(joining.current||connected)return;
  joining.current=true;setConnecting(true);
  let c:ChoirCoreClient|null=null;
  try{
   setStatus('Connecting receiving-only Output Desk…');
   const ctx = new AudioContext({latencyHint:'interactive'});
   await ctx.resume();context.current=ctx;
   const dst=ctx.createMediaStreamDestination();destination.current=dst;
   const masterGain=ctx.createGain();masterGain.gain.value=master/100;main.current=masterGain;
   const comp=ctx.createDynamicsCompressor();comp.threshold.value=-6;comp.knee.value=6;comp.ratio.value=8;comp.attack.value=0.004;comp.release.value=0.16;limiter.current=comp;
   masterGain.connect(comp).connect(dst);
   for(const section of SECTION_NAMES){
    const bus=ctx.createGain();bus.gain.value=levels[section]/100;bus.connect(masterGain);buses.current.set(section,bus);
   }
   const audio=output.current;
   if(!audio)throw new Error('Output audio element unavailable');
   audio.srcObject=dst.stream;
   c=new ChoirCoreClient(import.meta.env.VITE_CHOIRCORE_URL||'ws://localhost:8090');
   client.current=c;
   c.on('track',({track,producerId,section})=>{
    if(!context.current || sources.current.has(producerId))return;
    const source=context.current.createMediaStreamSource(new MediaStream([track]));
    const gain=context.current.createGain();gain.gain.value=1;
    const voice=safeSection(section);
    source.connect(gain).connect(buses.current.get(voice)!);
    sources.current.set(producerId,{source,gain,section:voice});
    refreshCounts();
    void output.current?.play().catch(()=>setStatus('Click Enable audio output to hear the choir'));
   });
   c.on('trackClosed',({producerId})=>removeSource(producerId));
   c.on('disconnected',()=>{if(client.current===c)stop('ChoirCore signaling lost. Reconnect the Sound Desk; any active local recording was finalized.');});
   c.on('error',error=>setStatus('Audio connection issue: '+String(error)));
   // The desk receives media but never publishes its microphone.
   // Engineer authorization uses a distinct receive-only shared code.
   // Individual user identities are required before public launch.
   await c.connect({room:room.trim(),name:name.trim(),secret,role:'engineer',section:'Other'});
   setConnected(true);setConnecting(false);joining.current=false;setStatus('Receiving choir audio — no microphone published');
   await refreshDevices();
   void audio.play().catch(()=>setStatus('Click Enable audio output to hear the choir'));
  }catch(error){stop('Output Desk connection failed: '+String(error));}
 };
 const setLevel=(section:Section,value:number)=>{
  setLevels(old=>({...old,[section]:value}));
  const bus=buses.current.get(section);if(bus)bus.gain.value=value/100;
 };
 const setMasterLevel=(value:number)=>{
  setMaster(value);if(main.current)main.current.gain.value=value/100;
 };
 const selectDevice=async(value:string)=>{
  setSelectedDevice(value);
  const element=output.current as (HTMLAudioElement & {setSinkId?:(id:string)=>Promise<void>})|null;
  if(!element?.setSinkId){setStatus('Output device selection is unavailable in this browser. Use your system audio settings.');return;}
  try{await element.setSinkId(value);setStatus('Audio output device selected');}catch(error){setStatus('Cannot select output: '+String(error));}
 };
 return <section className="choir-app" id="choircore-output">
  <div className="choir-shell">
   <div className="choir-top"><div><span className="choir-kicker"><img src={`${import.meta.env.BASE_URL}choir-mark.svg`} alt="" className="inline-block w-6 h-6 align-middle mr-2" />CHOIRCORE · INDEPENDENT OUTPUT</span><h2>Native ChoirCore Sound Desk</h2><p>Receive-only SATB mix · USB audio output · no LiveKit connection</p></div><span className="choir-pill">{connected?'● CONNECTED':'○ OFFLINE'}</span></div>
   {!connected?<div className="choir-form">
    <label>Engineer display name<input maxLength={64} disabled={connecting} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Choir room<input maxLength={64} disabled={connecting||!!invitation} value={room} onChange={e=>setRoom(e.target.value)}/></label>
    {invitation?<p className="choir-hint">Session invitation: authorization included in your link.</p>:<label>Room access code<input type="password" disabled={connecting} value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="off"/></label>}
    <button disabled={connecting} onClick={()=>void join()}>{connecting?'Connecting…':'Connect output desk'}</button>
    <p className="choir-hint">Only a sound-engineer invitation or the legacy engineering code grants desk access. A server-side master mixer remains pending.</p>
   </div>:<div>
    <div className="choir-actions"><button onClick={()=>void output.current?.play()}>Enable audio output</button><button onClick={()=>void refreshDevices()}>Refresh audio devices</button><button onClick={()=>stop()}>Leave room</button></div>
    <div className="choir-panel">
     <h3>Local rehearsal recording</h3>
     <label><input type="checkbox" checked={consentConfirmed} onChange={event=>setConsentConfirmed(event.target.checked)} disabled={recording}/> I confirm all participants have been informed and have agreed to this recording.</label>
     <div className="choir-actions"><button onClick={recording?finishRecording:startRecording} disabled={!recording&&!consentConfirmed}>{recording?'Stop and save recording':'Start recording'}</button><span role="status">{recording?`Recording: ${Math.floor(recordedSeconds/60)}m ${String(recordedSeconds%60).padStart(2,'0')}s`:'Not recording'}</span></div>
     <p className="choir-hint">Saves the received and mixed audio to this browser when recording stops. Keep this page open; there is no cloud backup or server-side recording yet. Individual singers' local microphones are not included unless received as remote tracks.</p>
    </div>
    <div className="choir-columns">
     <div className="choir-panel"><h3>SATB section mixer</h3>
      {SECTION_NAMES.map(section=><div key={section} className="choir-person"><span>{section}<small>{counts[section]} connected audio tracks</small></span><label>Level {levels[section]}%<input type="range" min="0" max="150" value={levels[section]} onChange={e=>setLevel(section,Number(e.target.value))}/></label></div>)}
      <label>Master volume {master}%<input type="range" min="0" max="100" value={master} onChange={e=>setMasterLevel(Number(e.target.value))}/></label>
     </div>
     <div className="choir-panel"><h3>Master output</h3>
      
      <label>Output device<select value={selectedDevice} onChange={e=>void selectDevice(e.target.value)}><option value="">Default system output</option>{devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</select></label>
      <p className="choir-hint">Connect the receiving computer to your USB audio interface, then feed the interface output into a mixer. Keep room microphones away from PA speakers to prevent feedback.</p>
      <p className="choir-hint">This is a browser-side mix of remotely received voices, not a server-generated master recording.</p>
     </div>
    </div>
   </div>}
   <audio className="choir-audio" ref={output} controls autoPlay style={{display: connected ? "block" : "none"}}/>
   <p className="choir-status" role="status">{status}</p>
  </div>
 </section>;
}
