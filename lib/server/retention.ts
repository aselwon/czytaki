type Bindings={DB:D1Database;BUCKET:R2Bucket;PHOTO_RETENTION_DAYS?:string;RETENTION_DAYS?:string};
const days=(value:string|undefined,fallback:number)=>Math.max(1,Math.min(3650,Number(value)||fallback)*86400000);

async function deleteOrder(env:Bindings,id:string){
 const prefix=`orders/${id}/`;
 let cursor:string|undefined;
 do{
  const page=await env.BUCKET.list({prefix,cursor});
  if(page.objects.length)await env.BUCKET.delete(page.objects.map(object=>object.key));
  cursor=page.truncated?page.cursor:undefined;
 }while(cursor);
 await env.DB.prepare("DELETE FROM ai_calls WHERE order_id=?").bind(id).run();
 await env.DB.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
}

export async function cleanExpiredOrders(env:Bindings,now=Date.now()){
 const photoCutoff=now-days(env.PHOTO_RETENTION_DAYS,7),retentionCutoff=now-days(env.RETENTION_DAYS,30);
 const photos=await env.DB.prepare("SELECT id,photo_key FROM orders WHERE photo_key IS NOT NULL AND created_at<=?").bind(photoCutoff).all<{id:string;photo_key:string}>();
 for(const order of photos.results){await env.BUCKET.delete(order.photo_key);await env.DB.prepare("UPDATE orders SET photo_key=NULL,photo_type=NULL WHERE id=? AND photo_key=?").bind(order.id,order.photo_key).run();}
 const expired=await env.DB.prepare("SELECT id FROM orders WHERE created_at<=?").bind(retentionCutoff).all<{id:string}>();
 for(const order of expired.results)await deleteOrder(env,order.id);
 return {photos:photos.results.length,orders:expired.results.length};
}

export async function deleteOrderData(env:Bindings,id:string){
 await deleteOrder(env,id);
}
