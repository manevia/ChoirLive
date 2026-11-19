import {useEffect,useState} from 'react';
import type {ChoirCoreClient,ChoirCoreReaction} from '../../../choircore/sdk/index.mjs';
const choices=[['👍','Ready / yes'],['👏','Well done'],['❤️','Love it'],['🎵','Music'],['🙋','Question'],['✅','Understood'],['⏳','Please wait'],['🔇','Audio issue']];
export default function RehearsalReactions({client}:{client:ChoirCoreClient}){
 const [items,setItems]=useState<ChoirCoreReaction[]>([]);
 const [status,setStatus]=useState('');
 useEffect(()=>client.on('reaction',item=>setItems(old=>[...old.slice(-11),item])),[client]);
 return <div className="choir-panel"><h3>Quick reactions</h3><p className="choir-hint">Send a silent cue to everyone in this rehearsal.</p><div className="choir-reactions">{choices.map(([emoji,label])=><button key={emoji} title={label} aria-label={label} onClick={()=>void client.react(emoji).then(()=>setStatus('')).catch(e=>setStatus(String(e)))}>{emoji}</button>)}</div>
 <div role="log" aria-live="polite" className="choir-reaction-feed">{items.map((item,i)=><p key={i}>{item.emoji} <strong>{item.from}</strong> · {item.role}</p>)}</div>
 {status&&<p role="status">{status}</p>}</div>;
}
