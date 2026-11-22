import {hasAssembledBook} from "@/lib/order-state";
import {runGenerationStep} from "@/lib/server/generation";
import {deliver} from "@/lib/server/payments";
import {findOrder,HttpError,infrastructure} from "@/lib/server/runtime";

// A paid order left alone this long is finished by the server. Customers who keep
// the tab open drive generation themselves and refresh updated_at on every step.
export const ABANDONED_AFTER_MS=3*60*1000;
const MAX_ORDER_AGE_MS=14*24*60*60*1000;
const DELIVERY_RETRY_WINDOW_MS=23*60*60*1000;
const BATCH=5,MAX_STEPS_PER_ORDER=80;

export type BackgroundSummary={orders:number;steps:number;delivered:number;failed:number};

export async function finishAbandonedOrders({now=Date.now(),budgetMs=4*60*1000}:{now?:number;budgetMs?:number}={}):Promise<BackgroundSummary>{
 const deadline=Date.now()+budgetMs;
 const {results}=await infrastructure().DB.prepare(
  "SELECT id FROM orders WHERE payment_status='paid' AND payment_verified_at IS NOT NULL AND status NOT IN ('safety_blocked','needs_refund','delivered') AND delivery_status!='sent' AND lock_until<? AND updated_at<? AND created_at>? AND (email_attempt_at IS NULL OR email_attempt_at>?) ORDER BY updated_at LIMIT ?"
 ).bind(now,now-ABANDONED_AFTER_MS,now-MAX_ORDER_AGE_MS,now-DELIVERY_RETRY_WINDOW_MS,BATCH).all<{id:string}>();
 const summary:BackgroundSummary={orders:results.length,steps:0,delivered:0,failed:0};
 for(const {id} of results){
  if(Date.now()>=deadline)break;
  try{
   let order=await findOrder(id);
   for(let step=0;!hasAssembledBook(order.status)&&step<MAX_STEPS_PER_ORDER&&Date.now()<deadline;step++){
    if((await runGenerationStep(id)).busy)break;
    summary.steps++;
    order=await findOrder(id);
   }
   if(hasAssembledBook(order.status)&&order.pdf_key&&order.delivery_status!=="sent"){
    await deliver(order);
    if((await findOrder(id)).delivery_status==="sent")summary.delivered++;
   }
  }catch(e){
   // Capacity, safety and provider errors keep their saved state; the next run retries.
   summary.failed++;
   console.error("Background order step failed",id,e instanceof HttpError?e.status:e instanceof Error?e.name:"UnknownError");
  }
 }
 return summary;
}
