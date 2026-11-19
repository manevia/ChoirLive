import {useEffect,useRef,useState} from 'react';
import type {ChoirCoreClient,ChoirCoreRecordingState} from '../../../choircore/sdk/index.mjs';
type Mix={stream:MediaStream;release:()=>void};
export function RecordingNotice({client}:{client:ChoirCoreClient}){
 const [state,setState]=useState<ChoirCoreRecordingState|null>(null);
 useEffect(()=>client.on('recordingState',setState),[client]);
 return state?.active?<p className="choir-recording-alert" role="status">● Rehearsal recording: {state.by}</p>:null;
}
export default function RehearsalRecorder({client,room,makeMix}:{client:ChoirCoreClient;room:string;makeMix:()=>Promise<Mix>}){
 const [consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [state,setState]=useState<ChoirCoreRecordingState|null>(null);
 const [recording,setRecording]=useState(false);
 const [status,setStatus]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 const pending=useRef(false);
 const granted=useRef(false);
 const consentRevision=useRef<number|null>(null);
 const mounted=useRef(true);
 const mix=useRef<Mix|null>(null);
 function stop(notify=true){
  granted.current=false;consentRevision.current=null;
  if(recorder.current?.state==='recording')recorder.current.stop();
  if(notify)void client.stopRecording().catch(()=>{});
  if(mounted.current){setRecording(false);setConsent(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  const off=client.on('recordingState',s=>{
   granted.current=s.active&&s.own;setState(s);
   if(!granted.current){stop(false);if(s.reason)setStatus(s.reason);}
  });
  return()=>{mounted.current=false;off();stop();mix.current?.release();mix.current=null;};
 },[client]);
 async function start(){
  if(!consent||consentRevision.current===null||pending.current||recorder.current)return;
  const revision=consentRevision.current;
  pending.current=true;setBusy(true);let prepared:Mix|null=null;
  try{
   if(typeof MediaRecorder==='undefined')throw Error('Recording is not supported in this browser');
   const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!mime)throw Error('No supported recording format');
   prepared=await makeMix();mix.current=prepared;
   if(!mounted.current)throw Error('Room closed');
   if(consentRevision.current!==revision)throw Error('Participants changed; confirm consent again');
   await client.startRecording(revision);
   if(!mounted.current||!granted.current)throw Error('Recording permission changed; confirm consent and retry');
   const r=new MediaRecorder(prepared.stream,{mimeType:mime,audioBitsPerSecond:128000});
   const chunks:BlobPart[]=[];recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   r.onerror=()=>{if(mounted.current)setStatus('Recording error');stop();};
   r.onstop=()=>{
    prepared?.release();if(mix.current===prepared)mix.current=null;recorder.current=null;
    const blob=new Blob(chunks,{type:r.mimeType||mime});
    if(blob.size){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='choirlive-'+room+'-'+Date.now()+'.'+(mime.includes('mp4')?'m4a':'webm');document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
    if(mounted.current){setRecording(false);setStatus(blob.size?'Recording saved to browser downloads.':'No audio was captured.');}
   };
   r.start(1000);setRecording(true);setStatus('Recording rehearsal audio locally.');
  }catch(e){prepared?.release();if(mix.current===prepared)mix.current=null;recorder.current=null;void client.stopRecording().catch(()=>{});if(mounted.current){setConsent(false);setStatus(String(e));}}
  finally{pending.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="choir-panel"><h3>Rehearsal recording</h3>
  {state?.active&&<p className="choir-recording-alert" role="status">● {state.own?'You are recording':state.by+' is recording'}</p>}
  <label className="choir-consent"><input type="checkbox" checked={consent} disabled={recording||busy||!state||!!state.active} onChange={e=>{consentRevision.current=e.target.checked?(state?.revision??null):null;setConsent(e.target.checked);}}/> I confirm all current participants have been informed and agreed to recording.</label>
  <div className="choir-actions"><button disabled={busy||(!recording&&(!consent||!state||!!state.active))} onClick={()=>recording?stop():void start()}>{recording?'Stop and save recording':busy?'Preparing recording…':'Start recording'}</button></div>
  <p className="choir-hint">Only conductors and sound engineers can use this feature. One recorder at a time. Adding a participant stops the recording until consent is confirmed again. Files are saved locally.</p>
  {status&&<p role="status">{status}</p>}
 </div>;
}
