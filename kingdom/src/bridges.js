import {terrain} from './terrain.js';
import {drawSprite,spriteUrl} from './sprites.js';

export function isBridge(state,road){
  return road.type==='road'&&terrain(road.x,road.y,state)==='water';
}

export function onBridge(state,x,y){
  return terrain(Math.floor(x),Math.floor(y),state)==='water'&&state.buildings.some(b=>b.type==='road'&&b.hp>0&&b.x===Math.floor(x)&&b.y===Math.floor(y));
}

export function bridgeLayout(buildings,road){
  const neighbors=buildings.filter(b=>b.type==='road'&&b.hp>0&&b.id!==road.id);
  const connected=(dx,dy)=>neighbors.some(b=>b.x===road.x+dx&&b.y===road.y+dy);
  const links={north:connected(0,-1),east:connected(1,0),south:connected(0,1),west:connected(-1,0)};
  return links;
}

const bridgeVariants=[
  'isolated','end-n','end-e','corner-ne','end-s','ns','corner-es','t-nes',
  'end-w','corner-wn','ew','t-new','corner-sw','t-nsw','t-esw','cross-nesw',
];
export function bridgeSprite(links){
  const mask=Number(!!links.north)+Number(!!links.east)*2+Number(!!links.south)*4+Number(!!links.west)*8;
  return `bridge-${bridgeVariants[mask]}`;
}

function deckRects(links,w,h){
  const left=w*.22,right=w*.78,top=h*.23,bottom=h*.79;
  return [[left,top,right-left,bottom-top],
    ...(links.west?[[0,top,left,bottom-top]]:[]),
    ...(links.east?[[right,top,w-right,bottom-top]]:[]),
    ...(links.north?[[left,0,right-left,top]]:[]),
    ...(links.south?[[left,bottom,right-left,h-bottom]]:[])];
}

export function drawBridge(c,links,w=48,h=36){
  c.save();c.scale(w/48,h/36);
  const drawn=drawSprite(c,bridgeSprite(links));c.restore();
  if(drawn)return;
  c.save();c.translate(-w/2,-h);
  const rects=deckRects(links,w,h),vertical=links.north||links.south;
  c.fillStyle='#294d4359';for(const [x,y,rw,rh]of rects)c.fillRect(x+2,y+5,rw,rh);
  c.beginPath();for(const rect of rects)c.rect(...rect);
  c.fillStyle='#ba8a4e';c.fill();c.save();c.clip();
  c.strokeStyle='#725033';c.lineWidth=1;
  const extent=vertical?h:w;
  for(let n=0;n<=extent;n+=5){c.beginPath();if(vertical){c.moveTo(0,n);c.lineTo(w,n);}else{c.moveTo(n,0);c.lineTo(n,h);}c.stroke();}
  c.strokeStyle='#e5bf7c';c.lineWidth=1;
  for(let n=1;n<=extent;n+=5){c.beginPath();if(vertical){c.moveTo(0,n);c.lineTo(w,n);}else{c.moveTo(n,0);c.lineTo(n,h);}c.stroke();}
  c.restore();
  const l=w*.22,r=w*.78,t=h*.23,b=h*.79;
  const rails=[];
  if(links.north)rails.push([l,0,l,t],[r,0,r,t]);else rails.push([l,t,r,t]);
  if(links.south)rails.push([l,b,l,h],[r,b,r,h]);else rails.push([l,b,r,b]);
  if(links.west)rails.push([0,t,l,t],[0,b,l,b]);else rails.push([l,t,l,b]);
  if(links.east)rails.push([r,t,w,t],[r,b,w,b]);else rails.push([r,t,r,b]);
  c.lineCap='round';
  for(const [x,y,x2,y2]of rails){
    c.strokeStyle='#62472f';c.lineWidth=3.5;c.beginPath();c.moveTo(x,y-3);c.lineTo(x2,y2-3);c.stroke();
    c.strokeStyle='#e0b67a';c.lineWidth=1.8;c.beginPath();c.moveTo(x,y-4);c.lineTo(x2,y2-4);c.stroke();
  }
  const posts=new Map();for(const rail of rails)for(let i=0;i<4;i+=2)posts.set(`${rail[i]},${rail[i+1]}`,[rail[i],rail[i+1]]);
  for(const [x,y]of posts.values()){
    c.fillStyle='#795536';c.fillRect(x-1.8,y-7,3.6,9);
    c.fillStyle='#e6c58e';c.fillRect(x-2,y-8,4,2.5);
  }
  c.restore();
}

export function bridgePreview(links){
  return spriteUrl(bridgeSprite(links));
}
