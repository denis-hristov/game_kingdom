import React,{useEffect,useRef,useState} from 'react';
import {BUILDINGS,SIZE,WHEAT_GROW_SECONDS,bounds,canPlace,canPlant,canTerraform,cropCapacity,cropCount,cropReady,terrain,maxHp,underAttack,buildingOccupancy} from './engine';
import {formationSlots} from './combat';
import {readyCropAt,tilesAlongLine} from './planting';
import {drawBuilding,drawPerson,drawCanoe,drawTree,polygon} from './art';
import {spriteTop,preloadSprites,hitSprite,drawSprite} from './sprites';
import {stepZoom} from './camera';
import {wallSprites} from './walls';
import {isBridge,onBridge,bridgeLayout,drawBridge} from './bridges';
const TW=48,TH=36;
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function drawOccupancyBubble(ctx,x,y,label,alpha=1){
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.font='600 11px sans-serif';
 const half=Math.max(36,ctx.measureText(label).width+16)/2;
 ctx.fillStyle='#656c6a';ctx.strokeStyle='#949b98';ctx.lineWidth=1;ctx.shadowColor='#26312a33';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
 ctx.beginPath();ctx.moveTo(-half+7,-28);ctx.lineTo(half-7,-28);ctx.quadraticCurveTo(half,-28,half,-21);
 ctx.lineTo(half,-13);ctx.quadraticCurveTo(half,-6,half-7,-6);ctx.lineTo(4,-6);ctx.lineTo(0,-1);ctx.lineTo(-4,-6);
 ctx.lineTo(-half+7,-6);ctx.quadraticCurveTo(-half,-6,-half,-13);ctx.lineTo(-half,-21);ctx.quadraticCurveTo(-half,-28,-half+7,-28);ctx.closePath();ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.stroke();ctx.fillStyle='#f5f6f4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,0,-17);ctx.restore();
}
function drawCrop(ctx,crop,highlight=false,clock=0){
 const x=crop.x*TW,y=crop.y*TH,stage=crop.progress/WHEAT_GROW_SECONDS;
 ctx.fillStyle='#6f5033';ctx.fillRect(x+3,y+3,TW-6,TH-6);ctx.strokeStyle=stage>=1?'#f6d474':'#b39566';ctx.lineWidth=stage>=1?2:1;ctx.strokeRect(x+3.5,y+3.5,TW-7,TH-7);
 if(highlight){const pulse=.65+Math.sin(clock*4)*.25;ctx.save();ctx.strokeStyle=`rgba(255,224,91,${pulse})`;ctx.fillStyle=`rgba(255,216,64,${pulse*.18})`;ctx.shadowColor='#ffe46b';ctx.shadowBlur=12+pulse*8;ctx.lineWidth=3;ctx.fillRect(x+2,y+2,TW-4,TH-4);ctx.strokeRect(x+2,y+2,TW-4,TH-4);ctx.restore();}
 if(crop.kind==='tree'){
  ctx.fillStyle='#72a34b';ctx.beginPath();ctx.ellipse(x+TW/2,y+TH-8,11,4,0,0,Math.PI*2);ctx.fill();
  ctx.save();if(highlight){ctx.shadowColor='#ffe15a';ctx.shadowBlur=14+Math.sin(clock*4)*6;}drawTree(ctx,x+TW/2,y+TH-7,.28+Math.min(1,stage)*.42,crop.x+crop.y);ctx.restore();
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
function ground(state){
 const cv=document.createElement('canvas');cv.width=SIZE*TW;cv.height=SIZE*TH;const c=cv.getContext('2d');c.fillStyle='#84a66a';c.fillRect(0,0,cv.width,cv.height);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
 const t=terrain(x,y,state),n=noise(x,y);c.fillStyle=t==='water'?'#599aa2':t==='forest'?'#76945c':n>.5?'#94ad73':'#91aa6f';c.fillRect(x*TW,y*TH,TW,TH);
 if(t!=='water'){for(let i=0;i<8;i++){let px=x*TW+noise(x+i,y+9)*TW,py=y*TH+noise(x+8,y+i)*TH;c.strokeStyle=i%2?'#b3c18480':'#53794c50';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px+1,py-3);c.lineTo(px+3,py-1);c.stroke();}if(n>.91){c.fillStyle='#dbc885';c.fillRect(x*TW+17,y*TH+10,2,2);c.fillStyle='#cfab73';c.fillRect(x*TW+24,y*TH+14,2,2);}}
 else{for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])if(terrain(x+dx,y+dy,state)!=='water'){c.fillStyle='#bac292';if(dx)c.fillRect(x*TW+(dx>0?TW-3:0),y*TH,3,TH);else c.fillRect(x*TW,y*TH+(dy>0?TH-3:0),TW,3);}c.strokeStyle='#a4cdbe66';for(let i=0;i<2;i++){const xx=x*TW+n*20,yy=y*TH+10+i*17;c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+8,yy+3,xx+19,yy);c.stroke();}}
 }
 return cv;
}
export default function World({state,dispatch,buildType,moveId,plantFarmId,clearFarmId,editTool,terrainTool,selected,onSelect,onMoveDone,grid,setGrid,cameraCommand}){
 const ref=useRef(),latest=useRef(),camera=useRef({x:22.5*TW,y:21.5*TH,zoom:1}),pointer=useRef(null),hover=useRef(null),size=useRef({w:1,h:1}),lastTap=useRef(0);
 const wallArt=useRef({key:'',variants:new Map()});
 const idleFormation=useRef({key:'',slots:[]}),motion=useRef({lastNow:null,seenTime:null,clock:0,elapsed:1});
 const [zoom,setZoom]=useState(100);
 const occupancy=buildingOccupancy(state);
 const occupancySummary=state.buildings.filter(b=>occupancy[b.id]&&occupancy[b.id].occupied<occupancy[b.id].capacity).map(b=>`${BUILDINGS[b.type].name} ${b.type==='house'?'residents':'workers'} ${occupancy[b.id].occupied}/${occupancy[b.id].capacity}.`).join(' ');
 latest.current={state,occupancy,dispatch,buildType,moveId,plantFarmId,clearFarmId,editTool,terrainTool,selected,onSelect,onMoveDone,grid};
 useEffect(()=>{if(cameraCommand){const z=1;camera.current={x:22.5*TW,y:21.5*TH,zoom:z};setZoom(Math.round(z*100));}},[cameraCommand]);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas.getContext('2d');let frame,backdrop=ground(latest.current.state),drawnWater=latest.current.state.waterTiles,waterKey=JSON.stringify(drawnWater||[]);preloadSprites();
  const resize=()=>{const rect=canvas.getBoundingClientRect();size.current={w:rect.width,h:rect.height};const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;setZoom(Math.round(camera.current.zoom*100));};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const toTile=e=>{const r=canvas.getBoundingClientRect(),cam=camera.current;return {x:Math.floor(((e.clientX-r.left-size.current.w/2)/cam.zoom+cam.x)/TW),y:Math.floor(((e.clientY-r.top-size.current.h/2)/cam.zoom+cam.y)/TH)};};
  function paintTerrain(p,t){
   const v=latest.current,key=`${t.x},${t.y}`;
   if(p.terrainPainted.has(key)||canTerraform(v.state,p.terrainTool,t.x,t.y))return;
   p.terrainPainted.add(key);v.dispatch({type:'TERRAFORM',kind:p.terrainTool,...t});
  }
  function terrainLine(p,t){for(const tile of tilesAlongLine(p.lastTile,t))paintTerrain(p,tile);p.lastTile=t;}
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
   const tile=toTile(e),v=latest.current,clearId=v.clearFarmId,harvest=!v.terrainTool&&!v.editTool&&!clearId&&!v.moveId&&!v.buildType&&!!v.state.crops.find(c=>c.x===tile.x&&c.y===tile.y),plantId=harvest?null:v.plantFarmId;
   pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false,plantId,clearId,harvest,terrainTool:v.terrainTool,terrainPainted:new Set(),lastTile:tile,painted:new Set(),harvested:new Set(),removed:new Set()};
   hover.current=tile;
   if(v.terrainTool)paintTerrain(pointer.current,tile);
   else if(clearId)removeTile(pointer.current,tile);
   else if(harvest)harvestTile(pointer.current,tile);
   else if(plantId)paintTile(pointer.current,tile);
  }
  function move(e){
   hover.current=toTile(e);
   const p=pointer.current;if(!p||p.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6)p.drag=true;
   if(p.terrainTool){if(p.lastTile.x!==hover.current.x||p.lastTile.y!==hover.current.y)p.drag=true;terrainLine(p,hover.current);}
   else if(p.clearId||p.plantId||p.harvest){if(p.lastTile.x!==hover.current.x||p.lastTile.y!==hover.current.y)p.drag=true;if(p.clearId)removeLine(p,hover.current);else if(p.harvest)harvestLine(p,hover.current);else paintLine(p,hover.current);}
   else if(p.drag){camera.current.x-=(e.clientX-p.x)/camera.current.zoom;camera.current.y-=(e.clientY-p.y)/camera.current.zoom;camera.current.x=Math.max(0,Math.min(SIZE*TW,camera.current.x));camera.current.y=Math.max(0,Math.min(SIZE*TH,camera.current.y));}
   p.x=e.clientX;p.y=e.clientY;
  }
  function up(e){
   const p=pointer.current;if(!p||p.id!==e.pointerId)return;
   pointer.current=null;
   const v=latest.current,t=toTile(e);
   if(p.terrainTool){terrainLine(p,t);if(!p.drag&&!p.terrainPainted.size)v.dispatch({type:'TERRAFORM',kind:p.terrainTool,...t});return;}
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
   if(v.moveId){const b=v.state.buildings.find(b=>b.id===v.moveId);if(b&&!canPlace(v.state,b.type,t.x,t.y,b.id)){v.dispatch({type:'MOVE',id:b.id,...t});v.onMoveDone();}else v.dispatch({type:'NOTICE',message:b?canPlace(v.state,b.type,t.x,t.y,b.id):'Select a building.'});}else if(v.buildType){v.dispatch({type:'BUILD',kind:v.buildType,...t});}else{
   const crop=v.state.crops.find(c=>c.x===t.x&&c.y===t.y);if(crop&&!v.editTool){v.dispatch({type:'HARVEST',id:crop.id});return;}
   const rect=canvas.getBoundingClientRect(),cam=camera.current,wx=(e.clientX-rect.left-size.current.w/2)/cam.zoom+cam.x,wy=(e.clientY-rect.top-size.current.h/2)/cam.zoom+cam.y;
   const ordered=[...v.state.buildings].sort((a,b)=>(b.y+BUILDINGS[b.type].size)-(a.y+BUILDINGS[a.type].size)||Number(b.type==='road')-Number(a.type==='road'));
   const sprite=ordered.find(b=>{const n=BUILDINGS[b.type].size,scale=b.type==='castle'?1.03:1;return b.hp>0&&b.type!=='road'&&(b.type==='wall'?wallSprites(v.state.buildings,b):[b.type]).some(type=>hitSprite(type,(wx-(b.x+n/2)*TW)/scale,(wy-((b.y+n)*TH-5))/scale,b.level));});
   const b=sprite||ordered.find(b=>t.x>=b.x&&t.x<b.x+BUILDINGS[b.type].size&&t.y>=b.y&&t.y<b.y+BUILDINGS[b.type].size);v.onSelect(b?.id||null);
  }lastTap.current=Date.now();}
  let wheelDelta=0;
  function wheel(e){
   e.preventDefault();wheelDelta+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?size.current.h:1);
   if(Math.abs(wheelDelta)<40)return;
   const direction=wheelDelta<0?1:-1;wheelDelta=0;
   const cam=camera.current,r=canvas.getBoundingClientRect(),px=e.clientX-r.left-size.current.w/2,py=e.clientY-r.top-size.current.h/2,z=stepZoom(cam.zoom,direction);
   cam.x+=px/cam.zoom-px/z;cam.y+=py/cam.zoom-py/z;cam.zoom=z;setZoom(Math.round(z*100));
  }
  const cancel=()=>{pointer.current=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  function render(now){
   const {state:s,occupancy:slots,buildType:bt,moveId:mid,plantFarmId:pf,clearFarmId:cf,selected:sel,terrainTool:tt,grid:showGrid}=latest.current;const {w,h}=size.current,cam=camera.current,dpr=canvas.width/w;
   if(s.waterTiles!==drawnWater){const nextKey=JSON.stringify(s.waterTiles||[]);drawnWater=s.waterTiles;if(nextKey!==waterKey){backdrop=ground(s);waterKey=nextKey;}}
   const moving=motion.current;
   if(moving.lastNow!==null&&!s.gameOver){const delta=Math.min(.1,Math.max(0,(now-moving.lastNow)/1000));moving.clock+=delta;moving.elapsed+=delta;}
   moving.lastNow=now;
   if(moving.seenTime!==s.simTime){moving.seenTime=s.simTime;moving.elapsed=0;}
   const alpha=Math.min(1,moving.elapsed/.05),pose=unit=>({x:(unit.prevX??unit.x)+(unit.x-(unit.prevX??unit.x))*alpha,y:(unit.prevY??unit.y)+(unit.y-(unit.prevY??unit.y))*alpha});
   const wallKey=s.buildings.filter(b=>b.type==='wall'||b.type==='road').map(b=>`${b.id}:${b.x}:${b.y}:${b.hp>0}`).join('|');
   if(wallKey!==wallArt.current.key)wallArt.current={key:wallKey,variants:new Map(s.buildings.filter(b=>b.type==='wall').map(b=>[b.id,wallSprites(s.buildings,b)]))};
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#748d5d';ctx.fillRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);ctx.drawImage(backdrop,0,0);
   const bd=bounds(s),minX=bd.min*TW,minY=bd.min*TH,maxX=bd.max*TW,maxY=bd.max*TH;
   ctx.fillStyle='#263e2b26';ctx.fillRect(0,0,SIZE*TW,minY);ctx.fillRect(0,maxY,SIZE*TW,SIZE*TH-maxY);ctx.fillRect(0,minY,minX,maxY-minY);ctx.fillRect(maxX,minY,SIZE*TW-maxX,maxY-minY);
   ctx.strokeStyle='#e4dfaa90';ctx.lineWidth=2;ctx.setLineDash([9,8]);ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);ctx.setLineDash([]);
   if(showGrid||bt||mid||pf||cf||tt){ctx.strokeStyle='#f4eedb30';ctx.lineWidth=.7;for(let x=bd.min;x<=bd.max;x++){ctx.beginPath();ctx.moveTo(x*TW,minY);ctx.lineTo(x*TW,maxY);ctx.stroke();}for(let y=bd.min;y<=bd.max;y++){ctx.beginPath();ctx.moveTo(minX,y*TH);ctx.lineTo(maxX,y*TH);ctx.stroke();}}
   const queue=[];
   for(const crop of s.crops)queue.push({y:(crop.y+1)*TH-7,draw:()=>drawCrop(ctx,crop,crop.farmId===cf,moving.clock)});
   for(let y=1;y<SIZE;y++)for(let x=1;x<SIZE;x++){if(terrain(x,y,s)==='water')continue;const outside=x<bd.min||x>=bd.max||y<bd.min||y>=bd.max;const n=noise(x,y);if((outside&&n>.46&&terrain(x,y,s)!=='water')||(terrain(x,y,s)==='forest'&&n>.2)){const px=x*TW+n*22,py=y*TH+n*14;if(Math.abs(px-cam.x)>w/cam.zoom/2+100||Math.abs(py-cam.y)>h/cam.zoom/2+140)continue;queue.push({y:py,draw:()=>drawTree(ctx,px,py,.8+n*.55,Math.floor(n*10))});}}
   for(const b of s.buildings){const n=BUILDINGS[b.type].size,px=(b.x+n/2)*TW,py=(b.y+n)*TH-5;if(b.type==='road'){ctx.save();ctx.translate(px,py+5);if(b.id===mid)ctx.globalAlpha=.4;if(isBridge(s,b))drawBridge(ctx,bridgeLayout(s.buildings,b));else if(!drawSprite(ctx,'road',b.level)){ctx.fillStyle='#d4c591';ctx.fillRect(-TW/2,-TH,TW,TH);}ctx.restore();if(b.id===sel){ctx.strokeStyle='#ffe7a0';ctx.lineWidth=2;ctx.strokeRect(b.x*TW,b.y*TH,TW,TH);}continue;}
    if(b.id===sel){ctx.fillStyle='#f9df843b';ctx.fillRect(b.x*TW,b.y*TH,n*TW,n*TH);ctx.strokeStyle='#ffe7a0';ctx.lineWidth=2;ctx.strokeRect(b.x*TW+1,b.y*TH+1,n*TW-2,n*TH-2);}
    queue.push({y:py,draw:()=>{ctx.save();ctx.translate(px,py);if(b.id===mid)ctx.globalAlpha=.4;drawBuilding(ctx,b.type==='wall'?{...b,wallSprites:wallArt.current.variants.get(b.id)}:b,b.type==='castle'?1.03:1);if(b.hp<maxHp(b)){ctx.fillStyle='#513e35';ctx.fillRect(-22,12,44,5);ctx.fillStyle=b.hp>0?'#d1b168':'#c36e54';ctx.fillRect(-22,12,44*b.hp/maxHp(b),5);}ctx.restore();}});
   }
   for(const citizen of s.villagers||[]){if(citizen.indoors)continue;const p=pose(citizen),x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>drawPerson(ctx,x,y,'villager',moving.clock*(citizen.mode==='fleeing'?12:6),false,citizen.facing)});}
   if(!underAttack(s)){
    const army=Object.entries(s.army).flatMap(([type,count])=>Array.from({length:Math.min(count,10)},()=>type));
    const key=army.join(',')+'#'+s.buildings.map(b=>`${b.id}:${b.x}:${b.y}:${b.hp>0}`).join('|')+'#'+JSON.stringify(s.waterTiles||[]);
    if(key!==idleFormation.current.key)idleFormation.current={key,slots:formationSlots(s,army.length,BUILDINGS)};
    army.forEach((type,index)=>{const p=idleFormation.current.slots[index];if(!p)return;const x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>drawPerson(ctx,x,y,type,0,false,-Math.PI/2)});});
   }
   for(const e of s.enemies){const p=pose(e),x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>{if(terrain(Math.floor(p.x),Math.floor(p.y),s)==='water'&&!onBridge(s,p.x,p.y))drawCanoe(ctx,x,y,e.type||'swordsman',moving.clock*7,true,e.facing);else drawPerson(ctx,x,y,e.type||'swordsman',moving.clock*7,true,e.facing);ctx.fillStyle='#a9513e';ctx.fillRect(x-10,y-28,20*e.hp/e.maxHp,3);}});}
   for(const d of s.defenders){const p=pose(d),x=p.x*TW,y=p.y*TH;queue.push({y,draw:()=>terrain(Math.floor(p.x),Math.floor(p.y),s)==='water'&&!onBridge(s,p.x,p.y)?drawCanoe(ctx,x,y,d.type,moving.clock*7,false,d.facing):drawPerson(ctx,x,y,d.type,moving.clock*7,false,d.facing)});}
   queue.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
   for(const bolt of s.bolts){
    const age=Math.max(0,(bolt.elapsed||0)-.05+Math.min(.05,moving.elapsed));if(age>=bolt.duration)continue;
    const progress=Math.min(1,age/bolt.duration),originY=bolt.from.y*TH-(bolt.fromHeight??15),dx=(bolt.to.x-bolt.from.x)*TW,dy=bolt.to.y*TH-10-originY,length=Math.hypot(dx,dy)||1,x=bolt.from.x*TW+dx*progress,y=originY+dy*progress;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.strokeStyle='#f9dc94';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-Math.min(12,length),0);ctx.lineTo(0,0);ctx.stroke();polygon(ctx,[[3,0],[-2,-2],[-2,2]],'#f6e8bd',null);ctx.restore();
   }
   const movingBuilding=mid?s.buildings.find(b=>b.id===mid):null,kind=movingBuilding?.type||bt;
   if(kind&&hover.current){const {x,y}=hover.current,n=BUILDINGS[kind].size,valid=!canPlace(s,kind,x,y,mid);ctx.fillStyle=valid?'#e4f0a25c':'#d7726273';ctx.fillRect(x*TW,y*TH,n*TW,n*TH);ctx.strokeStyle=valid?'#eff4bd':'#eeb1a0';ctx.lineWidth=2;ctx.strokeRect(x*TW,y*TH,n*TW,n*TH);ctx.save();ctx.globalAlpha=.65;ctx.translate((x+n/2)*TW,(y+n)*TH-(kind==='road'?0:5));if(kind==='road'){const previewRoad={id:mid||'preview-road',type:'road',x,y};if(isBridge(s,previewRoad))drawBridge(ctx,bridgeLayout(s.buildings,previewRoad));else drawSprite(ctx,'road');}else drawBuilding(ctx,{type:kind,level:movingBuilding?.level||1,hp:1,...(kind==='wall'?{wallSprites:wallSprites(s.buildings.filter(b=>b.id!==mid),{id:'preview',type:'wall',x,y})}:{})},kind==='castle'?1.03:1);ctx.restore();}
   if(tt&&hover.current){const {x,y}=hover.current,valid=!canTerraform(s,tt,x,y);ctx.fillStyle=valid?(tt==='water'?'#74c0d0aa':'#a6c776aa'):'#d7726273';ctx.fillRect(x*TW+1,y*TH+1,TW-2,TH-2);ctx.strokeStyle=valid?'#ecf7dd':'#eeb1a0';ctx.lineWidth=2;ctx.strokeRect(x*TW+1,y*TH+1,TW-2,TH-2);}
   if(pf&&hover.current){const {x,y}=hover.current,valid=!canPlant(s,pf,x,y);ctx.fillStyle=valid?'#d9e77991':'#d7726273';ctx.fillRect(x*TW+2,y*TH+2,TW-4,TH-4);ctx.strokeStyle=valid?'#f3e8ae':'#eeb1a0';ctx.lineWidth=2;ctx.strokeRect(x*TW+2,y*TH+2,TW-4,TH-4);}
   if(cf&&hover.current){const {x,y}=hover.current,valid=s.crops.some(c=>c.farmId===cf&&c.x===x&&c.y===y);ctx.fillStyle=valid?'#ffe16a77':'#544f4a50';ctx.fillRect(x*TW+2,y*TH+2,TW-4,TH-4);ctx.strokeStyle=valid?'#fff2ac':'#ddd0b080';ctx.lineWidth=2;ctx.strokeRect(x*TW+2,y*TH+2,TW-4,TH-4);}
   ctx.setTransform(dpr,0,0,dpr,0,0);
   for(const b of s.buildings){
    const fill=slots[b.id];if(!fill||fill.occupied>=fill.capacity)continue;
    const n=BUILDINGS[b.type].size;
    const x=((b.x+n/2)*TW-cam.x)*cam.zoom+w/2,y=((b.y+n)*TH-5+spriteTop(b.type,b.level)-cam.y)*cam.zoom+h/2-4;
    if(x<-40||x>w+40||y<0||y>h+28)continue;
    drawOccupancyBubble(ctx,x,y,`${fill.occupied}/${fill.capacity}`,b.id===mid?.4:1);
   }
   frame=requestAnimationFrame(render);
  }frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);};
 },[]);
 function adjust(direction){camera.current.zoom=stepZoom(camera.current.zoom,direction);setZoom(Math.round(camera.current.zoom*100));}
 function resetZoom(){camera.current.zoom=1;setZoom(100);}
 return <><canvas ref={ref} className={'world '+(buildType||moveId||plantFarmId||clearFarmId||editTool||terrainTool?'placing':'')} aria-label={`Village map. Drag to pan. ${state.villagers?.filter(v=>!v.indoors).length||0} residents outside, ${state.villagers?.filter(v=>v.indoors).length||0} at home. ${occupancySummary} Click or drag across mature wheat and trees to harvest them.`}/><div className="map-controls"><button title="Zoom out" aria-label="Zoom out" onClick={()=>adjust(-1)}>−</button><button className="zoom-reset" title="Reset zoom to 100%" aria-label={`Zoom ${zoom}%. Reset to 100%`} onClick={resetZoom}>{zoom}%</button><button title="Zoom in" aria-label="Zoom in" onClick={()=>adjust(1)}>+</button><i/><button className={grid?'on':''} title="Toggle grid" aria-label="Toggle grid" onClick={()=>setGrid(!grid)}>▦</button></div></>;
}
