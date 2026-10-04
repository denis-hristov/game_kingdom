import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,loadState,RAID_BASE_REWARD,RAID_INTERVAL_SECONDS,raidReward,reducer,saveState} from '../src/engine.js';

test('automatic raids begin every 60 seconds and manual raids begin immediately',()=>{
 let state=initialState();
 assert.equal(state.raidIn,60);
 for(let i=0;i<59;i++)state=reducer(state,{type:'TICK'});
 assert.equal(state.enemies.length,0);
 assert.equal(state.raidIn,1);
 state=reducer(state,{type:'TICK'});
 assert.equal(state.raidNumber,1);
 assert.equal(state.enemies.length,5);
 assert.equal(state.raidIn,RAID_INTERVAL_SECONDS);
 const repeated=reducer(state,{type:'RAID'});
 assert.equal(repeated.raidNumber,1);
 state=initialState();
 state=reducer(state,{type:'RAID'});
 assert.equal(state.raidNumber,1);
 assert.equal(state.raidIn,60);
 assert.equal(state.enemies.length,5);
});

test('victory rewards all four resources and grows each wave by two percent',()=>{
 assert.deepEqual(raidReward(1),RAID_BASE_REWARD);
 assert.deepEqual(raidReward(2),{gold:41,wood:31,stone:15,food:20});
 assert.deepEqual(raidReward(3),{gold:42,wood:31,stone:16,food:21});
 let state=initialState();
 state.buildings=state.buildings.filter(b=>b.type==='castle');
 state.population=0;state.army={swordsman:0,archer:0,guard:0};
 for(const wave of [1,2,3]){
  state=reducer(state,{type:'RAID'});
  assert.equal(state.raidNumber,wave);
  state.enemies.forEach(enemy=>{enemy.hp=0;});
  const before={...state.resources};
  state=reducer(state,{type:'TICK'});
  const reward=raidReward(wave);
  assert.equal(state.enemies.length,0);
  assert.equal(state.resources.gold,before.gold+.12+reward.gold);
  for(const resource of ['wood','stone','food'])assert.equal(state.resources[resource],before[resource]+reward[resource]);
  assert.match(state.notice,new RegExp(`\\+${reward.gold} злато`));
 }
});

test('old saved countdowns are shortened to one minute without resetting progress',()=>{
 const state=initialState();state.raidIn=185;state.resources.wood=731;
 let data='';const storage={getItem:()=>data,setItem:(_key,value)=>{data=value;}};
 saveState(state,storage);
 const loaded=loadState(storage);
 assert.equal(loaded.raidIn,RAID_INTERVAL_SECONDS);
 assert.equal(loaded.resources.wood,731);
});
