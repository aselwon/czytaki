const unavailable="Serwer chwilowo nie odpowiedział. Kliknij „Kontynuuj generowanie”.";

// Shared outer boundary also covers failures before a Next route is entered.
export async function apiResponse(request:Request,handle:()=>Promise<Response>):Promise<Response>{
 if(!new URL(request.url).pathname.startsWith('/api/'))return handle();
 try{
  const response=await handle();
  if(response.status<500||response.headers.get('content-type')?.includes('application/json'))return response;
  await response.body?.cancel();
  return Response.json({error:unavailable},{status:response.status,headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:unavailable},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
