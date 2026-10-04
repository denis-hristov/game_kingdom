import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDINGS,initialState,loadState,maxHp,reducer,repairAllCost,repairCost,saveState,upgradeCost} from '../src/engine.js';

test('walls have twice their previous health, including higher levels',()=>{
 const wall=initialState().buildings.find(b=>b.type==='wall');
 assert.equal(BUILDINGS.wall.hp,560);
 assert.equal(BUILDINGS.wall.cost.stone,6);
 assert.equal(wall.hp,560);
 assert.equal(maxHp({...wall,level:2}),896);
 assert.equal(repairCost({...wall,hp:0}),28);
 assert.equal(upgradeCost(wall).stone,6);
});

test('existing saves double wall health once while preserving damage',()=>{
 const old=initialState();delete old.wallHpVersion;
 const walls=old.buildings.filter(b=>b.type==='wall');
 walls[0].hp=280;walls[1].hp=140;walls[2].hp=0;
 let data=JSON.stringify(old);const storage={getItem:()=>data,setItem:(_key,value)=>{data=value;}};
 const migrated=loadState(storage);
 assert.deepEqual(migrated.buildings.filter(b=>b.type==='wall').slice(0,3).map(b=>b.hp),[560,280,0]);
 saveState(migrated,storage);
 assert.deepEqual(loadState(storage).buildings.filter(b=>b.type==='wall').slice(0,3).map(b=>b.hp),[560,280,0]);
});

test('repair all charges the exact combined price and repairs every damaged building',()=>{
 let state=initialState();const wall=state.buildings.find(b=>b.type==='wall'),house=state.buildings.find(b=>b.type==='house');
 wall.hp-=17;house.hp-=25;state.raidRepairPending=true;
 assert.equal(repairCost(wall),1);
 assert.equal(repairCost(house),3);
 assert.deepEqual(repairAllCost(state),{wood:4});
 const wood=state.resources.wood;
 state=reducer(state,{type:'REPAIR_ALL'});
 assert.equal(state.resources.wood,wood-4);
 assert.equal(state.buildings.find(b=>b.id===wall.id).hp,maxHp(wall));
 assert.equal(state.buildings.find(b=>b.id===house.id).hp,maxHp(house));
 assert.equal(state.raidRepairPending,false);
 assert.equal(reducer(state,{type:'REPAIR_ALL'}),state);
});

test('repair all is atomic when wood is insufficient and free when no repairs are needed',()=>{
 let state=initialState();const wall=state.buildings.find(b=>b.type==='wall');
 wall.hp=0;state.raidRepairPending=true;state.resources.wood=0;
 const blocked=reducer(state,{type:'REPAIR_ALL'});
 assert.equal(blocked.buildings.find(b=>b.id===wall.id).hp,0);
 assert.equal(blocked.resources.wood,0);
 assert.equal(blocked.raidRepairPending,true);
 state=initialState();state.raidRepairPending=true;
 state=reducer(state,{type:'REPAIR_ALL'});
 assert.equal(state.raidRepairPending,false);
 assert.deepEqual(repairAllCost(state),{wood:0});
});

test('every defended raid offers repairs and a new raid clears the previous offer',()=>{
 let state=reducer(initialState(),{type:'RAID'});
 state.enemies.forEach(e=>{e.hp=0;});
 state=reducer(state,{type:'TICK'});
 assert.equal(state.enemies.length,0);
 assert.equal(state.raidRepairPending,true);
 state=reducer(state,{type:'RAID'});
 assert.equal(state.raidRepairPending,false);
});
