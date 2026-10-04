export function blockedTiles(buildings,definitions){
 const blocked=new Set();
 for(const building of buildings){
  if(building.type==='road')continue;
  const size=definitions[building.type].size;
  for(let y=building.y;y<building.y+size;y++)for(let x=building.x;x<building.x+size;x++)blocked.add(`${x},${y}`);
 }
 return blocked;
}

export function findRoute(start,goal,blocked,size){
 const sx=Math.floor(start.x),sy=Math.floor(start.y);
 if(sx<0||sy<0||sx>=size||sy>=size)return null;
 const queue=[sy*size+sx],parents=new Int32Array(size*size).fill(-1);
 parents[queue[0]]=queue[0];
 for(let head=0;head<queue.length;head++){
  const index=queue[head],x=index%size,y=Math.floor(index/size),result=goal(x+.5,y+.5,x,y);
  if(result){
   const path=[];let current=index;
   while(true){path.push({x:current%size+.5,y:Math.floor(current/size)+.5});if(current===parents[current])break;current=parents[current];}
   return {path:path.reverse(),target:result};
  }
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,ny=y+dy,next=ny*size+nx;
   if(nx<0||ny<0||nx>=size||ny>=size||parents[next]!==-1||blocked.has(`${nx},${ny}`))continue;
   parents[next]=index;queue.push(next);
  }
 }
 return null;
}

export function moveAlongRoute(unit,path,speed){
 let remaining=speed;
 for(const point of path.length>1?path.slice(1):path){
  const dx=point.x-unit.x,dy=point.y-unit.y,distance=Math.hypot(dx,dy);
  if(distance<1e-6)continue;
  const step=Math.min(remaining,distance);
  unit.x+=dx/distance*step;unit.y+=dy/distance*step;
  remaining-=step;
  if(remaining<=1e-6)break;
 }
}

export function roadCircuit(buildings){
 const roads=new Map(buildings.filter(b=>b.type==='road'&&b.hp>0).map(b=>[`${b.x},${b.y}`,{x:b.x,y:b.y}]));
 if(!roads.size)return [];
 let largest=[];const unseen=new Set(roads.keys());
 while(unseen.size){
  const start=unseen.values().next().value,stack=[start],component=[];unseen.delete(start);
  while(stack.length){
   const key=stack.pop(),point=roads.get(key);component.push(point);
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const next=`${point.x+dx},${point.y+dy}`;
    if(unseen.delete(next))stack.push(next);
   }
  }
  if(component.length>largest.length)largest=component;
 }
 const allowed=new Set(largest.map(p=>`${p.x},${p.y}`)),visited=new Set(),route=[];
 const walk=point=>{
  visited.add(`${point.x},${point.y}`);route.push(point);
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const key=`${point.x+dx},${point.y+dy}`;
   if(!allowed.has(key)||visited.has(key))continue;
   walk(roads.get(key));route.push(point);
  }
 };
 walk(largest.sort((a,b)=>a.y-b.y||a.x-b.x)[0]);
 return route;
}

export function pointOnCircuit(route,progress){
 if(!route.length)return null;
 if(route.length===1)return {x:route[0].x+.5,y:route[0].y+.5};
 const segments=route.length-1,phase=((progress%segments)+segments)%segments,index=Math.floor(phase),fraction=phase-index;
 return {x:route[index].x+.5+(route[index+1].x-route[index].x)*fraction,y:route[index].y+.5+(route[index+1].y-route[index].y)*fraction};
}
