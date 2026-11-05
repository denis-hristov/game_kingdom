import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,UNITS,loadState,saveState} from '../src/engine.js';
import {combatStep,advanceProjectiles,movementField,UNIT_RADIUS} from '../src/combat.js';
import {walkablePoint} from '../src/navigation.js';

const soldier=(id,type,x,y,cooldown=0)=>({id,type,x,y,hp:1000,maxHp:1000,cooldown});
const step=s=>combatStep(s,.05,BUILDINGS,UNITS);
function enclosure(type='swordsman'){
 const s=initialState();s.buildings=[building('castle',28,25)];s.villagers=[];
 s.population=1;s.army={swordsman:0,archer:0,guard:0};s.army[type]=1;
 s.defenders=[soldier('defender',type,26.5,19.5)];s.enemies=[soldier('attacker','swordsman',19.5,19.5,1000)];
 for(let y=0;y<44;y++)s.buildings.push(building('wall',21,y));
 return s;
}
function advance(s,frames){
 const positions=new Map(s.enemies.map(e=>[e.id,{x:e.x,y:e.y}]));
 for(let i=0;i<frames;i++){
  for(const enemy of s.enemies)Object.assign(enemy,positions.get(enemy.id),{cooldown:1000});
  step(s);
 }
}

test('all defender roles detect attackers through intact walls and start moving immediately',()=>{
 for(const type of Object.keys(UNITS)){
  const s=enclosure(type);step(s);
  assert.equal(s.defenders[0].targetId,'attacker');
  assert.ok(s.defenders[0].route.length>0,`${type} has no approach route`);
  assert.ok(s.defenders[0].x<26.5,`${type} waited for the wall to break`);
  assert.ok(s.buildings.filter(b=>b.type==='wall').every(b=>b.hp===560));
 }
});

test('defending archers shoot over intact friendly walls and apply damage on impact',()=>{
 const s=enclosure('archer');s.defenders[0].x=23.5;s.enemies[0].x=20.5;
 step(s);assert.equal(s.bolts.length,1);assert.equal(s.bolts[0].targetKind,'enemy');assert.equal(s.bolts[0].targetId,'attacker');assert.equal(s.enemies[0].hp,1000);
 advanceProjectiles(s,1,BUILDINGS);assert.equal(s.enemies[0].hp,1000-UNITS.archer.attack);
 assert.ok(s.buildings.filter(b=>b.type==='wall').every(b=>b.hp===560));
});

test('buildings still block defending archers while their targets remain detected',()=>{
 const s=enclosure('archer');s.defenders[0].x=24.5;s.enemies[0].x=20.5;s.buildings.push(building('house',22,18));
 step(s);assert.equal(s.defenders[0].targetId,'attacker');assert.equal(s.bolts.length,0);assert.equal(s.enemies[0].hp,1000);
 assert.ok(s.defenders[0].route.length>1);assert.ok(s.defenders[0].y!==19.5||s.defenders[0].x!==24.5);
});

test('enclosed melee defenders approach the threat without damaging walls and advance when a breach opens',()=>{
 for(const type of ['swordsman','guard']){
  const s=enclosure(type);advance(s,220);const defender=s.defenders[0],field=movementField(s,BUILDINGS);
  assert.ok(defender.x<23,`${type} stayed away from the threatened wall`);assert.ok(defender.x>=22+UNIT_RADIUS);
  assert.equal(defender.routePartial,true);assert.equal(defender.targetId,'attacker');assert.equal(s.enemies[0].hp,1000);
  assert.ok(walkablePoint(defender.x,defender.y,UNIT_RADIUS,field.blocked,44));
  assert.ok(s.buildings.filter(b=>b.type==='wall').every(b=>b.hp===560));
  s.buildings.find(b=>b.type==='wall'&&b.y===19).hp=0;advance(s,160);
  assert.ok(s.defenders[0].x<22);assert.ok(s.enemies[0].hp<1000);assert.equal(s.defenders[0].routePartial,false);
 }
});

test('allied melee troops can leave through an intact friendly gate before a wall is broken',()=>{
 for(const type of ['swordsman','guard']){
  const s=enclosure(type);s.enemies[0].x=18.5;s.buildings.push(building('road',21,19));
  const gate=s.buildings.find(b=>b.type==='wall'&&b.y===19);advance(s,400);
  assert.ok(s.defenders[0].x<21,`${type} failed to leave through the gate`);assert.ok(s.enemies[0].hp<1000);assert.equal(gate.hp,560);
  assert.ok(s.buildings.filter(b=>b.type==='wall').every(b=>b.hp===560));
 }
});

test('friendly gate access does not allow hostile troops through an intact gate',()=>{
 const s=enclosure();s.defenders=[];s.enemies[0].x=20.5;s.buildings.push(building('road',21,19));
 const gate=s.buildings.find(b=>b.type==='wall'&&b.y===19);
 for(let i=0;i<120;i++)step(s);
 assert.ok(s.enemies[0].x<=21-UNIT_RADIUS);assert.equal(gate.hp,560);
});

test('defenders pursue a reachable attacker instead of waiting on a closer unreachable one',()=>{
 const s=enclosure();s.defenders[0].x=24.5;s.enemies[0].x=20.5;s.enemies.push(soldier('reachable','guard',30.5,19.5,1000));
 step(s);assert.equal(s.defenders[0].targetId,'reachable');assert.equal(s.defenders[0].routeTarget,'unit:reachable');assert.ok(s.defenders[0].x>24.5);
});

test('defenders track an attacker moving along the other side of a closed wall',()=>{
 const s=enclosure();step(s);const original=s.defenders[0].route;
 s.enemies[0].y=25.5;advance(s,20);
 assert.notEqual(s.defenders[0].route,original);assert.equal(s.defenders[0].route.at(-1).y,25.5);assert.equal(s.defenders[0].targetId,'attacker');
});

test('loading a battle resumes the detected threat and the approach inside intact walls',()=>{
 let s=enclosure();step(s);let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
 saveState(s,storage);s=loadState(storage);const x=s.defenders[0].x;step(s);
 assert.equal(s.defenders[0].targetId,'attacker');assert.ok(s.defenders[0].route.length>0);assert.ok(s.defenders[0].x<x);
});
