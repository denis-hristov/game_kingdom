import test from 'node:test';
import assert from 'node:assert/strict';
import {building,initialState,loadState,MARKET_TRADES,marketTrade,production,projectedProduction,reducer,saveState,staffing} from '../src/engine.js';

function village(population=6,level=1){
 const state=initialState();state.army={swordsman:0,archer:0,guard:0};state.population=population;
 state.buildings=[building('market',20,20),building('castle',25,20)];state.raidIn=9999;
 state.buildings[0].level=level;
 state.resources={wood:100,stone:100,food:100,gold:0};
 return state;
}

function tick(state,count){for(let i=0;i<count;i++)state=reducer(state,{type:'TICK'});return state;}

test('each market level uses its own material cost and gold reward every 20 staffed seconds',()=>{
 for(const level of [1,2,3])for(const resource of Object.keys(MARKET_TRADES)){
  let state=village(6,level),id=state.buildings[0].id,trade=marketTrade(state.buildings[0],resource);
  assert.equal(production(state).gold,0.12);
  state=reducer(state,{type:'SET_TRADE',id,resource});
  const starting=state.resources[resource];
  state=tick(state,19);
  assert.ok(Math.abs(state.resources.gold-19*.12)<1e-8);
  state=tick(state,1);
  assert.ok(Math.abs(state.resources.gold-(20*.12+trade.gold))<1e-8);
  const expected=starting-trade.cost-(resource==='food'?20*6/120:0);
  assert.ok(Math.abs(state.resources[resource]-expected)<1e-8);
  assert.equal(state.buildings[0].tradeProgress,0);
 }
});

test('the requested trade prices are exact for all three levels',()=>{
 assert.deepEqual(MARKET_TRADES,{
  food:[{cost:15,gold:1},{cost:25,gold:2},{cost:30,gold:3}],
  wood:[{cost:10,gold:1},{cost:15,gold:2},{cost:20,gold:3}],
  stone:[{cost:5,gold:1},{cost:8,gold:2},{cost:10,gold:3}],
 });
});

test('trade pauses without a worker and skips a deal without enough stock',()=>{
 let state=village(0),id=state.buildings[0].id;
 state.resources.food=0;state=reducer(state,{type:'SET_TRADE',id,resource:'wood'});
 state=tick(state,25);
 assert.equal(staffing(state)[id].assigned,0);
 assert.equal(state.buildings[0].tradeProgress,0);
 assert.ok(Math.abs(state.resources.gold-25*.12)<1e-8);
 state.population=6;state.resources.food=100;state.resources.wood=9;
 state=tick(state,20);
 assert.equal(state.resources.wood,9);
 assert.ok(Math.abs(state.resources.gold-45*.12)<1e-8);
 state.resources.wood=10;
 state=tick(state,20);
 assert.equal(state.resources.wood,0);
 assert.ok(Math.abs(state.resources.gold-(65*.12+1))<1e-8);
});

test('switching or stopping trade resets its timer immediately',()=>{
 let state=village(),id=state.buildings[0].id;
 state=reducer(state,{type:'SET_TRADE',id,resource:'wood'});
 state=tick(state,15);
 state=reducer(state,{type:'SET_TRADE',id,resource:'stone'});
 assert.equal(state.buildings[0].tradeProgress,0);
 state=tick(state,19);assert.equal(state.resources.stone,100);
 state=tick(state,1);assert.equal(state.resources.stone,95);
 state=reducer(state,{type:'SET_TRADE',id,resource:null});
 assert.equal(state.buildings[0].tradeResource,null);
 state=tick(state,40);assert.equal(state.resources.stone,95);
 assert.equal(state.resources.wood,100);
});

test('projected rates include active trades only while staffed and stocked',()=>{
 let state=village(),id=state.buildings[0].id;
 state=reducer(state,{type:'SET_TRADE',id,resource:'food'});
 assert.equal(projectedProduction(state).gold,.12+1/20);
 assert.equal(projectedProduction(state).food,-6/120-15/20);
 state.resources.food=14;
 assert.equal(projectedProduction(state).gold,.12);
 state.resources.food=100;state.population=0;
 assert.equal(projectedProduction(state).gold,.12);
 state.population=6;state.buildings[0].level=3;
 assert.equal(projectedProduction(state).gold,.12+3/20);
 assert.equal(projectedProduction(state).food,-6/120-30/20);
});

test('upgrading an active market applies the new deal to its next trade',()=>{
 let state=village(),market=state.buildings[0],castle=state.buildings[1];
 castle.level=3;state.resources.wood=1000;state.resources.stone=1000;
 state=reducer(state,{type:'SET_TRADE',id:market.id,resource:'food'});
 state=tick(state,19);
 state=reducer(state,{type:'UPGRADE',id:market.id});
 assert.equal(state.buildings[0].level,2);
 assert.equal(state.buildings[0].tradeProgress,19);
 const gold=state.resources.gold,food=state.resources.food;
 state=tick(state,1);
 assert.ok(Math.abs(state.resources.gold-gold-.12-2)<1e-8);
 assert.ok(Math.abs(state.resources.food-food+6/120+25)<1e-8);
});

test('saved markets keep their selection and old saves gain inactive trading fields',()=>{
 let state=village(),id=state.buildings[0].id,data='';
 const storage={getItem:()=>data,setItem:(_key,value)=>{data=value;}};
 delete state.buildings[0].tradeResource;delete state.buildings[0].tradeProgress;
 data=JSON.stringify(state);
 state=loadState(storage);
 assert.equal(state.buildings[0].tradeResource,null);
 assert.equal(state.buildings[0].tradeProgress,0);
 state=reducer(state,{type:'SET_TRADE',id,resource:'stone'});
 state=tick(state,7);
 saveState(state,storage);
 state=loadState(storage);
 assert.equal(state.buildings[0].tradeResource,'stone');
 assert.equal(state.buildings[0].tradeProgress,7);
});
