import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatUrl,personalMessage} from '../src/manual.js';
test('Manual chat keeps the recipient and special characters intact',()=>{
 const message=personalMessage('Happy Birthday, {{name}}!\nEnjoy & celebrate 🎂','María & José');
 const url=new URL(chatUrl('+1 480 504 9855',message));
 assert.equal(url.origin,'https://wa.me');
 assert.equal(url.pathname,'/14805049855');
 assert.equal(url.searchParams.get('text'),message);
 assert.equal([...url.searchParams].length,1);
 assert.throws(()=>chatUrl('invalid','hello'));
});
