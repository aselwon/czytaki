import {z} from "zod";
export const productSchema=z.object({name:z.string().trim().min(1).max(30),subject:z.enum(["child","pet","person"]),format:z.enum(["comic","story","fairytale"]),world:z.enum(["forest","space","ocean"]),style:z.enum(["storybook","comic","watercolor"]),age:z.enum(["3-5","6-8","9-12"]),dedication:z.string().trim().max(200),consent:z.literal(true)});
export type ProductInput=z.infer<typeof productSchema>;
export const formats={comic:"Komiks",story:"Opowiadanie",fairytale:"Bajka"};
export const worlds={forest:"Magiczny las",space:"Kosmiczna wyprawa",ocean:"Podwodny świat"};
export const styles={storybook:"Książkowa ilustracja",comic:"Kolorowy komiks",watercolor:"Miękka akwarela"};
export const comicPanelSchema=z.object({visual:z.string().min(8).max(220),line:z.string().min(2).max(55),kind:z.enum(["dialogue","narration"])});
export type ComicPanel=z.infer<typeof comicPanelSchema>;
export const bookSchema=z.object({title:z.string().min(3).max(70),summary:z.string().min(10).max(220),character:z.string().min(10).max(700),scenes:z.array(z.object({title:z.string().min(1).max(50),text:z.string().min(10).max(550),imagePrompt:z.string().min(20).max(1600),panels:z.array(comicPanelSchema).length(5).optional()})).length(6)});
export type Book=z.infer<typeof bookSchema>;
// Structured outputs guarantee field types, but not the length limits used by the UI and PDF.
// Shorten only oversized model text; malformed or missing content still fails validation.
function fitLength(value:unknown,max:number){
 if(typeof value!=="string")return value;
 const clean=value.trim();
 if(clean.length<=max)return clean;
 const prefix=clean.slice(0,max-1);
 const boundary=prefix.lastIndexOf(" ");
 return (boundary>max*.6?prefix.slice(0,boundary):prefix).trimEnd()+"…";
}
export function normalizeGeneratedBook(raw:unknown):Book{
 if(!raw||typeof raw!=="object")return bookSchema.parse(raw);
 const source=raw as Record<string,unknown>;
 const scenes=Array.isArray(source.scenes)?source.scenes.map(scene=>{
  if(!scene||typeof scene!=="object")return scene;
  const item=scene as Record<string,unknown>;
  const panels=Array.isArray(item.panels)?item.panels.map(panel=>{
   if(!panel||typeof panel!=="object")return panel;
   const beat=panel as Record<string,unknown>;
   return {...beat,visual:fitLength(beat.visual,220),line:fitLength(beat.line,55)};
  }):item.panels;
  return {...item,title:fitLength(item.title,50),text:fitLength(item.text,550),imagePrompt:fitLength(item.imagePrompt,1600),panels};
 }):source.scenes;
 return bookSchema.parse({...source,title:fitLength(source.title,70),summary:fitLength(source.summary,220),character:fitLength(source.character,700),scenes});
}
export type OrderView={id:string;status:string;generated:number;title?:string;summary?:string;previewText?:string;previewPanels?:ComicPanel[];remakeAvailable?:boolean;comicVersion?:number;name:string;format:ProductInput["format"];amount:number;currency:string;email?:string;error?:string;paymentStatus:string;deliveryStatus:string;};
export type ServiceConfig={generation:boolean;checkout:boolean;amount:number;currency:string;};
