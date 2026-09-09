import {test} from 'node:test';
import assert from 'node:assert/strict';
import {birthdaysToday,alertKey} from '../src/birthday-alerts.js';
test('Birthday reminders use business local date and exclude paused clients',()=>{
 const clients=[{id:'a',birthday:'1990-09-08',active:true},{id:'b',birthday:'1990-09-09',active:true},{id:'c',birthday:'1990-09-08',active:false}];
 assert.deepEqual(birthdaysToday(clients,new Date('2026-09-09T02:00:00Z'),'America/Phoenix').map(c=>c.id),['a']);
 assert.deepEqual(birthdaysToday(clients,new Date('2026-09-09T07:00:00Z'),'America/Phoenix').map(c=>c.id),['b']);
 assert.equal(alertKey([clients[0],clients[1]],'2026-09-08'),alertKey([clients[1],clients[0]],'2026-09-08'));
 assert.notEqual(alertKey([clients[0]],'2026-09-08'),alertKey([clients[0]],'2026-09-09'));
});
test('February 29 reminders only occur on leap day',()=>{
 const clients=[{id:'leap',birthday:'2000-02-29',active:true}];
 assert.equal(birthdaysToday(clients,new Date('2027-03-01T12:00:00Z'),'UTC').length,0);
 assert.equal(birthdaysToday(clients,new Date('2028-02-29T12:00:00Z'),'UTC').length,1);
});
