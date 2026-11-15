import http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const root = path.resolve(process.env.CHOIR_RECORDINGS_DIR || '/recordings');
const port = Number(process.env.RECORDINGS_PORT || 3003);
const secret = process.env.CHOIR_RECORDINGS_ACCESS_TOKEN;
if (!secret || secret.length < 24) throw new Error('Set a strong CHOIR_RECORDINGS_ACCESS_TOKEN (24+ characters)');
const valid = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(s);
function authorized(req) {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return false;
  const a = Buffer.from(value.slice(7)); const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a,b);
}
function reply(res,status,obj) { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(obj)); }
async function safeFile(room,session,filename) {
  if (![room,session].every(valid) || !/^(master|soprano|alto|tenor|bass|other)\.wav$|^manifest\.json$/.test(filename)) return null;
  const folder = path.join(root,room,session);
  const realRoot = await fs.realpath(root);
  const realFolder = await fs.realpath(folder);
  if (!realFolder.startsWith(realRoot + path.sep)) return null;
  const file = path.join(realFolder,filename);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) return null;
  return {file,stat};
}
const server = http.createServer(async(req,res)=>{
  if (req.method !== 'GET') return reply(res,405,{error:'Method not allowed'});
  if (req.url === '/health') return reply(res,200,{ok:true});
  if (!authorized(req)) return reply(res,401,{error:'Unauthorized'});
  const u = new URL(req.url,'http://localhost');
  const segments = u.pathname.split('/').filter(Boolean);
  try {
    if (segments.length===2 && segments[0]==='recordings' && valid(segments[1])) {
      const room=segments[1];
      const folders = await fs.readdir(path.join(root,room),{withFileTypes:true});
      const sessions = folders.filter(f=>f.isDirectory() && valid(f.name)).map(f=>f.name).sort().reverse();
      return reply(res,200,{room,sessions});
    }
    if (segments.length===4 && segments[0]==='recordings') {
      const f = await safeFile(...segments.slice(1));
      if (!f) return reply(res,404,{error:'Not found'});
      res.writeHead(200,{'Content-Type':segments[3].endsWith('.wav')?'audio/wav':'application/json','Content-Length':f.stat.size,'Content-Disposition':`attachment; filename="${segments[3]}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return createReadStream(f.file).pipe(res);
    }
    return reply(res,404,{error:'Not found'});
  } catch(e) { return reply(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':'Storage error'}); }
});
server.listen(port,'0.0.0.0',()=>console.log(`Recordings API listening on ${port}`));
