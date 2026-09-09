import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeRequest,syncAndroidBirthdays,clearAndroidBirthdays} from '../src/android-bridge.js';
test('Android reminder snapshot excludes phone numbers and authentication data',async()=>{
 const original=globalThis.window;const sent=[];
 const bridge={postMessage(raw){const message=JSON.parse(raw);sent.push(message);queueMicrotask(()=>bridge.onmessage({data:JSON.stringify({requestId:message.requestId,result:'synced'})}));}};
 globalThis.window={LibBirthdaysNative:bridge};
 try{
  syncAndroidBirthdays([{id:'a',name:'Example',birthday:'1990-01-02',active:true,phone:'+14805049855',consent_note:'private'}],{timezone:'America/Phoenix',send_time:'09:00',token:'private'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(Object.keys(sent[0].snapshot.clients[0]),['id','name','birthday','active']);
  assert.equal(JSON.stringify(sent[0]).includes('private'),false);
  clearAndroidBirthdays();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(sent[1].type,'clear');
  assert.equal(await nativeRequest('sync',{}),'synced');
 }finally{globalThis.window=original;}
});
