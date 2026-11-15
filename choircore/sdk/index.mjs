import { Device } from 'mediasoup-client';

// Browser-facing, independently reusable ChoirCore transport SDK.
// Signaling timeouts are finite; notifications received during join are queued.
export class ChoirCoreClient {
 constructor(url, { timeoutMs = 12000 } = {}) {
  this.url = url;
  this.timeoutMs = timeoutMs;
  this.pending = new Map();
  this.nextId = 0;
  this.listeners = new Map();
  this.consumers = new Map();
  this.subscriptions = new Set();
  this.queuedProducers = new Map();
  this.closed = false;
 }
 on(event, cb) { this.listeners.set(event, cb); return () => this.listeners.delete(event); }
 emit(event, data) { try { this.listeners.get(event)?.(data); } catch (error) { if (event !== 'error') this.listeners.get('error')?.(error); } }
 async connect({room, name, secret, role = 'singer', section = 'Other'}) {
  if (this.ws) throw new Error('Client already connected');
  this.closed = false;
  const ws = new WebSocket(this.url);
  this.ws = ws;
  try {
   await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Signaling connection timed out')), this.timeoutMs);
    ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Signaling connection failed')); }, { once: true });
    ws.addEventListener('close', () => { clearTimeout(timeout); reject(new Error('Signaling connection closed')); }, { once: true });
   });
   ws.addEventListener('close', () => {
    this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Connection closed')); }
    this.pending.clear();
    this.emit('disconnected');
   });
   ws.addEventListener('message', event => {
    try {
     const m = JSON.parse(event.data);
     if (m.id !== undefined) {
      const p = this.pending.get(m.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(m.id);
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.data);
     } else if (m.event === 'producerClosed') {
      this.queuedProducers.delete(m.data.producerId);
      const consumer = this.consumers.get(m.data.producerId);
      consumer?.close();
      this.consumers.delete(m.data.producerId);
      this.emit('trackClosed', m.data);
     } else if (m.event === 'newProducer') {
      this.queuedProducers.set(m.data.producerId, m.data);
      if (this.recvTransport) void this.drainSubscriptions();
     } else {
      this.emit(m.event, m.data);
     }
    } catch (error) { this.emit('error', error); }
   });
   const joined = await this.call('join', {room, name, secret, role, section});
   this.device = new Device();
   await this.device.load({routerRtpCapabilities: joined.routerRtpCapabilities});
   const send = await this.call('createTransport');
   this.sendTransport = this.device.createSendTransport(send);
   this.sendTransport.on('connect', ({dtlsParameters}, ok, fail) =>
    this.call('connectTransport', {transportId: send.id, dtlsParameters}).then(ok, fail));
   this.sendTransport.on('produce', ({kind, rtpParameters}, ok, fail) =>
    this.call('produce', {transportId: send.id, kind, rtpParameters}).then(ok, fail));
   const recv = await this.call('createTransport');
   this.recvTransport = this.device.createRecvTransport(recv);
   this.recvTransport.on('connect', ({dtlsParameters}, ok, fail) =>
    this.call('connectTransport', {transportId: recv.id, dtlsParameters}).then(ok, fail));
   for (const p of joined.existingProducers) this.queuedProducers.set(p.producerId, p);
   await this.drainSubscriptions();
  } catch (error) {
   this.close();
   throw error;
  }
 }
 call(action, data = {}) {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.closed) return Promise.reject(new Error('Not connected to ChoirCore'));
  const id = ++this.nextId;
  return new Promise((resolve, reject) => {
   const timer = setTimeout(() => {
    this.pending.delete(id);
    reject(new Error(`ChoirCore request timed out: ${action}`));
   }, this.timeoutMs);
   this.pending.set(id, { resolve, reject, timer });
   try { this.ws.send(JSON.stringify({id, action, data})); }
   catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
  });
 }
 async drainSubscriptions() {
  if (!this.recvTransport || this.closed) return;
  for (const p of this.queuedProducers.values()) {
   this.queuedProducers.delete(p.producerId);
   void this.subscribe(p).catch(error => this.emit('error', error));
  }
 }
 async getNetworkStats() {
  // These are transport-level estimates, not one-way musical audio latency.
  const stats = await Promise.all([this.sendTransport?.getStats(), this.recvTransport?.getStats()]);
  let roundTripMs = null, jitterMs = null, packetsLost = 0, packetsReceived = 0;
  for (const report of stats) {
   if (!report) continue;
   for (const value of report.values()) {
    if (value.type === 'candidate-pair' && value.state === 'succeeded' && typeof value.currentRoundTripTime === 'number') roundTripMs = Math.round(value.currentRoundTripTime * 1000);
    if (value.type === 'inbound-rtp' && (value.kind === 'audio' || value.mediaType === 'audio')) {
     packetsLost += value.packetsLost || 0;
     packetsReceived += value.packetsReceived || 0;
     if (typeof value.jitter === 'number') jitterMs = Math.round(value.jitter * 1000);
    }
   }
  }
  return {roundTripMs, jitterMs, packetsLost, packetsReceived};
 }
 async cue(message) { return this.call('cue', {message}); }
 async publish(track, section = 'Other') {
  if (!this.sendTransport) throw new Error('Not ready to publish audio');
  return this.sendTransport.produce({track, appData:{section}});
 }
 async subscribe({producerId, name, section}) {
  if (this.closed || this.consumers.has(producerId) || this.subscriptions.has(producerId)) return;
  if (!this.recvTransport) { this.queuedProducers.set(producerId, {producerId, name, section}); return; }
  this.subscriptions.add(producerId);
  try {
   const info = await this.call('consume', {transportId:this.recvTransport.id, producerId, rtpCapabilities:this.device.rtpCapabilities});
   const consumer = await this.recvTransport.consume(info);
   if (this.closed) { consumer.close(); return; }
   this.consumers.set(producerId, consumer);
   await this.call('resumeConsumer', {consumerId:consumer.id});
   if (!this.closed) this.emit('track', {track:consumer.track, producerId, name, section});
  } finally { this.subscriptions.delete(producerId); }
 }
 close() {
  if (this.closed && !this.ws) return;
  this.closed = true;
  for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Connection closed')); }
  this.pending.clear();
  this.queuedProducers.clear();
  for (const c of this.consumers.values()) c.close();
  this.consumers.clear();
  this.sendTransport?.close();
  this.recvTransport?.close();
  this.ws?.close();
  this.ws = null;
 }
}
