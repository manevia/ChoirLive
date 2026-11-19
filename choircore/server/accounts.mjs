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
 CREATE INDEX IF NOT EXISTS account_sessions_expiry ON account_sessions(expires_at);`);
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
  close(){db.close();}
 };
}
