import { useEffect, useRef, useState } from 'react';
import { ChoirCoreClient } from '../../../choircore/sdk/index.mjs';
import './ChoirRoom.css';

const SECTION_NAMES = ['Soprano','Alto','Tenor','Bass','Other'] as const;
type Section = typeof SECTION_NAMES[number];
type StreamNode = { source: MediaStreamAudioSourceNode; gain: GainNode; section: Section };
type OutputDevice = { deviceId: string; label: string };
const safeSection = (value: string): Section => SECTION_NAMES.includes(value as Section) ? value as Section : 'Other';

export default function ChoirCoreOutputDesk(){
 const [room,setRoom] = useState('CHOIR-101');
 const [name,setName] = useState('Sound Engineer');
 const [secret,setSecret] = useState('');
 const [status,setStatus] = useState('Disconnected');
 const [connected,setConnected] = useState(false);
 const [counts,setCounts] = useState<Record<Section,number>>({Soprano:0,Alto:0,Tenor:0,Bass:0,Other:0});
 const [levels,setLevels] = useState<Record<Section,number>>({Soprano:100,Alto:100,Tenor:100,Bass:100,Other:100});
 const [master,setMaster] = useState(75);
 const [devices,setDevices] = useState<OutputDevice[]>([]);
 const [selectedDevice,setSelectedDevice] = useState('');
 const client = useRef<ChoirCoreClient|null>(null);
 const context = useRef<AudioContext|null>(null);
 const destination = useRef<MediaStreamAudioDestinationNode|null>(null);
 const output = useRef<HTMLAudioElement|null>(null);
 const buses = useRef<Map<Section,GainNode>>(new Map());
 const sources = useRef<Map<string,StreamNode>>(new Map());
 const main = useRef<GainNode|null>(null);
 const limiter = useRef<DynamicsCompressorNode|null>(null);

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
 const stop = () => {
  client.current?.close();client.current=null;
  for(const id of [...sources.current.keys()])removeSource(id);
  if(output.current){output.current.pause();output.current.srcObject=null;}
  void context.current?.close();context.current=null;
  destination.current=null;main.current=null;limiter.current=null;buses.current.clear();
  setConnected(false);setStatus('Disconnected');
 };
 useEffect(()=>()=>stop(),[]);

 const refreshDevices = async () => {
  try{
   const devices = await navigator.mediaDevices.enumerateDevices();
   setDevices(devices.filter(d=>d.kind==='audiooutput').map(d=>({deviceId:d.deviceId,label:d.label||'Audio output device'})));
  }catch{setDevices([]);}
 };
 const join = async () => {
  if(!name.trim() || !room.trim() || !secret){setStatus('Enter the engineer name, room and room access code');return;}
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
   c.on('disconnected',()=>setStatus('ChoirCore signaling disconnected'));
   c.on('error',error=>setStatus('Audio connection issue: '+String(error)));
   // The desk receives media but never publishes its microphone.
   // Dedicated engineer authorization will be implemented before public launch.
   await c.connect({room,name,secret,role:'engineer',section:'Other'});
   setConnected(true);setStatus('Receiving choir audio — no microphone published');
   await refreshDevices();
   void audio.play().catch(()=>setStatus('Click Enable audio output to hear the choir'));
  }catch(error){stop();setStatus('Output Desk connection failed: '+String(error));}
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
   <div className="choir-top"><div><span className="choir-kicker">CHOIRCORE · INDEPENDENT OUTPUT</span><h2>Native ChoirCore Sound Desk</h2><p>Receive-only SATB mix · USB audio output · no LiveKit connection</p></div><span className="choir-pill">{connected?'● CONNECTED':'○ OFFLINE'}</span></div>
   {!connected?<div className="choir-form">
    <label>Engineer display name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Choir room<input value={room} onChange={e=>setRoom(e.target.value)}/></label>
    <label>Room access code<input type="password" value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="off"/></label>
    <button onClick={()=>void join()}>Connect output desk</button>
    <p className="choir-hint">This desk requires the dedicated sound-engineer access code. A server-side master mixer remains pending.</p>
   </div>:<div>
    <div className="choir-actions"><button onClick={()=>void output.current?.play()}>Enable audio output</button><button onClick={()=>void refreshDevices()}>Refresh audio devices</button><button onClick={stop}>Leave room</button></div>
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
