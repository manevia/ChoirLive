import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import './ChoirRoom.css'

const SECTIONS = ['Soprano','Alto','Tenor','Bass','Other'] as const
type Section = typeof SECTIONS[number]
type Channel = { source: MediaStreamAudioSourceNode; gain: GainNode; section: Section }
function sectionOf(metadata?: string): Section {
  try { const value = JSON.parse(metadata || '{}').section; return SECTIONS.includes(value) ? value : 'Other' } catch { return 'Other' }
}
export default function OutputDesk() {
  const [passphrase,setPassphrase] = useState('')
  const [mixMode,setMixMode] = useState<'server'|'local'>('server')
  const [roomCode,setRoomCode] = useState(new URLSearchParams(location.search).get('room') || 'CHOIR-101')
  const [connected,setConnected] = useState(false)
  const [status,setStatus] = useState('Output desk disconnected')
  const [counts,setCounts] = useState<Record<Section,number>>({Soprano:0,Alto:0,Tenor:0,Bass:0,Other:0})
  const [levels,setLevels] = useState<Record<Section,number>>({Soprano:100,Alto:100,Tenor:100,Bass:100,Other:100})
  const [master,setMaster] = useState(80)
  const [recording,setRecording] = useState(false)
  const [devices,setDevices] = useState<MediaDeviceInfo[]>([])
  const room = useRef<Room|null>(null)
  const ctx = useRef<AudioContext|null>(null)
  const buses = useRef<Map<Section,GainNode>>(new Map())
  const channels = useRef<Map<string,Channel>>(new Map())
  const masterGain = useRef<GainNode|null>(null)
  const dest = useRef<MediaStreamAudioDestinationNode|null>(null)
  const audio = useRef<HTMLAudioElement|null>(null)
  const recorder = useRef<MediaRecorder|null>(null)
  const chunks = useRef<Blob[]>([])
  const refresh = () => {
    const next: Record<Section,number> = {Soprano:0,Alto:0,Tenor:0,Bass:0,Other:0}
    channels.current.forEach(ch => next[ch.section]++)
    setCounts(next)
  }
  const remove = (key:string) => { const ch=channels.current.get(key); if(ch){ch.source.disconnect();ch.gain.disconnect();channels.current.delete(key);refresh()} }
  const add = (key:string, track:MediaStreamTrack, section:Section) => {
    const context=ctx.current, bus=buses.current.get(section)
    if(!context || !bus) return
    remove(key)
    const source=context.createMediaStreamSource(new MediaStream([track]))
    const gain=context.createGain()
    source.connect(gain).connect(bus)
    channels.current.set(key,{source,gain,section})
    refresh()
  }
  const disconnect = async () => {
    if(recorder.current?.state==='recording') recorder.current.stop()
    await room.current?.disconnect();room.current=null
    channels.current.forEach(ch=>{ch.source.disconnect();ch.gain.disconnect()});channels.current.clear()
    await ctx.current?.close();ctx.current=null;buses.current.clear();dest.current=null
    setConnected(false);setRecording(false);refresh();setStatus('Output desk disconnected')
  }
  const connect = async () => {
    try {
      setStatus('Connecting output desk…')
      const res=await fetch(import.meta.env.VITE_TOKEN_URL || 'http://localhost:3002/token',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:`Output Desk ${Math.random().toString(36).slice(2,7)}`,room:roomCode,section:'Other',role:'output',passphrase})
      })
      if(!res.ok) throw new Error(`Token service HTTP ${res.status}`)
      const {token,url}=await res.json()
      const context=new AudioContext({latencyHint:'interactive'});await context.resume();ctx.current=context
      const output=context.createMediaStreamDestination();dest.current=output
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=0.003;limiter.release.value=0.15
      const main=context.createGain();main.gain.value=master/100;masterGain.current=main
      main.connect(limiter).connect(output)
      for(const section of SECTIONS){const bus=context.createGain();bus.gain.value=levels[section]/100;bus.connect(main);buses.current.set(section,bus)}
      const client=new Room({adaptiveStream:false,dynacast:false});room.current=client
      client.on(RoomEvent.TrackSubscribed,(track,pub,p)=>{
        if(track.kind!==Track.Kind.Audio)return
        const isMixer=p.identity.startsWith('choirlive-mixer-')
        if(mixMode==='server'){
          if(!isMixer || pub.trackName==='choirlive-master')return
          const label=(pub.trackName||'').replace('choirlive-','').toLowerCase()
          const section=SECTIONS.find(s=>s.toLowerCase()===label)
          if(section)add(`${p.identity}:${track.sid}`,track.mediaStreamTrack,section)
        }else if(!isMixer)add(`${p.identity}:${track.sid}`,track.mediaStreamTrack,sectionOf(p.metadata))
      })
      client.on(RoomEvent.TrackUnsubscribed,(track,_pub,p)=>remove(`${p.identity}:${track.sid}`))
      client.on(RoomEvent.ParticipantDisconnected,p=>{for(const key of [...channels.current.keys()])if(key.startsWith(`${p.identity}:`))remove(key)})
      client.on(RoomEvent.Disconnected,()=>setStatus('SFU connection closed'))
      await client.connect(url,token,{autoSubscribe:true})
      if(audio.current){audio.current.srcObject=output.stream;await audio.current.play().catch(()=>setStatus('Connected: click Enable audio playback'))}
      setConnected(true);setStatus(mixMode==='server'?'Output desk connected — waiting for server section stems':'Output desk connected — individual tracks mixed locally')
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput'))
    } catch(err){await disconnect();setStatus(`Connection failed: ${String(err)}`)}
  }
  const record = () => {
    if(recorder.current?.state==='recording'){recorder.current.stop();setRecording(false);return}
    if(!dest.current || !MediaRecorder.isTypeSupported('audio/webm')){setStatus('WebM recording is not supported in this browser');return}
    chunks.current=[]
    const rec=new MediaRecorder(dest.current.stream,{mimeType:'audio/webm'})
    rec.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)}
    rec.onstop=()=>{const blob=new Blob(chunks.current,{type:'audio/webm'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`choirlive-master-${roomCode}-${Date.now()}.webm`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
    rec.start(1000);recorder.current=rec;setRecording(true)
  }
  useEffect(()=>()=>{void room.current?.disconnect();void ctx.current?.close()},[])
  return <section className="choir-app" id="output-desk"><div className="choir-shell"><div className="choir-top"><div><span className="choir-kicker">VERSION 0.6 · LIVE OUTPUT DESK</span><h2>Choir master mix & PA output</h2><p>Receive-only console · section buses · limiter · stereo recording</p></div><span className={`choir-pill ${connected?'on':''}`}>{connected?'● CONNECTED':'○ OFFLINE'}</span></div>
  <div className="choir-form"><label>Audio source<select disabled={connected} value={mixMode} onChange={e=>setMixMode(e.target.value as 'server'|'local')}><option value="server">Server SATB section feeds (v0.6)</option><option value="local">Individual singer tracks (fallback)</option></select></label><label>Output desk access code<input type="password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} autoComplete="off"/></label><label>Rehearsal room<input value={roomCode} disabled={connected} onChange={e=>setRoomCode(e.target.value)}/></label><button onClick={()=>void(connected?disconnect():connect())}>{connected?'Disconnect output desk':'Connect output desk'}</button></div>
  {connected&&<><div className="choir-columns"><div className="choir-panel"><h3>Section mixer</h3>{SECTIONS.map(s=><div className="choir-person" key={s}><span>{s}<small>{counts[s]} live tracks</small></span><label>Level {levels[s]}% <input type="range" min="0" max="150" value={levels[s]} onChange={e=>{const n=Number(e.target.value);setLevels(old=>({...old,[s]:n}));const bus=buses.current.get(s);if(bus&&ctx.current)bus.gain.setTargetAtTime(n/100,ctx.current.currentTime,0.015)}}/></label></div>)}<div className="choir-person"><strong>Master</strong><label>{master}% <input type="range" min="0" max="100" value={master} onChange={e=>{const n=Number(e.target.value);setMaster(n);if(masterGain.current&&ctx.current)masterGain.current.gain.setTargetAtTime(n/100,ctx.current.currentTime,0.015)}}/></label></div></div><div className="choir-panel"><h3>Sound system output</h3><p>Use a USB audio interface and connect its line outputs to your external mixer. Use headphones for monitoring to prevent feedback.</p><audio ref={audio} controls autoPlay className="choir-audio"/><div className="choir-actions"><button onClick={()=>void audio.current?.play()}>Enable audio playback</button><button onClick={record}>{recording?'Stop & save master recording':'Record master mix'}</button></div><label>Output device<select defaultValue="" onChange={e=>{const element=audio.current as (HTMLAudioElement & {setSinkId?:(id:string)=>Promise<void>})|null;if(element?.setSinkId)void element.setSinkId(e.target.value).catch(err=>setStatus(`Device selection failed: ${String(err)}`));else setStatus('Output device selection unavailable in this browser')}}><option value="">System default</option>{devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||'Audio output'}</option>)}</select></label><p className="choir-hint">In server mode the receiving computer mixes five section feeds published by the server worker; local fallback receives each singer separately. The mixer worker must be running for server mode.</p></div></div></>}
  <div className="choir-status" role="status">{status}</div></div></section>
}
