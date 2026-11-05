import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,UNITS,reducer,loadState,saveState,underAttack} from '../src/engine.js';
import {blockedTiles,findRoute,findWeightedRoute,distanceToBuilding} from '../src/navigation.js';
import {residentialRoads,updateVillagers} from '../src/villagers.js';
import {combatStep,movementField,movementFactor,planRaiderRoute,fireProjectile,advanceProjectiles,unitRadius} from '../src/combat.js';

const frames=(state,count)=>{for(let i=0;i<count;i++)state=reducer(state,{type:'FRAME',dt:.05});return state;};
const emptyBattle=()=>{const s=initialState();s.buildings=[building('castle',25,18)];s.population=0;s.army={swordsman:0,archer:0,guard:0};s.villagers=[];return s;};
const soldier=(id,x,y,type='swordsman')=>({id,x,y,type,hp:500,maxHp:500,cooldown:100});

test('residents use roads connected to their own home, including small disconnected neighborhoods',()=>{
 const s=initialState();s.buildings=[building('castle',25,25),building('house',12,12),building('house',20,20),building('road',12,14),building('road',13,14),building('road',20,22),building('road',21,22),building('road',30,30),building('road',31,30),building('road',31,31)];s.villagers=[];s.waterTiles=[{x:12,y:14},{x:20,y:22}];
 for(let i=0;i<400;i++)updateVillagers(s,BUILDINGS,4,.05);
 const network=residentialRoads(s.buildings,BUILDINGS);assert.equal(s.villagers.length,4);
 assert.ok(new Set(s.villagers.map(v=>v.homeId)).size===2);
 for(const resident of s.villagers){const home=network.homes.get(resident.homeId);assert.ok(home.component.has(`${Math.floor(resident.x)},${Math.floor(resident.y)}`));assert.ok(resident.x<25);}
});

test('raids make residents run home and stay inside until the all-clear',()=>{
 const s=initialState();s.villagers=[];
 for(let i=0;i<300;i++)updateVillagers(s,BUILDINGS,8,.05);
 assert.ok(s.villagers.some(v=>!v.indoors));
 s.raidActive=true;s.enemies=[soldier('raider',30,30)];
 updateVillagers(s,BUILDINGS,8,.05);assert.ok(s.villagers.some(v=>v.mode==='fleeing'));
 for(let i=0;i<1000;i++)updateVillagers(s,BUILDINGS,8,.05);
 assert.ok(s.villagers.every(v=>v.indoors));
 const positions=s.villagers.map(v=>[v.x,v.y]);
 for(let i=0;i<40;i++)updateVillagers(s,BUILDINGS,8,.05);
 assert.deepEqual(s.villagers.map(v=>[v.x,v.y]),positions);
 s.raidActive=false;s.enemies=[];for(let i=0;i<40;i++)updateVillagers(s,BUILDINGS,8,.05);
 assert.ok(s.villagers.some(v=>!v.indoors));
});

test('cutting home road access or destroying the home removes stranded street animations',()=>{
 const s=initialState();s.buildings=[building('castle',25,25),building('house',12,12),building('road',12,14),building('road',12,15)];s.villagers=[];
 for(let i=0;i<200;i++)updateVillagers(s,BUILDINGS,2,.05);
 assert.ok(s.villagers.some(v=>!v.indoors));
 s.buildings=s.buildings.filter(b=>b.type!=='road'||b.y!==14);updateVillagers(s,BUILDINGS,2,.05);
 assert.ok(s.villagers.every(v=>v.indoors));
 s.buildings.find(b=>b.type==='house').hp=0;updateVillagers(s,BUILDINGS,2,.05);assert.deepEqual(s.villagers,[]);
});

test('destroyed walls and buildings are passable and repairing them blocks their footprint again',()=>{
 const wall=building('wall',12,12),house=building('house',13,12);wall.hp=0;house.hp=0;
 const rubble=blockedTiles([wall,house],BUILDINGS);assert.equal(rubble.size,0);
 const route=findRoute({x:11.5,y:12.5},(_x,_y,x,y)=>x===15&&y===12,rubble,44);assert.equal(route.path.length,5);
 wall.hp=560;house.hp=150;assert.equal(blockedTiles([wall,house],BUILDINGS).size,5);
});

test('all troop types spawn in distinct formation slots and retain personal space while fighting',()=>{
 const random=Math.random;let s;try{Math.random=()=>0;s=reducer(initialState(),{type:'RAID'});}finally{Math.random=random;}
 assert.equal(s.defenders.length,4);assert.equal(new Set(s.defenders.map(u=>`${u.x},${u.y}`)).size,4);
 for(let frame=0;frame<500&&underAttack(s);frame++){
  s=reducer(s,{type:'FRAME',dt:.05});const field=movementField(s,BUILDINGS),units=[...s.defenders,...s.enemies];
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)assert.ok(Math.hypot(units[i].x-units[j].x,units[i].y-units[j].y)>=unitRadius(s,units[i],field)+unitRadius(s,units[j],field)-.002,`overlap at frame ${frame}`);
 }
});

test('legacy stacked soldiers separate rather than remaining permanently stuck',()=>{
 const s=emptyBattle();s.enemies=Array.from({length:6},(_,i)=>soldier(`enemy-${i}`,15.5,15.5));
 for(let i=0;i<80;i++)combatStep(s,.05,BUILDINGS,UNITS);
 for(let i=0;i<s.enemies.length;i++)for(let j=i+1;j<s.enemies.length;j++)assert.ok(Math.hypot(s.enemies[i].x-s.enemies[j].x,s.enemies[i].y-s.enemies[j].y)>.437);
});

test('soldiers face their movement direction and boats move at exactly half the walking speed',()=>{
 const land=emptyBattle(),water=emptyBattle();
 land.enemies=[soldier('walker',15.5,19.5)];water.enemies=[soldier('boater',15.5,19.5)];
 water.waterTiles=[{x:15,y:19},{x:16,y:19}];
 const start=15.5;combatStep(land,.05,BUILDINGS,UNITS);combatStep(water,.05,BUILDINGS,UNITS);
 assert.ok(land.enemies[0].x>start);assert.ok(Math.abs((water.enemies[0].x-start)/(land.enemies[0].x-start)-.5)<1e-8);
 assert.ok(Math.abs(land.enemies[0].facing)<.01);
 water.buildings.push(building('road',15,19));
 assert.equal(movementFactor(water,15.5,19.5,movementField(water,BUILDINGS)),1.25);
});

test('weighted routes prefer a faster road or bridge crossing over a shorter swim',()=>{
 const s=emptyBattle();s.buildings=[building('castle',20,12)];s.waterTiles=[];
 for(let y=8;y<=18;y++)for(let x=16;x<=17;x++)s.waterTiles.push({x,y});
 for(let x=14;x<=20;x++)s.buildings.push(building('road',x,11));
 const route=planRaiderRoute(s,{x:14.5,y:13.5},BUILDINGS);
 assert.ok(route.path.some(p=>Math.floor(p.x)===16&&Math.floor(p.y)===11));
 assert.ok(!route.path.some(p=>[16,17].includes(Math.floor(p.x))&&Math.floor(p.y)!==11));
});

test('attackers head for the castle instead of detouring to an unrelated nearby building',()=>{
 const s=emptyBattle();s.buildings.push(building('house',12,16));
 const route=planRaiderRoute(s,{x:15.5,y:19.5},BUILDINGS);
 assert.equal(route.target.type,'castle');assert.ok(route.path.every(p=>p.x>=15.5));
 assert.ok(distanceToBuilding(route.path.at(-1),s.buildings[0],BUILDINGS)<=.6);
});

test('attackers break obstacles on the fastest castle route and then cross their ruins',()=>{
 const s=emptyBattle();s.buildings=[building('castle',20,12)];
 for(let y=0;y<44;y++)s.buildings.push(building('wall',17,y));
 const gate=s.buildings.find(b=>b.type==='wall'&&b.y===13);gate.hp=1;s.enemies=[soldier('raider',16.5,13.5)];s.enemies[0].cooldown=0;
 const route=planRaiderRoute(s,s.enemies[0],BUILDINGS);assert.ok(route.path.some(p=>Math.floor(p.x)===17&&Math.floor(p.y)===13));
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(gate.hp,0);
 for(let i=0;i<150;i++)combatStep(s,.05,BUILDINGS,UNITS);
 assert.ok(s.enemies[0].x>18);assert.ok(s.buildings[0].hp<650);
});

test('archer and tower damage is delayed until each arrow reaches the enemy',()=>{
 const s=emptyBattle();s.buildings.push(building('tower',14,12));s.enemies=[soldier('target',18.5,13.5)];s.defenders=[{...soldier('archer',14.5,13.5,'archer'),cooldown:0}];
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(s.enemies[0].hp,500);assert.equal(s.bolts.length,2);
 const duration=Math.max(...s.bolts.map(b=>b.duration));
 advanceProjectiles(s,.05,BUILDINGS);assert.equal(s.enemies[0].hp,500);
 advanceProjectiles(s,duration,BUILDINGS);assert.equal(s.enemies[0].hp,500-UNITS.archer.attack-18);
 advanceProjectiles(s,2,BUILDINGS);assert.equal(s.enemies[0].hp,500-UNITS.archer.attack-18);
});

test('projectiles can hit buildings and retain their target if the shooter dies',()=>{
 const s=emptyBattle(),castle=s.buildings[0];
 const bolt=fireProjectile(s,{x:20,y:19},castle,'building',25,15,BUILDINGS.castle.size);
 advanceProjectiles(s,bolt.duration/2,BUILDINGS);assert.equal(castle.hp,650);
 advanceProjectiles(s,bolt.duration/2,BUILDINGS);assert.equal(castle.hp,625);assert.deepEqual(s.bolts,[]);
});

test('arrows aimed at a dead target disappear without damaging another target',()=>{
 const s=emptyBattle();s.enemies=[soldier('first',18,18),soldier('second',18,19)];
 fireProjectile(s,{x:15,y:18},s.enemies[0],'enemy',100);s.enemies[0].hp=0;
 advanceProjectiles(s,1,BUILDINGS);assert.deepEqual(s.bolts,[]);assert.equal(s.enemies[1].hp,500);
});

test('frame simulation advances economic timers once per second without doubling combat',()=>{
 const initial=initialState();const after=frames(initial,20);
 assert.equal(after.time,1);assert.equal(after.raidIn,59);assert.ok(Math.abs(after.resources.gold-initial.resources.gold-.12)<1e-8);
 assert.ok(Math.abs(after.simTime-1)<1e-8);
 const tick=reducer(initial,{type:'TICK'});assert.deepEqual(after.resources,tick.resources);
});

test('saving during a raid retains sheltered residents and pending projectile damage',()=>{
 let s=initialState();s.raidActive=true;s.enemies=[soldier('target',18,18)];s.villagers.forEach(v=>{v.indoors=true;v.mode='inside';});
 fireProjectile(s,{x:15,y:18},s.enemies[0],'enemy',25);let data;const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};
 saveState(s,storage);s=loadState(storage);assert.equal(s.bolts.length,1);assert.ok(s.villagers.every(v=>v.indoors));
 advanceProjectiles(s,1,BUILDINGS);assert.equal(s.enemies[0].hp,475);
});

test('weighted routing also works when the cheapest path has more grid steps',()=>{
 const route=findWeightedRoute({x:1.5,y:2.5},(_x,_y,x,y)=>x===5&&y===2,new Set(),8,(x,y)=>y===1?.1:1);
 assert.ok(route.path.some(p=>p.y===1.5));assert.ok(route.cost<4);
});

test('hostile archers damage buildings on impact rather than at launch',()=>{
 const s=emptyBattle(),castle=s.buildings[0];s.enemies=[{...soldier('hostile-archer',21.5,19.5,'archer'),cooldown:0}];
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(castle.hp,650);assert.equal(s.bolts.length,1);assert.equal(s.bolts[0].targetKind,'building');
 const duration=s.bolts[0].duration;advanceProjectiles(s,duration-.01,BUILDINGS);assert.equal(castle.hp,650);
 advanceProjectiles(s,.01,BUILDINGS);assert.equal(castle.hp,644);
});

test('soldiers turn north, south, east, and west as their route changes',()=>{
 for(const [cx,cy,x,y,expected]of [[25,18,15.5,19.5,0],[10,18,20.5,19.5,Math.PI],[15,10,16.5,20.5,-Math.PI/2],[15,25,16.5,15.5,Math.PI/2]]){
  const s=emptyBattle();s.buildings=[building('castle',cx,cy)];s.enemies=[soldier('moving',x,y)];combatStep(s,.05,BUILDINGS,UNITS);
  assert.ok(Math.abs(Math.cos(s.enemies[0].facing)-Math.cos(expected))<.01);assert.ok(Math.abs(Math.sin(s.enemies[0].facing)-Math.sin(expected))<.01);
 }
});
