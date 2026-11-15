import { ChoirCoreClient } from '../../../choircore/sdk/index.mjs';
const tracks = [];
let client;
let microphone;
let producer;
const log = [];
window.choirMediaTest = {
  ready: true,
  get events() { return [...log]; },
  get receivedTrackCount() { return tracks.filter(t => t.readyState === 'live').length; },
  get publishedTrackId() { return producer?.id || null; },
  async join({url, room, name, secret, role='singer', publish=false}) {
    client = new ChoirCoreClient(url, {timeoutMs:18000});
    client.on('track', ({track, producerId}) => {
      tracks.push(track);
      log.push({event:'track', producerId, kind:track.kind});
    });
    client.on('trackClosed', ({producerId}) => log.push({event:'trackClosed',producerId}));
    client.on('error', error => log.push({event:'error', message:String(error)}));
    client.on('disconnected', () => log.push({event:'disconnected'}));
    await client.connect({room,name,secret,role,section:'Alto'});
    log.push({event:'joined',role});
    if (publish) {
      microphone = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      producer = await client.publish(microphone.getAudioTracks()[0], 'Alto');
      log.push({event:'published',id:producer.id});
    }
    return true;
  },
  async stats() { return client.getNetworkStats(); },
  async leave() {
    producer?.close();
    microphone?.getTracks().forEach(t=>t.stop());
    client?.close();
  }
};
