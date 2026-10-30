// Text rectangles are inscribed in the balloon body, excluding its tail.
export function bubbleCopyArea(kind,targeted=false){
 if(kind!=='dialogue')return {cx:.5,cy:.5,width:.82,height:.9};
 return targeted?{cx:.5,cy:.5,width:.52,height:.44}:{cx:.5,cy:.43,width:.64,height:.50};
}
export function fitBubbleCopy(text,width,height,kind,targeted,measure){
 const area=bubbleCopyArea(kind,targeted),maxWidth=width*area.width,maxHeight=height*area.height-4;
 const wrap=size=>{
  const lines=[];let line='';
  for(const word of text.trim().split(/\s+/)){
   if(measure(word,size)>maxWidth){
    if(line){lines.push(line);line='';}
    for(const char of word){if(measure(line+char,size)>maxWidth){if(line)lines.push(line);line=char;}else line+=char;}
   }else{const next=line?line+' '+word:word;if(measure(next,size)>maxWidth){lines.push(line);line=word;}else line=next;}
  }
  if(line)lines.push(line);return lines;
 };
 const minimum=targeted&&kind==='dialogue'?9:5.5;
 for(let size=13;size>=minimum;size-=.5){
  const lines=wrap(size),lineHeight=size*1.2;
  if(lines.length*lineHeight<=maxHeight&&lines.every(line=>measure(line,size)<=maxWidth))return {area,size,lines,lineHeight};
 }
 throw new Error('Comic bubble text exceeds bounds');
}
