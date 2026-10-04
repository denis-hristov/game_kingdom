import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDINGS,initialState,reducer} from '../src/engine.js';
import {blockedTiles,findRoute,moveAlongRoute,roadCircuit,pointOnCircuit} from '../src/navigation.js';

test('villager circuit uses connected road squares and interpolates between neighbours',()=>{
 const state=initialState(),roads=new Set(state.buildings.filter(b=>b.type==='road').map(b=>`${b.x},${b.y}`));
 const route=roadCircuit(state.buildings);
 assert.ok(route.length>roads.size);assert.deepEqual(route[0],route.at(-1));
 for(let i=1;i<route.length;i++){
  assert.ok(roads.has(`${route[i].x},${route[i].y}`));
  assert.equal(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].y-route[i-1].y),1);
  const midway=pointOnCircuit(route,i-.5);
  assert.equal(midway.x,(route[i-1].x+route[i].x+1)/2);
  assert.equal(midway.y,(route[i-1].y+route[i].y+1)/2);
 }
});

test('villagers stay on the largest road component after roads are removed',()=>{
 const roads=[{type:'road',x:1,y:1,hp:1},{type:'road',x:2,y:1,hp:1},{type:'road',x:3,y:1,hp:1},{type:'road',x:10,y:10,hp:1}];
 const route=roadCircuit(roads);
 assert.equal(route.length,5);
 assert.ok(route.every(point=>point.y===1));
 assert.deepEqual(roadCircuit([]),[]);
});

test('troops can cross unpaved ground but route around walls and buildings',()=>{
 const obstacles=blockedTiles([{type:'wall',x:11,y:10},{type:'house',x:12,y:9}],BUILDINGS);
 const result=findRoute({x:10.5,y:10.5},(_px,_py,x,y)=>x===14&&y===10,obstacles,20);
 assert.ok(result);
 assert.ok(result.path.length>5);
 assert.ok(result.path.every(point=>!obstacles.has(`${Math.floor(point.x)},${Math.floor(point.y)}`)));
 const troop={x:10.5,y:10.5};
 for(let i=0;i<30&&Math.hypot(troop.x-14.5,troop.y-10.5)>.01;i++){
  const next=findRoute(troop,(_px,_py,x,y)=>x===14&&y===10,obstacles,20);
  moveAlongRoute(troop,next.path,.55);
  assert.equal(obstacles.has(`${Math.floor(troop.x)},${Math.floor(troop.y)}`),false);
 }
 assert.ok(Math.hypot(troop.x-14.5,troop.y-10.5)<.01);
});

test('raid soldiers and attackers never cross occupied tiles during smooth movement',()=>{
 const random=Math.random;
 try{
  for(let side=0;side<4;side++){
   Math.random=()=>side/4;
   let state=reducer(initialState(),{type:'RAID'});
   for(let tick=0;tick<120&&state.enemies.length;tick++){
    state=reducer(state,{type:'TICK'});
    const blocked=blockedTiles(state.buildings,BUILDINGS);
    for(const unit of [...state.defenders,...state.enemies])for(let step=0;step<=10;step++){
     const fraction=step/10;
     const x=(unit.prevX??unit.x)+(unit.x-(unit.prevX??unit.x))*fraction;
     const y=(unit.prevY??unit.y)+(unit.y-(unit.prevY??unit.y))*fraction;
     assert.equal(blocked.has(`${Math.floor(x)},${Math.floor(y)}`),false);
    }
   }
   assert.equal(state.enemies.length,0);
  }
 }finally{Math.random=random;}
});
