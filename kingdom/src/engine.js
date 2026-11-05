import {blockedTiles} from './navigation.js';
import {gateSprite} from './walls.js';
import {combatStep,formationSlots} from './combat.js';
import {UNITS,raidRoster,raiderStats} from './units.js';
export {UNITS} from './units.js';
import {updateVillagers} from './villagers.js';
import {translateLegacyMessage} from './legacy-messages.js';

import {SIZE,terrain,baseTerrain,normalizeWaterTiles} from './terrain.js';
export {SIZE,terrain} from './terrain.js';
export const WHEAT_GROW_SECONDS = 45;
export const WHEAT_YIELD = 5;
export const TREE_YIELD = 5;
export const MARKET_TRADE_SECONDS = 20;
export const RAID_INTERVAL_SECONDS = 60;
export const RAID_BASE_REWARD = {gold:40,wood:30,stone:15,food:20};
export function raidReward(wave){const multiplier=1.02**Math.max(0,wave-1);return Object.fromEntries(Object.entries(RAID_BASE_REWARD).map(([resource,amount])=>[resource,Math.round(amount*multiplier)]));}
export const MARKET_TRADES = {
  food:[{cost:15,gold:1},{cost:25,gold:2},{cost:30,gold:3}],
  wood:[{cost:10,gold:1},{cost:15,gold:2},{cost:20,gold:3}],
  stone:[{cost:5,gold:1},{cost:8,gold:2},{cost:10,gold:3}],
};
export function marketTrade(market,resource){return MARKET_TRADES[resource]?.[market.level-1]||null;}
export const SAVE_KEY = 'oakvale.v1';
export const RESOURCES = ['wood', 'stone', 'food', 'gold'];
export const NAMES = {wood:'Wood',stone:'Stone',food:'Food',gold:'Gold'};
export const BUILDINGS = {
  castle:{name:'Main castle',desc:'The heart of your kingdom. Upgrades unlock higher building levels and territory expansions.',size:3,cost:{},hp:650,max:5},
  house:{name:'House',desc:'A home for 6 residents per level. A new resident arrives every 18 seconds if food is available.',size:2,cost:{wood:55,stone:15},hp:150,max:3},
  farm:{name:'Farm',desc:'Provides 5 wheat plots at level 1 and 3 more per upgrade. Mature wheat yields 5 food. At level 3, crops are harvested and replanted automatically. Understaffing halves growth speed.',size:2,cost:{wood:45,gold:15},hp:130,max:3},
  lumber:{name:'Lumberyard',desc:'Provides 5 tree plots at level 1 and 3 more per upgrade. Each mature tree yields 5 wood. At level 3, trees are harvested and replanted automatically. Understaffing halves growth speed.',size:2,cost:{wood:40,stone:10},hp:160,max:3},
  quarry:{name:'Quarry',desc:'Produces 18 stone per minute per level. Requires 5 workers at level 1 and 3 more per upgrade. Understaffing halves production.',size:2,cost:{wood:65,gold:25},hp:200,max:3,production:'stone',rate:0.3},
  market:{name:'Market',desc:'Choose food, wood, or stone to sell. With an assigned worker, completes one trade every 20 seconds. Higher levels sell more goods for more gold. Switch goods or stop trading at any time.',size:2,cost:{wood:80,stone:35},hp:170,max:3},
  barracks:{name:'Barracks',desc:'Trains unassigned residents as swordsmen, archers, and guards. Upgrades speed up training.',size:2,cost:{wood:90,stone:60,gold:35},hp:240,max:3},
  wall:{name:'Castle wall',desc:'Slows enemies and absorbs damage. Connects to adjacent walls. Place over a road on dry ground to create a gate.',size:1,cost:{stone:6},hp:560,max:3},
  tower:{name:'Watchtower',desc:'Fires at enemies within 7 tiles. Each upgrade increases damage.',size:1,cost:{wood:35,stone:65,gold:20},hp:300,max:3},
  road:{name:'Road',desc:'Connects your village. Residents and soldiers can travel along it. Roads placed on water become bridges and follow neighboring roads.',size:1,cost:{stone:2},hp:1,max:1},
};
export const CAMPS = [
  {name:'Raider Camp',desc:'Careless raiders near the old mill.',power:30,reward:{wood:100,stone:60,gold:70,food:60}},
  {name:'Iron Pass',desc:'A guarded pass high in the mountains.',power:100,reward:{wood:180,stone:160,gold:140,food:120}},
  {name:'Black Fortress',desc:'The last stronghold of the northern ruler.',power:220,reward:{wood:300,stone:250,gold:300,food:180}},
];
export function building(type,x,y,id=crypto.randomUUID()) {return {id,type,x,y,level:1,hp:BUILDINGS[type].hp,...(requiredWorkers({type,level:1})?{assignedWorkers:0}:{}),...(type==='market'?{tradeResource:null,tradeProgress:0}:{})};}
export function bounds(s){const r=10+(s.expansion||0)*3;return {min:22-r,max:22+r};}
export function capacity(s){return 6+s.buildings.filter(b=>b.type==='house'&&b.hp>0).reduce((n,b)=>n+6*b.level,0);}
export function military(s){return Object.values(s.army).reduce((a,b)=>a+b,0)+(s.expedition?Object.values(s.expedition.army).reduce((a,b)=>a+b,0):0);}
export function workers(s){return Math.max(0,s.population-military(s)-s.queue.length);}
export function requiredWorkers(b){
  if(['farm','lumber','quarry'].includes(b.type))return 5+(b.level-1)*3;
  return b.type==='market'?1:0;
}
export function staffing(s){
  let available=workers(s);const assignments={};
  for(const b of s.buildings){
    const required=requiredWorkers(b);if(!required)continue;
    const requested=Number.isInteger(b.assignedWorkers)?Math.max(0,b.assignedWorkers):0;
    const assigned=b.hp>0?Math.min(required,requested,available):0;
    available-=assigned;
    const efficiency=!assigned?0:assigned===required?1:b.type==='market'?0:0.5;
    assignments[b.id]={required,assigned,efficiency,rate:(BUILDINGS[b.type].rate||0)*b.level*efficiency};
  }
  return assignments;
}
export function freeWorkers(s){return Math.max(0,workers(s)-Object.values(staffing(s)).reduce((n,a)=>n+a.assigned,0));}
export function buildingOccupancy(s){
 // The castle supplies six base slots; houses fill in construction order.
 const assignments=staffing(s),occupancy={};let residents=Math.max(0,Math.floor(s.population)-6);
 for(const b of s.buildings){
  if(b.hp<=0)continue;
  if(b.type==='house'){
   const capacity=6*b.level,occupied=Math.min(capacity,residents);
   occupancy[b.id]={occupied,capacity};residents-=occupied;
  }else if(assignments[b.id]){
   const {assigned,required}=assignments[b.id];occupancy[b.id]={occupied:assigned,capacity:required};
  }
 }
 return occupancy;
}
function normalizeStaffing(s){
 const assignments=staffing(s);
 for(const b of s.buildings)if(assignments[b.id])b.assignedWorkers=assignments[b.id].assigned;
}
function migrateStaffing(s){
 let available=workers(s);
 for(const b of s.buildings){
  const required=requiredWorkers(b);if(!required)continue;
  const assigned=b.hp>0?Math.min(required,available):0;
  b.assignedWorkers=assigned;available-=assigned;
 }
 s.staffingVersion=1;
}
function reconcileHousing(s){s.population=Math.max(military(s)+s.queue.length,Math.min(s.population,capacity(s)));}
export function production(s){
  const assignments=staffing(s),rates={wood:0,stone:0,food:-s.population/120,gold:0.12};
  for(const b of s.buildings)if(assignments[b.id]&&BUILDINGS[b.type].production)rates[BUILDINGS[b.type].production]+=assignments[b.id].rate;
  return rates;
}
export function cropCapacity(owner){return 5+(owner.level-1)*3;}
export function cropCount(s,ownerId){return (s.crops||[]).filter(c=>c.farmId===ownerId).length;}
export function projectedProduction(s){
 const rates=production(s),assignments=staffing(s);
 const available={...s.resources};
 for(const b of s.buildings){
  if(b.hp<=0)continue;
  if(b.level>=3&&['farm','lumber'].includes(b.type)){
   const resource=b.type==='farm'?'food':'wood';
   rates[resource]+=cropCount(s,b.id)*(b.type==='farm'?WHEAT_YIELD:TREE_YIELD)*(assignments[b.id]?.efficiency||0)/WHEAT_GROW_SECONDS;
  }
  const trade=b.type==='market'?marketTrade(b,b.tradeResource):null;
  if(trade&&assignments[b.id]?.efficiency===1&&available[b.tradeResource]>=trade.cost){
   available[b.tradeResource]-=trade.cost;
   rates[b.tradeResource]-=trade.cost/MARKET_TRADE_SECONDS;
   rates.gold+=trade.gold/MARKET_TRADE_SECONDS;
  }
 }
 return rates;
}
export function cropReady(c){return c.progress>=WHEAT_GROW_SECONDS;}
export function canPlant(s,ownerId,x,y){
  const owner=s.buildings.find(b=>b.id===ownerId&&['farm','lumber'].includes(b.type)&&b.hp>0);
  if(!owner)return 'Select an operational farm or lumberyard.';
  if(!Number.isInteger(x)||!Number.isInteger(y))return 'Select a map tile.';
  const limit=bounds(s);
  if(x<limit.min||y<limit.min||x>=limit.max||y>=limit.max||terrain(x,y,s)!=='grass')return 'Plant on empty ground within your territory.';
  if(s.buildings.some(b=>x>=b.x&&x<b.x+BUILDINGS[b.type].size&&y>=b.y&&y<b.y+BUILDINGS[b.type].size))return 'A building or road already occupies this tile.';
  if((s.crops||[]).some(c=>c.x===x&&c.y===y))return 'This plot is already planted.';
  if(cropCount(s,ownerId)>=cropCapacity(owner))return 'All plots are occupied. Harvest mature crops or upgrade the building.';
  return null;
}
export function power(army){return Object.entries(army).reduce((n,[k,v])=>n+UNITS[k].power*v,0);}
export function maxHp(b){return Math.round(BUILDINGS[b.type].hp*(1+(b.level-1)*0.6));}
export function repairCost(b){return b.type==='castle'&&b.hp===0?0:Math.ceil(Math.max(0,maxHp(b)-b.hp)/(b.type==='wall'?20:10));}
export function repairAllCost(s){return {wood:s.buildings.reduce((sum,b)=>sum+(b.hp<maxHp(b)?repairCost(b):0),0)};}
export function upgradeCost(b){return b.type==='castle'?{wood:180*b.level,stone:140*b.level,gold:100*b.level}:Object.fromEntries(Object.entries(BUILDINGS[b.type].cost).map(([k,v])=>[k,Math.ceil(v*b.level*0.85)]));}
export const EXPANSIONS=[3,4,5].map((castleLevel,index)=>({castleLevel,cost:{wood:150*(index+1),stone:100*(index+1),gold:80*(index+1)}}));
export function requiredCastleLevelForExpansion(expansion){return EXPANSIONS[expansion]?.castleLevel??null;}
export function canAfford(s,cost){return Object.entries(cost).every(([k,v])=>s.resources[k]>=v);}
function pay(s,cost){for(const [k,v] of Object.entries(cost))s.resources[k]-=v;}
function log(s,message){s.logs=[{id:crypto.randomUUID(),message,time:s.time},...s.logs].slice(0,12);s.notice=message;}
export function canPlace(s,type,x,y,ignoreId){
  const size=BUILDINGS[type].size,b=bounds(s);
  if(x<b.min||y<b.min||x+size>b.max||y+size>b.max)return 'Outside your territory. Expand your domain.';
  for(let yy=y;yy<y+size;yy++)for(let xx=x;xx<x+size;xx++)if(terrain(xx,yy,s)!=='grass'&&(type!=='road'||terrain(xx,yy,s)!=='water'))return 'There is a river or forest here.';
  if(s.buildings.some(other=>other.id!==ignoreId&&!(x===other.x&&y===other.y&&((type==='wall'&&other.type==='road')||(type==='road'&&other.type==='wall')))&&x<other.x+BUILDINGS[other.type].size&&x+size>other.x&&y<other.y+BUILDINGS[other.type].size&&y+size>other.y))return 'This location is already occupied.';
  if((s.crops||[]).some(c=>c.x>=x&&c.x<x+size&&c.y>=y&&c.y<y+size))return 'Harvest the crops here first.';
  if(type!=='road'&&!s.buildings.some(road=>{
    if(road.type!=='road'||road.hp<=0||road.id===ignoreId)return false;
    const beside=(road.x===x-1||road.x===x+size)&&road.y>=y&&road.y<y+size;
    const aboveOrBelow=(road.y===y-1||road.y===y+size)&&road.x>=x&&road.x<x+size;
    return beside||aboveOrBelow||(type==='wall'&&road.x===x&&road.y===y);
  }))return 'A road is required next to the building. Place a road along at least one side.';
  return null;
}
export function canTerraform(s,kind,x,y){
  if(!['water','grass'].includes(kind)||!Number.isInteger(x)||!Number.isInteger(y))return 'Select a map tile.';
  const area=bounds(s);
  if(x<area.min||y<area.min||x>=area.max||y>=area.max)return 'Shape terrain within your territory.';
  if(baseTerrain(x,y)!=='grass')return 'The natural river and forest cannot be reshaped.';
  if(s.buildings.some(b=>b.type!=='road'&&x>=b.x&&y>=b.y&&x<b.x+BUILDINGS[b.type].size&&y<b.y+BUILDINGS[b.type].size))return 'Move or remove the building first.';
  if((s.crops||[]).some(c=>c.x===x&&c.y===y))return 'Clear the planted plot first.';
  if(kind==='water'&&terrain(x,y,s)==='water')return 'There is already water here.';
  if(kind==='grass'&&terrain(x,y,s)!=='water')return 'Select a placed water tile to restore grass.';
  return null;
}
export function initialState(){
 const s={version:1,wallHpVersion:2,staffingVersion:1,time:0,resources:{wood:330,stone:280,food:240,gold:180},population:12,army:{swordsman:2,archer:1,guard:1},queue:[],buildings:[],crops:[],waterTiles:[],expansion:0,raidIn:RAID_INTERVAL_SECONDS,raidNumber:0,raidSide:null,raidRepairPending:false,gameOver:false,enemies:[],defenders:[],bolts:[],villagers:[],raidActive:false,simTime:0,frameRemainder:0,simulationVersion:2,expedition:null,campaign:0,logs:[],notice:'Welcome to Oakvale.',quest:0,claimed:[],stats:{built:0,trained:0,victories:0},savedAt:Date.now()};
 const entries=[['castle',21,18],['house',17,18],['house',25,20],['house',18,24],['farm',26,24],['farm',29,24],['lumber',16,24],['quarry',29,18],['barracks',25,16],['market',22,25],['tower',16,16],['tower',29,28]];
 for(const [t,x,y]of entries)s.buildings.push(building(t,x,y));
 for(let x=17;x<=28;x++)if(x!==22&&x!==23)s.buildings.push(building('wall',x,15));
 for(let y=16;y<21;y++)if(y!==16)s.buildings.push(building('wall',15,y));
 const roads=new Set(),addRoad=(x,y)=>roads.add(`${x},${y}`);
 const segments=[
  [23,14,28,14],[23,15,23,17],[17,16,22,16],[16,17,17,17],
  [24,17,24,17],[16,18,16,23],[28,19,28,27],[24,22,27,22],
  [17,23,24,23],[23,24,23,24],[29,27,29,27],
 ];
 for(const [fromX,fromY,toX,toY]of segments)for(let y=fromY;y<=toY;y++)for(let x=fromX;x<=toX;x++)addRoad(x,y);
 let available=workers(s);
 for(const b of s.buildings.filter(b=>['farm','lumber','quarry','market'].includes(b.type))){const assigned=Math.min(b.type==='market'?1:2,available);b.assignedWorkers=assigned;available-=assigned;}
 for(const position of roads){const [x,y]=position.split(',').map(Number);s.buildings.push(building('road',x,y));}
 updateVillagers(s,BUILDINGS,workers(s),0);
 return s;
}
export function loadState(storage=localStorage){
 try{
  const s=JSON.parse(storage.getItem(SAVE_KEY));
  if(!s||s.version!==1||!Array.isArray(s.buildings)||!s.buildings.some(b=>b.type==='castle')||!RESOURCES.every(k=>Number.isFinite(s.resources[k])&&s.resources[k]>=0)||!Number.isFinite(s.population)||!Object.keys(UNITS).every(k=>Number.isInteger(s.army[k])&&s.army[k]>=0)||!Array.isArray(s.queue)||!Array.isArray(s.logs)||!s.stats||!Array.isArray(s.claimed)||!s.buildings.every(b=>BUILDINGS[b.type]&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.hp)&&b.level>=1&&b.level<=5))return initialState();
  const buildings=(s.wallHpVersion===2?s.buildings:s.buildings.map(b=>b.type==='wall'?{...b,hp:Math.min(maxHp(b),b.hp*2)}:b)).map(b=>b.type==='market'?{...b,tradeResource:MARKET_TRADES[b.tradeResource]?b.tradeResource:null,tradeProgress:Number.isInteger(b.tradeProgress)?Math.max(0,Math.min(MARKET_TRADE_SECONDS-1,b.tradeProgress)):0}:b);
  const crops=Array.isArray(s.crops)?s.crops.filter(c=>c&&typeof c.id==='string'&&s.buildings.some(b=>b.id===c.farmId&&['farm','lumber'].includes(b.type))&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number.isFinite(c.progress)&&c.progress>=0).map(c=>({...c,kind:s.buildings.find(b=>b.id===c.farmId).type==='lumber'?'tree':'wheat'})):[];
  const loaded={...initialState(),...s,buildings,crops,waterTiles:normalizeWaterTiles(s.waterTiles,buildings,BUILDINGS,crops),logs:s.logs.map(entry=>({...entry,message:translateLegacyMessage(entry.message)})),raidIn:Number.isFinite(s.raidIn)?Math.max(1,Math.min(RAID_INTERVAL_SECONDS,s.raidIn)):RAID_INTERVAL_SECONDS,wallHpVersion:2,expansion:Number.isInteger(s.expansion)?Math.max(0,Math.min(EXPANSIONS.length,s.expansion)):0,bolts:s.simulationVersion===2&&Array.isArray(s.bolts)?s.bolts.filter(b=>b&&b.from&&b.to&&Number.isFinite(b.from.x)&&Number.isFinite(b.from.y)&&Number.isFinite(b.to.x)&&Number.isFinite(b.to.y)&&Number.isFinite(b.duration)&&Number.isFinite(b.elapsed)&&Number.isFinite(b.damage)&&b.duration>0&&b.damage>0&&b.elapsed>=0&&b.elapsed<b.duration&&['enemy','defender','building'].includes(b.targetKind)):[],simTime:Number.isFinite(s.simTime)?Math.max(0,s.simTime):Math.max(0,s.time||0),frameRemainder:Number.isFinite(s.frameRemainder)?Math.max(0,Math.min(.999999,s.frameRemainder)):0,simulationVersion:2,notice:'Your village is saved. Welcome back.'};
  delete loaded.paused;reconcileHousing(loaded);
  if(s.staffingVersion!==1)migrateStaffing(loaded);
  loaded.enemies=(Array.isArray(loaded.enemies)?loaded.enemies:[]).filter(u=>u&&Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp)).map(u=>({...u,prevX:u.x,prevY:u.y,route:[],repath:0}));
  loaded.defenders=(Array.isArray(loaded.defenders)?loaded.defenders:[]).filter(u=>u&&UNITS[u.type]&&Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp)).map(u=>({...u,prevX:u.x,prevY:u.y,route:[],repath:0}));
  loaded.bolts=loaded.bolts.filter(b=>(b.targetKind==='building'?loaded.buildings:b.targetKind==='defender'?loaded.defenders:loaded.enemies).some(target=>target.id===b.targetId&&target.hp>0));
  loaded.raidActive=loaded.enemies.length>0||loaded.bolts.length>0;
  loaded.villagers=Array.isArray(s.villagers)?s.villagers.filter(v=>v&&typeof v.id==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&['inside','leaving','walking','fleeing'].includes(v.mode)):[];
  normalizeStaffing(loaded);updateVillagers(loaded,BUILDINGS,workers(loaded),0);return loaded;
 }catch{return initialState();}
}
export function saveState(s,storage=localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify({...s,savedAt:Date.now()}));return true;}catch{return false;}}
function center(b){return {x:b.x+BUILDINGS[b.type].size/2,y:b.y+BUILDINGS[b.type].size/2};}
export const RAID_SIDES=['north','east','south','west'];
export const RAID_SIDE_NAMES={north:'North',east:'East',south:'South',west:'West'};
export function raidSpawnPoint(s,side,index){
 const area=bounds(s),castle=s.buildings.find(b=>b.type==='castle'),target=center(castle),blocked=blockedTiles(s.buildings,BUILDINGS);
 let remaining=index;
 for(let depth=0;depth<area.max-area.min;depth++){
  const candidates=[];
  for(let position=area.min;position<area.max;position++){
   const x=side==='west'?area.min+depth:side==='east'?area.max-1-depth:position;
   const y=side==='north'?area.min+depth:side==='south'?area.max-1-depth:position;
   if(terrain(x,y,s)==='grass'&&!blocked.has(`${x},${y}`))candidates.push({x,y});
  }
  if(candidates.length){
   if(remaining>=candidates.length){remaining-=candidates.length;continue;}
   candidates.sort((a,b)=>Math.abs((side==='north'||side==='south'?a.x+.5:a.y+.5)-(side==='north'||side==='south'?target.x:target.y))-Math.abs((side==='north'||side==='south'?b.x+.5:b.y+.5)-(side==='north'||side==='south'?target.x:target.y))||a.x-b.x||a.y-b.y);
   const tile=candidates[remaining];return {x:tile.x+.5,y:tile.y+.5};
  }
 }
 return {x:target.x,y:target.y};
}
export function underAttack(s){return !!s.raidActive||s.enemies.length>0||(s.bolts||[]).length>0;}
function startRaid(s){
 s.raidRepairPending=false;s.bolts=[];s.raidActive=true;s.raidNumber++;
 const side=RAID_SIDES[Math.floor(Math.random()*RAID_SIDES.length)];s.raidSide=side;
 const roster=raidRoster(s.raidNumber),count=roster.length;
 s.enemies=roster.map((type,i)=>{const {maxHp}=raiderStats(type,s.raidNumber);return {id:crypto.randomUUID(),type,...raidSpawnPoint(s,side,i),hp:maxHp,maxHp,facing:Math.PI/2};});
 s.defenders=[];const slots=formationSlots(s,Object.values(s.army).reduce((a,b)=>a+b,0),BUILDINGS);let index=0;
 for(const [type,n]of Object.entries(s.army))for(let i=0;i<n;i++){const position=slots[index++];if(position)s.defenders.push({id:crypto.randomUUID(),type,...position,hp:UNITS[type].hp,facing:-Math.PI/2});}
 updateVillagers(s,BUILDINGS,workers(s),0);
 log(s,`Raid! ${count} raiders are approaching from ${RAID_SIDE_NAMES[side]}.`);
}
function finishCombat(s){
 if(!s.buildings.some(b=>b.type==='castle'&&b.hp>0)){s.gameOver=true;s.raidActive=false;s.enemies=[];s.defenders=[];s.bolts=[];log(s,'The main castle was destroyed. Game over.');return;}
 if(s.enemies.length||s.bolts.length)return;
 s.raidActive=false;s.defenders=[];s.raidSide=null;s.raidRepairPending=true;
 const reward=raidReward(s.raidNumber);for(const [resource,amount]of Object.entries(reward))s.resources[resource]=Math.min(99999,s.resources[resource]+amount);
 log(s,`Raid repelled. +${reward.gold} gold, +${reward.wood} wood, +${reward.stone} stone and +${reward.food} food.`);
}
function advanceSimulation(s,duration){
 let remaining=duration;
 while(remaining>1e-8&&!s.gameOver){
  const dt=Math.min(.05,remaining);remaining-=dt;s.simTime=(s.simTime||0)+dt;
  if(!s.raidActive&&!s.enemies.length&&!s.bolts.some(b=>Number.isFinite(b.duration)&&Number.isFinite(b.damage)))s.bolts=[];
  if(underAttack(s)){s.raidActive=true;combatStep(s,dt,BUILDINGS,UNITS);finishCombat(s);}
  updateVillagers(s,BUILDINGS,workers(s),dt);
 }
}
export const QUESTS=[{title:'New roots',desc:'Build your first building.',goal:1,stat:'built',reward:{wood:75,gold:40}},{title:'Under the banners',desc:'Train 3 new soldiers.',goal:3,stat:'trained',reward:{food:100,gold:80}},{title:'Beyond the walls',desc:'Win your first expedition.',goal:1,stat:'victories',reward:{stone:150,gold:100}}];
export function reducer(state,a){
 if(a.type==='RESET')return a.state||initialState();
 if(state.gameOver)return state;
 if(a.type==='NOTICE')return {...state,notice:a.message};
 if(a.type==='PAUSE')return state;
 if(a.type==='FRAME'){
  if(!Number.isFinite(a.dt)||a.dt<=0)return state;
  const next=structuredClone(state),dt=Math.min(.25,a.dt);
  advanceSimulation(next,dt);next.frameRemainder=(next.frameRemainder||0)+dt;
  if(capacity(next)<capacity(state))reconcileHousing(next);
  normalizeStaffing(next);
  if(next.frameRemainder>=1-1e-8){next.frameRemainder=Math.max(0,next.frameRemainder-1);return reducer(next,{type:'TICK',simulationHandled:true});}
  return next;
 }

 const s=structuredClone(state);
 const fail=m=>({...state,notice:m});
 if(a.type==='BUILD'){if(!BUILDINGS[a.kind]||a.kind==='castle')return state;const reason=canPlace(s,a.kind,a.x,a.y);if(reason)return fail(reason);if(!canAfford(s,BUILDINGS[a.kind].cost))return fail('Not enough resources for this building.');pay(s,BUILDINGS[a.kind].cost);s.buildings.push(building(a.kind,a.x,a.y));if(a.kind!=='road'&&a.kind!=='wall')s.stats.built++;log(s,`${a.kind==='road'&&terrain(a.x,a.y,s)==='water'?'Bridge':a.kind==='wall'&&gateSprite(s.buildings,s.buildings.at(-1))?'Castle gate':BUILDINGS[a.kind].name} built.`);}
 if(a.type==='TERRAFORM'){
  const reason=canTerraform(s,a.kind,a.x,a.y);if(reason)return fail(reason);
  s.waterTiles=a.kind==='water'?[...(s.waterTiles||[]),{x:a.x,y:a.y}]:(s.waterTiles||[]).filter(tile=>tile.x!==a.x||tile.y!==a.y);
  log(s,a.kind==='water'?'Water tile placed. Build a road over it to create a bridge.':'Water filled. Grass restored.');
 }
 if(a.type==='PLANT'){const reason=canPlant(s,a.farmId,a.x,a.y);if(reason)return fail(reason);const owner=s.buildings.find(b=>b.id===a.farmId),tree=owner.type==='lumber';s.crops.push({id:crypto.randomUUID(),farmId:a.farmId,kind:tree?'tree':'wheat',x:a.x,y:a.y,progress:0});log(s,owner.level>=3?`${tree?'Tree':'Wheat'} planted and will be harvested automatically.`:tree?'Tree planted. Harvest it when mature.':'Wheat planted. Harvest it when ripe.');}
 if(a.type==='ASSIGN_WORKER'){
  const b=s.buildings.find(b=>b.id===a.id),assignment=b&&staffing(s)[b.id];
  if(!assignment||b.hp<=0||![1,-1].includes(a.delta))return state;
  if(a.delta>0&&assignment.assigned>=assignment.required)return fail('This building already has a full workforce.');
  if(a.delta>0&&freeWorkers(s)<1)return fail('No available workers. Release a worker from another building or build more houses.');
  if(a.delta<0&&assignment.assigned===0)return state;
  b.assignedWorkers=assignment.assigned+a.delta;
  log(s,a.delta>0?'Worker assigned.':'Worker released and available for another building.');
 }
 if(a.type==='SET_TRADE'){
  const market=s.buildings.find(b=>b.id===a.id&&b.type==='market');
  if(!market||a.resource!==null&&!MARKET_TRADES[a.resource])return state;
  if(market.tradeResource===a.resource)return state;
  market.tradeResource=a.resource;market.tradeProgress=0;
  log(s,a.resource?`The market will sell ${NAMES[a.resource].toLowerCase()} for gold.`:'Market trading stopped.');
 }
 if(a.type==='HARVEST'){const crop=s.crops.find(c=>c.id===a.id);if(!crop)return state;const owner=s.buildings.find(b=>b.id===crop.farmId);if(!owner||owner.hp<=0)return fail('Restore the building first.');const tree=owner.type==='lumber';if(!cropReady(crop))return fail(`${tree?'The tree will mature':'The wheat will ripen'} in ${Math.ceil(WHEAT_GROW_SECONDS-crop.progress)} seconds with a full workforce.`);const resource=tree?'wood':'food',amount=tree?TREE_YIELD:WHEAT_YIELD;s.resources[resource]=Math.min(99999,s.resources[resource]+amount);if(owner.level>=3)crop.progress=0;else s.crops=s.crops.filter(c=>c.id!==a.id);log(s,owner.level>=3?`${tree?'Tree':'Wheat'} harvested. +${amount} ${tree?'wood':'food'} and replanted in the same plot.`:`${tree?'Tree':'Wheat'} harvested. +${amount} ${tree?'wood':'food'}. The plot is free again.`);}
 if(a.type==='REMOVE_CROP'){
  const owner=s.buildings.find(b=>b.id===a.farmId&&['farm','lumber'].includes(b.type));
  const crop=s.crops.find(c=>c.id===a.id&&c.farmId===a.farmId);
  if(!owner||!crop)return state;
  s.crops=s.crops.filter(c=>c.id!==crop.id);
  log(s,owner.type==='lumber'?'Tree removed. The plot is free.':'Wheat removed. The plot is free.');
 }
 if(a.type==='REPAIR_ALL'){
  if(!s.raidRepairPending)return state;
  if(underAttack(s))return fail('Wait until the raid ends to repair buildings.');
  const cost=repairAllCost(s);
  if(!canAfford(s,cost))return fail(`Missing ${cost.wood-s.resources.wood} wood for all repairs.`);
  const count=s.buildings.filter(b=>b.hp<maxHp(b)).length;
  pay(s,cost);for(const b of s.buildings)if(b.hp<maxHp(b))b.hp=maxHp(b);
  s.raidRepairPending=false;log(s,count?`Repaired ${count} buildings for ${cost.wood} wood.`:'No buildings need repairs.');
 }
 if(a.type==='DISMISS_REPAIR'){s.raidRepairPending=false;}
 if(['UPGRADE','MOVE','DEMOLISH','REPAIR'].includes(a.type)){const b=s.buildings.find(b=>b.id===a.id);if(!b)return state;
 if(a.type==='UPGRADE'){const castle=s.buildings.find(c=>c.type==='castle');if(b.hp<=0)return fail('Restore the building first.');if(b.level>=BUILDINGS[b.type].max)return fail('Maximum level reached.');if(b.type!=='castle'&&b.level>=castle.level)return fail('Upgrade the main castle first.');const cost=upgradeCost(b);if(!canAfford(s,cost))return fail('Not enough resources for this upgrade.');pay(s,cost);b.level++;b.hp=maxHp(b);log(s,`${BUILDINGS[b.type].name} is now level ${b.level}.`);}
 if(a.type==='MOVE'){if(underAttack(s))return fail('Cannot move buildings during a raid.');const reason=canPlace(s,b.type,a.x,a.y,b.id);if(reason)return fail(reason);b.x=a.x;b.y=a.y;log(s,'Building moved.');}
 if(a.type==='DEMOLISH'){if(b.type==='castle')return fail('The main castle cannot be removed.');if(underAttack(s))return fail('Cannot remove buildings during a raid.');if(b.type==='house'&&capacity(s)-6*b.level<military(s)+s.queue.length)return fail('Build more housing before removing this house. Soldiers and recruits still need a home.');s.buildings=s.buildings.filter(v=>v.id!==b.id);if(['farm','lumber'].includes(b.type))s.crops=s.crops.filter(c=>c.farmId!==b.id);for(const [k,v]of Object.entries(BUILDINGS[b.type].cost))s.resources[k]+=Math.floor(v*0.5);log(s,'Building removed. Refunded 50% of the base cost.');}
 if(a.type==='REPAIR'){const cost={wood:repairCost(b)};if(underAttack(s))return fail('Wait until the raid ends to repair buildings.');if(!canAfford(s,cost))return fail('Not enough wood for repairs.');pay(s,cost);b.hp=maxHp(b);log(s,'Building restored.');}}
 if(a.type==='TRAIN'){const def=UNITS[a.kind],b=s.buildings.find(b=>b.type==='barracks'&&b.hp>0);if(!def||!b)return fail('An operational barracks is required.');if(underAttack(s))return fail('Training is unavailable during a raid.');if(s.queue.length>=5)return fail('The queue is full. Wait for training to finish.');if(freeWorkers(s)<1)return fail('No unassigned residents. Build houses and wait for new settlers.');if(!canAfford(s,def.cost))return fail('Not enough resources for training.');pay(s,def.cost);const duration=Math.ceil(def.time/b.level);s.queue.push({id:crypto.randomUUID(),type:a.kind,remaining:duration,total:duration});log(s,`${def.name} started training.`);}
 if(a.type==='EXPAND'){const castle=s.buildings.find(b=>b.type==='castle');if(castle.hp<=0)return fail('Restore the main castle before expanding.');if(s.expansion>=EXPANSIONS.length)return fail('Your territory is fully expanded.');const requiredLevel=requiredCastleLevelForExpansion(s.expansion);if(castle.level<requiredLevel)return fail(`Requires main castle level ${requiredLevel} for the next expansion.`);const cost=EXPANSIONS[s.expansion].cost;if(!canAfford(s,cost))return fail('Not enough resources for expansion.');pay(s,cost);s.expansion++;log(s,'Territory expanded by 3 tiles in every direction.');}
 if(a.type==='EXPEDITION'){if(s.expedition||underAttack(s))return fail('Wait for the current battle to end.');if(power(s.army)===0)return fail('Train soldiers before an expedition.');if(!Number.isInteger(a.camp)||a.camp<0||a.camp>=CAMPS.length||a.camp>s.campaign)return fail('This camp is still locked.');if(s.raidIn<30)return fail('A raid is approaching. Defend your village first.');s.expedition={camp:a.camp,army:{...s.army},remaining:20,total:20};s.army={swordsman:0,archer:0,guard:0};log(s,'The army set out on an expedition.');}
 if(a.type==='RAID'){if(underAttack(s)||s.expedition)return fail('A battle is already in progress.');if(!s.buildings.some(b=>b.type==='castle'&&b.hp>0))return fail('Restore the castle first.');startRaid(s);s.raidIn=RAID_INTERVAL_SECONDS;}
 if(a.type==='CLAIM'){const q=QUESTS[a.index];if(!q||s.claimed.includes(a.index)||s.stats[q.stat]<q.goal)return state;for(const [k,v]of Object.entries(q.reward))s.resources[k]+=v;s.claimed.push(a.index);log(s,'Quest reward claimed.');}
 if(a.type==='TICK'){
  s.time++;const assignments=staffing(s);for(const crop of s.crops){const owner=s.buildings.find(b=>b.id===crop.farmId);if(owner?.hp<=0||!owner)continue;const automatic=owner.level>=3&&['farm','lumber'].includes(owner.type);if(!cropReady(crop))crop.progress=Math.min(WHEAT_GROW_SECONDS,crop.progress+(assignments[crop.farmId]?.efficiency||0));if(automatic&&assignments[crop.farmId]?.efficiency>0&&cropReady(crop)){const resource=owner.type==='lumber'?'wood':'food',amount=owner.type==='lumber'?TREE_YIELD:WHEAT_YIELD;s.resources[resource]=Math.min(99999,s.resources[resource]+amount);crop.progress=0;}}const rates=production(s);for(const k of RESOURCES)s.resources[k]=Math.min(99999,Math.max(0,s.resources[k]+rates[k]));
  for(const market of s.buildings){
   const trade=market.type==='market'?marketTrade(market,market.tradeResource):null;
   if(!trade||assignments[market.id]?.efficiency!==1)continue;
   market.tradeProgress=(market.tradeProgress||0)+1;
   if(market.tradeProgress<MARKET_TRADE_SECONDS)continue;
   market.tradeProgress=0;
   const resource=market.tradeResource;
   if(s.resources[resource]>=trade.cost){s.resources[resource]-=trade.cost;s.resources.gold=Math.min(99999,s.resources.gold+trade.gold);}
  }
  if(s.time%18===0&&s.population<capacity(s)&&s.resources.food>=15){s.population++;s.resources.food-=15;}
  if(s.time%30===0&&s.resources.food<1&&freeWorkers(s)>0){s.population--;log(s,'No food left. A resident left the village.');}
  if(s.queue.length&&s.buildings.some(b=>b.type==='barracks'&&b.hp>0)&&!underAttack(s)){s.queue[0].remaining--;if(s.queue[0].remaining<=0){const u=s.queue.shift();s.army[u.type]++;s.stats.trained++;log(s,`${UNITS[u.type].name} joined the army.`);}}
  if(s.expedition){s.expedition.remaining--;if(s.expedition.remaining<=0){const e=s.expedition,camp=CAMPS[e.camp],won=power(e.army)>=camp.power;const loss=won?Math.min(0.45,camp.power/Math.max(1,power(e.army))*0.35):0.65;let casualties=0;for(const [k,v]of Object.entries(e.army)){const dead=Math.min(v,Math.floor(v*loss));s.army[k]+=v-dead;casualties+=dead;}s.population-=casualties;if(won){for(const[k,v]of Object.entries(camp.reward))s.resources[k]+=v;s.stats.victories++;s.campaign=Math.max(s.campaign,Math.min(2,e.camp+1));}log(s,won?`Victory at ${camp.name}! Loot delivered. Soldiers lost: ${casualties}.`:`Retreat from ${camp.name}. Train a stronger army. Soldiers lost: ${casualties}.`);s.expedition=null;}}
  const attacked=underAttack(s);if(!a.simulationHandled)advanceSimulation(s,1);
  if(!attacked&&!underAttack(s)&&s.buildings.some(b=>b.type==='castle'&&b.hp>0)){s.raidIn--;if(s.raidIn<=0){if(!s.expedition){startRaid(s);s.raidIn=RAID_INTERVAL_SECONDS;}else s.raidIn=5;}}
 }
 if(capacity(s)<capacity(state))reconcileHousing(s);
 normalizeStaffing(s);
 return s;
}
