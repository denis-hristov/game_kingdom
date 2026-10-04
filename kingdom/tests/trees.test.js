import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,reducer,production,projectedProduction,cropCapacity,cropCount,cropReady,canPlant,canPlace,saveState,loadState,WHEAT_YIELD,TREE_YIELD} from '../src/engine.js';

function village(type='lumber',level=1,population=11){
 const s=initialState();s.army={swordsman:0,archer:0,guard:0};s.population=population;s.raidIn=181;
 s.buildings=[{...building(type,20,20),level},building('castle',25,20)];return s;
}

test('lumberyards provide 5, 8, 11 tree plots and no passive wood',()=>{
 for(const [level,slots] of [[1,5],[2,8],[3,11]]){
  const s=village('lumber',level);assert.equal(cropCapacity(s.buildings[0]),slots);
  assert.equal(production(s).wood,0);
 }
});

test('trees grow, harvest for five wood, then release their square',()=>{
 let s=village(),id=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});assert.equal(s.crops[0].kind,'tree');
 assert.match(canPlant(s,id,15,15),/засято/);
 assert.match(canPlace(s,'road',15,15),/прибери/);
 for(let i=0;i<44;i++)s=reducer(s,{type:'TICK'});
 const wood=s.resources.wood;s=reducer(s,{type:'HARVEST',id:s.crops[0].id});assert.equal(s.resources.wood,wood);
 s=reducer(s,{type:'TICK'});assert.equal(cropReady(s.crops[0]),true);
 const readyWood=s.resources.wood,cropId=s.crops[0].id;
 s=reducer(s,{type:'HARVEST',id:cropId});assert.equal(s.resources.wood,readyWood+TREE_YIELD);
 assert.equal(cropCount(s,id),0);assert.equal(canPlant(s,id,15,15),null);
});

test('level three lumberyard automatically harvests and replants every 45 seconds with a full team',()=>{
 let s=village('lumber',3),id=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});
 const cropId=s.crops[0].id,wood=s.resources.wood;
 assert.equal(production(s).wood,0);
 assert.equal(projectedProduction(s).wood,TREE_YIELD/45);
 for(let i=0;i<44;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood);
 s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood+TREE_YIELD);
 assert.equal(s.crops[0].id,cropId);
 assert.equal(s.crops[0].progress,0);
 for(let i=0;i<45;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood+TREE_YIELD*2);
 assert.equal(cropCount(s,id),1);
});

test('level three trees grow and auto-harvest at half speed with too few workers',()=>{
 let s=village('lumber',3,0),id=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});
 assert.equal(projectedProduction(s).wood,TREE_YIELD*.5/45);
 const wood=s.resources.wood;
 for(let i=0;i<89;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood);
 s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood+TREE_YIELD);
 assert.equal(s.crops[0].progress,0);
 s.buildings[0].hp=0;
 assert.equal(projectedProduction(s).wood,0);
 for(let i=0;i<90;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.wood,wood+TREE_YIELD);
});

test('level three wheat auto-harvests and replants in the same plot every cycle',()=>{
 let s=village('farm',3),id=s.buildings[0].id;
 s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});const cropId=s.crops[0].id;
 s.population=0;s.resources.food=0;s.time=1;const food=s.resources.food;
 for(let i=0;i<89;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.crops[0].progress,44.5);assert.equal(s.resources.food,food);
 s=reducer(s,{type:'TICK'});assert.equal(s.resources.food,food+WHEAT_YIELD);
 assert.equal(s.crops[0].id,cropId);assert.deepEqual([s.crops[0].x,s.crops[0].y,s.crops[0].progress],[15,15,0]);
 for(let i=0;i<90;i++)s=reducer(s,{type:'TICK'});
 assert.equal(s.resources.food,food+WHEAT_YIELD*2);assert.equal(cropCount(s,id),1);
});

test('tree plots survive save and vanish with their lumberyard',()=>{
 let s=village(),id=s.buildings[0].id;s=reducer(s,{type:'PLANT',farmId:id,x:15,y:15});
 let data;const storage={setItem:(_key,value)=>{data=value;},getItem:()=>data};
 saveState(s,storage);s=loadState(storage);assert.equal(s.crops[0].kind,'tree');
 s=reducer(s,{type:'DEMOLISH',id});assert.equal(s.crops.length,0);
});
