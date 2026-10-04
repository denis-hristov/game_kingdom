import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reducer,building,production,projectedProduction,cropCapacity,cropCount,cropReady,canPlant,loadState,saveState,SAVE_KEY,WHEAT_GROW_SECONDS,WHEAT_YIELD} from '../src/engine.js';

function farmVillage(level=1,population=5){
 const s=initialState();s.army={swordsman:0,archer:0,guard:0};s.population=population;
 s.buildings=[{...building('farm',20,20),level},building('castle',25,20)];return s;
}

test('farms give 5, 8 and 11 plot slots without automatic food production',()=>{
 for(const [level,capacity] of [[1,5],[2,8],[3,11]]){
  const s=farmVillage(level,11);assert.equal(cropCapacity(s.buildings[0]),capacity);
  assert.equal(production(s).food,-11/120);
 }
});

test('displayed food rate includes level three automatic harvest and population consumption',()=>{
 let s=farmVillage(3,11),id=s.buildings[0].id;
 assert.equal(projectedProduction(s).food,-11/120);
 s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});
 assert.equal(production(s).food,-11/120);
 assert.equal(projectedProduction(s).food,-11/120+WHEAT_YIELD/45);
 s.buildings[0].hp=0;
 assert.equal(projectedProduction(s).food,-11/120);
});

test('planting each plot uses one slot, respects territory, and rejects occupied squares',()=>{
 let s=farmVillage();const farmId=s.buildings[0].id;
 for(let i=0;i<5;i++)s=reducer(s,{type:'PLANT',farmId,x:15+i,y:15});
 assert.equal(cropCount(s,farmId),5);
 const full=s;assert.match(canPlant(s,farmId,15,16),/Всички квадратчета/);
 s=reducer(s,{type:'PLANT',farmId,x:15,y:16});assert.equal(s.crops.length,5);assert.deepEqual(s.resources,full.resources);
 assert.match(canPlant(s,farmId,20,20),/сграда/);
 assert.match(canPlant(s,farmId,15,15),/засято/);
 assert.match(canPlant(s,farmId,11,11),/владението/);
});

test('full team ripens wheat in 45 ticks; harvest gives exactly 5 food once and frees plot',()=>{
 let s=farmVillage();const farmId=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId,x:15,y:15});const cropId=s.crops[0].id;
 for(let i=0;i<WHEAT_GROW_SECONDS-1;i++)s=reducer(s,{type:'TICK'});
 assert.equal(cropReady(s.crops[0]),false);
 const before=s.resources.food;s=reducer(s,{type:'HARVEST',id:cropId});assert.equal(s.resources.food,before);
 s=reducer(s,{type:'TICK'});assert.equal(cropReady(s.crops[0]),true);
 const food=s.resources.food;s=reducer(s,{type:'HARVEST',id:cropId});
 assert.equal(s.resources.food,food+WHEAT_YIELD);assert.equal(cropCount(s,farmId),0);
 assert.equal(canPlant(s,farmId,15,15),null);
 s=reducer(s,{type:'HARVEST',id:cropId});assert.equal(s.resources.food,food+WHEAT_YIELD);
});

test('understaffed farm needs 90 ticks, ruined farm freezes crops, pause freezes them too',()=>{
 let s=farmVillage(1,0),farmId=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId,x:15,y:15});
 for(let i=0;i<45;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.crops[0].progress,22.5);
 s.buildings[0].hp=0;for(let i=0;i<10;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.crops[0].progress,22.5);
 s.buildings[0].hp=100;s=reducer(s,{type:'PAUSE'});s=reducer(s,{type:'TICK'});
 assert.equal(s.crops[0].progress,22.5);
});

test('upgrading one farm expands only its own plot limit, removing it removes its crops',()=>{
 let s=farmVillage();const farmId=s.buildings[0].id;
 for(let i=0;i<5;i++)s=reducer(s,{type:'PLANT',farmId,x:15+i,y:15});
 s.buildings.find(b=>b.type==='castle').level=2;
 s.resources={wood:2000,stone:2000,food:2000,gold:2000};
 s=reducer(s,{type:'UPGRADE',id:farmId});assert.equal(cropCapacity(s.buildings[0]),8);
 s=reducer(s,{type:'PLANT',farmId,x:15,y:16});assert.equal(cropCount(s,farmId),6);
 s=reducer(s,{type:'DEMOLISH',id:farmId});assert.equal(s.crops.length,0);
});

test('old saves gain empty crop array and new saves retain growth',()=>{
 let data='';const storage={getItem:key=>{assert.equal(key,SAVE_KEY);return data;},setItem:(key,value)=>{assert.equal(key,SAVE_KEY);data=value;}};
 const old=initialState();delete old.crops;data=JSON.stringify(old);
 assert.deepEqual(loadState(storage).crops,[]);
 let s=initialState(),farmId=s.buildings.find(b=>b.type==='farm').id;
 s=reducer(s,{type:'PLANT',farmId,x:13,y:13});s=reducer(s,{type:'TICK'});
 assert.equal(saveState(s,storage),true);
 const loaded=loadState(storage);assert.equal(loaded.crops.length,1);assert.equal(loaded.crops[0].progress,s.crops[0].progress);
});
