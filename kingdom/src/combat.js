import {SIZE,terrain} from './terrain.js';
import {blockedTiles,distanceToBuilding,findWeightedRoute,walkablePoint} from './navigation.js';
import {UNITS,raiderStats} from './units.js';

export const UNIT_RADIUS=.22;
export const PROJECTILE_SPEED=10;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function movementField(state,definitions){
 const occupants=new Map(),roads=new Set(),buildings=new Map();let castle=null;
 for(const b of state.buildings){
  if(b.hp<=0)continue;
  buildings.set(b.id,b);if(b.type==='castle')castle=b;
  if(b.type==='road'){roads.add(`${b.x},${b.y}`);continue;}
  const n=definitions[b.type].size;
  for(let y=b.y;y<b.y+n;y++)for(let x=b.x;x<b.x+n;x++)occupants.set(`${x},${y}`,b);
 }
 const blocked=blockedTiles(state.buildings,definitions),defenderBlocked=new Set(blocked),openGates=new Set();
 for(const position of roads){const gate=occupants.get(position);if(gate?.type==='wall'){defenderBlocked.delete(position);openGates.add(gate.id);}}
 const defenderField={occupants,roads,buildings,castle,blocked:defenderBlocked,openGates};
 return {occupants,roads,buildings,castle,blocked,defenderField,defenderIds:new Set((state.defenders||[]).map(unit=>unit.id))};
}

export function movementFactor(state,x,y,field){
 const key=`${Math.floor(x)},${Math.floor(y)}`;
 if(field.roads.has(key))return 1.25;
 const ground=terrain(Math.floor(x),Math.floor(y),state);
 return ground==='water'?.5:ground==='forest'?.85:1;
}

export function unitRadius(state,unit,field){
 return terrain(Math.floor(unit.x),Math.floor(unit.y),state)==='water'&&!field.roads.has(`${Math.floor(unit.x)},${Math.floor(unit.y)}`)?.48:UNIT_RADIUS;
}

export function formationSlots(state,count,definitions){
 const blocked=blockedTiles(state.buildings,definitions),castle=state.buildings.find(b=>b.type==='castle');
 const origin={x:castle?castle.x+definitions.castle.size+1:22,y:castle?castle.y+definitions.castle.size+1:22},slots=[];
 for(let y=.5;y<SIZE;y+=.7)for(let x=.5;x<SIZE;x+=.65){
  if(terrain(Math.floor(x),Math.floor(y),state)==='water'||!walkablePoint(x,y,UNIT_RADIUS,blocked,SIZE))continue;
  slots.push({x,y});
 }
 slots.sort((a,b)=>distance(a,origin)-distance(b,origin)||a.y-b.y||a.x-b.x);
 return slots.slice(0,count);
}

function aimPoint(target,definitions){
 const size=definitions[target.type]?.size;
 return size?{x:target.x+size/2,y:target.y+size/2}:{x:target.x,y:target.y};
}

export function clearShot(from,target,field,definitions,overWalls=false){
 const to=aimPoint(target,definitions),dx=to.x-from.x,dy=to.y-from.y;
 const source=field.occupants.get(`${Math.floor(from.x)},${Math.floor(from.y)}`);
 const obstructed=(x,y)=>{const b=field.occupants.get(`${x},${y}`);return b&&b.hp>0&&b.id!==target.id&&b.id!==source?.id&&!field.openGates?.has(b.id)&&!(overWalls&&b.type==='wall');};
 let x=Math.floor(from.x),y=Math.floor(from.y);const endX=Math.floor(to.x),endY=Math.floor(to.y),sx=Math.sign(dx),sy=Math.sign(dy);
 const stepX=dx?1/Math.abs(dx):Infinity,stepY=dy?1/Math.abs(dy):Infinity;
 let nextX=dx?(sx>0?x+1-from.x:from.x-x)*stepX:Infinity,nextY=dy?(sy>0?y+1-from.y:from.y-y)*stepY:Infinity;
 while(x!==endX||y!==endY){
  if(x===endX)nextX=Infinity;if(y===endY)nextY=Infinity;
  if(Math.abs(nextX-nextY)<1e-9){
   if(obstructed(x+sx,y)||obstructed(x,y+sy))return false;
   x+=sx;y+=sy;nextX+=stepX;nextY+=stepY;
  }else if(nextX<nextY){x+=sx;nextX+=stepX;}
  else{y+=sy;nextY+=stepY;}
  if(obstructed(x,y))return false;
 }
 return true;
}

export function planRaiderRoute(state,unit,definitions,field=movementField(state,definitions),objective,unitDefinitions=UNITS){
 const target=objective||field.castle;if(!target)return null;
 const stats=raiderStats(unit.type,state.raidNumber||0,unitDefinitions);
 return findWeightedRoute(unit,(x,y)=>{
  const obstacle=field.occupants.get(`${Math.floor(x)},${Math.floor(y)}`);
  return !obstacle&&distanceToBuilding({x,y},target,definitions)<=stats.buildingRange&&clearShot({x,y},target,field,definitions)?target:null;
 },new Set(),SIZE,(x,y,fromX,fromY)=>{
  const obstacle=field.occupants.get(`${x},${y}`),previous=field.occupants.get(`${fromX},${fromY}`);
  const travel=(1/movementFactor(state,x+.5,y+.5,field)+1/movementFactor(state,fromX+.5,fromY+.5,field))/(2*stats.speed);
  return travel+(obstacle&&obstacle.id!==previous?.id?Math.ceil(obstacle.hp/stats.buildingAttack):0);
 });
}

export function planDefenderRoute(state,unit,definitions,unitDefinitions=UNITS,field=movementField(state,definitions).defenderField){
 const stats=unitDefinitions[unit.type]||unitDefinitions.swordsman;
 return findWeightedRoute(unit,(x,y)=>nearestUnit({x,y},state.enemies,stats.range,enemy=>clearShot({x,y},enemy,field,definitions,stats.range>2)),field.blocked,SIZE,
  (x,y)=>1/movementFactor(state,x+.5,y+.5,field),
  (x,y)=>{const target=nearestUnit({x,y},state.enemies);return target?{target,score:distance({x,y},target)}:null;});
}

function encounteredBuilding(state,unit,definitions,field,assignments,range){
 const castle=field.castle;if(!castle)return null;
 const center=aimPoint(castle,definitions),direction={x:center.x-unit.x,y:center.y-unit.y};
 const points=[unit,...(unit.route||[]).slice(unit.routeIndex||0,(unit.routeIndex||0)+8)];
 let target=null,best=Infinity;
 for(const b of state.buildings){
  if(b.hp<=0||b.type==='road'||b.type==='wall'||b.type==='castle')continue;
  const proximity=distanceToBuilding(unit,b,definitions);if(proximity>6)continue;
  const point=aimPoint(b,definitions),toward=(point.x-unit.x)*direction.x+(point.y-unit.y)*direction.y;
  if(toward<0&&proximity>1.25)continue;
  let corridor=Infinity;for(const p of points)corridor=Math.min(corridor,distanceToBuilding(p,b,definitions));
  if(corridor>Math.max(2.5,range)||!clearShot(unit,b,field,definitions))continue;
  const score=proximity+corridor*.4+(assignments.get(b.id)||0)*.65-(b.type==='tower'?.5:0);
  if(score<best){best=score;target=b;}
 }
 return target;
}

function nearestUnit(from,units,range=Infinity,accept=()=>true){
 let target=null,best=range*range;
 for(const unit of units){
  if(unit.hp<=0)continue;
  const squared=(unit.x-from.x)**2+(unit.y-from.y)**2;
  if(squared<=best&&accept(unit)){best=squared;target=unit;}
 }
 return target;
}

function face(unit,target){if(distance(unit,target)>.001)unit.facing=Math.atan2(target.y-unit.y,target.x-unit.x);}

export function fireProjectile(state,from,target,targetKind,damage,fromHeight=15,targetSize=1){
 const destination=targetKind==='building'?{x:target.x+targetSize/2,y:target.y+targetSize/2}:{x:target.x,y:target.y};
 const duration=Math.max(.12,Math.hypot(destination.x-from.x,(destination.y-from.y)*.75+(fromHeight-10)/48)/PROJECTILE_SPEED);
 const bolt={id:crypto.randomUUID(),from:{x:from.x,y:from.y},to:destination,targetId:target.id,targetKind,damage,fromHeight,duration,elapsed:0,firedAt:state.simTime||0};
 state.bolts.push(bolt);return bolt;
}

export function advanceProjectiles(state,dt,definitions){
 if(!state.bolts?.length){state.bolts=[];return;}
 const targets={building:new Map(state.buildings.map(b=>[b.id,b])),defender:new Map(state.defenders.map(u=>[u.id,u])),enemy:new Map(state.enemies.map(u=>[u.id,u]))};
 state.bolts=state.bolts.filter(bolt=>{
  if(!Number.isFinite(bolt.duration)||!Number.isFinite(bolt.damage))return false;
  const target=targets[bolt.targetKind]?.get(bolt.targetId);if(!target||target.hp<=0)return false;
  bolt.to=aimPoint(target,definitions);bolt.elapsed+=dt;
  if(bolt.elapsed+1e-9<bolt.duration)return true;
  target.hp=Math.max(0,target.hp-bolt.damage);return false;
 });
}

function freeFromUnits(state,unit,x,y,all,field){
 const radius=unitRadius(state,{x,y},field);
 return all.every(other=>other===unit||other.hp<=0||Math.hypot(x-other.x,y-other.y)+1e-6>=radius+unitRadius(state,other,field));
}

export function separateUnits(state,all,field){
 for(let pass=0;pass<12;pass++){
  let touching=false;
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
   const a=all[i],b=all[j];if(a.hp<=0||b.hp<=0)continue;
   let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);const minimum=unitRadius(state,a,field)+unitRadius(state,b,field)+.005;
   if(d>=minimum-1e-5)continue;touching=true;
   if(d<1e-6){const angle=(i*2.399+j*.91)%(Math.PI*2);dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
   const overlap=minimum-Math.hypot(b.x-a.x,b.y-a.y),nx=dx/d,ny=dy/d;
   for(const [unit,sign]of [[a,-1],[b,1]]){
    const x=unit.x+sign*nx*overlap*.51,y=unit.y+sign*ny*overlap*.51;
    const blocked=field.defenderIds?.has(unit.id)?field.defenderField.blocked:field.blocked;
    if(walkablePoint(x,y,unitRadius(state,{x,y},field),blocked,SIZE)){unit.x=x;unit.y=y;}
   }
  }
  if(!touching)break;
 }
}

function steer(state,unit,target,speed,dt,all,field){
 const dx=target.x-unit.x,dy=target.y-unit.y,d=Math.hypot(dx,dy);if(d<1e-5)return;
 const angle=Math.atan2(dy,dx),step=Math.min(d,speed*movementFactor(state,unit.x,unit.y,field)*dt);
 let best=null,bestScore=-Infinity;
 for(const offset of [0,.4,-.4,.8,-.8,1.2,-1.2,1.6,-1.6]){
  const x=unit.x+Math.cos(angle+offset)*step,y=unit.y+Math.sin(angle+offset)*step;
  if(!walkablePoint(x,y,unitRadius(state,{x,y},field),field.blocked,SIZE)||!freeFromUnits(state,unit,x,y,all,field))continue;
  const score=d-Math.hypot(target.x-x,target.y-y)-Math.abs(offset)*step*.05;
  if(score>bestScore){bestScore=score;best={x,y};}
 }
 if(best){face(unit,best);unit.x=best.x;unit.y=best.y;}
}

function waypoint(unit){
 const path=unit.route||[];
 while(unit.routeIndex<path.length-1&&distance(unit,path[unit.routeIndex])<.09)unit.routeIndex++;
 return path[unit.routeIndex]||null;
}

function assignRoute(unit,result,stamp,target){
 unit.route=result?.path||[];unit.routeIndex=unit.route.length>1?1:0;unit.routeStamp=stamp;unit.routeTarget=target;unit.routePartial=!!result?.partial;unit.repath=.65;unit.stuckTime=0;
}

function needsRoute(unit,stamp,target,goal){
 return unit.routeStamp!==stamp||unit.routeTarget!==target||(unit.stuckTime||0)>=1.5||(!unit.repath&&(!unit.route?.length||!goal(unit.route.at(-1))));
}

function followRoute(state,unit,speed,dt,all,field){
 const next=waypoint(unit);if(!next)return;
 const start={x:unit.x,y:unit.y};steer(state,unit,next,speed,dt,all,field);
 unit.stuckTime=distance(start,unit)<1e-4?(unit.stuckTime||0)+dt:0;
}

function engageUnit(state,unit,target,stats,targetKind,dt,all,field,definitions,unitDefinitions,stamp){
 const defending=targetKind==='enemy';
 const goal=point=>distance(point,target)<=stats.range&&clearShot(point,target,field,definitions,defending&&stats.range>2);
 const inRange=goal(unit);
 if(inRange&&unit.cooldown===0){
  face(unit,target);
  if(stats.range>2)fireProjectile(state,unit,target,targetKind,stats.attack);else target.hp=Math.max(0,target.hp-stats.attack);
  unit.cooldown=1;
 }
 if(stats.range>2){
  const opponents=targetKind==='enemy'?state.enemies:state.defenders;
  const threat=nearestUnit(unit,opponents,2,other=>(unitDefinitions[other.type]||unitDefinitions.swordsman).range<=2&&clearShot(unit,other,field,definitions));
  if(threat){
   const d=distance(unit,threat)||1,away={x:unit.x+(unit.x-threat.x)/d*2,y:unit.y+(unit.y-threat.y)/d*2};
   const before={x:unit.x,y:unit.y};steer(state,unit,away,stats.speed,dt,all,field);face(unit,target);
   if(distance(before,unit)>1e-5)return true;
  }
 }
 if(inRange){face(unit,target);unit.stuckTime=0;return true;}
 const key=`unit:${target.id}`;
 const routeGoal=defending&&unit.routePartial?()=>unit.routeTargetPosition&&distance(target,unit.routeTargetPosition)<.5:goal;
 if(needsRoute(unit,stamp,key,routeGoal)){
  const result=defending?planDefenderRoute(state,unit,definitions,unitDefinitions,field):findWeightedRoute(unit,(x,y)=>goal({x,y})?target:null,field.blocked,SIZE,(x,y)=>1/movementFactor(state,x+.5,y+.5,field));
  const plannedTarget=result?.target||target;
  assignRoute(unit,result,stamp,`unit:${plannedTarget.id}`);
  if(defending){unit.targetId=plannedTarget.id;unit.routeTargetPosition={x:plannedTarget.x,y:plannedTarget.y};}
 }
 followRoute(state,unit,stats.speed,dt,all,field);
 if(unit.routePartial&&unit.route.length&&distance(unit,unit.route.at(-1))<.1)face(unit,target);
 return unit.route.length>0;
}

function attackBuilding(state,unit,target,stats,definitions){
 face(unit,aimPoint(target,definitions));unit.stuckTime=0;
 if(unit.cooldown!==0)return;
 if(stats.range>2)fireProjectile(state,unit,target,'building',stats.buildingAttack,15,definitions[target.type].size);
 else target.hp=Math.max(0,target.hp-stats.buildingAttack);
 unit.cooldown=1;
}

export function combatStep(state,dt,definitions,unitDefinitions){
 advanceProjectiles(state,dt,definitions);
 const all=[...state.defenders,...state.enemies].filter(u=>u.hp>0),field=movementField(state,definitions);
 const stamp=state.buildings.map(b=>`${b.id}:${b.x}:${b.y}:${b.hp>0}`).join('|')+'#'+JSON.stringify(state.waterTiles||[]);
 for(const unit of all){unit.prevX=unit.x;unit.prevY=unit.y;unit.cooldown=Math.max(0,(unit.cooldown||0)-dt);unit.repath=Math.max(0,(unit.repath||0)-dt);unit.thinkIn=Math.max(0,(unit.thinkIn||0)-dt);}
 separateUnits(state,all,field);
 for(const defender of state.defenders){
  if(defender.hp<=0)continue;
  const def=unitDefinitions[defender.type]||unitDefinitions.swordsman;
  const ownField=field.defenderField;
  const target=nearestUnit(defender,state.enemies,def.range,enemy=>clearShot(defender,enemy,ownField,definitions,def.range>2))||state.enemies.find(enemy=>enemy.id===defender.targetId&&enemy.hp>0)||nearestUnit(defender,state.enemies);
  if(target){defender.targetId=target.id;engageUnit(state,defender,target,{...def,speed:defender.type==='guard'?.48:.55},'enemy',dt,all,ownField,definitions,unitDefinitions,stamp);}
 }
 for(const tower of state.buildings){
  if(tower.type!=='tower'||tower.hp<=0)continue;
  tower.cooldown=Math.max(0,(tower.cooldown||0)-dt);
  const from={x:tower.x+.5,y:tower.y+.5},target=nearestUnit(from,state.enemies,7);
  if(target&&tower.cooldown===0){fireProjectile(state,from,target,'enemy',18*tower.level,62);tower.cooldown=1;}
 }
 const assignments=new Map();
 for(const enemy of state.enemies)if(enemy.hp>0&&enemy.assaultId)assignments.set(enemy.assaultId,(assignments.get(enemy.assaultId)||0)+1);
 for(const enemy of state.enemies){
  if(enemy.hp<=0)continue;
  const stats=raiderStats(enemy.type,state.raidNumber||0,unitDefinitions);
  const defender=nearestUnit(enemy,state.defenders,stats.range>2?stats.range:3,unit=>clearShot(enemy,unit,field,definitions));
  if(defender&&engageUnit(state,enemy,defender,stats,'defender',dt,all,field,definitions,unitDefinitions,stamp))continue;
  const containing=field.occupants.get(`${Math.floor(enemy.x)},${Math.floor(enemy.y)}`);
  if(containing&&containing.hp>0){attackBuilding(state,enemy,containing,stats,definitions);continue;}
  let assault=field.buildings.get(enemy.assaultId);
  if(!assault||assault.hp<=0||assault.type==='road'){assault=null;delete enemy.assaultId;}
  let objective=assault||field.castle;if(!objective)continue;
  const goal=point=>distanceToBuilding(point,objective,definitions)<=stats.buildingRange&&clearShot(point,objective,field,definitions);
  const changed=enemy.routeStamp!==stamp||enemy.routeObjective!==objective.id||enemy.routeTarget!==`building:${objective.id}`;
  if(needsRoute(enemy,stamp,`building:${objective.id}`,goal)){
   assignRoute(enemy,planRaiderRoute(state,enemy,definitions,field,objective,unitDefinitions),stamp,`building:${objective.id}`);enemy.routeObjective=objective.id;
  }
  if(!assault&&(!enemy.thinkIn||changed||(enemy.cooldown===0&&goal(enemy)))){
   enemy.thinkIn=.5;assault=encounteredBuilding(state,enemy,definitions,field,assignments,stats.buildingRange);
   if(assault){
    enemy.assaultId=assault.id;objective=assault;assignments.set(assault.id,(assignments.get(assault.id)||0)+1);
    assignRoute(enemy,planRaiderRoute(state,enemy,definitions,field,assault,unitDefinitions),stamp,`building:${assault.id}`);enemy.routeObjective=assault.id;
   }
  }
  const next=waypoint(enemy),obstacle=next&&field.occupants.get(`${Math.floor(next.x)},${Math.floor(next.y)}`);
  const target=goal(enemy)?objective:obstacle;
  if(target&&target.hp>0&&distanceToBuilding(enemy,target,definitions)<=stats.buildingRange&&clearShot(enemy,target,field,definitions))attackBuilding(state,enemy,target,stats,definitions);
  else followRoute(state,enemy,stats.speed,dt,all,field);
 }
 separateUnits(state,all,field);
 for(const defender of state.defenders)if(defender.hp<=0){state.army[defender.type]=Math.max(0,state.army[defender.type]-1);state.population=Math.max(0,state.population-1);}
 state.defenders=state.defenders.filter(d=>d.hp>0);state.enemies=state.enemies.filter(e=>e.hp>0);
 if(state.bolts.length){
  const targets=new Map([...state.buildings,...state.defenders,...state.enemies].map(target=>[target.id,target]));
  state.bolts=state.bolts.filter(bolt=>(targets.get(bolt.targetId)?.hp||0)>0);
 }
}
