import {apiError,HttpError,hash,infrastructure,runtime,type OrderRow} from "./runtime";
import {failedLoginSql,failedLoginBindings} from "../admin-login-limit.mjs";

const SESSION_MS=2*60*60*1000,LOGIN_WINDOW_MS=15*60*1000,MAX_LOGIN_ATTEMPTS=5;

function loopback(hostname:string){return hostname==="localhost"||hostname==="127.0.0.1"||hostname==="[::1]";}
export function localAdmin(req:Request){
 try{return loopback(new URL(req.url).hostname)&&loopback(new URL(runtime().APP_URL||req.url).hostname);}catch{return false;}
}
function password(){const value=runtime().ADMIN_PASSWORD||"";if(value.length<20)throw new HttpError(503,"Panel administratora wymaga silnego ADMIN_PASSWORD (minimum 20 znaków).");return value;}
function cookieName(req:Request){return new URL(req.url).protocol==="https:"?"__Host-czytaki_admin":"czytaki_admin";}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,"0")).join("");}
async function sessionKey(){const material=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("czytaki-admin-session-v2:"+password()));return crypto.subtle.importKey("raw",material,{name:"HMAC",hash:"SHA-256"},false,["sign"]);}
async function signature(value:string){return hex(await crypto.subtle.sign("HMAC",await sessionKey(),new TextEncoder().encode(value)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
export async function requireAdmin(req:Request){
 password();
 const name=cookieName(req),raw=req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([0-9]{13}\\.[a-f0-9]{32}\\.[a-f0-9]{64})(?:;|$)`))?.[1];
 if(!raw)throw new HttpError(401,"Zaloguj się do panelu administratora.");
 const [expires,nonce,actual]=raw.split("."),expiry=Number(expires),now=Date.now();
 if(!Number.isSafeInteger(expiry)||expiry<=now||expiry>now+SESSION_MS+60_000)throw new HttpError(401,"Sesja administratora wygasła. Zaloguj się ponownie.");
 const expected=await signature(`${expires}.${nonce}`);
 if(!equal(actual,expected))throw new HttpError(401,"Zaloguj się do panelu administratora.");
}
export async function validAdminPassword(candidate:string){const expected=await hash("czytaki-admin-password-v2:"+password()),actual=await hash("czytaki-admin-password-v2:"+candidate);return equal(actual,expected);}
export async function adminCookie(req:Request){const expires=Date.now()+SESSION_MS,nonce=crypto.randomUUID().replaceAll("-","");const value=`${expires}.${nonce}.${await signature(`${expires}.${nonce}`)}`;return `${cookieName(req)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS/1000}${new URL(req.url).protocol==="https:"?"; Secure":""}`;}
export function clearAdminCookie(req:Request){return `${cookieName(req)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(req.url).protocol==="https:"?"; Secure":""}`;}
async function loginKey(req:Request){const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";return "admin:"+await hash(ip);}
export async function assertAdminLoginAllowed(req:Request){const row=await infrastructure().DB.prepare("SELECT blocked_until FROM admin_login_attempts WHERE key=?").bind(await loginKey(req)).first<{blocked_until:number}>();if((row?.blocked_until||0)>Date.now())throw new HttpError(429,"Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.");}
export async function recordAdminLogin(req:Request,success:boolean){const {DB}=infrastructure(),key=await loginKey(req);if(success){await DB.prepare("DELETE FROM admin_login_attempts WHERE key=?").bind(key).run();return;}await DB.prepare(failedLoginSql).bind(...failedLoginBindings(key,Date.now(),LOGIN_WINDOW_MS,MAX_LOGIN_ATTEMPTS)).run();}
export function adminHeaders(extra:Record<string,string>={}):Record<string,string>{return {"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"frame-ancestors 'none'; base-uri 'none'; object-src 'none'",...extra};}
export function adminApiError(error:unknown){const response=apiError(error);const headers=adminHeaders();response.headers.forEach((value,key)=>headers[key]=value);return new Response(response.body,{status:response.status,headers});}
export function orderNumber(order:Pick<OrderRow,"id"|"created_at">){const day=new Date(order.created_at).toISOString().slice(0,10).replaceAll("-","");return `CZ-${day}-${order.id.slice(0,8).toUpperCase()}`;}
