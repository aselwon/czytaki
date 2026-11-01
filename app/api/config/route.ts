import {checkoutReady} from "@/lib/server/test-checkout";
import {runtime} from "@/lib/server/runtime";
import {pricesForRequest} from "@/lib/server/pricing";
export async function GET(req:Request){const e=runtime(),offers=pricesForRequest(req,e.PRICE_CENTS,e.REGULAR_PRICE_CENTS),offer=offers[0];return Response.json({generation:!!(e.DB&&e.BUCKET),checkout:await checkoutReady(req),amount:offer.amount,regularAmount:offer.regularAmount,currency:offer.currency,offers},{headers:{"Cache-Control":"no-store"}});}
