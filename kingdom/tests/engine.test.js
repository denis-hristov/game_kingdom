import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,reducer,canPlace,building,BUILDINGS,RAID_SIDES,RAID_SIDE_NAMES,raidSpawnPoint,bounds,terrain,workers,production,power,loadState,saveState,SAVE_KEY,maxHp} from '../src/engine.js';
test('construction pays exactly once and rejects overlap or out-of-bounds placement',()=>{let s=initialState();s.buildings.push(building('road',14,12));const before=s.resources.wood;s=reducer(s,{type:'BUILD',kind:'house',x:12,y:12});assert.equal(s.resources.wood,before-BUILDINGS.house.cost.wood);assert.equal(s.stats.built,1);const count=s.buildings.length;s=reducer(s,{type:'BUILD',kind:'farm',x:13,y:13});assert.equal(s.buildings.length,count);assert.ok(canPlace(s,'house',1,1));assert.ok(canPlace(s,'castle',31,30));});
test('insufficient resources never go negative',()=>{let s=initialState();s.buildings.push(building('road',14,12));s.resources={wood:0,stone:0,gold:0,food:0};const n=s.buildings.length;s=reducer(s,{type:'BUILD',kind:'house',x:12,y:12});assert.equal(s.buildings.length,n);for(let i=0;i<50;i++)s=reducer(s,{type:'TICK'});assert.ok(Object.values(s.resources).every(v=>v>=0));});
test('houses permit immigration and military training reserves residents',()=>{let s=initialState();const original=workers(s);s=reducer(s,{type:'TRAIN',kind:'archer'});assert.equal(workers(s),original-1);assert.equal(s.queue.length,1);for(let i=0;i<12;i++)s=reducer(s,{type:'TICK'});assert.equal(s.army.archer,2);assert.equal(s.queue.length,0);assert.equal(s.stats.trained,1);for(let i=0;i<6;i++)s=reducer(s,{type:'TICK'});assert.equal(s.population,13);});
test('quarries run at half speed without civilians and stop when destroyed',()=>{let s=initialState();s.buildings=[building('quarry',15,15)];s.army={swordsman:0,archer:0,guard:0};s.population=5;assert.equal(production(s).stone,BUILDINGS.quarry.rate);s.population=4;assert.equal(production(s).stone,BUILDINGS.quarry.rate/2);s.buildings[0].hp=0;assert.equal(production(s).stone,0);});
test('upgrades respect castle level; expansion opens new building tiles',()=>{let s=initialState();const house=s.buildings.find(b=>b.type==='house');s=reducer(s,{type:'UPGRADE',id:house.id});assert.equal(s.buildings.find(b=>b.id===house.id).level,1);const castle=s.buildings.find(b=>b.type==='castle');s=reducer(s,{type:'UPGRADE',id:castle.id});assert.equal(s.buildings.find(b=>b.id===castle.id).level,2);s=reducer(s,{type:'UPGRADE',id:house.id});assert.equal(s.buildings.find(b=>b.id===house.id).level,2);s.resources={wood:2000,stone:2000,gold:2000,food:2000};assert.ok(canPlace(s,'house',10,10));s=reducer(s,{type:'UPGRADE',id:castle.id});assert.equal(s.buildings.find(b=>b.id===castle.id).level,3);s=reducer(s,{type:'EXPAND'});s=reducer(s,{type:'BUILD',kind:'road',x:9,y:10});assert.equal(canPlace(s,'house',10,10),null);});
test('expedition removes defenders, pays rewards, and returns troops',()=>{let s=initialState();const originalPower=power(s.army),gold=s.resources.gold;s=reducer(s,{type:'EXPEDITION',camp:0});assert.equal(power(s.army),0);assert.equal(power(s.expedition.army),originalPower);for(let i=0;i<20;i++)s=reducer(s,{type:'TICK'});assert.equal(s.expedition,null);assert.ok(power(s.army)>0);assert.equal(s.stats.victories,1);assert.equal(s.campaign,1);assert.ok(s.resources.gold>=gold+70);});
test('locked and invalid expedition camps are rejected',()=>{const s=initialState();for(const camp of [2,99,-1,0.5])assert.equal(reducer(s,{type:'EXPEDITION',camp}).expedition,null);});
test('raids resolve and prevent moving walls during combat',()=>{const originalRandom=Math.random;let s;try{Math.random=()=>0;s=reducer(initialState(),{type:'RAID'});}finally{Math.random=originalRandom;}assert.equal(s.enemies.length,5);const wall=s.buildings.find(b=>b.type==='wall'),gold=s.resources.gold;const moved=reducer(s,{type:'MOVE',id:wall.id,x:12,y:12});assert.equal(moved.buildings.find(b=>b.id===wall.id).x,wall.x);for(let i=0;i<180&&s.enemies.length;i++)s=reducer(s,{type:'TICK'});assert.equal(s.enemies.length,0);assert.ok(s.resources.gold>=gold+40);assert.ok(Object.values(s.army).every(v=>v>=0));});
test('each map edge can be selected for a raid',()=>{
 const originalRandom=Math.random;
 try{
  for(const expansion of [0,1,2,3])RAID_SIDES.forEach((side,index)=>{
   Math.random=()=>index/4;
   const start=initialState();start.expansion=expansion;
   const s=reducer(start,{type:'RAID'}),area=bounds(s);
   assert.equal(s.raidSide,side);
   assert.match(s.notice,new RegExp(RAID_SIDE_NAMES[side]));
   for(let enemyIndex=0;enemyIndex<s.enemies.length;enemyIndex++){
    const enemy=s.enemies[enemyIndex],point=raidSpawnPoint(s,side,enemyIndex);
    assert.deepEqual({x:enemy.x,y:enemy.y},point);
    const x=Math.floor(enemy.x),y=Math.floor(enemy.y);
    assert.ok(x>=area.min&&x<area.max&&y>=area.min&&y<area.max);
    assert.equal(terrain(x,y),'grass');
    assert.ok(!s.buildings.some(b=>b.type!=='road'&&x>=b.x&&x<b.x+BUILDINGS[b.type].size&&y>=b.y&&y<b.y+BUILDINGS[b.type].size));
    const depth=side==='north'?y-area.min:side==='south'?area.max-1-y:side==='east'?area.max-1-x:x-area.min;
    assert.ok(depth<=4,`${side} at expansion ${expansion} starts too far from owned edge: ${depth}`);
   }
  });
  Math.random=()=>0.75;let s=initialState();s.expansion=3;s.raidIn=1;s=reducer(s,{type:'TICK'});assert.equal(s.raidSide,'west');assert.ok(s.enemies[0].x<bounds(initialState()).min+.5);
 }finally{Math.random=originalRandom;}
});
test('destroyed main castle ends the game permanently until restart',()=>{
 let s=initialState();const castle=s.buildings.find(b=>b.type==='castle');
 s.buildings=[castle];s.army={swordsman:0,archer:0,guard:0};castle.hp=1;
 s=reducer(s,{type:'RAID'});s.enemies=[{id:'attacker',x:22.5,y:19.5,hp:100,maxHp:100}];
 const gold=s.resources.gold;s=reducer(s,{type:'TICK'});
 assert.equal(s.gameOver,true);assert.equal(s.buildings[0].hp,0);
 assert.equal(s.resources.gold,gold+0.12);assert.equal(s.enemies.length,0);
 assert.equal(reducer(s,{type:'TICK'}),s);
 assert.equal(reducer(s,{type:'REPAIR',id:castle.id}),s);
 const storage={value:null,getItem(){return this.value;},setItem(_key,value){this.value=value;}};
 saveState(s,storage);assert.equal(loadState(storage).gameOver,true);
 const restarted=reducer(s,{type:'RESET'});assert.equal(restarted.gameOver,false);assert.equal(restarted.raidNumber,0);
});
test('destroyed castle repairs for free and cannot be demolished',()=>{let s=initialState(),castle=s.buildings.find(b=>b.type==='castle');castle.hp=0;s.resources.wood=0;s=reducer(s,{type:'REPAIR',id:castle.id});assert.equal(s.buildings.find(b=>b.id===castle.id).hp,maxHp(castle));s=reducer(s,{type:'DEMOLISH',id:castle.id});assert.ok(s.buildings.some(b=>b.id===castle.id));});
test('pause freezes time, production, armies and timers',()=>{let s=initialState();s=reducer(s,{type:'PAUSE'});assert.deepEqual(reducer(s,{type:'TICK'}),s);});
test('building hit point totals remain integers at every upgrade level',()=>{for(const [type,def]of Object.entries(BUILDINGS))for(let level=1;level<=def.max;level++)assert.ok(Number.isInteger(maxHp({type,level})));});
test('every building type has a standalone self-contained SVG asset',()=>{for(const type of Object.keys(BUILDINGS)){const svg=readFileSync(new URL(`../public/assets/buildings/${type}.svg`,import.meta.url),'utf8');assert.match(svg,/<svg[^>]+viewBox=/);assert.match(svg,/<\/svg>/);assert.doesNotMatch(svg,/<script|<foreignObject|href=["']https?:/);}});
test('quest rewards cannot be claimed twice',()=>{let s=initialState();s.stats.built=1;s=reducer(s,{type:'CLAIM',index:0});const wood=s.resources.wood;s=reducer(s,{type:'CLAIM',index:0});assert.equal(s.resources.wood,wood);});
test('save roundtrip preserves progress and corrupt saves recover safely',()=>{let value=null;const storage={getItem:()=>value,setItem:(key,v)=>{assert.equal(key,SAVE_KEY);value=v;}};const s=initialState();s.resources.gold=981;assert.equal(saveState(s,storage),true);assert.equal(loadState(storage).resources.gold,981);value='{invalid';assert.equal(loadState(storage).resources.gold,180);value=JSON.stringify({version:1});assert.equal(loadState(storage).resources.gold,180);assert.equal(saveState(s,{setItem(){throw Error('denied');}}),false);});
