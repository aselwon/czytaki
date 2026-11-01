export const unavailableMessage='Serwer chwilowo nie odpowiedział. Kliknij „Kontynuuj generowanie”.';
export class RequestError extends Error{
 retryAfter?:number;
 constructor(message:string,retryAfter?:number){super(message);this.retryAfter=retryAfter;}
}
export async function request<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,options);
 if(!response.headers.get('content-type')?.includes('application/json'))throw new RequestError(unavailableMessage);
 let data:T&{error?:string;retryAfter?:number};
 try{data=await response.json();}catch{throw new RequestError(unavailableMessage);}
 if(!response.ok)throw new RequestError(data.error||unavailableMessage,response.status===409&&Number.isFinite(data.retryAfter)&&data.retryAfter!>0?data.retryAfter:undefined);
 return data;
}
// Only lease conflicts are retried; capacity and other errors remain actionable.
export async function requestGeneration<T>(path:string,onWaiting:(message:string)=>void):Promise<T>{
 for(;;){
  try{return await request<T>(path,{method:'POST'});}
  catch(error){
   if(!(error instanceof RequestError)||!error.retryAfter)throw error;
   onWaiting(error.message);
   await new Promise(resolve=>setTimeout(resolve,error.retryAfter!*1000));
   onWaiting('');
  }
 }
}
const activeOrderKey='czytaki.activeOrder';
const validId=(id:string|null):id is string=>!!id&&/^[a-f0-9-]{36}$/.test(id);
export function rememberOrder(id:string){
 if(validId(id))try{localStorage.setItem(activeOrderKey,id);}catch{/* Storage may be disabled. */}
}
export function restoreOrder():string|null{
 const url=new URL(location.href);
 let id=url.searchParams.get('order');
 if(!url.searchParams.has('order')){
  try{id=localStorage.getItem(activeOrderKey);}catch{/* URL recovery still works. */}
  if(validId(id)){url.searchParams.set('order',id);history.replaceState({},'',url);}
 }
 return validId(id)?id:null;
}
