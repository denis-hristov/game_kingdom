import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,UNITS,reducer,loadState,saveState} from '../src/engine.js';
import {combatStep,advanceProjectiles,clearShot,movementField} from '../src/combat.js';
import {raidRoster,raiderStats} from '../src/units.js';

function battle(){
 const s=initialState();s.buildings=[building('castle',28,18)];s.population=0;s.army={swordsman:0,archer:0,guard:0};s.defenders=[];s.enemies=[];s.villagers=[];
 return s;
}
const soldier=(id,type,x,y)=>({id,type,x,y,hp:1000,maxHp:1000,cooldown:100});
const step=s=>combatStep(s,.05,BUILDINGS,UNITS);

test('every raid includes all three troop types with varied compositions and role-specific health',()=>{
 const compositions=[];
 for(let wave=1;wave<=12;wave++){
  const start=battle();start.raidNumber=wave-1;
  const s=reducer(start,{type:'RAID'}),counts={};
  assert.equal(s.enemies.length,3+wave*2);
  assert.deepEqual(s.enemies.map(u=>u.type),raidRoster(wave));
  for(const type of Object.keys(UNITS)){
   const troops=s.enemies.filter(u=>u.type===type);assert.ok(troops.length>0);counts[type]=troops.length/s.enemies.length;
   for(const unit of troops){assert.equal(unit.hp,raiderStats(type,wave).maxHp);assert.equal(unit.hp,unit.maxHp);}
  }
  assert.ok(raiderStats('archer',wave).maxHp<raiderStats('swordsman',wave).maxHp);
  assert.ok(raiderStats('guard',wave).maxHp>raiderStats('swordsman',wave).maxHp);
  compositions.push(counts);
 }
 assert.ok(compositions[1].archer>compositions[0].archer);
 assert.ok(compositions[2].guard>compositions[0].guard);
});

test('archers and guards deal exactly half swordsman damage at every wave against troops and buildings',()=>{
 for(const wave of [0,1,5,20]){
  const sword=raiderStats('swordsman',wave);
  for(const type of ['archer','guard']){
   assert.equal(UNITS[type].attack,UNITS.swordsman.attack/2);
   const stats=raiderStats(type,wave);assert.equal(stats.attack,sword.attack/2);assert.equal(stats.buildingAttack,sword.buildingAttack/2);
  }
  for(const type of Object.keys(UNITS)){
   const structures=battle();structures.raidNumber=wave;
   structures.enemies=[{...soldier('raider',type,27.5,19.5),cooldown:0}];step(structures);advanceProjectiles(structures,1,BUILDINGS);
   assert.equal(structures.buildings[0].hp,650-raiderStats(type,wave).buildingAttack);
   const troops=battle();troops.raidNumber=wave;
   troops.enemies=[{...soldier('raider',type,20.5,19.5),cooldown:0}];troops.defenders=[soldier('defender','swordsman',21.5,19.5)];
   step(troops);advanceProjectiles(troops,1,BUILDINGS);
   assert.equal(troops.defenders[0].hp,1000-raiderStats(type,wave).attack);
  }
 }
});

test('all raider types destroy successive buildings beside their approach before damaging the castle',()=>{
 for(const type of Object.keys(UNITS)){
  const s=battle(),house=building('house',23,22),farm=building('farm',26,22),castle=s.buildings[0];house.hp=24;farm.hp=24;s.buildings.push(house,farm);
  s.enemies=[{...soldier('raider',type,20.5,19.5),cooldown:0}];
  let frames=0;
  while(house.hp>0&&frames++<1400){step(s);assert.equal(farm.hp,24);assert.equal(castle.hp,650);}
  assert.equal(house.hp,0,`${type} bypassed the first building`);
  while(farm.hp>0&&frames++<2200){step(s);assert.equal(castle.hp,650);}
  assert.equal(farm.hp,0,`${type} bypassed the second building`);
  while(castle.hp===650&&frames++<2600)step(s);
  assert.ok(castle.hp<650,`${type} never resumed the castle assault`);
 }
});

test('archers prioritize nearby buildings even when the castle is already in bow range',()=>{
 const s=battle(),house=building('house',25,21);s.buildings.push(house);s.enemies=[{...soldier('archer','archer',24.5,19.5),cooldown:0}];
 step(s);assert.equal(s.enemies[0].assaultId,house.id);assert.equal(s.bolts[0].targetId,house.id);assert.equal(s.buildings[0].hp,650);
});

test('troops cannot attack through intact walls and can attack after the wall is destroyed',()=>{
 for(const type of Object.keys(UNITS)){
  const s=battle(),wall=building('wall',21,19);s.buildings.push(wall);
  s.enemies=[{...soldier('raider',type,20.75,19.5),cooldown:0}];s.defenders=[soldier('defender','swordsman',22.25,19.5)];
  step(s);advanceProjectiles(s,1,BUILDINGS);assert.equal(s.defenders[0].hp,1000,`${type} hit through a wall`);
  wall.hp=0;s.enemies[0].cooldown=0;step(s);advanceProjectiles(s,1,BUILDINGS);
  assert.ok(s.defenders[0].hp<1000,`${type} failed to use the breach`);
 }
});

test('archers retreat from melee threats while continuing to fire',()=>{
 const s=battle();s.enemies=[{...soldier('archer','archer',20.5,19.5),cooldown:0}];s.defenders=[soldier('defender','swordsman',22,19.5)];
 const separation=()=>Math.hypot(s.enemies[0].x-s.defenders[0].x,s.enemies[0].y-s.defenders[0].y),before=separation();
 step(s);assert.ok(separation()>before);assert.ok(s.bolts.some(b=>b.targetId==='defender'));
 advanceProjectiles(s,1,BUILDINGS);assert.equal(s.defenders[0].hp,995);
});

test('melee raiders engage nearby defenders outside melee range instead of ignoring them',()=>{
 for(const type of ['swordsman','guard']){
  const s=battle();s.enemies=[soldier('raider',type,20.5,19.5)];s.defenders=[soldier('defender','swordsman',20.5,22)];
  step(s);assert.ok(s.enemies[0].y>19.5);assert.equal(s.enemies[0].routeTarget,'unit:defender');
 }
});

test('an interrupted building assault resumes after a nearby defender is defeated',()=>{
 const s=battle(),house=building('house',22,20);s.buildings.push(house);s.enemies=[soldier('raider','guard',20.5,19.5)];
 step(s);assert.equal(s.enemies[0].assaultId,house.id);
 s.defenders=[soldier('defender','swordsman',19,19.5)];step(s);assert.equal(s.enemies[0].assaultId,house.id);
 s.defenders[0].hp=0;step(s);assert.equal(s.enemies[0].routeObjective,house.id);assert.equal(s.buildings[0].hp,650);
});

test('raiders reuse a valid route and recalculate it when the obstacles change',()=>{
 const s=battle();s.enemies=[soldier('raider','swordsman',12.5,19.5)];step(s);const route=s.enemies[0].route;
 for(let i=0;i<80;i++)step(s);
 assert.equal(s.enemies[0].route,route);
 s.buildings.push(building('wall',18,19));step(s);assert.notEqual(s.enemies[0].route,route);
});

test('pursuing defenders update routes when their moving target leaves the planned range',()=>{
 const s=battle();s.enemies=[soldier('raider','guard',12.5,19.5)];s.defenders=[soldier('defender','swordsman',20.5,19.5)];
 step(s);const route=s.defenders[0].route;s.enemies[0].x=13.5;s.enemies[0].y=26.5;
 for(let i=0;i<15;i++)step(s);
 assert.notEqual(s.defenders[0].route,route);
});

test('saving a mixed raid preserves troop roles, health, and chosen building targets',()=>{
 let s=reducer(initialState(),{type:'RAID'});s.enemies.find(u=>u.type==='archer').assaultId=s.buildings.find(b=>b.type==='house').id;
 const troops=s.enemies.map(u=>[u.id,u.type,u.hp,u.maxHp,u.assaultId]);let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
 saveState(s,storage);s=loadState(storage);assert.deepEqual(s.enemies.map(u=>[u.id,u.type,u.hp,u.maxHp,u.assaultId]),troops);
 step(s);assert.ok(s.enemies.every(u=>u.hp>0&&Number.isFinite(u.x)&&Number.isFinite(u.y)));
});

test('line of sight handles diagonal wall corners and exact tile-boundary targets',()=>{
 const s=battle(),wall=building('wall',21,20);s.buildings.push(wall);const field=movementField(s,BUILDINGS);
 assert.equal(clearShot({x:20.5,y:20.5},soldier('target','guard',22.5,22.5),field,BUILDINGS),false);
 wall.hp=0;
 for(const [x,y]of [[22,20],[20,22],[22,22],[20,20]])assert.equal(clearShot({x:21.5,y:21.5},soldier('target','guard',x,y),field,BUILDINGS),true);
});
