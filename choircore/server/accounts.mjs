import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const derive=promisify(scrypt);
const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const emailKey=value=>{
 if(typeof value!=='string'||value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))throw Error('Enter a valid email address');
 return value.trim().toLowerCase();
};
const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128;
const keyPattern=/^[A-Za-z0-9_-]{43}$/;
const TTL=12*60*60*1000;
const dummySalt=randomBytes(16);
let outstanding=0;
async function passwordHash(password,salt){
 if(outstanding>=4)throw Error('Account service busy. Try again shortly');
 outstanding++;
 try{return Buffer.from(await derive(password,salt,64));}finally{outstanding--;}
}

export function createAccounts(path=process.env.CHOIRCORE_ACCOUNT_DB||':memory:'){
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS account_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS account_sessions_expiry ON account_sessions(expires_at);
 CREATE TABLE IF NOT EXISTS rehearsals(room TEXT PRIMARY KEY,workspace_id TEXT REFERENCES workspaces(id),title TEXT NOT NULL,created_at INTEGER NOT NULL,starts_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,ended_at INTEGER,status TEXT NOT NULL DEFAULT 'open',manager_hash TEXT NOT NULL,role_hashes TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS rehearsals_workspace ON rehearsals(workspace_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS rehearsals_expiry ON rehearsals(status,expires_at);`);
 const accountByEmail=db.prepare('SELECT * FROM accounts WHERE email=?');
 const workspaceByOwner=db.prepare('SELECT id,name,active FROM workspaces WHERE owner_id=?');
 const readSession=db.prepare('SELECT a.id,a.email,w.id AS workspaceId,w.name AS workspaceName,w.active FROM account_sessions s JOIN accounts a ON a.id=s.account_id JOIN workspaces w ON w.owner_id=a.id WHERE s.token_hash=? AND s.expires_at>?');
 const project=(account,workspace)=>({email:account.email,workspaceId:workspace.id,workspaceName:workspace.name,active:!!workspace.active});
 function issue(account){
  db.prepare('DELETE FROM account_sessions WHERE expires_at<=?').run(Date.now());
  db.prepare('DELETE FROM account_sessions WHERE account_id=?').run(account.id);
  const authToken=token();
  db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(hash(authToken),account.id,Date.now()+TTL);
  return {...project(account,workspaceByOwner.get(account.id)),authToken};
 }
 return {
  async register({email,password,workspaceName}){
   email=emailKey(email);
   if(!validPassword(password))throw Error('Password must contain 12–128 characters');
   if(typeof workspaceName!=='string'||workspaceName.trim().length<2||workspaceName.trim().length>64||/[\p{C}]/u.test(workspaceName))throw Error('Enter a workspace name of 2–64 characters');
   if(db.prepare('SELECT COUNT(*) AS total FROM accounts').get().total>=500)throw Error('Account registration capacity reached');
   if(accountByEmail.get(email))throw Error('Account already exists. Sign in instead');
   const salt=randomBytes(16),derived=await passwordHash(password,salt);
   const account={id:randomUUID(),email};
   db.exec('BEGIN IMMEDIATE');
   try{
    if(db.prepare('SELECT COUNT(*) AS total FROM accounts').get().total>=500)throw Error('Account registration capacity reached');
    db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?)').run(account.id,email,salt.toString('hex'),derived.toString('hex'),Date.now());
    db.prepare('INSERT INTO workspaces VALUES(?,?,?,0)').run(randomUUID(),account.id,workspaceName.trim());
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   return issue(account);
  },
  async login({email,password}){
   let normalized;
   try{normalized=emailKey(email);}catch{return null;}
   if(!validPassword(password))return null;
   const account=accountByEmail.get(normalized);
   const actual=await passwordHash(password,account?Buffer.from(account.salt,'hex'):dummySalt);
   if(!account||!timingSafeEqual(actual,Buffer.from(account.password_hash,'hex')))return null;
   return issue(account);
  },
  authenticate(value){
   if(typeof value!=='string'||!keyPattern.test(value))return null;
   const row=readSession.get(hash(value),Date.now());
   return row?{...row,active:!!row.active}:null;
  },
  logout(value){if(typeof value==='string'&&keyPattern.test(value))db.prepare('DELETE FROM account_sessions WHERE token_hash=?').run(hash(value));},
  approve(workspaceId){
   if(typeof workspaceId!=='string'||! /^[0-9a-f-]{36}$/.test(workspaceId))throw Error('Enter a workspace ID');
   return db.prepare('UPDATE workspaces SET active=1 WHERE id=?').run(workspaceId).changes===1;
  },
  saveRehearsal(room,session){
   db.prepare('INSERT INTO rehearsals(room,workspace_id,title,created_at,starts_at,expires_at,manager_hash,role_hashes) VALUES(?,?,?,?,?,?,?,?)').run(room,session.workspaceId,session.title,session.createdAt,session.startsAt,session.expiresAt,session.manager.toString('hex'),JSON.stringify(Object.fromEntries(Object.entries(session.roles).map(([role,digest])=>[role,digest.toString('hex')]))));
  },
  restoreRehearsals(now=Date.now()){
   this.expireRehearsals(now);
   return db.prepare("SELECT * FROM rehearsals WHERE status='open' AND expires_at>?").all(now).map(row=>[row.room,{workspaceId:row.workspace_id,title:row.title,createdAt:row.created_at,startsAt:row.starts_at,expiresAt:row.expires_at,manager:Buffer.from(row.manager_hash,'hex'),roles:Object.fromEntries(Object.entries(JSON.parse(row.role_hashes)).map(([role,hash])=>[role,Buffer.from(hash,'hex')]))}]);
  },
  rotateRehearsal(room,roles){
   const hashes=JSON.stringify(Object.fromEntries(Object.entries(roles).map(([role,digest])=>[role,digest.toString('hex')])));
   if(db.prepare("UPDATE rehearsals SET role_hashes=? WHERE room=? AND status='open' AND expires_at>?").run(hashes,room,Date.now()).changes!==1)throw Error('Rehearsal no longer active');
  },
  closeRehearsal(room,status,endedAt=Date.now()){
   if(!['ended','cancelled','expired'].includes(status))throw Error('Invalid rehearsal status');
   db.prepare("UPDATE rehearsals SET status=?,ended_at=?,manager_hash='',role_hashes='{}' WHERE room=? AND status='open'").run(status,endedAt,room);
  },
  expireRehearsals(now=Date.now()){
   db.prepare("UPDATE rehearsals SET status='expired',ended_at=expires_at,manager_hash='',role_hashes='{}' WHERE status='open' AND expires_at<=?").run(now);
   // Retain only the last 180 days of completed metadata; no audio or plaintext invite tokens.
   db.prepare("DELETE FROM rehearsals WHERE status!='open' AND ended_at<?").run(now-180*86400000);
  },
  rehearsalHistory(workspaceId){
   return db.prepare("SELECT room,title,created_at AS createdAt,starts_at AS startsAt,expires_at AS expiresAt,ended_at AS endedAt,status FROM rehearsals WHERE workspace_id=? AND status!='open' ORDER BY ended_at DESC LIMIT 50").all(workspaceId);
  },
  close(){db.close();}
 };
}
