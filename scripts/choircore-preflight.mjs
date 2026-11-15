#!/usr/bin/env node
// Deployment preflight is a read-only configuration check. It never prints secrets.
import net from 'node:net';

const env=process.env;
const errors=[];
const warn=[];
const get=(key)=>String(env[key]||'').trim();
const keys=['CHOIRCORE_SINGER_CODE','CHOIRCORE_CONDUCTOR_CODE','CHOIRCORE_ENGINEER_CODE'];
const secrets=keys.map(get);
keys.forEach((key,i)=>{if(secrets[i].length<24)errors.push(key+' must be at least 24 characters');});
if(new Set(secrets).size!==3)errors.push('Role access codes must be distinct');
const announced=get('ANNOUNCED_IP');
if(!announced)errors.push('ANNOUNCED_IP is required');
else if(net.isIP(announced)===0 && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/i.test(announced)) errors.push('ANNOUNCED_IP must be an IP address or valid hostname');
if(net.isIP(announced)===4){
 const v=announced.split('.').map(Number);
 if(v[0]===10 || v[0]===127 || v[0]===0 || v[0]===192&&v[1]===168 || v[0]===172&&v[1]>=16&&v[1]<=31 ||
    v[0]===169&&v[1]===254 || v[0]>=224 || v[0]===100&&v[1]>=64&&v[1]<=127) {
  errors.push('ANNOUNCED_IP must be publicly reachable (private, loopback, and reserved IPv4 addresses are not valid for Internet testing)');
 }
}
const origins=get('CHOIRCORE_ALLOWED_ORIGINS').split(',').map(v=>v.trim()).filter(Boolean);
if(!origins.length)errors.push('CHOIRCORE_ALLOWED_ORIGINS is required');
for(const origin of origins){
 try{
  const url=new URL(origin);
  if(url.origin!==origin || url.protocol!=='https:' || url.username || url.password)errors.push('Origin must be an exact HTTPS origin (no path): '+origin);
 }catch{errors.push('Invalid allowed origin: '+origin);}
}
const limits={MAX_CONNECTIONS:100,MAX_PEERS_PER_ROOM:12,MAX_ROOMS:20,MAX_AUTH_FAILURES:10};
for(const [key,fallback] of Object.entries(limits)){
 const actual=get(key)||String(fallback), value=Number(actual);
 if(!Number.isSafeInteger(value)||value<1)errors.push(key+' must be a positive integer');
}
if(get('NODE_ENV') && get('NODE_ENV')!=='production')warn.push('Set NODE_ENV=production for a deployed server');
if(!get('CHOIRCORE_SIGNALING_URL'))warn.push('Set CHOIRCORE_SIGNALING_URL=wss://<your-signaling-domain> for endpoint verification');
else {
 try{const url=new URL(get('CHOIRCORE_SIGNALING_URL'));if(url.protocol!=='wss:')errors.push('CHOIRCORE_SIGNALING_URL must use wss://');}
 catch{errors.push('Invalid CHOIRCORE_SIGNALING_URL');}
}
console.log('ChoirCore public deployment configuration preflight');
console.log('Configured:',{announcedAddress:announced||'(missing)',allowedOriginCount:origins.length,roleCount:keys.length});
for(const message of warn)console.log('WARNING:',message);
for(const message of errors)console.error('ERROR:',message);
if(!errors.length)console.log('PASS: configuration checks only. This does not verify UDP reachability, WSS, DNS, TLS, or real audio.');
process.exitCode=errors.length?1:0;
