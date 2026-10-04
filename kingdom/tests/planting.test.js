import test from 'node:test';
import assert from 'node:assert/strict';
import {readyCropAt,tilesAlongLine} from '../src/planting.js';
import {initialState,reducer,cropCapacity,cropCount,canPlant,WHEAT_GROW_SECONDS,WHEAT_YIELD,TREE_YIELD} from '../src/engine.js';

test('dragging across tiles includes both ends and does not skip fast movement',()=>{
 assert.deepEqual(tilesAlongLine({x:13,y:13},{x:17,y:13}),[
  {x:13,y:13},{x:14,y:13},{x:15,y:13},{x:16,y:13},{x:17,y:13},
 ]);
 assert.deepEqual(tilesAlongLine({x:17,y:13},{x:14,y:16}),[
  {x:17,y:13},{x:16,y:14},{x:15,y:15},{x:14,y:16},
 ]);
 assert.deepEqual(tilesAlongLine({x:14,y:16},{x:14,y:16}),[{x:14,y:16}]);
});

test('drag paths plant wheat and trees only on available tiles up to each owner capacity',()=>{
 for(const type of ['farm','lumber']){
  let state=initialState();
  const owner=state.buildings.find(b=>b.type===type);
  for(const tile of tilesAlongLine({x:12,y:12},{x:23,y:12}))state=reducer(state,{type:'PLANT',farmId:owner.id,...tile});
  assert.equal(cropCount(state,owner.id),cropCapacity(owner));
  assert.equal(new Set(state.crops.map(c=>`${c.x},${c.y}`)).size,state.crops.length);
  assert.ok(state.crops.every(c=>c.kind===(type==='farm'?'wheat':'tree')));
 }
});

test('harvest drag takes each ready wheat and tree once and skips unripe crops',()=>{
 let state=initialState();
 const farm=state.buildings.find(b=>b.type==='farm');
 const lumber=state.buildings.find(b=>b.type==='lumber');
 for(const [farmId,x] of [[farm.id,12],[farm.id,13],[farm.id,14],[lumber.id,15]])state=reducer(state,{type:'PLANT',farmId,x,y:12});
 for(const crop of state.crops)if(crop.x!==13)crop.progress=WHEAT_GROW_SECONDS;
 const food=state.resources.food,wood=state.resources.wood,harvested=new Set();
 const sweep=[...tilesAlongLine({x:12,y:12},{x:16,y:12}),...tilesAlongLine({x:16,y:12},{x:12,y:12})];
 for(const tile of sweep){
  const crop=readyCropAt(state,tile);
  if(crop&&!harvested.has(crop.id)){harvested.add(crop.id);state=reducer(state,{type:'HARVEST',id:crop.id});}
 }
 assert.equal(state.resources.food,food+WHEAT_YIELD*2);
 assert.equal(state.resources.wood,wood+TREE_YIELD);
 assert.equal(state.crops.length,1);
 assert.equal(state.crops[0].x,13);
 assert.equal(readyCropAt(state,{x:13,y:12}),null);
});

test('harvest drag ignores ripe crops whose owner is destroyed',()=>{
 let state=initialState();const farm=state.buildings.find(b=>b.type==='farm');
 state=reducer(state,{type:'PLANT',farmId:farm.id,x:12,y:12});
 state.crops[0].progress=WHEAT_GROW_SECONDS;
 state.buildings.find(b=>b.id===farm.id).hp=0;
 assert.equal(readyCropAt(state,{x:12,y:12}),null);
});

test('removing planted squares affects only the selected farm or lumberyard and grants no resources',()=>{
 let state=initialState();const farm=state.buildings.find(b=>b.type==='farm'),lumber=state.buildings.find(b=>b.type==='lumber');
 state=reducer(state,{type:'PLANT',farmId:farm.id,x:12,y:12});
 state=reducer(state,{type:'PLANT',farmId:lumber.id,x:13,y:12});
 state=reducer(state,{type:'PLANT',farmId:lumber.id,x:14,y:12});
 const resources={...state.resources},foreign=state.crops.find(c=>c.farmId===farm.id);
 assert.equal(reducer(state,{type:'REMOVE_CROP',farmId:lumber.id,id:foreign.id}),state);
 for(const tile of tilesAlongLine({x:12,y:12},{x:14,y:12})){
  const crop=state.crops.find(c=>c.farmId===lumber.id&&c.x===tile.x&&c.y===tile.y);
  if(crop)state=reducer(state,{type:'REMOVE_CROP',farmId:lumber.id,id:crop.id});
 }
 assert.equal(cropCount(state,lumber.id),0);
 assert.equal(cropCount(state,farm.id),1);
 assert.deepEqual(state.resources,resources);
 assert.equal(canPlant(state,lumber.id,13,12),null);
});

test('removed level-three plots do not regrow automatically',()=>{
 let state=initialState(),lumber=state.buildings.find(b=>b.type==='lumber');
 state.raidIn=91;
 lumber.level=3;
 state=reducer(state,{type:'PLANT',farmId:lumber.id,x:12,y:12});
 state=reducer(state,{type:'REMOVE_CROP',farmId:lumber.id,id:state.crops[0].id});
 const wood=state.resources.wood;
 for(let i=0;i<90;i++)state=reducer(state,{type:'TICK'});
 assert.equal(cropCount(state,lumber.id),0);
 assert.equal(state.resources.wood,wood);
});
