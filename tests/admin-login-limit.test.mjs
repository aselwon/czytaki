import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {failedLoginSql,failedLoginBindings} from '../lib/admin-login-limit.mjs';

function setup(t){
 const db=new DatabaseSync(':memory:');
 t.after(()=>db.close());
 db.exec('CREATE TABLE admin_login_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,window_start INTEGER NOT NULL,blocked_until INTEGER NOT NULL)');
 return {
  fail:(key,now)=>db.prepare(failedLoginSql).run(...failedLoginBindings(key,now,900000,5)),
  row:key=>db.prepare('SELECT * FROM admin_login_attempts WHERE key=?').get(key),
 };
}
test('atomic login counter keeps every increment and blocks at five failures',t=>{
 const {fail,row}=setup(t);
 for(let i=1;i<=20;i++){
  fail('a',1000000+i);
  assert.equal(row('a').count,i);
  assert.equal(row('a').blocked_until,i<5?0:1900000+i);
 }
 assert.equal(row('a').window_start,1000001);
});
test('login window resets only after expiry and counters are isolated',t=>{
 const {fail,row}=setup(t);
 for(let i=0;i<5;i++)fail('a',1000000);
 fail('b',1000000);
 assert.equal(row('b').count,1);
 assert.equal(row('b').blocked_until,0);
 fail('a',1900000);
 assert.equal(row('a').count,6);
 fail('a',1900001);
 assert.equal(row('a').count,1);
 assert.equal(row('a').window_start,1900001);
 assert.equal(row('a').blocked_until,2800000);
 fail('a',2800002);
 assert.equal(row('a').count,1);
 assert.equal(row('a').blocked_until,0);
});
