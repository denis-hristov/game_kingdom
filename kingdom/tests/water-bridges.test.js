import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,terrain,canPlace,canPlant,canTerraform,reducer,loadState,saveState} from '../src/engine.js';
import {bridgeLayout,bridgeSprite,bridgePreview,isBridge,onBridge} from '../src/bridges.js';
import {roadCircuit,pointOnCircuit,blockedTiles} from '../src/navigation.js';
import {tilesAlongLine} from '../src/planting.js';

const water=(s,x,y)=>reducer(s,{type:'TERRAFORM',kind:'water',x,y});
const road=(s,x,y)=>reducer(s,{type:'BUILD',kind:'road',x,y});

test('water painting is free, immutable, continuous, and cannot duplicate tiles',()=>{
  const before=initialState();let s=before;
  assert.equal(terrain(12,12,before),'grass');
  for(const tile of tilesAlongLine({x:12,y:12},{x:15,y:12}))s=water(s,tile.x,tile.y);
  assert.equal(s.waterTiles.length,4);
  for(let x=12;x<=15;x++)assert.equal(terrain(x,12,s),'water');
  assert.equal(terrain(12,12,before),'grass');assert.deepEqual(before.waterTiles,[]);
  assert.deepEqual(s.resources,before.resources);assert.deepEqual(s.buildings,before.buildings);
  assert.equal(water(s,12,12).waterTiles.length,4);
});

test('water tools respect territory, tile coordinates, buildings, crops, and natural terrain',()=>{
  const s=initialState(),house=s.buildings.find(b=>b.type==='house');
  for(const [x,y]of [[house.x,house.y],[house.x+1,house.y+1],[11,12],[32,12],[NaN,12],[12.5,12]]){
    const after=water(s,x,y);assert.deepEqual(after.waterTiles,[]);assert.deepEqual(after.buildings,s.buildings);
  }
  s.crops=[{id:'wheat',farmId:s.buildings.find(b=>b.type==='farm').id,x:12,y:12,progress:0}];
  assert.match(canTerraform(s,'water',12,12),/planted plot/);
  s.expansion=3;
  assert.match(canTerraform(s,'water',33,20),/natural river/);
  assert.match(canTerraform(s,'grass',33,20),/natural river/);
  assert.match(canTerraform(s,'water',3,20),/natural river and forest/);
});

test('roads on placed water become usable bridges and pay the road price once',()=>{
  let s=water(initialState(),12,12);const resources={...s.resources};
  s=road(s,12,12);const bridge=s.buildings.find(b=>b.x===12&&b.y===12);
  assert.equal(bridge.type,'road');assert.equal(isBridge(s,bridge),true);
  assert.equal(s.resources.stone,resources.stone-BUILDINGS.road.cost.stone);
  assert.equal(s.notice,'Bridge built.');assert.equal(onBridge(s,12.5,12.5),true);
  const duplicate=road(s,12,12);assert.deepEqual(duplicate.resources,s.resources);
  assert.equal(blockedTiles(s.buildings,BUILDINGS).has('12,12'),false);
});

test('bridges can cross the natural river inside expanded territory',()=>{
  let s=initialState();s.expansion=2;
  assert.equal(terrain(33,20,s),'water');assert.equal(canPlace(s,'road',33,20),null);
  s=road(s,33,20);assert.equal(isBridge(s,s.buildings.at(-1)),true);
  assert.equal(canPlace(s,'wall',34,20),'There is a river or forest here.');
});

test('water prevents planting and buildings whose footprint reaches even one wet tile',()=>{
  const s=water(initialState(),12,12),farm=s.buildings.find(b=>b.type==='farm');
  assert.match(canPlant(s,farm.id,12,12),/empty ground/);
  assert.match(canPlace(s,'house',12,12),/river or forest/);
  assert.match(canPlace(s,'house',11,11),/Outside/);
  const corner=water(s,14,14);assert.match(canPlace(corner,'house',13,13),/river or forest/);
  assert.equal(canPlace(s,'road',12,12),null);
});

test('painting beneath roads and restoring grass converts bridges without duplicating roads',()=>{
  let s=road(initialState(),12,12);const id=s.buildings.at(-1).id,count=s.buildings.length;
  s=water(s,12,12);assert.equal(isBridge(s,s.buildings.find(b=>b.id===id)),true);
  s=reducer(s,{type:'TERRAFORM',kind:'grass',x:12,y:12});
  assert.equal(terrain(12,12,s),'grass');assert.equal(isBridge(s,s.buildings.find(b=>b.id===id)),false);
  assert.equal(s.buildings.length,count);assert.equal(s.waterTiles.length,0);
  assert.match(canTerraform(s,'grass',12,12),/placed water tile/);
});

test('moving or removing a bridge leaves its water in place',()=>{
  let s=road(water(initialState(),12,12),12,12);const id=s.buildings.at(-1).id;
  s=reducer(s,{type:'MOVE',id,x:13,y:12});
  assert.equal(terrain(12,12,s),'water');assert.equal(onBridge(s,12.5,12.5),false);
  assert.equal(isBridge(s,s.buildings.find(b=>b.id===id)),false);
  s=reducer(s,{type:'MOVE',id,x:12,y:12});assert.equal(onBridge(s,12.5,12.5),true);
  s=reducer(s,{type:'DEMOLISH',id});assert.equal(terrain(12,12,s),'water');
  assert.equal(onBridge(s,12.5,12.5),false);
});

test('bridge direction follows cardinal roads, with corners, T junctions, and crossings',()=>{
  const center=building('road',20,20),north=building('road',20,19),south=building('road',20,21),east=building('road',21,20),west=building('road',19,20);
  const horizontal={north:false,east:true,south:false,west:true},vertical={north:true,east:false,south:true,west:false};
  assert.deepEqual(bridgeLayout([center],center),{north:false,east:false,south:false,west:false});
  assert.deepEqual(bridgeLayout([center,north,south],center),vertical);
  assert.deepEqual(bridgeLayout([center,north],center),{north:true,east:false,south:false,west:false});
  assert.deepEqual(bridgeLayout([center,south],center),{north:false,east:false,south:true,west:false});
  assert.deepEqual(bridgeLayout([center,east,west],center),horizontal);
  assert.deepEqual(bridgeLayout([center,east],center),{north:false,east:true,south:false,west:false});
  assert.deepEqual(bridgeLayout([center,west],center),{north:false,east:false,south:false,west:true});
  assert.deepEqual(bridgeLayout([center,north,east],center),{north:true,east:true,south:false,west:false});
  assert.deepEqual(bridgeLayout([center,north,east,west],center),{north:true,east:true,south:false,west:true});
  assert.deepEqual(bridgeLayout([center,north,east,south,west],center),{north:true,east:true,south:true,west:true});
  assert.deepEqual(bridgeLayout([center,{...north,hp:0},east],center),{north:false,east:true,south:false,west:false});
  assert.deepEqual(bridgeLayout([center,{...east,x:21,y:21}],center),{north:false,east:false,south:false,west:false});
});

test('road movement and demolition immediately update the bridge direction',()=>{
  let s=road(road(water(initialState(),13,13),13,13),13,12);
  const bridge=s.buildings.find(b=>b.x===13&&b.y===13),neighbor=s.buildings.find(b=>b.x===13&&b.y===12);
  assert.equal(bridgeLayout(s.buildings,bridge).north,true);
  s=reducer(s,{type:'MOVE',id:neighbor.id,x:14,y:13});
  assert.equal(bridgeLayout(s.buildings,bridge).north,false);assert.equal(bridgeLayout(s.buildings,bridge).east,true);
  s=reducer(s,{type:'DEMOLISH',id:neighbor.id});assert.equal(bridgeLayout(s.buildings,bridge).north,false);
});

test('villager road routes remain continuous across a multi-tile water crossing',()=>{
  let s=initialState();s.buildings=[];
  for(let x=12;x<=16;x++){if(x>12&&x<16)s=water(s,x,12);s=road(s,x,12);}
  const route=roadCircuit(s.buildings);
  assert.equal(new Set(route.map(p=>`${p.x},${p.y}`)).size,5);
  assert.equal(onBridge(s,pointOnCircuit(route,1.5).x,12.5),true);
  assert.equal(onBridge(s,12.5,12.5),false);
  const broken={...s,buildings:s.buildings.map(b=>b.x===14?{...b,hp:0}:b)};
  assert.equal(onBridge(broken,14.5,12.5),false);
});

test('water, bridges, and progress survive saving while legacy and malformed terrain migrate safely',()=>{
  let s=road(water(initialState(),12,12),12,12);s.resources.gold=731;
  let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
  saveState(s,storage);let loaded=loadState(storage);
  assert.deepEqual(loaded.waterTiles,[{x:12,y:12}]);assert.equal(loaded.resources.gold,731);
  assert.equal(onBridge(loaded,12.5,12.5),true);
  delete s.waterTiles;saveState(s,storage);loaded=loadState(storage);
  assert.deepEqual(loaded.waterTiles,[]);assert.equal(loaded.resources.gold,731);
  const house=s.buildings.find(b=>b.type==='house');
  s.waterTiles=[{x:12,y:12},{x:12,y:12},null,{x:NaN,y:12},{x:12.2,y:12},{x:33,y:20},{x:house.x,y:house.y}];
  saveState(s,storage);loaded=loadState(storage);assert.deepEqual(loaded.waterTiles,[{x:12,y:12}]);
  s.waterTiles='invalid';saveState(s,storage);assert.deepEqual(loadState(storage).waterTiles,[]);
});


test('all 16 cardinal bridge layouts use the matching uploaded artwork in map and sidebar',()=>{
  const center=building('road',20,20);
  const variants={
    isolated:[], 'end-n':[[0,-1]], 'end-e':[[1,0]], 'end-s':[[0,1]], 'end-w':[[-1,0]],
    ns:[[0,-1],[0,1]], ew:[[1,0],[-1,0]],
    'corner-ne':[[0,-1],[1,0]], 'corner-es':[[1,0],[0,1]], 'corner-sw':[[0,1],[-1,0]], 'corner-wn':[[-1,0],[0,-1]],
    't-nes':[[0,-1],[1,0],[0,1]], 't-esw':[[1,0],[0,1],[-1,0]], 't-nsw':[[0,-1],[0,1],[-1,0]], 't-new':[[0,-1],[1,0],[-1,0]],
    'cross-nesw':[[0,-1],[1,0],[0,1],[-1,0]],
  };
  for(const [variant,offsets]of Object.entries(variants)){
    const roads=[center,...offsets.map(([dx,dy])=>building('road',center.x+dx,center.y+dy))];
    const layout=bridgeLayout(roads,center);
    assert.equal(bridgeSprite(layout),`bridge-${variant}`);
    assert.equal(bridgePreview(layout),`/assets/buildings/bridge-${variant}.svg`);
  }
});
