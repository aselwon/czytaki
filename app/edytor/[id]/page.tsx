import type {Metadata} from "next";
import ComicEditor from "@/app/comic-editor";
export const metadata:Metadata={title:"Edytor dymków — Czytaki"};
export default async function EditorPage({params}:{params:Promise<{id:string}>}){return <ComicEditor orderId={(await params).id}/>;}
