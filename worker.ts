import {apiResponse} from "./lib/api-response";
import handler from "vinext/server/fetch-handler";
import {cleanExpiredOrders} from "./lib/server/retention";

import {testCheckoutEntry} from "./lib/server/test-checkout";

const worker={
 async fetch(...args:Parameters<typeof handler.fetch>){
  return apiResponse(args[0],async()=>await testCheckoutEntry(args[0]) ?? handler.fetch(...args));
 },
 scheduled(_event:ScheduledController,env:Cloudflare.Env & {PHOTO_RETENTION_DAYS?:string;RETENTION_DAYS?:string},ctx:ExecutionContext){
  ctx.waitUntil(cleanExpiredOrders(env as {DB:D1Database;BUCKET:R2Bucket;PHOTO_RETENTION_DAYS?:string;RETENTION_DAYS?:string}));
 },
};
export default worker;
