import test from 'node:test';
import assert from 'node:assert/strict';
import {localPreviewAllowed} from '../lib/preview-policy.mjs';
test('unpaid preview fails closed outside an explicitly local non-sales environment',()=>{
 for(const url of [undefined,'','bad','https://shop.example','https://localhost.evil.test','https://127.0.0.1.example'])assert.equal(localPreviewAllowed(url,'false'),false);
 for(const url of ['http://localhost:8787','http://127.0.0.1:8787','http://[::1]:8787']){assert.equal(localPreviewAllowed(url,'false'),true);assert.equal(localPreviewAllowed(url,'true'),false);}
});
