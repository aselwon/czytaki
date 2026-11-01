import handler from "vinext/server/fetch-handler";
import {cleanExpiredOrders} from "./lib/server/retention";

const worker={
 fetch:handler.fetch,
 scheduled(_event:ScheduledController,env:Cloudflare.Env & {PHOTO_RETENTION_DAYS?:string;RETENTION_DAYS?:string},ctx:ExecutionContext){
  ctx.waitUntil(cleanExpiredOrders(env as {DB:D1Database;BUCKET:R2Bucket;PHOTO_RETENTION_DAYS?:string;RETENTION_DAYS?:string}));
 },
};
export default worker;
