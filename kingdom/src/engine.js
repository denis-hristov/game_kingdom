import {blockedTiles,findRoute,moveAlongRoute} from './navigation.js';
import {translateLegacyMessage} from './legacy-messages.js';

export const SIZE = 44;
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
  wall:{name:'Castle wall',desc:'Slows enemies and absorbs damage. Connects to adjacent walls.',size:1,cost:{stone:6},hp:560,max:3},
  tower:{name:'Watchtower',desc:'Fires at enemies within 7 tiles. Each upgrade increases damage.',size:1,cost:{wood:35,stone:65,gold:20},hp:300,max:3},
  road:{name:'Road',desc:'Connects your village. Residents and soldiers can travel along it.',size:1,cost:{stone:2},hp:1,max:1},
};
export const UNITS = {
  swordsman:{name:'Swordsman',desc:'A balanced fighter for expeditions.',cost:{food:30,gold:20},power:18,hp:90,attack:12,range:1.5,time:10},
  archer:{name:'Archer',desc:'Attacks from a distance.',cost:{food:25,wood:20,gold:15},power:15,hp:55,attack:10,range:5,time:12},
  guard:{name:'Guard',desc:'A resilient village defender.',cost:{food:35,stone:15,gold:20},power:16,hp:140,attack:9,range:1.5,time:14},
};
export const CAMPS = [
  {name:'Raider Camp',desc:'Careless raiders near the old mill.',power:30,reward:{wood:100,stone:60,gold:70,food:60}},
  {name:'Iron Pass',desc:'A guarded pass high in the mountains.',power:100,reward:{wood:180,stone:160,gold:140,food:120}},
  {name:'Black Fortress',desc:'The last stronghold of the northern ruler.',power:220,reward:{wood:300,stone:250,gold:300,food:180}},
];
export function building(type,x,y,id=crypto.randomUUID()) {return {id,type,x,y,level:1,hp:BUILDINGS[type].hp,...(type==='market'?{tradeResource:null,tradeProgress:0}:{})};}
export function terrain(x,y) {
  if(x<0||y<0||x>=SIZE||y>=SIZE)return 'outside';
  const river = 35 + Math.sin(y*0.23)*1.8;
  if(Math.abs(x-river)<1.5)return 'water';
  if(x<4||y<4||x>40||y>40)return 'forest';
  return 'grass';
}
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
    const assigned=b.hp>0?Math.min(required,available):0;
    available-=assigned;
    const efficiency=b.hp<=0?0:assigned===required?1:b.type==='market'?0:0.5;
    assignments[b.id]={required,assigned,efficiency,rate:(BUILDINGS[b.type].rate||0)*b.level*efficiency};
  }
  return assignments;
}
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
  if(x<limit.min||y<limit.min||x>=limit.max||y>=limit.max||terrain(x,y)!=='grass')return 'Plant on empty ground within your territory.';
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
export function requiredCastleLevelForExpansion(expansion){return expansion+3;}
export function canAfford(s,cost){return Object.entries(cost).every(([k,v])=>s.resources[k]>=v);}
function pay(s,cost){for(const [k,v] of Object.entries(cost))s.resources[k]-=v;}
function log(s,message){s.logs=[{id:crypto.randomUUID(),message,time:s.time},...s.logs].slice(0,12);s.notice=message;}
export function canPlace(s,type,x,y,ignoreId){
  const size=BUILDINGS[type].size,b=bounds(s);
  if(x<b.min||y<b.min||x+size>b.max||y+size>b.max)return 'Outside your territory. Expand your domain.';
  for(let yy=y;yy<y+size;yy++)for(let xx=x;xx<x+size;xx++)if(terrain(xx,yy)!=='grass')return 'There is a river or forest here.';
  if(s.buildings.some(other=>other.id!==ignoreId&&x<other.x+BUILDINGS[other.type].size&&x+size>other.x&&y<other.y+BUILDINGS[other.type].size&&y+size>other.y))return 'This location is already occupied.';
  if((s.crops||[]).some(c=>c.x>=x&&c.x<x+size&&c.y>=y&&c.y<y+size))return 'Harvest the crops here first.';
  if(type!=='road'&&!s.buildings.some(road=>{
    if(road.type!=='road'||road.hp<=0||road.id===ignoreId)return false;
    const beside=(road.x===x-1||road.x===x+size)&&road.y>=y&&road.y<y+size;
    const aboveOrBelow=(road.y===y-1||road.y===y+size)&&road.x>=x&&road.x<x+size;
    return beside||aboveOrBelow;
  }))return 'A road is required next to the building. Place a road along at least one side.';
  return null;
}
export function initialState(){
 const s={version:1,wallHpVersion:2,time:0,resources:{wood:330,stone:280,food:240,gold:180},population:12,army:{swordsman:2,archer:1,guard:1},queue:[],buildings:[],crops:[],expansion:0,raidIn:RAID_INTERVAL_SECONDS,raidNumber:0,raidSide:null,raidRepairPending:false,gameOver:false,enemies:[],defenders:[],bolts:[],expedition:null,campaign:0,logs:[],notice:'Welcome to Oakvale.',paused:false,quest:0,claimed:[],stats:{built:0,trained:0,victories:0},savedAt:Date.now()};
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
 for(const position of roads){const [x,y]=position.split(',').map(Number);s.buildings.push(building('road',x,y));}
 return s;
}
export function loadState(storage=localStorage){
 try{
  const s=JSON.parse(storage.getItem(SAVE_KEY));
  if(!s||s.version!==1||!Array.isArray(s.buildings)||!s.buildings.some(b=>b.type==='castle')||!RESOURCES.every(k=>Number.isFinite(s.resources[k])&&s.resources[k]>=0)||!Number.isFinite(s.population)||!Object.keys(UNITS).every(k=>Number.isInteger(s.army[k])&&s.army[k]>=0)||!Array.isArray(s.queue)||!Array.isArray(s.logs)||!s.stats||!Array.isArray(s.claimed)||!s.buildings.every(b=>BUILDINGS[b.type]&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.hp)&&b.level>=1&&b.level<=5))return initialState();
  const buildings=(s.wallHpVersion===2?s.buildings:s.buildings.map(b=>b.type==='wall'?{...b,hp:Math.min(maxHp(b),b.hp*2)}:b)).map(b=>b.type==='market'?{...b,tradeResource:MARKET_TRADES[b.tradeResource]?b.tradeResource:null,tradeProgress:Number.isInteger(b.tradeProgress)?Math.max(0,Math.min(MARKET_TRADE_SECONDS-1,b.tradeProgress)):0}:b);
  const crops=Array.isArray(s.crops)?s.crops.filter(c=>c&&typeof c.id==='string'&&s.buildings.some(b=>b.id===c.farmId&&['farm','lumber'].includes(b.type))&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number.isFinite(c.progress)&&c.progress>=0).map(c=>({...c,kind:s.buildings.find(b=>b.id===c.farmId).type==='lumber'?'tree':'wheat'})):[];
  return {...initialState(),...s,buildings,crops,logs:s.logs.map(entry=>({...entry,message:translateLegacyMessage(entry.message)})),raidIn:Number.isFinite(s.raidIn)?Math.max(1,Math.min(RAID_INTERVAL_SECONDS,s.raidIn)):RAID_INTERVAL_SECONDS,wallHpVersion:2,paused:false,bolts:[],notice:'Your village is saved. Welcome back.'};
 }catch{return initialState();}
}
export function saveState(s,storage=localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify({...s,savedAt:Date.now()}));return true;}catch{return false;}}
function center(b){return {x:b.x+BUILDINGS[b.type].size/2,y:b.y+BUILDINGS[b.type].size/2};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export const RAID_SIDES=['north','east','south','west'];
export const RAID_SIDE_NAMES={north:'north',east:'east',south:'south',west:'west'};
export function raidSpawnPoint(s,side,index){
 const area=bounds(s),castle=s.buildings.find(b=>b.type==='castle'),target=center(castle),blocked=blockedTiles(s.buildings,BUILDINGS);
 for(let depth=0;depth<area.max-area.min;depth++){
  const candidates=[];
  for(let position=area.min;position<area.max;position++){
   const x=side==='west'?area.min+depth:side==='east'?area.max-1-depth:position;
   const y=side==='north'?area.min+depth:side==='south'?area.max-1-depth:position;
   if(terrain(x,y)==='grass'&&!blocked.has(`${x},${y}`))candidates.push({x,y});
  }
  if(candidates.length){
   candidates.sort((a,b)=>Math.abs((side==='north'||side==='south'?a.x+.5:a.y+.5)-(side==='north'||side==='south'?target.x:target.y))-Math.abs((side==='north'||side==='south'?b.x+.5:b.y+.5)-(side==='north'||side==='south'?target.x:target.y))||a.x-b.x||a.y-b.y);
   const tile=candidates[index%candidates.length];return {x:tile.x+.5,y:tile.y+.5};
  }
 }
 return {x:target.x,y:target.y};
}
function startRaid(s){s.raidRepairPending=false;s.raidNumber++;const side=RAID_SIDES[Math.floor(Math.random()*RAID_SIDES.length)];s.raidSide=side;const count=3+s.raidNumber*2;s.enemies=Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),...raidSpawnPoint(s,side,i),hp:55+s.raidNumber*12,maxHp:55+s.raidNumber*12}));s.defenders=[];for(const [type,n]of Object.entries(s.army))for(let i=0;i<n;i++)s.defenders.push({id:crypto.randomUUID(),type,x:22+i%3,y:22+Math.floor(i/3),hp:UNITS[type].hp});log(s,`Raid! ${count} raiders are approaching from ${RAID_SIDE_NAMES[side]}.`);}
function combat(s){
 s.bolts=[];const blocked=blockedTiles(s.buildings,BUILDINGS);
 for(const d of s.defenders){d.prevX=d.x;d.prevY=d.y;if(d.hp<=0)continue;const targets=s.enemies.filter(e=>e.hp>0),e=targets.sort((a,b)=>dist(a,d)-dist(b,d))[0];if(!e)break;const def=UNITS[d.type],dd=dist(d,e);if(dd<=def.range){e.hp-=def.attack;if(def.range>2)s.bolts.push({from:{...d},to:{...e}});}else{const route=findRoute(d,(x,y)=>targets.find(target=>dist({x,y},target)<=def.range),blocked,SIZE);if(route)moveAlongRoute(d,route.path,0.55);}}
 for(const b of s.buildings.filter(b=>b.type==='tower'&&b.hp>0)){const c=center(b),e=s.enemies.find(e=>e.hp>0&&dist(e,c)<7);if(e){e.hp-=18*b.level;s.bolts.push({from:c,to:{...e}});}}
 for(const e of s.enemies){e.prevX=e.x;e.prevY=e.y;if(e.hp<=0)continue;const d=s.defenders.filter(d=>d.hp>0).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(d&&dist(d,e)<2){d.hp-=10+s.raidNumber*2;continue;}
 const targets=s.buildings.filter(b=>b.hp>0&&b.type!=='road');if(!targets.length)continue;
 const reachable=targets.filter(b=>dist(center(b),e)<=BUILDINGS[b.type].size/2+0.5).sort((a,b)=>dist(center(a),e)-dist(center(b),e))[0];
 if(reachable){reachable.hp=Math.max(0,reachable.hp-12-s.raidNumber*2);continue;}
 const route=findRoute(e,(x,y)=>targets.find(b=>dist(center(b),{x,y})<=BUILDINGS[b.type].size/2+0.5),blocked,SIZE);
 if(route)moveAlongRoute(e,route.path,0.4);
 }
 for(const d of s.defenders.filter(d=>d.hp<=0)){s.army[d.type]=Math.max(0,s.army[d.type]-1);s.population=Math.max(0,s.population-1);}s.defenders=s.defenders.filter(d=>d.hp>0);s.enemies=s.enemies.filter(e=>e.hp>0);
 if(!s.buildings.some(b=>b.type==='castle'&&b.hp>0)){s.gameOver=true;s.enemies=[];s.defenders=[];s.bolts=[];log(s,'The main castle was destroyed. Game over.');}
 else if(!s.enemies.length){s.defenders=[];s.raidSide=null;s.raidRepairPending=true;const reward=raidReward(s.raidNumber);for(const [resource,amount]of Object.entries(reward))s.resources[resource]=Math.min(99999,s.resources[resource]+amount);log(s,`Raid repelled. +${reward.gold} gold, +${reward.wood} wood, +${reward.stone} stone and +${reward.food} food.`);}
}
export const QUESTS=[{title:'New roots',desc:'Build your first building.',goal:1,stat:'built',reward:{wood:75,gold:40}},{title:'Under the banners',desc:'Train 3 new soldiers.',goal:3,stat:'trained',reward:{food:100,gold:80}},{title:'Beyond the walls',desc:'Win your first expedition.',goal:1,stat:'victories',reward:{stone:150,gold:100}}];
export function reducer(state,a){
 if(a.type==='RESET')return a.state||initialState();
 if(state.gameOver)return state;
 if(a.type==='NOTICE')return {...state,notice:a.message};
 if(a.type==='PAUSE')return {...state,paused:!state.paused};
 if(a.type==='TICK'&&state.paused)return state;
 const s=structuredClone(state);
 const fail=m=>({...state,notice:m});
 if(a.type==='BUILD'){if(!BUILDINGS[a.kind]||a.kind==='castle')return state;const reason=canPlace(s,a.kind,a.x,a.y);if(reason)return fail(reason);if(!canAfford(s,BUILDINGS[a.kind].cost))return fail('Not enough resources for this building.');pay(s,BUILDINGS[a.kind].cost);s.buildings.push(building(a.kind,a.x,a.y));if(a.kind!=='road'&&a.kind!=='wall')s.stats.built++;log(s,`${BUILDINGS[a.kind].name} built.`);}
 if(a.type==='PLANT'){const reason=canPlant(s,a.farmId,a.x,a.y);if(reason)return fail(reason);const owner=s.buildings.find(b=>b.id===a.farmId),tree=owner.type==='lumber';s.crops.push({id:crypto.randomUUID(),farmId:a.farmId,kind:tree?'tree':'wheat',x:a.x,y:a.y,progress:0});log(s,owner.level>=3?`${tree?'Tree':'Wheat'} planted and will be harvested automatically.`:tree?'Tree planted. Harvest it when mature.':'Wheat planted. Harvest it when ripe.');}
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
  if(s.enemies.length)return fail('Wait until the raid ends to repair buildings.');
  const cost=repairAllCost(s);
  if(!canAfford(s,cost))return fail(`Missing ${cost.wood-s.resources.wood} wood for all repairs.`);
  const count=s.buildings.filter(b=>b.hp<maxHp(b)).length;
  pay(s,cost);for(const b of s.buildings)if(b.hp<maxHp(b))b.hp=maxHp(b);
  s.raidRepairPending=false;log(s,count?`Repaired ${count} buildings for ${cost.wood} wood.`:'No buildings need repairs.');
 }
 if(a.type==='DISMISS_REPAIR'){s.raidRepairPending=false;}
 if(['UPGRADE','MOVE','DEMOLISH','REPAIR'].includes(a.type)){const b=s.buildings.find(b=>b.id===a.id);if(!b)return state;
 if(a.type==='UPGRADE'){const castle=s.buildings.find(c=>c.type==='castle');if(b.hp<=0)return fail('Restore the building first.');if(b.level>=BUILDINGS[b.type].max)return fail('Maximum level reached.');if(b.type!=='castle'&&b.level>=castle.level)return fail('Upgrade the main castle first.');const cost=upgradeCost(b);if(!canAfford(s,cost))return fail('Not enough resources for this upgrade.');pay(s,cost);b.level++;b.hp=maxHp(b);log(s,`${BUILDINGS[b.type].name} is now level ${b.level}.`);}
 if(a.type==='MOVE'){if(s.enemies.length)return fail('Cannot move buildings during a raid.');const reason=canPlace(s,b.type,a.x,a.y,b.id);if(reason)return fail(reason);b.x=a.x;b.y=a.y;log(s,'Building moved.');}
 if(a.type==='DEMOLISH'){if(b.type==='castle')return fail('The main castle cannot be removed.');if(s.enemies.length)return fail('Cannot remove buildings during a raid.');s.buildings=s.buildings.filter(v=>v.id!==b.id);if(['farm','lumber'].includes(b.type))s.crops=s.crops.filter(c=>c.farmId!==b.id);for(const [k,v]of Object.entries(BUILDINGS[b.type].cost))s.resources[k]+=Math.floor(v*0.5);log(s,'Building removed. Refunded 50% of the base cost.');}
 if(a.type==='REPAIR'){const cost={wood:repairCost(b)};if(s.enemies.length)return fail('Wait until the raid ends to repair buildings.');if(!canAfford(s,cost))return fail('Not enough wood for repairs.');pay(s,cost);b.hp=maxHp(b);log(s,'Building restored.');}}
 if(a.type==='TRAIN'){const def=UNITS[a.kind],b=s.buildings.find(b=>b.type==='barracks'&&b.hp>0);if(!def||!b)return fail('An operational barracks is required.');if(s.enemies.length)return fail('Training is unavailable during a raid.');if(s.queue.length>=5)return fail('The queue is full. Wait for training to finish.');if(workers(s)<1)return fail('No unassigned residents. Build houses and wait for new settlers.');if(!canAfford(s,def.cost))return fail('Not enough resources for training.');pay(s,def.cost);const duration=Math.ceil(def.time/b.level);s.queue.push({id:crypto.randomUUID(),type:a.kind,remaining:duration,total:duration});log(s,`${def.name} started training.`);}
 if(a.type==='EXPAND'){const castle=s.buildings.find(b=>b.type==='castle');if(s.expansion>=3)return fail('Your territory is fully expanded.');const requiredLevel=requiredCastleLevelForExpansion(s.expansion);if(castle.level<requiredLevel)return fail(`Requires main castle level ${requiredLevel} for the next expansion.`);const cost={wood:150*(s.expansion+1),stone:100*(s.expansion+1),gold:80*(s.expansion+1)};if(!canAfford(s,cost))return fail('Not enough resources for expansion.');pay(s,cost);s.expansion++;log(s,'Territory expanded by 3 tiles in every direction.');}
 if(a.type==='EXPEDITION'){if(s.expedition||s.enemies.length)return fail('Wait for the current battle to end.');if(power(s.army)===0)return fail('Train soldiers before an expedition.');if(!Number.isInteger(a.camp)||a.camp<0||a.camp>=CAMPS.length||a.camp>s.campaign)return fail('This camp is still locked.');if(s.raidIn<30)return fail('A raid is approaching. Defend your village first.');s.expedition={camp:a.camp,army:{...s.army},remaining:20,total:20};s.army={swordsman:0,archer:0,guard:0};log(s,'The army set out on an expedition.');}
 if(a.type==='RAID'){if(s.enemies.length||s.expedition)return fail('A battle is already in progress.');if(!s.buildings.some(b=>b.type==='castle'&&b.hp>0))return fail('Restore the castle first.');startRaid(s);s.raidIn=RAID_INTERVAL_SECONDS;}
 if(a.type==='CLAIM'){const q=QUESTS[a.index];if(!q||s.claimed.includes(a.index)||s.stats[q.stat]<q.goal)return state;for(const [k,v]of Object.entries(q.reward))s.resources[k]+=v;s.claimed.push(a.index);log(s,'Quest reward claimed.');}
 if(a.type==='TICK'){
  s.time++;const assignments=staffing(s);for(const crop of s.crops){const owner=s.buildings.find(b=>b.id===crop.farmId);if(owner?.hp<=0||!owner)continue;const automatic=owner.level>=3&&['farm','lumber'].includes(owner.type);if(!cropReady(crop))crop.progress=Math.min(WHEAT_GROW_SECONDS,crop.progress+(assignments[crop.farmId]?.efficiency||0));if(automatic&&cropReady(crop)){const resource=owner.type==='lumber'?'wood':'food',amount=owner.type==='lumber'?TREE_YIELD:WHEAT_YIELD;s.resources[resource]=Math.min(99999,s.resources[resource]+amount);crop.progress=0;}}const rates=production(s);for(const k of RESOURCES)s.resources[k]=Math.min(99999,Math.max(0,s.resources[k]+rates[k]));
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
  if(s.time%30===0&&s.resources.food<1&&workers(s)>0){s.population--;log(s,'No food left. A resident left the village.');}
  if(s.queue.length&&s.buildings.some(b=>b.type==='barracks'&&b.hp>0)&&!s.enemies.length){s.queue[0].remaining--;if(s.queue[0].remaining<=0){const u=s.queue.shift();s.army[u.type]++;s.stats.trained++;log(s,`${UNITS[u.type].name} joined the army.`);}}
  if(s.expedition){s.expedition.remaining--;if(s.expedition.remaining<=0){const e=s.expedition,camp=CAMPS[e.camp],won=power(e.army)>=camp.power;const loss=won?Math.min(0.45,camp.power/Math.max(1,power(e.army))*0.35):0.65;let casualties=0;for(const [k,v]of Object.entries(e.army)){const dead=Math.min(v,Math.floor(v*loss));s.army[k]+=v-dead;casualties+=dead;}s.population-=casualties;if(won){for(const[k,v]of Object.entries(camp.reward))s.resources[k]+=v;s.stats.victories++;s.campaign=Math.max(s.campaign,Math.min(2,e.camp+1));}log(s,won?`Victory at ${camp.name}! Loot delivered. Soldiers lost: ${casualties}.`:`Retreat from ${camp.name}. Train a stronger army. Soldiers lost: ${casualties}.`);s.expedition=null;}}
  if(s.enemies.length)combat(s);else if(s.buildings.some(b=>b.type==='castle'&&b.hp>0)){s.raidIn--;if(s.raidIn<=0){if(!s.expedition){startRaid(s);s.raidIn=RAID_INTERVAL_SECONDS;}else s.raidIn=5;}}
 }
 return s;
}
