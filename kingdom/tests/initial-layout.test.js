import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,canPlace,BUILDINGS} from '../src/engine.js';

test('every starting building and road follows the current placement rules',()=>{
 const state=initialState();
 assert.equal(state.buildings.some(b=>b.type==='wall'&&b.x===15&&b.y===16),false);
 assert.equal(state.buildings.some(b=>b.type==='wall'&&b.x===15&&b.y===19),true);
 for(const building of state.buildings){
  assert.equal(canPlace(state,building.type,building.x,building.y,building.id),null,`${BUILDINGS[building.type].name} at ${building.x},${building.y}`);
 }
});

test('the starting road network is connected',()=>{
 const roads=initialState().buildings.filter(b=>b.type==='road');
 assert.equal(roads.length,47);
 const positions=new Set(roads.map(b=>`${b.x},${b.y}`));
 const reached=new Set(),pending=[roads[0]];
 while(pending.length){
  const road=pending.pop(),key=`${road.x},${road.y}`;
  if(reached.has(key))continue;
  reached.add(key);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=road.x+dx,y=road.y+dy;
   if(positions.has(`${x},${y}`)&&!reached.has(`${x},${y}`))pending.push({x,y});
  }
 }
 assert.equal(reached.size,positions.size);
});
