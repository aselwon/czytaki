import {z} from "zod";
export const pageCounts=[8,15,30] as const;
export type PageCount=(typeof pageCounts)[number];
export const sceneCountForPages=(pages:PageCount)=>pages-2;
export const productSchema=z.object({name:z.string().trim().min(1).max(30),subject:z.enum(["auto","child","pet","person"]).default("auto"),format:z.enum(["comic","story","fairytale"]),pages:z.union([z.literal(8),z.literal(15),z.literal(30)]).default(8),heroRole:z.enum(["original","web","sky","shadow","ice","magic","cosmic","speed","ocean_guardian","dragon","custom"]).default("original"),heroIdea:z.string().trim().max(120).default(""),world:z.enum(["forest","space","ocean","city","kingdom"]),style:z.enum(["storybook","comic","watercolor"]),age:z.enum(["3-5","6-8","9-12"]),dedication:z.string().trim().max(200),consent:z.literal(true)});
export type ProductInput=z.infer<typeof productSchema>;
export const formats={comic:"Komiks",story:"Opowiadanie",fairytale:"Bajka"};
export const heroRoles={original:"Własny bohater",web:"Pajęczy akrobata",sky:"Latający obrońca",shadow:"Nocny detektyw",ice:"Lodowa czarodziejka",magic:"Uczeń magii",cosmic:"Kosmiczny wojownik",speed:"Błyskawiczny bohater",ocean_guardian:"Strażnik oceanu",dragon:"Smoczy jeździec",custom:"Własny pomysł"};
export const heroRolePrompts={
 original:"an entirely original young adventurer with a distinctive outfit and talent invented for this story",
 web:"an agile wall-climbing and web-slinging rescuer with an original color palette, mask shape, emblem and costume",
 sky:"a flying super-strong protector with an original cape, emblem, costume silhouette and origin",
 shadow:"a clever nighttime detective using original gadgets, stealth and deduction in a mysterious city",
 ice:"a kind ice-and-snow sorcerer with original clothing, powers, kingdom and visual motifs",
 magic:"a young spell learner in an original magical school with an original wand, outfit and creatures",
 cosmic:"a brave cosmic guardian using an original energy power, suit, insignia and galactic setting",
 speed:"a lightning-fast rescuer with an original suit, energy trail, symbol and source of power",
 ocean_guardian:"a protector of the seas with original water powers, attire, companions and underwater realm",
 dragon:"a courageous rider bonded with an original friendly dragon, gear, village and mythology",
 custom:"a new hero inspired only by the broad themes in the customer's note, with an original identity, powers, outfit, emblem and world"
};
export const worlds={forest:"Magiczny las",space:"Kosmiczna wyprawa",ocean:"Podwodny świat",city:"Miasto bohaterów",kingdom:"Baśniowe królestwo"};
export const styles={storybook:"Książkowa ilustracja",comic:"Kolorowy komiks",watercolor:"Miękka akwarela"};
export const comicPanelSchema=z.object({visual:z.string().min(8).max(220),line:z.string().min(2).max(90),kind:z.enum(["dialogue","narration"]),speaker:z.string().min(1).max(160).optional()});
export type ComicPanel=z.infer<typeof comicPanelSchema>;
export const letteringBoxSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1),speaker:z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).optional()}).refine(box=>box.x+box.width<=1&&box.y+box.height<=1);
export const editableLetteringBoxSchema=letteringBoxSchema.refine(box=>box.width>=.12&&box.height>=.055,"Dymek jest zbyt mały.");
export const bookSchema=z.object({title:z.string().min(3).max(70),summary:z.string().min(10).max(220),character:z.string().min(10).max(700),comicLayoutVersion:z.union([z.literal(1),z.literal(2)]).optional(),scenes:z.array(z.object({title:z.string().min(1).max(50),text:z.string().min(10).max(550),imagePrompt:z.string().min(20).max(1600),panels:z.array(comicPanelSchema).length(5).optional(),comicTemplate:z.number().int().min(0).max(7).optional(),placementVersion:z.literal(1).optional(),lettering:z.array(letteringBoxSchema).length(5).optional()})).min(6).max(28)});
export type Book=z.infer<typeof bookSchema>;
export const comicEditorSceneSchema=z.object({title:z.string().min(1).max(50),text:z.string().min(10).max(550),comicTemplate:z.number().int().min(0).max(7),panels:z.array(comicPanelSchema).length(5),lettering:z.array(editableLetteringBoxSchema).length(5)});
export const comicEditorUpdateSchema=z.object({revision:z.number().int().nonnegative(),scenes:z.array(comicEditorSceneSchema).min(6).max(28)});
export type ComicEditorScene=z.infer<typeof comicEditorSceneSchema>;
export type ComicEditorPayload={orderId:string;title:string;revision:number;needsCleanArtwork:boolean;scenes:ComicEditorScene[]};
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
   return {...beat,visual:fitLength(beat.visual,220),line:fitLength(beat.line,55),speaker:fitLength(beat.speaker,160)};
  }):item.panels;
  return {...item,title:fitLength(item.title,50),text:fitLength(item.text,550),imagePrompt:fitLength(item.imagePrompt,1600),panels};
 }):source.scenes;
 return bookSchema.parse({...source,title:fitLength(source.title,70),summary:fitLength(source.summary,220),character:fitLength(source.character,700),scenes});
}
export type PriceOffer={pages:PageCount;amount:number;regularAmount:number;currency:string};
export type OrderView={id:string;status:string;generated:number;title?:string;summary?:string;previewText?:string;previewPanels?:ComicPanel[];previewLettering?:z.infer<typeof letteringBoxSchema>[];comicLayoutVersion?:number;previewAvailable?:boolean;remakeAvailable?:boolean;editorAvailable?:boolean;comicVersion?:number;name:string;format:ProductInput["format"];pages:PageCount;sceneCount:number;amount:number;regularAmount:number;currency:string;email?:string;error?:string;paymentStatus:string;deliveryStatus:string;};
export type ServiceConfig={generation:boolean;checkout:boolean;amount:number;regularAmount:number;currency:string;offers:PriceOffer[];};
