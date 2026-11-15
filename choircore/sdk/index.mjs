import { Device } from 'mediasoup-client';
export class ChoirCoreClient {
 constructor(url){this.url=url;this.pending=new Map();this.nextId=0;this.listeners=new Map();this.consumers=new Map();}
 on(event,cb){this.listeners.set(event,cb);}
 async connect({room,name,secret,role='singer',section='Other'}){
  this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject;});
  this.ws.onclose=()=>{for(const p of this.pending.values())p.reject(Error('Connection closed'));this.pending.clear();this.listeners.get('disconnected')?.();};this.ws.onmessage=async ev=>{const m=JSON.parse(ev.data);if(m.id!==undefined){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.data);}}else if(m.event==='producerClosed'){const c=this.consumers.get(m.data.producerId);c?.close();this.consumers.delete(m.data.producerId);this.listeners.get('trackClosed')?.(m.data);}else if(m.event==='newProducer'){await this.subscribe(m.data).catch(e=>this.listeners.get('error')?.(e));}else this.listeners.get(m.event)?.(m.data);};
  const joined=await this.call('join',{room,name,secret,role,section});this.device=new Device();await this.device.load({routerRtpCapabilities:joined.routerRtpCapabilities});
  const send=await this.call('createTransport');this.sendTransport=this.device.createSendTransport(send);
  this.sendTransport.on('connect',({dtlsParameters},ok,fail)=>this.call('connectTransport',{transportId:send.id,dtlsParameters}).then(ok,fail));
  this.sendTransport.on('produce',({kind,rtpParameters,appData},ok,fail)=>this.call('produce',{transportId:send.id,kind,rtpParameters,section:appData.section}).then(ok,fail));
  const recv=await this.call('createTransport');this.recvTransport=this.device.createRecvTransport(recv);
  this.recvTransport.on('connect',({dtlsParameters},ok,fail)=>this.call('connectTransport',{transportId:recv.id,dtlsParameters}).then(ok,fail));
  for(const p of joined.existingProducers)await this.subscribe(p);
 }
 call(action,data={}){const id=++this.nextId;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,action,data}));});}
 async cue(message){return this.call('cue',{message});}
 async publish(track,section='Other'){return this.sendTransport.produce({track,appData:{section}});}
 async subscribe({producerId,name,section}){if(this.consumers.has(producerId))return;const info=await this.call('consume',{transportId:this.recvTransport.id,producerId,rtpCapabilities:this.device.rtpCapabilities});const consumer=await this.recvTransport.consume(info);this.consumers.set(producerId,consumer);await this.call('resumeConsumer',{consumerId:consumer.id});this.listeners.get('track')?.({track:consumer.track,producerId,name,section});}
 close(){this.sendTransport?.close();this.recvTransport?.close();this.ws?.close();}
}
