// Single continuous outline. The curved tail stays inside the saved box,
// so resizing cannot push it onto a neighbouring face or outside the page.
/** @param {number} width @param {number} height @param {{x:number,y:number}|null} target */
export function speechBubblePath(width=100,height=100,target=null){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid bubble size');
 if(target){
  const angle=Math.atan2((target.y-.5)/.32,(target.x-.5)/.37),spread=.24;
  const pos=a=>[width*(.5+.37*Math.cos(a)),height*(.5+.32*Math.sin(a))];
  const fmt=([x,y])=>`${x.toFixed(3)} ${y.toFixed(3)}`;
  const start=angle+spread,end=angle+Math.PI*2-spread;
  let d=`M ${fmt(pos(start))}`;
  for(let i=0;i<24;i++){
   const a=start+(end-start)*i/24,b=start+(end-start)*(i+1)/24,k=4/3*Math.tan((b-a)/4),p=pos(a),q=pos(b);
   d+=` C ${fmt([p[0]-k*width*.37*Math.sin(a),p[1]+k*height*.32*Math.cos(a)])} ${fmt([q[0]+k*width*.37*Math.sin(b),q[1]-k*height*.32*Math.cos(b)])} ${fmt(q)}`;
  }
  const tip=[width*(.5+.48*Math.cos(angle)),height*(.5+.48*Math.sin(angle))];
  return d+` Q ${fmt(pos(angle-.08))} ${fmt(tip)} Q ${fmt(pos(angle+.08))} ${fmt(pos(start))} Z`;
 }
 const p=(x,y)=>`${(x*width).toFixed(3)} ${(y*height).toFixed(3)}`;
 return `M ${p(.50,.02)} C ${p(.77,.02)} ${p(.98,.17)} ${p(.98,.43)} C ${p(.98,.64)} ${p(.83,.78)} ${p(.64,.82)} Q ${p(.63,.90)} ${p(.72,.98)} Q ${p(.54,.96)} ${p(.48,.84)} C ${p(.22,.84)} ${p(.02,.69)} ${p(.02,.43)} C ${p(.02,.17)} ${p(.23,.02)} ${p(.50,.02)} Z`;
}
