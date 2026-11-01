import {timingSafeEqual} from "node:crypto";
import {runtime,salesConfigured,salesReady} from "./runtime";

const COOKIE="__Host-czytaki_test_checkout",TTL=24*60*60*1000;
const encoder=new TextEncoder();

function testSecret(){
 const e=runtime();
 return e.STRIPE_SECRET_KEY?.startsWith("sk_test_")?e.TEST_CHECKOUT_TOKEN:undefined;
}
async function key(secret:string){
 return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
function payload(expires:string){return encoder.encode("czytaki-test-checkout-v1:"+expires);}
async function validCookie(req:Request){
 const secret=testSecret();
 if(!secret)return false;
 const raw=req.headers.get("cookie")?.match(/(?:^|;\s*)__Host-czytaki_test_checkout=([0-9]{13})\.([a-f0-9]{64})(?:;|$)/);
 if(!raw)return false;
 const expires=Number(raw[1]),now=Date.now();
 if(expires<=now||expires>now+TTL)return false;
 const signature=Uint8Array.from(raw[2].match(/../g)!,byte=>parseInt(byte,16));
 return crypto.subtle.verify("HMAC",await key(secret),signature,payload(raw[1]));
}
export async function checkoutReady(req?:Request){
 return salesReady()||!!(req&&salesConfigured()&&await validCookie(req));
}

// Intercept before rendering so the bearer token never reaches page content.
export async function testCheckoutEntry(req:Request):Promise<Response|null>{
 const url=new URL(req.url);
 if(!url.searchParams.has("test_checkout"))return null;
 const candidates=url.searchParams.getAll("test_checkout");
 url.searchParams.delete("test_checkout");
 const headers=new Headers({Location:url.href,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"});
 const secret=testSecret();
 if(req.method==="GET"&&url.protocol==="https:"&&secret&&candidates.length===1){
  // Fixed-size digests let timingSafeEqual compare tokens of any input length.
  const digest=(value:string)=>crypto.subtle.digest("SHA-256",encoder.encode(value));
  const [expected,actual]=await Promise.all([digest(secret),digest(candidates[0])]);
  if(timingSafeEqual(new Uint8Array(expected),new Uint8Array(actual))){
   const expires=String(Date.now()+TTL);
   const signature=await crypto.subtle.sign("HMAC",await key(secret),payload(expires));
   const hex=Array.from(new Uint8Array(signature),byte=>byte.toString(16).padStart(2,"0")).join("");
   headers.set("Set-Cookie",`${COOKIE}=${expires}.${hex}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL/1000}`);
  }
 }
 return new Response(null,{status:303,headers});
}
