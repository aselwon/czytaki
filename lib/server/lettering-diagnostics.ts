// Each scene keeps only the validated geometry and deterministic decisions supplied
// by locateComicSpeech. A JSON path update preserves diagnostics for other pages.
export function saveLetteringAnalysis(db:D1Database,orderId:string,sceneIndex:number){
 return async (analysis:unknown)=>{
  await db.prepare("UPDATE orders SET lettering_analysis=json_set(COALESCE(lettering_analysis,'{}'),?,json(?)),lettering_rejection=NULL WHERE id=?")
   .bind('$.'+sceneIndex,JSON.stringify(analysis),orderId).run();
 };
}
