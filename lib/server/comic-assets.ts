import type {Book} from "../product";
import {COMIC_LAYOUT_VERSION} from "../comic-layouts.ts";
export const templatePrefix=(id:string,version=COMIC_LAYOUT_VERSION)=>version===1?`orders/${id}/comic-templates-v1`:`orders/${id}/comic-overlay-v${version}`;
export function sceneImageKey(id:string,book:Book|null,index:number,pdfKey?:string|null){
 if(book?.comicLayoutVersion)return `${templatePrefix(id,book.comicLayoutVersion)}/scene-${index}.jpg`;
 return `orders/${id}/${pdfKey?.includes("/comic-remake/")?"comic-remake/":""}scene-${index}.jpg`;
}
export const sceneImageType=(_book:Book|null)=>"image/jpeg";
