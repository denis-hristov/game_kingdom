import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,canPlace,reducer,saveState,loadState,maxHp} from '../src/engine.js';
import {gateSprite,wallSprites} from '../src/walls.js';
import {spriteUrl} from '../src/sprites.js';
import {roadCircuit,blockedTiles} from '../src/navigation.js';

const build=(s,kind,x,y)=>reducer(s,{type:'BUILD',kind,x,y});

test('building a wall over a road creates a gate, keeps the road, and charges only the wall price',()=>{
  const before=build(initialState(),'road',12,12),resources={...before.resources};
  assert.equal(canPlace(before,'wall',12,12),null);
  const s=build(before,'wall',12,12),gate=s.buildings.at(-1);
  assert.equal(s.buildings.length,before.buildings.length+1);
  assert.equal(s.buildings.filter(b=>b.x===12&&b.y===12).length,2);
  assert.deepEqual(s.resources,{...resources,stone:resources.stone-BUILDINGS.wall.cost.stone});
  assert.equal(s.notice,'Castle gate built.');assert.equal(gateSprite(s.buildings,gate),'gate-path-ns');
  assert.deepEqual(wallSprites(s.buildings,gate),['gate-path-ns']);
  assert.match(canPlace(s,'wall',12,12),/occupied/);assert.match(canPlace(s,'road',12,12),/occupied/);
  assert.deepEqual(before.resources,resources);
});

test('a road can be built or moved under an existing wall, but other overlaps and water gates are rejected',()=>{
  let s=build(build(initialState(),'road',13,12),'wall',12,12),wall=s.buildings.at(-1);
  assert.equal(gateSprite(s.buildings,wall),null);
  s=build(s,'road',12,12);assert.equal(gateSprite(s.buildings,wall),'gate-path-ew');
  const road=s.buildings.at(-1);s=reducer(s,{type:'MOVE',id:road.id,x:12,y:13});
  assert.equal(gateSprite(s.buildings,wall),null);
  s=reducer(s,{type:'MOVE',id:road.id,x:12,y:12});assert.equal(gateSprite(s.buildings,wall),'gate-path-ew');
  assert.match(canPlace(s,'house',12,12),/occupied/);
  s=reducer(s,{type:'TERRAFORM',kind:'water',x:14,y:12});s=build(s,'road',14,12);
  assert.match(canPlace(s,'wall',14,12),/river or forest/);
});

test('gate direction follows the path, breaks ties using the wall line, and uses all three upgraded appearances',()=>{
  const wall=building('wall',20,20),under=building('road',20,20),north=building('road',20,19),east=building('road',21,20);
  assert.equal(gateSprite([wall,under,north],wall),'gate-path-ns');
  assert.equal(gateSprite([wall,under,east],wall),'gate-path-ew');
  assert.equal(gateSprite([wall,under,north,east,building('wall',20,21)],wall),'gate-path-ew');
  assert.equal(gateSprite([wall,under,north,east,building('wall',21,20)],wall),'gate-path-ns');
  assert.equal(gateSprite([wall,{...under,hp:0},north],wall),null);
  assert.equal(gateSprite([wall,under,{...north,x:21,y:19}],wall),'gate-path-ns');
  for(let level=1;level<=3;level++)for(const direction of ['ns','ew'])assert.equal(spriteUrl(`gate-path-${direction}`,level),`/assets/buildings/gate-path-${direction}-level-0${level}.svg`);
});

test('moving and removing gate layers updates artwork without deleting the other layer',()=>{
  let s=initialState();for(let x=12;x<=14;x++)s=build(s,'road',x,12);
  s=build(s,'wall',13,12);const wall=s.buildings.at(-1),under=s.buildings.find(b=>b.type==='road'&&b.x===13&&b.y===12);
  assert.equal(new Set(roadCircuit(s.buildings.filter(b=>b.y===12)).map(p=>`${p.x},${p.y}`)).size,3);
  assert.equal(blockedTiles(s.buildings,BUILDINGS).has('13,12'),true);
  s=reducer(s,{type:'MOVE',id:wall.id,x:14,y:12});assert.equal(gateSprite(s.buildings,s.buildings.find(b=>b.id===wall.id)),'gate-path-ew');
  assert.ok(s.buildings.some(b=>b.id===under.id));
  s=reducer(s,{type:'DEMOLISH',id:wall.id});assert.ok(s.buildings.some(b=>b.id===under.id));
  s=build(s,'wall',13,12);const nextWall=s.buildings.at(-1);
  s=reducer(s,{type:'DEMOLISH',id:under.id});assert.equal(gateSprite(s.buildings,nextWall),null);
  assert.ok(s.buildings.some(b=>b.id===nextWall.id));
});

test('gate upgrades, damage, and the underlying road survive saving without changing wall defense',()=>{
  let s=build(build(initialState(),'road',12,12),'wall',12,12),wall=s.buildings.at(-1);
  s.buildings.find(b=>b.type==='castle').level=3;s.resources={wood:999,stone:999,gold:999,food:999};
  s=reducer(s,{type:'UPGRADE',id:wall.id});s=reducer(s,{type:'UPGRADE',id:wall.id});
  s.buildings.find(b=>b.id===wall.id).hp-=23;
  let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};saveState(s,storage);
  const loaded=loadState(storage),gate=loaded.buildings.find(b=>b.id===wall.id);
  assert.equal(gate.level,3);assert.equal(gate.hp,maxHp(gate)-23);
  assert.equal(gateSprite(loaded.buildings,gate),'gate-path-ns');
  assert.equal(loaded.buildings.filter(b=>b.x===12&&b.y===12).length,2);
});
