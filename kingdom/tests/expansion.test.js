import test from 'node:test';
import assert from 'node:assert/strict';
import {bounds,initialState,reducer,requiredCastleLevelForExpansion} from '../src/engine.js';

test('each land expansion requires castle levels three, four and five',()=>{
 for(let expansion=0;expansion<3;expansion++){
  const requiredLevel=expansion+3;
  assert.equal(requiredCastleLevelForExpansion(expansion),requiredLevel);
  for(let level=1;level<=5;level++){
   let state=initialState();
   state.expansion=expansion;
   state.buildings.find(b=>b.type==='castle').level=level;
   state.resources={wood:5000,stone:5000,gold:5000,food:5000};
   const before={...state.resources},oldBounds=bounds(state);
   state=reducer(state,{type:'EXPAND'});
   if(level<requiredLevel){
    assert.equal(state.expansion,expansion);
    assert.deepEqual(state.resources,before);
    assert.deepEqual(bounds(state),oldBounds);
    assert.match(state.notice,new RegExp(`ниво ${requiredLevel}`));
   }else{
    assert.equal(state.expansion,expansion+1);
    assert.equal(state.resources.wood,before.wood-150*(expansion+1));
    assert.equal(state.resources.stone,before.stone-100*(expansion+1));
    assert.equal(state.resources.gold,before.gold-80*(expansion+1));
    assert.equal(state.resources.food,before.food);
    assert.equal(bounds(state).min,oldBounds.min-3);
   }
  }
 }
});

test('land cannot expand beyond the third purchase',()=>{
 let state=initialState();state.expansion=3;
 state.buildings.find(b=>b.type==='castle').level=5;
 const before={...state.resources};
 state=reducer(state,{type:'EXPAND'});
 assert.equal(state.expansion,3);
 assert.deepEqual(state.resources,before);
});
