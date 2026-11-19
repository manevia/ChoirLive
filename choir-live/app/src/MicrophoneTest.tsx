import { useEffect, useRef, useState } from 'react';
import './ChoirRoom.css';

export default function MicrophoneTest() {
 const [active,setActive]=useState(false);
 const [pending,setPending]=useState(false);
 const [recording,setRecording]=useState(false);
 const [level,setLevel]=useState(0);
 const [url,setUrl]=useState('');
 const [mime,setMime]=useState('');
 const [status,setStatus]=useState('Microphone is off.');
 const stream=useRef<MediaStream|null>(null);
 const context=useRef<AudioContext|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const frame=useRef(0);
 const generation=useRef(0);
 const clip=useRef('');
 const release=()=>{
  cancelAnimationFrame(frame.current);
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  if(context.current && context.current.state!=='closed')void context.current.close().catch(()=>{});
  context.current=null;
 };
 useEffect(()=>()=>{generation.current++; if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop();}release();if(clip.current)URL.revokeObjectURL(clip.current);},[]);
 const start=async()=>{
  if(pending||active)return;
  if(!navigator.mediaDevices?.getUserMedia){setStatus('Microphone access requires HTTPS and a supported browser.');return;}
  const id=++generation.current;
  setPending(true);setStatus('Allow microphone access in your browser.');
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(id!==generation.current){input.getTracks().forEach(t=>t.stop());return;}
   stream.current=input;
   setActive(true);setStatus('Microphone is on. Speak or sing to check the level.');
   try{
    const ctx=new AudioContext();context.current=ctx;
    await ctx.resume();
    if(id!==generation.current)return;
    const analyser=ctx.createAnalyser();analyser.fftSize=1024;
    ctx.createMediaStreamSource(input).connect(analyser);
    const samples=new Float32Array(analyser.fftSize);
    const update=()=>{if(id!==generation.current)return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);setLevel(Math.min(100,Math.round(rms*300)));frame.current=requestAnimationFrame(update);};
    update();
   }catch{if(id===generation.current)setStatus('Microphone is on. Level meter unavailable; you can still record.');}
   input.getAudioTracks()[0]?.addEventListener('ended',()=>{if(id===generation.current){setActive(false);setLevel(0);release();setStatus('Microphone disconnected. Enable it again.');}});
  }catch(e){if(id===generation.current){release();const name=e instanceof DOMException?e.name:'';setStatus(name==='NotAllowedError'?'Microphone permission denied. Allow microphone access in your browser site settings and retry.':name==='NotFoundError'?'No microphone found. Connect or enable an input device.':'Could not open microphone: '+String(e));}}
  finally{if(id===generation.current)setPending(false);}
 };
 const stop=()=>{generation.current++;if(recorder.current?.state==='recording')recorder.current.stop();release();setActive(false);setPending(false);setLevel(0);setStatus('Microphone is off.');};
 const record=()=>{
  if(!stream.current?.active||recorder.current)return;
  if(typeof MediaRecorder==='undefined'){setStatus('Recording is not supported by this browser.');return;}
  try{
   const format=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   const r=new MediaRecorder(stream.current,format?{mimeType:format}:undefined);
   const chunks:Blob[]=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=()=>{
    recorder.current=null;setRecording(false);
    const blob=new Blob(chunks,{type:r.mimeType||format||'audio/webm'});
    if(!blob.size){setStatus('No audio captured. Try recording for a few seconds.');return;}
    if(clip.current)URL.revokeObjectURL(clip.current);
    clip.current=URL.createObjectURL(blob);setUrl(clip.current);setMime(blob.type);
    setStatus('Recording ready. Play it back or download it.');
   };
   r.onerror=()=>{setStatus('Recording failed. Re-enable your microphone and retry.');};
   recorder.current=r;r.start();setRecording(true);setStatus('Recording your microphone locally…');
  }catch(e){recorder.current=null;setRecording(false);setStatus('Could not start recording: '+String(e));}
 };
 return <section className="choir-app" id="microphone-test"><div className="choir-shell">
  <div className="choir-top"><div><span className="choir-kicker">CHOIRLIVE · AUDIO CHECK</span><h2>Microphone &amp; recording test</h2><p>Check your own voice before joining. No access code required. Nothing is sent to ChoirCore.</p></div><span className={'choir-pill'+(active?' on':'')}>{recording?'● RECORDING':active?'● MIC ON':'○ MIC OFF'}</span></div>
  <div className="choir-actions"><button disabled={active||pending} onClick={()=>void start()}>{pending?'Waiting for permission…':'Enable microphone'}</button><button disabled={!active||recording} onClick={record}>Start recording</button><button disabled={!recording} onClick={()=>{if(recorder.current?.state==='recording')recorder.current.stop();}}>Stop recording</button><button disabled={!active&&!pending} onClick={stop}>Turn microphone off</button></div>
  <label className="choir-hint">Microphone input level <meter min={0} max={100} value={level} style={{width:'100%',height:16}}/></label>
  <p role="status" className="choir-status">{status}</p>
  {url&&<div className="choir-panel"><h3>Your test recording</h3><audio className="choir-audio" src={url} controls/><a className="choir-hint" href={url} download={'choirlive-mic-test.'+(mime.includes('mp4')?'m4a':'webm')}>Download recording</a></div>}
  <p className="choir-hint">Turn the microphone off when finished. For a full choir recording, use the connected Sound Desk with everyone's consent.</p>
 </div></section>;
}
