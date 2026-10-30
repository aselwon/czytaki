// A missing payment/email key must never unlock unpaid production PDFs.
export function localPreviewAllowed(appUrl,salesEnabled){
 if(salesEnabled==='true')return false;
 try{const url=new URL(appUrl);return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);}catch{return false;}
}
