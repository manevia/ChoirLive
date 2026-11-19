import {useEffect,useRef,useState} from 'react';
import './ChoirRoom.css';
export default function MicrophoneTest(){
 const [active,setActive]=useState(false);
 const [pending,setPending]=useState(false);
 const [level,setLevel]=useState(0);
 const [status,setStatus]=useState('Microphone is off.');
 const stream=useRef<MediaStream|null>(null);
 const context=useRef<AudioContext|null>(null);
 const frame=useRef(0);
 const generation=useRef(0);
 const release=()=>{
  generation.current++;cancelAnimationFrame(frame.current);
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  if(context.current&&context.current.state!=='closed')void context.current.close().catch(()=>{});
  context.current=null;
 };
 useEffect(()=>release,[]);
 const start=async()=>{
  if(active||pending)return;
  const id=++generation.current;setPending(true);setStatus('Allow microphone access in your browser.');
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(id!==generation.current){input.getTracks().forEach(t=>t.stop());return;}
   stream.current=input;const ctx=new AudioContext();context.current=ctx;await ctx.resume();
   if(id!==generation.current||ctx.state==='closed')return;
   const analyser=ctx.createAnalyser();analyser.fftSize=1024;ctx.createMediaStreamSource(input).connect(analyser);
   const samples=new Float32Array(analyser.fftSize);
   const measure=()=>{if(id!==generation.current)return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);setLevel(Math.min(100,Math.round(rms*300)));frame.current=requestAnimationFrame(measure);};
   measure();setActive(true);setStatus('Microphone is on. Speak or sing to check the level.');
  }catch(e){if(id===generation.current){release();setStatus('Could not open microphone: '+String(e));}}
  finally{if(id===generation.current||!stream.current)setPending(false);}
 };
 return <section className="choir-app" id="microphone-test"><div className="choir-shell">
  <div className="choir-top"><div><span className="choir-kicker">CHOIRLIVE · AUDIO CHECK</span><h2>Microphone level check</h2><p>Verify input without recording or sending audio to ChoirCore.</p></div><span className={'choir-pill'+(active?' on':'')}>{active?'● MIC ON':'○ MIC OFF'}</span></div>
  <div className="choir-actions"><button disabled={active||pending} onClick={()=>void start()}>{pending?'Waiting for permission…':'Enable microphone'}</button><button disabled={!active&&!pending} onClick={()=>{release();setActive(false);setPending(false);setLevel(0);setStatus('Microphone is off.');}}>Turn microphone off</button></div>
  <label className="choir-hint">Microphone input level <meter min={0} max={100} value={level} style={{width:'100%',height:16}}/></label>
  <p role="status" className="choir-status">{status}</p><p className="choir-hint">Rehearsal recording is available only to authorized conductors and sound engineers after participant consent.</p>
 </div></section>;
}
