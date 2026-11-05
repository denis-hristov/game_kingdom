import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,requiredWorkers,staffing,production,reducer,workers,freeWorkers,loadState,saveState} from '../src/engine.js';

function village(type='quarry',level=1,population=8){
 const s=initialState();s.army={swordsman:0,archer:0,guard:0};s.population=population;
 s.buildings=[{...building(type,15,15),level},building('castle',21,18)];s.buildings[1].level=3;return s;
}
function assign(s,id,count){for(let i=0;i<count;i++)s=reducer(s,{type:'ASSIGN_WORKER',id,delta:1});return s;}

test('new workshops start empty and produce nothing until manually staffed',()=>{
 for(const type of ['lumber','quarry','farm','market']){
  const s=village(type),b=s.buildings[0],a=staffing(s)[b.id];
  assert.equal(a.assigned,0);assert.equal(a.efficiency,0);assert.equal(a.rate,0);
  assert.equal(freeWorkers(s),workers(s));
 }
});
test('teams need 5, 8 and 11 workers and a nonempty partial team works at half speed',()=>{
 for(const type of ['lumber','quarry','farm'])for(const level of [1,2,3]){
  const required=5+(level-1)*3;
  let s=village(type,level,required+2),id=s.buildings[0].id;
  assert.equal(requiredWorkers(s.buildings[0]),required);
  s=assign(s,id,1);assert.equal(staffing(s)[id].efficiency,.5);
  s=assign(s,id,required-1);assert.equal(staffing(s)[id].efficiency,1);
  assert.equal(staffing(s)[id].rate,(BUILDINGS[type].rate||0)*level);
  const extra=reducer(s,{type:'ASSIGN_WORKER',id,delta:1});assert.equal(staffing(extra)[id].assigned,required);
 }
});
test('workers can be released and reassigned without being allocated twice',()=>{
 let s=village('quarry',1,2),id=s.buildings[0].id;
 const market=building('market',18,15);s.buildings.push(market);
 s=assign(s,id,2);assert.equal(freeWorkers(s),0);
 s=reducer(s,{type:'ASSIGN_WORKER',id:market.id,delta:1});assert.equal(staffing(s)[market.id].assigned,0);
 s=reducer(s,{type:'ASSIGN_WORKER',id,delta:-1});s=assign(s,market.id,1);
 assert.equal(staffing(s)[id].assigned,1);assert.equal(staffing(s)[market.id].assigned,1);assert.equal(freeWorkers(s),0);
 s=reducer(s,{type:'ASSIGN_WORKER',id,delta:-1});s=reducer(s,{type:'ASSIGN_WORKER',id,delta:-1});assert.equal(staffing(s)[id].assigned,0);
});
test('upgrades keep the existing team and immigration does not assign newcomers',()=>{
 let s=village('quarry',1,5),id=s.buildings[0].id;s=assign(s,id,5);
 s=reducer(s,{type:'UPGRADE',id});assert.equal(staffing(s)[id].required,8);assert.equal(staffing(s)[id].assigned,5);
 const stone=s.resources.stone;s.time=17;s=reducer(s,{type:'TICK'});
 assert.ok(Math.abs(s.resources.stone-stone-BUILDINGS.quarry.rate)<1e-9);
 assert.equal(s.population,6);assert.equal(staffing(s)[id].assigned,5);assert.equal(freeWorkers(s),1);
});
test('destroyed buildings release their team and repairing does not silently reassign it',()=>{
 let s=village('quarry',1,5),id=s.buildings[0].id;s=assign(s,id,5);s.buildings[0].hp=0;
 s=reducer(s,{type:'TICK'});assert.equal(staffing(s)[id].assigned,0);assert.equal(production(s).stone,0);assert.equal(freeWorkers(s),5);
 s=reducer(s,{type:'REPAIR',id});assert.equal(staffing(s)[id].assigned,0);
});
test('training requires a free resident and reserves them without taking an assigned worker',()=>{
 let s=village('quarry',1,5),id=s.buildings[0].id;s.buildings.push(building('barracks',25,20));s=assign(s,id,5);
 s=reducer(s,{type:'TRAIN',kind:'archer'});assert.equal(s.queue.length,0);
 s=reducer(s,{type:'ASSIGN_WORKER',id,delta:-1});s=reducer(s,{type:'TRAIN',kind:'archer'});
 assert.equal(s.queue.length,1);assert.equal(staffing(s)[id].assigned,4);assert.equal(freeWorkers(s),0);
});
test('old saves migrate their previous automatic teams once and manual assignments survive reload',()=>{
 const old=initialState();delete old.staffingVersion;for(const b of old.buildings)delete b.assignedWorkers;
 let data=JSON.stringify(old);const storage={getItem:()=>data,setItem:(_key,value)=>{data=value;}};
 let s=loadState(storage),farms=s.buildings.filter(b=>b.type==='farm');
 assert.deepEqual(farms.map(b=>staffing(s)[b.id].assigned),[5,3]);
 s=reducer(s,{type:'ASSIGN_WORKER',id:farms[0].id,delta:-1});
 saveState(s,storage);s=loadState(storage);
 assert.deepEqual(farms.map(b=>staffing(s)[b.id].assigned),[4,3]);assert.equal(freeWorkers(s),1);
});
test('invalid assignments cannot create residents or change non-workshop buildings',()=>{
 const s=village(),id=s.buildings[0].id;
 for(const delta of [0,2,-2,.5,NaN])assert.equal(reducer(s,{type:'ASSIGN_WORKER',id,delta}),s);
 assert.equal(reducer(s,{type:'ASSIGN_WORKER',id:s.buildings[1].id,delta:1}),s);
 assert.equal(reducer(s,{type:'ASSIGN_WORKER',id:'missing',delta:1}),s);
});

test('unstaffed plots neither grow nor automatically harvest mature crops',()=>{
 let s=village('lumber',3,5),id=s.buildings[0].id;
 s.crops=[{id:'growing',farmId:id,kind:'tree',x:13,y:13,progress:12},{id:'ready',farmId:id,kind:'tree',x:14,y:13,progress:45}];
 const wood=s.resources.wood;s=reducer(s,{type:'TICK'});
 assert.deepEqual(s.crops.map(c=>c.progress),[12,45]);assert.equal(s.resources.wood,wood);
 s=assign(s,id,1);s=reducer(s,{type:'TICK'});
 assert.deepEqual(s.crops.map(c=>c.progress),[12.5,0]);assert.equal(s.resources.wood,wood+5);
});
