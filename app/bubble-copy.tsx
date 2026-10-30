"use client";
import {useEffect,useState} from "react";
import {fitBubbleCopy} from "@/lib/bubble-copy.mjs";
type Fit={area:{cx:number;cy:number};size:number;lines:string[];lineHeight:number};
export default function BubbleCopy({text,box,kind}:{text:string;box:{width:number;height:number;speaker?:unknown};kind:string}){
 const width=box.width*490,height=box.height*735,targeted=!!box.speaker;
 const [fit,setFit]=useState<Fit|null>(null),[overflow,setOverflow]=useState(false);
 useEffect(()=>{
  let cancelled=false;setFit(null);setOverflow(false);
  const calculate=async()=>{
   await document.fonts.load('13px ComicLettering');
   if(cancelled)return;
   const ctx=document.createElement('canvas').getContext('2d');if(!ctx)return;
   try{const result=fitBubbleCopy(text,width,height,kind,targeted,(line:string,size:number)=>{ctx.font=`${size}px ComicLettering`;return ctx.measureText(line).width;});setFit(result);}
   catch{setOverflow(true);}
  };
  void calculate();return()=>{cancelled=true;};
 },[text,width,height,kind,targeted]);
 return <svg className="fitted-bubble-copy" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={overflow?"Tekst nie mieści się w dymku":text}>
  <title>{overflow?"Powiększ dymek albo skróć wypowiedź. ":""}{text}</title>
  {fit?.lines.map((line,i)=><text key={i} x={width*fit.area.cx} y={height*fit.area.cy-fit.lines.length*fit.lineHeight/2+fit.lineHeight*.76+i*fit.lineHeight} textAnchor="middle" fontFamily="ComicLettering, sans-serif" fontWeight="400" fontSize={fit.size}>{line}</text>)}
  {overflow&&<text x={width/2} y={height/2} textAnchor="middle" dominantBaseline="middle" fill="#a12626" fontSize={Math.min(13,height*.3)}>!</text>}
 </svg>;
}
