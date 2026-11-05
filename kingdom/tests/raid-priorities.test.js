import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,building,BUILDINGS,UNITS,loadState,saveState} from '../src/engine.js';
import {combatStep} from '../src/combat.js';

function scenario(){
 const s=initialState();s.buildings=[building('castle',28,18)];s.population=0;s.army={swordsman:0,archer:0,guard:0};s.villagers=[];
 s.enemies=[{id:'raider',type:'swordsman',x:20.5,y:19.5,hp:1000,maxHp:1000}];
 return s;
}

test('raiders stop at a building beside an open road before attacking the castle',()=>{
 const s=scenario(),castle=s.buildings[0],house=building('house',22,20);s.buildings.push(house);
 for(let x=20;x<28;x++)s.buildings.push(building('road',x,19));
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(s.enemies[0].assaultId,house.id);
 let steps=0;
 while(house.hp>0&&steps++<600){combatStep(s,.05,BUILDINGS,UNITS);assert.equal(castle.hp,650);}
 assert.equal(house.hp,0);
 for(let i=0;i<600;i++)combatStep(s,.05,BUILDINGS,UNITS);
 assert.ok(castle.hp<650);
});

test('successive buildings on the approach are destroyed in order before the castle',()=>{
 const s=scenario(),castle=s.buildings[0],first=building('house',22,20),second=building('farm',25,20);first.hp=24;second.hp=24;s.buildings.push(first,second);
 let steps=0;
 while(first.hp>0&&steps++<400){combatStep(s,.05,BUILDINGS,UNITS);assert.equal(second.hp,24);assert.equal(castle.hp,650);}
 assert.equal(first.hp,0);
 while(second.hp>0&&steps++<800){combatStep(s,.05,BUILDINGS,UNITS);assert.equal(castle.hp,650);}
 assert.equal(second.hp,0);
 for(let i=0;i<400;i++)combatStep(s,.05,BUILDINGS,UNITS);
 assert.ok(castle.hp<650);
});

test('a chosen structure remains the target even when the castle becomes closer',()=>{
 const s=scenario(),castle=s.buildings[0],house=building('house',22,20);house.hp=1000;s.buildings.push(house);
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(s.enemies[0].assaultId,house.id);
 s.enemies[0].x=27.5;s.enemies[0].y=19.5;s.enemies[0].repath=0;
 for(let i=0;i<240;i++){combatStep(s,.05,BUILDINGS,UNITS);assert.equal(castle.hp,650);assert.equal(s.enemies[0].assaultId,house.id);}
 assert.ok(house.hp<1000);
});

test('saving during an assault preserves the building priority',()=>{
 let s=scenario();const house=building('house',22,20);s.buildings.push(house);
 combatStep(s,.05,BUILDINGS,UNITS);let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
 saveState(s,storage);s=loadState(storage);assert.equal(s.enemies[0].assaultId,house.id);
 combatStep(s,.05,BUILDINGS,UNITS);assert.equal(s.enemies[0].routeObjective,house.id);assert.equal(s.buildings[0].hp,650);
});

test('raiders use an existing breach rather than stripping intact wall segments beside it',()=>{
 const s=scenario();s.enemies[0].x=20.5;s.enemies[0].y=19.5;
 const above=building('wall',22,18),below=building('wall',22,20),rubble=building('wall',22,19);rubble.hp=0;s.buildings.push(above,below,rubble);
 for(let i=0;i<300;i++)combatStep(s,.05,BUILDINGS,UNITS);
 assert.ok(s.enemies[0].x>24);assert.equal(above.hp,560);assert.equal(below.hp,560);
});
