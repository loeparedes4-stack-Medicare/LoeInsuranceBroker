import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('PIN budget is atomic, global, private and limited by window and day',async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(await readFile('supabase/pin.sql','utf8'));
 const results=await Promise.all(Array.from({length:8},()=>db.query('select reserve_pin_attempt() as allowed')));
 assert.equal(results.filter(r=>r.rows[0].allowed).length,5);
 await db.exec("update pin_login_budget set window_started=now()-interval '16 minutes'");
 assert.equal((await db.query('select reserve_pin_attempt() as allowed')).rows[0].allowed,true);
 await db.exec("update pin_login_budget set window_started=now()-interval '16 minutes',day_count=20");
 assert.equal((await db.query('select reserve_pin_attempt() as allowed')).rows[0].allowed,false);
 await db.exec("update pin_login_budget set day_started=current_date-1");
 assert.equal((await db.query('select reserve_pin_attempt() as allowed')).rows[0].allowed,true);
 await db.exec('set role authenticated');await assert.rejects(db.exec('select reserve_pin_attempt()'));await assert.rejects(db.exec('select * from pin_login_budget'));await db.close();
});
