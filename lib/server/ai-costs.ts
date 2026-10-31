import {HttpError,infrastructure} from "./runtime";
import {aiPricing} from "./ai-pricing";

export async function assertPaidOrder(orderId:string){
 const order=await infrastructure().DB.prepare("SELECT payment_status,payment_verified_at FROM orders WHERE id=?").bind(orderId).first<{payment_status:string;payment_verified_at:number|null}>();
 if(order?.payment_status!=="paid"||!order.payment_verified_at)throw new HttpError(409,"Generowanie wymaga płatności potwierdzonej przez operatora.");
}
const validToken=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0;
type Call={id:string;orderId:string;model:string;kind:string};
type Usage={input_tokens:number;output_tokens:number;input_tokens_details?:{text_tokens:number;image_tokens:number}};
export async function startAiCall(orderId:string,kind:string,request:Record<string,unknown>):Promise<Call>{
 const model=String(request.model);
 if(!Object.hasOwn(aiPricing,model))throw new HttpError(503,"Brak cennika wybranego modelu AI.");
 const call={id:crypto.randomUUID(),orderId,model,kind};
 await infrastructure().DB.prepare("INSERT INTO ai_calls (id,order_id,kind,model,size,quality,created_at) VALUES (?,?,?,?,?,?,?)").bind(call.id,orderId,kind,model,request.size??null,request.quality??null,Date.now()).run();
 return call;
}
export async function finishAiCall(call:Call,response:{usage?:Usage;data?:unknown[]}|null,status:string){
 const usage=response?.usage,price=aiPricing[call.model];
 let cost:number|null=null;
 if(status==="completed"&&call.kind==="moderations")cost=0;
 else if(status==="completed"&&usage&&validToken(usage.input_tokens)&&validToken(usage.output_tokens)){
  const detail=usage.input_tokens_details;
  // Image inputs have a separate tariff. Missing details must not silently
  // undercount costs; unresolved calls remain visible as unknown.
  if(!price.imageInput||(detail&&validToken(detail.text_tokens)&&validToken(detail.image_tokens)&&detail.text_tokens+detail.image_tokens===usage.input_tokens)){
   const input=price.imageInput?detail!.text_tokens*price.input+detail!.image_tokens*price.imageInput:usage.input_tokens*price.input;
   cost=Math.ceil((input+usage.output_tokens*price.output)/10000);
  }
 }
 // A single D1 transaction keeps the ledger and cached order total consistent.
 // Only a pending call can be settled: retries of settlement cannot double count.
 const DB=infrastructure().DB;
 await DB.batch([
  DB.prepare("UPDATE orders SET ai_cost_cents=ai_cost_cents+? WHERE id=? AND EXISTS (SELECT 1 FROM ai_calls WHERE id=? AND status='pending')").bind(cost??0,call.orderId,call.id),
  DB.prepare("UPDATE ai_calls SET input_tokens=?,output_tokens=?,images=?,cost_cents=?,status=? WHERE id=? AND status='pending'").bind(usage&&validToken(usage.input_tokens)?usage.input_tokens:null,usage&&validToken(usage.output_tokens)?usage.output_tokens:null,response?.data?.length??0,cost,status==="completed"&&cost===null?"unknown":status,call.id),
 ]);
 if(status==="completed"&&cost===null)throw new HttpError(503,"Brak danych do rozliczenia wywołania AI. Zamówienie wymaga sprawdzenia przez obsługę.");
}
