export async function verifyStripeSignature(body:string,header:string|null,secret:string,now=Date.now()){
 if(!header)return false;const parts=header.split(",").map(p=>p.split("="));const stamp=parts.find(p=>p[0]==="t")?.[1];const signatures=parts.filter(p=>p[0]==="v1").map(p=>p[1]);if(!stamp||!/^\d+$/.test(stamp)||Math.abs(now/1000-Number(stamp))>300)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 for(const signature of signatures){if(!/^[0-9a-f]{64}$/.test(signature))continue;const bytes=Uint8Array.from(signature.match(/.{2}/g)!,v=>parseInt(v,16));if(await crypto.subtle.verify("HMAC",key,bytes,new TextEncoder().encode(stamp+"."+body)))return true;}return false;
}
export type PaymentSession={id:string;status:string;payment_status:string;amount_total:number;currency:string;mode:string;metadata?:{orderId?:string};client_reference_id:string;customer_details?:{email?:string};url?:string;};
export function validPayment(s:PaymentSession,order:{id:string;stripe_session:string|null;amount:number;currency:string}){return s.id===order.stripe_session&&s.metadata?.orderId===order.id&&s.client_reference_id===order.id&&s.mode==="payment"&&s.status==="complete"&&s.payment_status==="paid"&&s.amount_total===order.amount&&s.currency===order.currency;}

