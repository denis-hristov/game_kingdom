import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,reducer,capacity,staffing,workers,loadState,saveState} from '../src/engine.js';
import {stepZoom} from '../src/camera.js';
import {wallSprites} from '../src/walls.js';
import {changeSound} from '../src/sound.js';

test('removing houses reduces excess residents and reconciles assigned workers',()=>{
 let s=initialState();s.population=capacity(s);
 const houses=s.buildings.filter(b=>b.type==='house');
 for(const house of houses){
  s=reducer(s,{type:'DEMOLISH',id:house.id});
  assert.equal(s.population,capacity(s));
  assert.ok(Object.values(staffing(s)).reduce((n,a)=>n+a.assigned,0)<=workers(s));
 }
 assert.equal(s.population,6);assert.equal(s.army.swordsman,2);
});
test('losing a house during combat also releases excess residents',()=>{
 let s=initialState();s.population=capacity(s);s.army={swordsman:0,archer:0,guard:0};
 const house=s.buildings.find(b=>b.type==='house');house.hp=1;
 s.enemies=[{id:'enemy',x:house.x+.5,y:house.y+.5,hp:1000,maxHp:1000}];
 s=reducer(s,{type:'TICK'});assert.equal(s.buildings.find(b=>b.id===house.id).hp,0);assert.equal(s.population,capacity(s));
});
test('removing a house cannot orphan soldiers and recruits',()=>{
 let s=initialState();s.buildings=s.buildings.filter(b=>b.type!=='house'||b===s.buildings.find(v=>v.type==='house'));
 const house=s.buildings.find(b=>b.type==='house');s.army.swordsman=8;s.population=10;
 const after=reducer(s,{type:'DEMOLISH',id:house.id});assert.equal(after.buildings.length,s.buildings.length);assert.equal(after.population,10);
});
test('old saves with excess population are repaired without resetting the village',()=>{
 const s=initialState();s.population=240;s.resources.wood=731;let data='';
 const storage={setItem:(_key,value)=>{data=value;},getItem:()=>data};saveState(s,storage);
 const loaded=loadState(storage);assert.equal(loaded.population,capacity(loaded));assert.equal(loaded.resources.wood,731);
});
test('projectiles are cleared after the last enemy and during quiet ticks',()=>{
 let s=initialState();s.army={swordsman:0,archer:0,guard:0};s.population=6;
 s.buildings=[building('castle',21,18),building('tower',20,22)];
 s.enemies=[{id:'target',x:22,y:22,hp:19,maxHp:19}];s.raidNumber=1;
 s=reducer(s,{type:'FRAME',dt:.05});assert.equal(s.bolts.length,1);assert.equal(s.bolts[0].firedAt,s.simTime);assert.equal(s.enemies[0].hp,19);
 s=reducer(s,{type:'TICK'});s=reducer(s,{type:'TICK'});assert.equal(s.enemies.length,0);assert.deepEqual(s.bolts,[]);
 s.bolts=[{from:{x:0,y:0},to:{x:1,y:1}}];s=reducer(s,{type:'TICK'});assert.deepEqual(s.bolts,[]);
});
test('zoom steps reach exactly 100% from both directions and stay bounded',()=>{
 assert.equal(stepZoom(.9,1),1);assert.equal(stepZoom(1.1,-1),1);
 assert.equal(stepZoom(.95,1),1.1);assert.equal(stepZoom(1.04,-1),.9);
 assert.equal(stepZoom(.4,-1),.4);assert.equal(stepZoom(1.8,1),1.8);
 let zoom=1;for(let i=0;i<6;i++)zoom=stepZoom(zoom,-1);for(let i=0;i<6;i++)zoom=stepZoom(zoom,1);assert.equal(zoom,1);
});
test('walls follow vertical and horizontal neighbors in either construction order',()=>{
 const wall=building('wall',20,20),north=building('wall',20,19),south=building('wall',20,21),east=building('wall',21,20);
 assert.deepEqual(wallSprites([wall],wall),['wall']);
 for(const neighbor of [north,south]){
  assert.deepEqual(wallSprites([wall,neighbor],wall),['wall-vertical']);assert.deepEqual(wallSprites([neighbor,wall],neighbor),['wall-vertical']);
 }
 assert.deepEqual(wallSprites([wall,east],wall),['wall']);
 assert.deepEqual(wallSprites([wall,north,east],wall),['wall','wall-vertical']);
 north.hp=0;assert.deepEqual(wallSprites([wall,north],wall),['wall']);
});
test('construction sounds follow successful changes and do not play for failed actions or ticks',()=>{
 const before=initialState(),road=building('road',12,12);
 assert.equal(changeSound(before,{...before,buildings:[...before.buildings,road]}),'road');
 assert.equal(changeSound(before,{...before,notice:'Not enough resources.'}),null);
 assert.equal(changeSound(before,{...before,time:1}),null);
});
