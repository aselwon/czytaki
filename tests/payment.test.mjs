import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStripeSignature,validPayment} from '../lib/server/payment-validation.ts';
const order={id:'order-a',stripe_session:'cs_test_a',amount:3900,currency:'pln'};
const paid={id:'cs_test_a',status:'complete',payment_status:'paid',amount_total:3900,currency:'pln',mode:'payment',metadata:{orderId:'order-a'},client_reference_id:'order-a'};
test('only a complete paid session for the exact order and server price unlocks delivery',()=>{
 assert.equal(validPayment(paid,order),true);
 for(const patch of [{id:'cs_other'},{status:'open'},{payment_status:'unpaid'},{amount_total:1},{currency:'usd'},{mode:'subscription'},{metadata:{orderId:'other'}},{client_reference_id:'other'}])assert.equal(validPayment({...paid,...patch},order),false,JSON.stringify(patch));
});
test('webhook authenticates the raw body and rejects missing, stale, future and altered signatures',async()=>{
 const secret='whsec_test_fixture',now=1700000000000,stamp=String(now/1000),body='{"type":"checkout.session.completed"}';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body))).toString('hex');
 const header='t='+stamp+',v1='+signature;
 assert.equal(await verifyStripeSignature(body,header,secret,now),true);
 assert.equal(await verifyStripeSignature(body,null,secret,now),false);
 assert.equal(await verifyStripeSignature(body+' ',header,secret,now),false);
 assert.equal(await verifyStripeSignature(body,header,secret,now+301000),false);
 assert.equal(await verifyStripeSignature(body,header,secret,now-301000),false);
 assert.equal(await verifyStripeSignature(body,header,'wrong-key',now),false);
 assert.equal(await verifyStripeSignature(body,'t='+stamp+',v1=bad,v1='+signature,secret,now),true);
});
