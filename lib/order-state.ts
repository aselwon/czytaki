// `ready` is the historical name; existing orders need no destructive rewrite.
export function hasAssembledBook(status?:string){
 return status!==undefined&&["ready","assembled","delivered"].includes(status);
}
