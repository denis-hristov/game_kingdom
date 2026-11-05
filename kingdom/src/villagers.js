import {findRoute,roadCircuit} from './navigation.js';
import {SIZE} from './terrain.js';

let networkCache={key:null,homes:new Map()};
export function residentialRoads(buildings,definitions){
 const key=buildings.filter(b=>b.type==='road'||b.type==='house').map(b=>`${b.id}:${b.type}:${b.x}:${b.y}:${b.level}:${b.hp>0}`).join('|');
 if(networkCache.key===key)return networkCache;
 const roads=buildings.filter(b=>b.type==='road'&&b.hp>0),positions=new Map(roads.map(b=>[`${b.x},${b.y}`,b])),homes=new Map();
 for(const house of buildings.filter(b=>b.type==='house'&&b.hp>0)){
  const n=definitions.house.size;
  const entrances=roads.filter(r=>((r.x===house.x-1||r.x===house.x+n)&&r.y>=house.y&&r.y<house.y+n)||((r.y===house.y-1||r.y===house.y+n)&&r.x>=house.x&&r.x<house.x+n));
  entrances.sort((a,b)=>Number(b.y===house.y+n)-Number(a.y===house.y+n)||Math.hypot(a.x+.5-house.x-n/2,a.y+.5-house.y-n)-Math.hypot(b.x+.5-house.x-n/2,b.y+.5-house.y-n));
  const entrance=entrances[0],component=new Set(),pending=entrance?[entrance]:[];
  while(pending.length){const p=pending.pop(),k=`${p.x},${p.y}`;if(component.has(k))continue;component.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=positions.get(`${p.x+dx},${p.y+dy}`);if(next&&!component.has(`${next.x},${next.y}`))pending.push(next);}}
  const blocked=new Set();for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!component.has(`${x},${y}`))blocked.add(`${x},${y}`);
  let circuit=roadCircuit(roads.filter(r=>component.has(`${r.x},${r.y}`)));
  if(entrance&&circuit.length>1){const open=circuit.slice(0,-1),start=open.findIndex(p=>p.x===entrance.x&&p.y===entrance.y);circuit=[...open.slice(start),...open.slice(0,start)];circuit.push(circuit[0]);}
  const entry=entrance?{x:entrance.x+.5,y:entrance.y+.5}:null;
  const door=entry?{x:Math.max(house.x+.15,Math.min(house.x+n-.15,entry.x)),y:Math.max(house.y+.15,Math.min(house.y+n-.15,entry.y))}:{x:house.x+n/2,y:house.y+n-.15};
  homes.set(house.id,{house,entry,door,component,blocked,circuit});
 }
 networkCache={key,homes};return networkCache;
}

function follow(v,points,speed,dt){
 let remaining=speed*dt;
 while(v.pathIndex<points.length){
  const point=points[v.pathIndex],dx=point.x-v.x,dy=point.y-v.y,distance=Math.hypot(dx,dy);
  if(distance<1e-6){v.pathIndex++;continue;}
  const step=Math.min(remaining,distance);v.x+=dx/distance*step;v.y+=dy/distance*step;v.facing=Math.atan2(dy,dx);remaining-=step;
  if(step+1e-6>=distance)v.pathIndex++;else break;
  if(remaining<1e-6)break;
 }
 return v.pathIndex>=points.length;
}

export function updateVillagers(state,definitions,civilianCount,dt=0){
 const network=residentialRoads(state.buildings,definitions),houses=[...network.homes.values()];
 const count=Math.min(14,Math.max(0,civilianCount),houses.reduce((sum,h)=>sum+6*h.house.level,0));
 const previous=new Map((state.villagers||[]).map(v=>[v.id,v])),assigned=new Map(),villagers=[];
 for(let i=0;i<count;i++){
  const id=`resident-${i}`,old=previous.get(id);
  let home=old&&network.homes.get(old.homeId);
  if(!home||(assigned.get(home.house.id)||0)>=home.house.level*6)home=houses.map((_,index)=>houses[(index+i)%houses.length]).find(h=>(assigned.get(h.house.id)||0)<h.house.level*6);
  if(!home)continue;
  assigned.set(home.house.id,(assigned.get(home.house.id)||0)+1);
  let v=old&&old.homeId===home.house.id?old:{id,homeId:home.house.id,x:home.door.x,y:home.door.y,indoors:true,mode:'inside',wait:(i%5)*1.2,facing:Math.PI/2};
  if(!Number.isFinite(v.x)||!Number.isFinite(v.y)){v={...v,x:home.door.x,y:home.door.y,indoors:true,mode:'inside'};}
  v.prevX=v.x;v.prevY=v.y;
  const alarm=state.enemies.some(e=>e.hp>0)||state.raidActive;
  if(!home.entry){v.x=home.door.x;v.y=home.door.y;v.indoors=true;v.mode='inside';villagers.push(v);continue;}
  if(v.indoors){
   if(alarm){villagers.push(v);continue;}
   v.wait=Math.max(0,(v.wait||0)-dt);if(v.wait>0){villagers.push(v);continue;}
   v.indoors=false;v.mode='leaving';v.path=[home.entry];v.pathIndex=0;v.networkKey=network.key;
  }
  if(!alarm&&v.mode==='leaving'&&v.networkKey!==network.key){v.indoors=true;v.mode='inside';v.x=home.door.x;v.y=home.door.y;villagers.push(v);continue;}
  if(alarm&&(v.mode!=='fleeing'||v.networkKey!==network.key)){
   const onRoad=home.component.has(`${Math.floor(v.x)},${Math.floor(v.y)}`);
   const route=onRoad?findRoute(v,(_x,_y,x,y)=>x===Math.floor(home.entry.x)&&y===Math.floor(home.entry.y),home.blocked,SIZE):null;
   if(route){v.path=[...route.path.slice(1),home.entry,home.door];v.pathIndex=0;}
   else if(v.mode==='leaving'){v.path=[home.door];v.pathIndex=0;}
   else{v.indoors=true;v.x=home.door.x;v.y=home.door.y;v.mode='inside';villagers.push(v);continue;}
   v.mode='fleeing';v.networkKey=network.key;
  }
  if(v.mode==='leaving'||v.mode==='fleeing'){
   if(follow(v,v.path||[],v.mode==='fleeing'?2.2:.8,dt)){
    if(v.mode==='fleeing'){v.indoors=true;v.mode='inside';}
    else{v.mode='walking';v.circuitIndex=1;}
   }
  }else{
   if(v.networkKey!==network.key){
    if(!home.component.has(`${Math.floor(v.x)},${Math.floor(v.y)}`)){v.indoors=true;v.mode='inside';v.x=home.door.x;v.y=home.door.y;villagers.push(v);continue;}
    let closest=0;for(let j=1;j<home.circuit.length;j++)if(Math.hypot(home.circuit[j].x+.5-v.x,home.circuit[j].y+.5-v.y)<Math.hypot(home.circuit[closest].x+.5-v.x,home.circuit[closest].y+.5-v.y))closest=j;
    v.circuitIndex=closest;v.networkKey=network.key;
   }
   const point=home.circuit[(Number.isInteger(v.circuitIndex)?v.circuitIndex:0)%home.circuit.length];
   v.pathIndex=0;if(follow(v,[{x:point.x+.5,y:point.y+.5}],.8,dt))v.circuitIndex=(v.circuitIndex+1)%home.circuit.length;
  }
  villagers.push(v);
 }
 state.villagers=villagers;
}
