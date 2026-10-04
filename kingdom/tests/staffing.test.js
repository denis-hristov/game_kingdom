import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,requiredWorkers,staffing,production,reducer,workers} from '../src/engine.js';

function village(type,level,population){const s=initialState();s.army={swordsman:0,archer:0,guard:0};s.population=population;s.buildings=[{...building(type,15,15),level}];return s;}
test('all three workshops require 5, 8 and 11 workers with exact half/full thresholds',()=>{
  for(const type of ['lumber','quarry','farm'])for(const level of [1,2,3]){
    const required=5+(level-1)*3;
    for(const population of [0,required-1,required,required+2]){
      const s=village(type,level,population),b=s.buildings[0],a=staffing(s)[b.id];
      assert.equal(requiredWorkers(b),required);assert.equal(a.assigned,Math.min(population,required));
      assert.equal(a.efficiency,population>=required?1:0.5);
      assert.equal(a.rate,(BUILDINGS[type].rate||0)*level*a.efficiency);
      if(type==='farm')assert.equal(production(s).food,-population/120);
      else if(type==='lumber')assert.equal(production(s).wood,0);
      else assert.equal(production(s)[BUILDINGS[type].production],a.rate);
    }
  }
});
test('workers are allocated once in construction order, including partial teams',()=>{
  const s=village('lumber',1,8);s.buildings.push(building('quarry',18,15));s.buildings.push(building('farm',21,15));
  const assignments=s.buildings.map(b=>staffing(s)[b.id]);
  assert.deepEqual(assignments.map(a=>a.assigned),[5,3,0]);assert.deepEqual(assignments.map(a=>a.efficiency),[1,.5,.5]);
  assert.equal(assignments.reduce((n,a)=>n+a.assigned,0),workers(s));
});
test('destroyed workshops release their workers and never produce',()=>{
  const s=village('lumber',1,5);s.buildings[0].hp=0;s.buildings.push(building('quarry',18,15));
  const a=staffing(s);assert.equal(a[s.buildings[0].id].assigned,0);assert.equal(production(s).wood,0);assert.equal(a[s.buildings[1].id].efficiency,1);
});
test('market still needs one worker and stops completely without one',()=>{
  for(const n of [0,1]){const s=village('market',3,n),a=staffing(s)[s.buildings[0].id];assert.equal(a.required,1);assert.equal(a.efficiency,n);}
});
test('soldiers, expedition troops and training reservations cannot staff workshops',()=>{
  const s=village('lumber',1,8);s.army.swordsman=2;s.queue=[{type:'archer'}];s.expedition={army:{swordsman:1,archer:0,guard:0}};
  assert.equal(staffing(s)[s.buildings[0].id].assigned,4);assert.equal(staffing(s)[s.buildings[0].id].efficiency,.5);
  s.queue=[];assert.equal(staffing(s)[s.buildings[0].id].efficiency,1);
});
test('upgrading immediately raises staffing demand and the tick uses reduced production',()=>{
  let s=village('quarry',1,5);s.buildings.push({...building('castle',21,18),level:3});
  const id=s.buildings[0].id;s=reducer(s,{type:'UPGRADE',id});
  assert.equal(staffing(s)[id].required,8);assert.equal(staffing(s)[id].efficiency,.5);
  const stone=s.resources.stone;s=reducer(s,{type:'TICK'});assert.ok(Math.abs(s.resources.stone-stone-BUILDINGS.quarry.rate)<1e-9);
  s.population=8;assert.equal(staffing(s)[id].efficiency,1);
});
