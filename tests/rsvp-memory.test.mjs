import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedRequest, savedRequestValue } from '../lib/guest-validation.ts';
const id='c6243020-854c-4a08-9a42-e32037b4a5d6';
test('receipt storage holds only a version and random receipt ID',()=>{const raw=savedRequestValue(id);assert.equal(parseSavedRequest(raw),id);assert.deepEqual(Object.keys(JSON.parse(raw)),['version','requestId']);});
test('malformed or old receipts cannot restore confirmation',()=>{for(const raw of [null,'invalid','{}',JSON.stringify({version:2,requestId:id}),JSON.stringify({version:1,requestId:'bad'}),'x'.repeat(300)])assert.equal(parseSavedRequest(raw),null);assert.throws(()=>savedRequestValue('bad'));});
