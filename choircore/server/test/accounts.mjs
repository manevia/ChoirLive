import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAccounts} from '../accounts.mjs';
const temp=mkdtempSync(join(tmpdir(),'choir-accounts-'));
const file=join(temp,'accounts.sqlite');
let db=createAccounts(file);
try{
 const registered=await db.register({email:'owner@example.test',password:'disposable-account-test-password',workspaceName:'Test Choir'});
 assert.equal(registered.active,false);
 assert.equal(db.approve(registered.workspaceId),true);
 db.close();db=createAccounts(file);
 const loggedIn=await db.login({email:'OWNER@example.test',password:'disposable-account-test-password'});
 assert.ok(loggedIn?.active);
 assert.equal(loggedIn.workspaceId,registered.workspaceId);
 assert.equal(db.authenticate(loggedIn.authToken)?.workspaceId,registered.workspaceId);
 db.logout(loggedIn.authToken);assert.equal(db.authenticate(loggedIn.authToken),null);
 console.log('Account persistence and lifecycle passed');
}finally{db.close();rmSync(temp,{recursive:true,force:true});}
