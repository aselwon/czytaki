import {HttpError, runtime} from "./runtime";

const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
async function key(){const secret=runtime().DELETE_TOKEN_SECRET||runtime().ADMIN_PASSWORD;if(!secret)throw new HttpError(503,"Usuwanie danych nie jest skonfigurowane.");return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);}
export async function createDeletionToken(id:string,expires=Date.now()+30*86400000){const data=`${id}.${expires}`,sig=await crypto.subtle.sign("HMAC",await key(),encoder.encode(data));return `${data}.${hex(new Uint8Array(sig))}`;}
export async function verifyDeletionToken(token:string){
 const match=/^([a-f0-9-]{36})\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
 if(!match||Number(match[2])<Date.now())throw new HttpError(403,"Link usuwania jest nieprawidłowy lub wygasł.");
 const valid=await crypto.subtle.verify("HMAC",await key(),Uint8Array.from(match[3].match(/.{2}/g)!,x=>parseInt(x,16)),encoder.encode(`${match[1]}.${match[2]}`));
 if(!valid)throw new HttpError(403,"Link usuwania jest nieprawidłowy lub wygasł.");
 return match[1];
}
