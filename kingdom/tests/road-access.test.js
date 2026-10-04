import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,canPlace,reducer} from '../src/engine.js';

test('every building needs an edge-adjacent road, except roads themselves',()=>{
  const s=initialState();s.buildings=[];
  for(const type of Object.keys(BUILDINGS)){
    if(type==='road')assert.equal(canPlace(s,type,15,15),null);
    else assert.match(canPlace(s,type,15,15),/Нужна е пътека/);
  }
});

test('any perimeter tile provides access, but diagonal, distant, destroyed or overlapping roads do not',()=>{
  const s=initialState();
  for(const [x,y] of [[14,15],[14,16],[17,15],[17,16],[15,14],[16,14],[15,17],[16,17]]){
    s.buildings=[building('road',x,y)];assert.equal(canPlace(s,'house',15,15),null);
  }
  for(const [x,y] of [[14,14],[17,17],[17,14],[14,17],[13,15],[15,18]]){
    s.buildings=[building('road',x,y)];assert.match(canPlace(s,'house',15,15),/Нужна е пътека/);
  }
  s.buildings=[{...building('road',14,15),hp:0}];assert.match(canPlace(s,'house',15,15),/Нужна е пътека/);
  s.buildings=[building('road',15,15)];assert.match(canPlace(s,'house',15,15),/заето/);
});

test('rejected construction does not spend resources; building a road enables it',()=>{
  let s=initialState();const resources={...s.resources},count=s.buildings.length;
  s=reducer(s,{type:'BUILD',kind:'house',x:12,y:12});
  assert.deepEqual(s.resources,resources);assert.equal(s.buildings.length,count);assert.equal(s.stats.built,0);
  assert.match(s.notice,/Нужна е пътека/);
  s=reducer(s,{type:'BUILD',kind:'road',x:14,y:12});
  s=reducer(s,{type:'BUILD',kind:'house',x:12,y:12});
  assert.equal(s.buildings.length,count+2);assert.equal(s.stats.built,1);
  assert.equal(s.resources.wood,resources.wood-BUILDINGS.house.cost.wood);
});

test('moving requires access at the destination and keeps the original building on rejection',()=>{
  let s=initialState();const house=s.buildings.find(b=>b.type==='house'),original={...house},resources={...s.resources};
  s=reducer(s,{type:'MOVE',id:house.id,x:12,y:12});
  assert.deepEqual(s.buildings.find(b=>b.id===house.id),original);assert.deepEqual(s.resources,resources);
  s=reducer(s,{type:'BUILD',kind:'road',x:14,y:12});
  s=reducer(s,{type:'MOVE',id:house.id,x:12,y:12});
  assert.equal(s.buildings.find(b=>b.id===house.id).x,12);assert.equal(s.buildings.find(b=>b.id===house.id).y,12);
});

test('roads can be moved without another road nearby',()=>{
  let s=initialState();const road=s.buildings.find(b=>b.type==='road');
  s=reducer(s,{type:'MOVE',id:road.id,x:12,y:12});
  assert.equal(s.buildings.find(b=>b.id===road.id).x,12);
});
