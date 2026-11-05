export function blockedTiles(buildings,definitions){
 const blocked=new Set();
 for(const building of buildings){
  if(building.type==='road'||building.hp<=0)continue;
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

export function distanceToBuilding(point,building,definitions){
 const size=definitions[building.type].size;
 return Math.hypot(Math.max(building.x-point.x,0,point.x-building.x-size),Math.max(building.y-point.y,0,point.y-building.y-size));
}

export function walkablePoint(x,y,radius,blocked,size){
 if(x<radius||y<radius||x>size-radius||y>size-radius)return false;
 for(let yy=Math.floor(y-radius);yy<=Math.floor(y+radius);yy++)for(let xx=Math.floor(x-radius);xx<=Math.floor(x+radius);xx++){
  if(!blocked.has(`${xx},${yy}`))continue;
  const dx=x-Math.max(xx,Math.min(xx+1,x)),dy=y-Math.max(yy,Math.min(yy+1,y));
  if(dx*dx+dy*dy<radius*radius-1e-8)return false;
 }
 return true;
}

export function findWeightedRoute(start,goal,blocked,size,edgeCost=()=>1,fallback){
 const sx=Math.floor(start.x),sy=Math.floor(start.y);
 if(sx<0||sy<0||sx>=size||sy>=size)return null;
 const startIndex=sy*size+sx,parents=new Int32Array(size*size).fill(-1),costs=new Float64Array(size*size).fill(Infinity),heap=[];
 const push=(index,cost)=>{
  let i=heap.length;heap.push({index,cost});
  while(i){const parent=(i-1)>>1;if(heap[parent].cost<=cost)break;heap[i]=heap[parent];i=parent;}heap[i]={index,cost};
 };
 const pop=()=>{
  const first=heap[0],last=heap.pop();if(!heap.length)return first;
  let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child;}heap[i]=last;return first;
 };
 const routeTo=(index,target,partial=false)=>{
  const path=[];let current=index;
  while(true){path.push({x:current%size+.5,y:Math.floor(current/size)+.5});if(current===startIndex)break;current=parents[current];}
  return {path:path.reverse(),target,cost:costs[index],...(partial?{partial:true}:{})};
 };
 let closest=null,bestScore=Infinity,bestCost=Infinity;
 costs[startIndex]=0;parents[startIndex]=startIndex;push(startIndex,0);
 while(heap.length){
  const {index,cost}=pop();if(cost>costs[index]+1e-9)continue;
  const x=index%size,y=Math.floor(index/size),target=goal(x+.5,y+.5,x,y);
  if(target)return routeTo(index,target);
  const approach=fallback?.(x+.5,y+.5,x,y);
  if(approach&&Number.isFinite(approach.score)&&(approach.score<bestScore-1e-9||Math.abs(approach.score-bestScore)<1e-9&&cost<bestCost)){
   closest={index,target:approach.target};bestScore=approach.score;bestCost=cost;
  }
  for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,ny=y+dy,next=ny*size+nx;
   if(nx<0||ny<0||nx>=size||ny>=size||blocked.has(`${nx},${ny}`))continue;
   const step=edgeCost(nx,ny,x,y);if(!Number.isFinite(step)||step<0)continue;
   const candidate=cost+step;
   if(candidate+1e-9>=costs[next])continue;
   costs[next]=candidate;parents[next]=index;push(next,candidate);
  }
 }
 return closest?routeTo(closest.index,closest.target,true):null;
}
