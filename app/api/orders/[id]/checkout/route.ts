import {z} from "zod";
import {apiError,HttpError,ownOrder,sameOrigin,infrastructure,boundedBytes,findOrder} from "@/lib/server/runtime";
import {checkoutSession} from "@/lib/server/payments";
import {DIGITAL_CONSENT_VERSION,digitalConsentMissing} from "@/lib/consent";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}) {
  let id:string|undefined,lock:string|undefined;
  try {
    sameOrigin(req);
    const order=await ownOrder(req,(await params).id);
    const raw=JSON.parse(new TextDecoder().decode(await boundedBytes(req,2048)));
    if(raw?.termsAccepted!==true)throw new HttpError(400,"Zaakceptuj regulamin przed przejściem do płatności.");
    if(raw?.digitalConsent!==true)throw new HttpError(400,digitalConsentMissing);
    const email=z.string().trim().email().max(254).safeParse(raw.email);
    if(!email.success)throw new HttpError(400,"Wpisz poprawny adres e-mail.");
    id=order.id;
    lock=crypto.randomUUID();
    const now=Date.now();
    const claim=await infrastructure().DB.prepare("UPDATE orders SET lock_token=?,lock_until=? WHERE id=? AND lock_until<?").bind(lock,now+60000,id,now).run();
    if(!claim.meta.changes)throw new HttpError(409,"Płatność jest już przygotowywana. Spróbuj za chwilę.");
    // Evidence of both consents is stored before the customer leaves for Stripe.
    await infrastructure().DB.prepare("UPDATE orders SET terms_accepted_at=?,digital_consent_at=?,consent_version=? WHERE id=? AND payment_status!='paid'").bind(now,now,DIGITAL_CONSENT_VERSION,id).run();
    return Response.json({url:await checkoutSession(await findOrder(id),email.data,req)});
  } catch(e) {
    return apiError(e);
  } finally {
    if(id&&lock)await infrastructure().DB.prepare("UPDATE orders SET lock_token=NULL,lock_until=0 WHERE id=? AND lock_token=?").bind(id,lock).run();
  }
}
