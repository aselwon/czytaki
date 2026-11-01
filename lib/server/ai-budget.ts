import {HttpError,infrastructure} from './runtime';
import {aiPricing} from './ai-pricing';

export const capacityMessage='Dzisiejszy limit generowania został wykorzystany. Zamówienie jest opłacone, a postęp zapisany. Wróć jutro i kliknij „Kontynuuj generowanie”. Książeczka może powstawać przez kilka dni.';
export function budgetConfig(){
 const e=infrastructure(),cap=Number(e.OPENAI_DAILY_COST_CAP_GROSZE),rate=Number(e.OPENAI_USD_PLN_RATE);
 if(!e.OPENAI_DAILY_COST_CAP_GROSZE?.trim()||!Number.isSafeInteger(cap)||cap<=0||!e.OPENAI_USD_PLN_RATE?.trim()||!Number.isFinite(rate)||rate<=0)throw new HttpError(503,'Nieprawidłowa konfiguracja limitu AI. Skontaktuj się z obsługą.');
 return {cap,rate};
}
export function budgetDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()));}
export function estimateCost(kind:string,request:Record<string,unknown>,rate:number){
 const price=aiPricing[String(request.model)];
 if(kind==='moderations')return 0;
 // One byte per text token is deliberately pessimistic. Reserve image inputs
 // separately rather than treating base64 as text. Bounds cover our fixed sizes.
 const text=JSON.stringify(request, (key,value)=>key==='image_url'||key==='image[]'?undefined:value);
 const textTokens=new TextEncoder().encode(text).length;
 const imageTokens=kind==='images/edits'?2*8192:JSON.stringify(request).includes('input_image')?8192:0;
 if(kind!=='responses'&&kind!=='images/edits')throw new HttpError(503,'Nieobsługiwany rodzaj wywołania AI.');
 const output=kind==='images/edits'?16384:Number(request.max_output_tokens);
 if(!Number.isSafeInteger(output)||output<=0)throw new HttpError(503,'Brak maksymalnego kosztu wywołania AI.');
 const amount=Math.ceil(((textTokens*price.input+imageTokens*(price.imageInput??price.input)+output*price.output)/1e6)*100*rate);
 if(!Number.isSafeInteger(amount))throw new HttpError(503,'Nieprawidłowy koszt AI.');
 return amount;
}
export async function budgetAlerts(day:string,cap:number,denied=false){
 const e=infrastructure();
 if(!e.OWNER_ALERT_EMAIL||!e.RESEND_API_KEY||!e.EMAIL_FROM)return;
 for(const threshold of [80,100]){
  // Claim before sending: at most one attempt per threshold/day, including
  // ambiguous network failures. Resend also receives a stable idempotency key.
  const claim=await e.DB.prepare('INSERT INTO ai_budget_alerts (day,threshold) SELECT ?,? WHERE EXISTS (SELECT 1 FROM ai_daily_budget WHERE day=? AND (reserved_grosze>=? OR ?)) ON CONFLICT DO NOTHING RETURNING threshold').bind(day,threshold,day,Math.ceil(cap*threshold/100),denied&&threshold===100?1:0).first();
  if(!claim)continue;
  try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+e.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`ai-budget-${day}-${threshold}`},body:JSON.stringify({from:e.EMAIL_FROM,to:[e.OWNER_ALERT_EMAIL],subject:`Czytaki: limit AI ${threshold}%`,text:`Doba ${day} (Europe/Warsaw), limit ${cap} groszy. Próg ${threshold}% lub brak miejsca na następne wywołanie. Opłacone zamówienia zachowują postęp.`}),signal:AbortSignal.timeout(10000)});if(!response.ok)console.error('AI budget alert failed',response.status);}catch{console.error('AI budget alert transport failed');}
 }
}
