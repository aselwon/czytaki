import type {Book} from "../product";
export const templatePrefix=(id:string)=>`orders/${id}/comic-templates-v1`;
export function sceneImageKey(id:string,book:Book|null,index:number,pdfKey?:string|null){
 if(book?.comicLayoutVersion===1)return `${templatePrefix(id)}/scene-${index}.jpg`;
 return `orders/${id}/${pdfKey?.includes("/comic-remake/")?"comic-remake/":""}scene-${index}.jpg`;
}
export const sceneImageType=(_book:Book|null)=>"image/jpeg";
