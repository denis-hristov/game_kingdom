import React,{useEffect,useRef,useState} from 'react';
import {BUILDINGS,SIZE,WHEAT_GROW_SECONDS,bounds,canPlace,canPlant,cropCapacity,cropCount,cropReady,terrain,maxHp} from './engine';
import {roadCircuit,pointOnCircuit} from './navigation';
import {readyCropAt,tilesAlongLine} from './planting';
import {drawBuilding,drawPerson,drawTree,polygon} from './art';
import {preloadSprites,hitSprite,drawSprite} from './sprites';
const TW=48,TH=36;
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function drawCrop(ctx,crop){
 const x=crop.x*TW,y=crop.y*TH,stage=crop.progress/WHEAT_GROW_SECONDS;
 ctx.fillStyle='#6f5033';ctx.fillRect(x+3,y+3,TW-6,TH-6);ctx.strokeStyle=stage>=1?'#f6d474':'#b39566';ctx.lineWidth=stage>=1?2:1;ctx.strokeRect(x+3.5,y+3.5,TW-7,TH-7);
 if(crop.kind==='tree'){
  ctx.fillStyle='#72a34b';ctx.beginPath();ctx.ellipse(x+TW/2,y+TH-8,11,4,0,0,Math.PI*2);ctx.fill();
  drawTree(ctx,x+TW/2,y+TH-7,.28+Math.min(1,stage)*.42,crop.x+crop.y);
  if(stage>=1){ctx.fillStyle='#f5ebbe';ctx.beginPath();ctx.arc(x+TW-5,y+5,4,0,Math.PI*2);ctx.fill();}
  return;
 }
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const px=x+9+col*10,py=y+11+row*8;
  ctx.strokeStyle='#9e7750';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-3,py+4);ctx.lineTo(px+3,py+4);ctx.stroke();
  const height=stage>=1?13:Math.max(3,stage*12);
  ctx.strokeStyle=stage>=.72?'#c5a94b':'#628446';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(px,py+3);ctx.lineTo(px,py+3-height);ctx.stroke();
  ctx.fillStyle=stage>=.72?'#e7c966':'#83a75a';ctx.beginPath();ctx.ellipse(px-2,py-height/2,2,3,-.5,0,Math.PI*2);ctx.ellipse(px+2,py-height/2-2,2,3,.5,0,Math.PI*2);ctx.fill();
 }
 if(stage>=1){ctx.fillStyle='#f5ebbe';ctx.beginPath();ctx.arc(x+TW-5,y+5,4,0,Math.PI*2);ctx.fill();}
}
function ground(){
 const cv=document.createElement('canvas');cv.width=SIZE*TW;cv.height=SIZE*TH;const c=cv.getContext('2d');c.fillStyle='#84a66a';c.fillRect(0,0,cv.width,cv.height);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
 const t=terrain(x,y),n=noise(x,y);c.fillStyle=t==='water'?'#599aa2':t==='forest'?'#76945c':n>.5?'#94ad73':'#91aa6f';c.fillRect(x*TW,y*TH,TW,TH);
 if(t!=='water'){for(let i=0;i<8;i++){let px=x*TW+noise(x+i,y+9)*TW,py=y*TH+noise(x+8,y+i)*TH;c.strokeStyle=i%2?'#b3c18480':'#53794c50';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px+1,py-3);c.lineTo(px+3,py-1);c.stroke();}if(n>.91){c.fillStyle='#dbc885';c.fillRect(x*TW+17,y*TH+10,2,2);c.fillStyle='#cfab73';c.fillRect(x*TW+24,y*TH+14,2,2);}}
 else{if(terrain(x-1,y)!=='water'){c.fillStyle='#bac292';c.fillRect(x*TW,y*TH,5,TH);c.fillStyle='#7eb0aa';c.fillRect(x*TW+5,y*TH,4,TH);}if(terrain(x+1,y)!=='water'){c.fillStyle='#bdc58f';c.fillRect((x+1)*TW-5,y*TH,5,TH);}c.strokeStyle='#a4cdbe66';for(let i=0;i<2;i++){const xx=x*TW+n*20,yy=y*TH+10+i*17;c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+8,yy+3,xx+19,yy);c.stroke();}}
 }
 return cv;
}
export default function World({state,dispatch,buildType,moveId,plantFarmId,clearFarmId,selected,onSelect,onMoveDone,grid,setGrid,cameraCommand}){
 const ref=useRef(),latest=useRef(),camera=useRef({x:22.5*TW,y:22*TH,zoom:1}),pointer=useRef(null),hover=useRef(null),size=useRef({w:1,h:1}),lastTap=useRef(0);
 const roadWalk=useRef({key:'',route:[]}),motion=useRef({lastNow:null,seenTime:null,clock:0,elapsed:1});
 const [zoom,setZoom]=useState(100);
 latest.current={state,dispatch,buildType,moveId,plantFarmId,clearFarmId,selected,onSelect,onMoveDone,grid};
 useEffect(()=>{if(cameraCommand){const z=Math.max(.45,Math.min(1.1,size.current.w/940,size.current.h/650));camera.current={x:22.5*TW,y:21.5*TH,zoom:z};setZoom(Math.round(z*100));}},[cameraCommand]);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas.getContext('2d');let frame;const backdrop=ground();preloadSprites();
  const resize=()=>{const rect=canvas.getBoundingClientRect();size.current={w:rect.width,h:rect.height};const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;const z=Math.max(.45,Math.min(1.1,rect.width/940,rect.height/650));camera.current.zoom=z;camera.current.y=21.5*TH;setZoom(Math.round(z*100));};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const toTile=e=>{const r=canvas.getBoundingClientRect(),cam=camera.current;return {x:Math.floor(((e.clientX-r.left-size.current.w/2)/cam.zoom+cam.x)/TW),y:Math.floor(((e.clientY-r.top-size.current.h/2)/cam.zoom+cam.y)/TH)};};
  function paintTile(p,t){
   const v=latest.current,s=v.state,key=`${t.x},${t.y}`;
   if(p.painted.has(key))return;
   const owner=s.buildings.find(b=>b.id===p.plantId);
   if(!owner||canPlant(s,p.plantId,t.x,t.y))return;
   const pending=[...p.painted].filter(position=>!s.crops.some(c=>c.farmId===p.plantId&&`${c.x},${c.y}`===position)).length;
   if(cropCount(s,p.plantId)+pending>=cropCapacity(owner))return;
   p.painted.add(key);v.dispatch({type:'PLANT',farmId:p.plantId,...t});
  }
  function harvestTile(p,t){
   const v=latest.current,crop=readyCropAt(v.state,t);
   if(!crop||p.harvested.has(crop.id))return;
   p.harvested.add(crop.id);v.dispatch({type:'HARVEST',id:crop.id});
  }
  function removeTile(p,t){
   const v=latest.current,crop=v.state.crops.find(c=>c.farmId===p.clearId&&c.x===t.x&&c.y===t.y);
   if(!crop||p.removed.has(crop.id))return;
   p.removed.add(crop.id);v.dispatch({type:'REMOVE_CROP',farmId:p.clearId,id:crop.id});
  }
  function paintLine(p,t){for(const tile of tilesAlongLine(p.lastTile,t))paintTile(p,tile);p.lastTile=t;}
  function harvestLine(p,t){for(const tile of tilesAlongLine(p.lastTile,t))harvestTile(p,tile);p.lastTile=t;}
  function removeLine(p,t){for(const tile of tilesAlongLine(p.lastTile,t))removeTile(p,tile);p.lastTile=t;}
  function down(e){
   if(pointer.current)return;
   canvas.setPointerCapture(e.pointerId);
   const tile=toTile(e),v=latest.current,clearId=v.clearFarmId,harvest=!clearId&&!v.moveId&&!v.buildType&&!!v.state.crops.find(c=>c.x===tile.x&&c.y===tile.y),plantId=harvest?null:v.plantFarmId;
   pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false,plantId,clearId,harvest,lastTile:tile,painted:new Set(),harvested:new Set(),removed:new Set()};
   hover.current=tile;
   if(clearId)removeTile(pointer.current,tile);
   else if(harvest)harvestTile(pointer.current,tile);
   else if(plantId)paintTile(pointer.current,tile);
  }
  function move(e){
   hover.current=toTile(e);
   const p=pointer.current;if(!p||p.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6)p.drag=true;
   if(p.clearId||p.plantId||p.harvest){if(p.lastTile.x!==hover.current.x||p.lastTile.y!==hover.current.y)p.drag=true;if(p.clearId)removeLine(p,hover.current);else if(p.harvest)harvestLine(p,hover.current);else paintLine(p,hover.current);}
   else if(p.drag){camera.current.x-=(e.clientX-p.x)/camera.current.zoom;camera.current.y-=(e.clientY-p.y)/camera.current.zoom;camera.current.x=Math.max(0,Math.min(SIZE*TW,camera.current.x));camera.current.y=Math.max(0,Math.min(SIZE*TH,camera.current.y));}
   p.x=e.clientX;p.y=e.clientY;
  }
  function up(e){
   const p=pointer.current;if(!p||p.id!==e.pointerId)return;
   pointer.current=null;
   const v=latest.current,t=toTile(e);
   if(p.clearId){removeLine(p,t);return;}
   if(p.harvest){
    if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6||p.lastTile.x!==t.x||p.lastTile.y!==t.y)p.drag=true;
    harvestLine(p,t);
    if(!p.drag&&!p.harvested.size){const crop=v.state.crops.find(c=>c.x===t.x&&c.y===t.y);if(crop)v.dispatch({type:'HARVEST',id:crop.id});}
    return;
   }
   if(p.plantId){
    if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6||p.lastTile.x!==t.x||p.lastTile.y!==t.y)p.drag=true;
    paintLine(p,t);
    if(!p.drag&&!p.painted.size){const crop=v.state.crops.find(c=>c.x===t.x&&c.y===t.y);v.dispatch(crop&&cropReady(crop)?{type:'HARVEST',id:crop.id}:{type:'PLANT',farmId:p.plantId,...t});}
    return;
   }
   if(p.drag)return;
   if(v.moveId){const b=v.state.buildings.find(b=>b.id===v.moveId);if(b&&!canPlace(v.state,b.type,t.x,t.y,b.id)){v.dispatch({type:'MOVE',id:b.id,...t});v.onMoveDone();}else v.dispatch({type:'NOTICE',message:b?canPlace(v.state,b.type,t.x,t.y,b.id):'Избери сграда.'});}else if(v.buildType){v.dispatch({type:'BUILD',kind:v.buildType,...t});}else{
   const crop=v.state.crops.find(c=>c.x===t.x&&c.y===t.y);if(crop){v.dispatch({type:'HARVEST',id:crop.id});return;}
   const rect=canvas.getBoundingClientRect(),cam=camera.current,wx=(e.clientX-rect.left-size.current.w/2)/cam.zoom+cam.x,wy=(e.clientY-rect.top-size.current.h/2)/cam.zoom+cam.y;
   const ordered=[...v.state.buildings].sort((a,b)=>(b.y+BUILDINGS[b.type].size)-(a.y+BUILDINGS[a.type].size));
   const sprite=ordered.find(b=>{const n=BUILDINGS[b.type].size,scale=b.type==='castle'?1.03:1;return b.hp>0&&b.type!=='road'&&hitSprite(b.type,(wx-(b.x+n/2)*TW)/scale,(wy-((b.y+n)*TH-5))/scale);});
   const b=sprite||ordered.find(b=>t.x>=b.x&&t.x<b.x+BUILDINGS[b.type].size&&t.y>=b.y&&t.y<b.y+BUILDINGS[b.type].size);v.onSelect(b?.id||null);
  }lastTap.current=Date.now();}
  function wheel(e){e.preventDefault();const cam=camera.current,r=canvas.getBoundingClientRect(),px=e.clientX-r.left-size.current.w/2,py=e.clientY-r.top-size.current.h/2;const z=Math.max(.45,Math.min(1.8,cam.zoom*Math.exp(-e.deltaY*.001)));cam.x+=px/cam.zoom-px/z;cam.y+=py/cam.zoom-py/z;cam.zoom=z;setZoom(Math.round(z*100));}
  const cancel=()=>{pointer.current=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  function render(now){
   const {state:s,buildType:bt,moveId:mid,plantFarmId:pf,clearFarmId:cf,selected:sel,grid:showGrid}=latest.current;const {w,h}=size.current,cam=camera.current,dpr=canvas.width/w;
   const moving=motion.current;
   if(moving.lastNow!==null&&!s.paused&&!s.gameOver){const delta=Math.min(.1,Math.max(0,(now-moving.lastNow)/1000));moving.clock+=delta;moving.elapsed+=delta;}
   moving.lastNow=now;
   if(moving.seenTime!==s.time){moving.seenTime=s.time;moving.elapsed=0;}
   const alpha=Math.min(1,moving.elapsed),pose=unit=>({x:(unit.prevX??unit.x)+(unit.x-(unit.prevX??unit.x))*alpha,y:(unit.prevY??unit.y)+(unit.y-(unit.prevY??unit.y))*alpha});
   const roadKey=s.buildings.filter(b=>b.type==='road'&&b.hp>0).map(b=>`${b.id}:${b.x}:${b.y}`).join('|');
   if(roadKey!==roadWalk.current.key){roadWalk.current={key:roadKey,route:roadCircuit(s.buildings)};}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#748d5d';ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);ctx.drawImage(backdrop,0,0);
   const bd=bounds(s),minX=bd.min*TW,minY=bd.min*TH,maxX=bd.max*TW,maxY=bd.max*TH;
   ctx.fillStyle='#263e2b26';ctx.fillRect(0,0,SIZE*TW,minY);ctx.fillRect(0,maxY,SIZE*TW,SIZE*TH-maxY);ctx.fillRect(0,minY,minX,maxY-minY);ctx.fillRect(maxX,minY,SIZE*TW-maxX,maxY-minY);
   ctx.strokeStyle='#e4dfaa90';ctx.lineWidth=2;ctx.setLineDash([9,8]);ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);ctx.setLineDash([]);
   if(showGrid||bt||mid||pf||cf){ctx.strokeStyle='#f4eedb30';ctx.lineWidth=.7;for(let x=bd.min;x<=bd.max;x++){ctx.beginPath();ctx.moveTo(x*TW,minY);ctx.lineTo(x*TW,maxY);ctx.stroke();}for(let y=bd.min;y<=bd.max;y++){ctx.beginPath();ctx.moveTo(minX,y*TH);ctx.lineTo(maxX,y*TH);ctx.stroke();}}
   const queue=[];
   for(const crop of s.crops)queue.push({y:(crop.y+1)*TH-7,draw:()=>drawCrop(ctx,crop)});
   for(let y=1;y<SIZE;y++)for(let x=1;x<SIZE;x++){if(terrain(x,y)==='water')continue;const outside=x<bd.min||x>=bd.max||y<bd.min||y>=bd.max;const n=noise(x,y);if((outside&&n>.46&&terrain(x,y)!=='water')||(terrain(x,y)==='forest'&&n>.2)){const px=x*TW+n*22,py=y*TH+n*14;if(Math.abs(px-cam.x)>w/cam.zoom/2+100||Math.abs(py-cam.y)>h/cam.zoom/2+140)continue;queue.push({y:py,draw:()=>drawTree(ctx,px,py,.8+n*.55,Math.floor(n*10))});}}
   for(const b of s.buildings){const n=BUILDINGS[b.type].size,px=(b.x+n/2)*TW,py=(b.y+n)*TH-5;if(b.type==='road'){ctx.save();ctx.translate(px,py+5);if(!drawSprite(ctx,'road')){ctx.fillStyle='#d4c591';ctx.fillRect(-TW/2,-TH,TW,TH);}ctx.restore();if(b.id===sel){ctx.strokeStyle='#ffe7a0';ctx.lineWidth=2;ctx.strokeRect(b.x*TW,b.y*TH,TW,TH);}continue;}
    if(b.id===sel){ctx.fillStyle='#f9df843b';ctx.fillRect(b.x*TW,b.y*TH,n*TW,n*TH);ctx.strokeStyle='#ffe7a0';ctx.lineWidth=2;ctx.strokeRect(b.x*TW+1,b.y*TH+1,n*TW-2,n*TH-2);}
    queue.push({y:py,draw:()=>{ctx.save();ctx.translate(px,py);if(b.id===mid)ctx.globalAlpha=.4;drawBuilding(ctx,b,b.type==='castle'?1.03:1);if(b.hp<maxHp(b)){ctx.fillStyle='#513e35';ctx.fillRect(-22,12,44,5);ctx.fillStyle=b.hp>0?'#d1b168':'#c36e54';ctx.fillRect(-22,12,44*b.hp/maxHp(b),5);}if(b.level>1){ctx.fillStyle='#294a3c';ctx.beginPath();ctx.arc(29,0,8,0,7);ctx.fill();ctx.fillStyle='#f9e8ae';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(b.level,29,3);}ctx.restore();}});
   }
   for(let i=0;i<Math.min(14,s.population);i++){const point=pointOnCircuit(roadWalk.current.route,moving.clock*.8+i*7.31);if(!point)break;const x=point.x*TW,y=point.y*TH+4;queue.push({y,draw:()=>drawPerson(ctx,x,y,'villager',moving.clock*6+i)});}
   if(!s.enemies.length){let ix=0;for(const [type,count]of Object.entries(s.army))for(let i=0;i<Math.min(count,10);i++){const x=(24.7+ix%4*.35)*TW,y=(18.3+Math.floor(ix/4)*.4)*TH;queue.push({y,draw:()=>drawPerson(ctx,x,y,type,moving.clock*2)});ix++;}}
   for(const e of s.enemies){const p=pose(e),x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>{drawPerson(ctx,x,y,'swordsman',moving.clock*7,true);ctx.fillStyle='#a9513e';ctx.fillRect(x-10,y-28,20*e.hp/e.maxHp,3);}});}
   for(const d of s.defenders){const p=pose(d),x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>drawPerson(ctx,x,y,d.type,moving.clock*7)});}
   queue.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
   for(const bolt of s.bolts){ctx.strokeStyle='#f9dc94';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bolt.from.x*TW,bolt.from.y*TH-15);ctx.lineTo(bolt.to.x*TW,bolt.to.y*TH-10);ctx.stroke();}
   const kind=mid?s.buildings.find(b=>b.id===mid)?.type:bt;
   if(kind&&hover.current){const {x,y}=hover.current,n=BUILDINGS[kind].size,valid=!canPlace(s,kind,x,y,mid);ctx.fillStyle=valid?'#e4f0a25c':'#d7726273';ctx.fillRect(x*TW,y*TH,n*TW,n*TH);ctx.strokeStyle=valid?'#eff4bd':'#eeb1a0';ctx.lineWidth=2;ctx.strokeRect(x*TW,y*TH,n*TW,n*TH);ctx.save();ctx.globalAlpha=.65;ctx.translate((x+n/2)*TW,(y+n)*TH-5);if(kind!=='road')drawBuilding(ctx,{type:kind,level:1,hp:1});ctx.restore();}
   if(pf&&hover.current){const {x,y}=hover.current,valid=!canPlant(s,pf,x,y);ctx.fillStyle=valid?'#d9e77991':'#d7726273';ctx.fillRect(x*TW+2,y*TH+2,TW-4,TH-4);ctx.strokeStyle=valid?'#f3e8ae':'#eeb1a0';ctx.lineWidth=2;ctx.strokeRect(x*TW+2,y*TH+2,TW-4,TH-4);}
   if(cf&&hover.current){const {x,y}=hover.current,valid=s.crops.some(c=>c.farmId===cf&&c.x===x&&c.y===y);ctx.fillStyle=valid?'#d75d5288':'#544f4a50';ctx.fillRect(x*TW+2,y*TH+2,TW-4,TH-4);ctx.strokeStyle=valid?'#ffe0cb':'#ddd0b080';ctx.lineWidth=2;ctx.strokeRect(x*TW+2,y*TH+2,TW-4,TH-4);}
   frame=requestAnimationFrame(render);
  }frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);};
 },[]);
 function adjust(amount){camera.current.zoom=Math.max(.45,Math.min(1.8,camera.current.zoom+amount));setZoom(Math.round(camera.current.zoom*100));}
 return <><canvas ref={ref} className={'world '+(buildType||moveId||plantFarmId||clearFarmId?'placing':'')} aria-label="Карта на селището. Влачи за движение. Натисни или влачи през готово жито и дървета, за да ги прибереш. В режим премахване можеш да освобождаваш засадените квадратчета."/><div className="map-controls"><button title="Отдалечаване" aria-label="Отдалечаване" onClick={()=>adjust(-.15)}>−</button><span>{zoom}%</span><button title="Приближаване" aria-label="Приближаване" onClick={()=>adjust(.15)}>+</button><i/><button className={grid?'on':''} title="Показване на мрежата" aria-label="Показване на мрежата" onClick={()=>setGrid(!grid)}>▦</button></div></>;
}
