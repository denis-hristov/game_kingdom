import {cropReady} from './engine.js';

export function tilesAlongLine(from,to){
 const tiles=[];
 let x=from.x,y=from.y;
 const dx=Math.abs(to.x-x),dy=Math.abs(to.y-y);
 const stepX=x<to.x?1:-1,stepY=y<to.y?1:-1;
 let error=dx-dy;
 while(true){
  tiles.push({x,y});
  if(x===to.x&&y===to.y)break;
  const twice=2*error;
  if(twice>-dy){error-=dy;x+=stepX;}
  if(twice<dx){error+=dx;y+=stepY;}
 }
 return tiles;
}

export function readyCropAt(state,tile){
 const crop=state.crops.find(c=>c.x===tile.x&&c.y===tile.y);
 if(!crop||!cropReady(crop))return null;
 return state.buildings.some(b=>b.id===crop.farmId&&b.hp>0)?crop:null;
}
