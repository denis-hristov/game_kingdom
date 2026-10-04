export const SPRITES = {
  castle: {width:180,height:210,anchor:245/280},
  house: {width:106,height:119.25,anchor:155/180},
  farm: {width:106,height:119.25,anchor:155/180},
  lumber: {width:106,height:119.25,anchor:155/180},
  quarry: {width:106,height:119.25,anchor:155/180},
  market: {width:106,height:119.25,anchor:155/180},
  barracks: {width:106,height:119.25,anchor:155/180},
  wall: {width:60,height:67.5,anchor:145/180},
  tower: {width:128,height:144,anchor:155/180},
  road: {width:48,height:36,anchor:1},
};
const cache=new Map();
const SCALE=4;
export const spriteUrl=type=>`${import.meta.env.BASE_URL}assets/buildings/${type}.svg`;
export function preloadSprites(){
  return Promise.all(Object.entries(SPRITES).map(([type,meta])=>{
    if(cache.has(type))return cache.get(type).ready;
    const entry={canvas:null,alpha:null,ready:null};cache.set(type,entry);
    entry.ready=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(meta.width*SCALE);canvas.height=Math.ceil(meta.height*SCALE);
        const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
        entry.alpha=context.getImageData(0,0,canvas.width,canvas.height).data;entry.canvas=canvas;resolve(true);
      };
      image.onerror=()=>{console.warn(`Building image could not load: ${type}`);resolve(false);};
      image.src=spriteUrl(type);
    });
    return entry.ready;
  }));
}
export function drawSprite(context,type){
  const entry=cache.get(type),meta=SPRITES[type];if(!entry?.canvas||!meta)return false;
  context.drawImage(entry.canvas,-meta.width/2,-meta.height*meta.anchor,meta.width,meta.height);return true;
}
export function hitSprite(type,x,y){
  const entry=cache.get(type),m=SPRITES[type];if(!entry?.alpha||!m)return false;
  const px=Math.floor((x+m.width/2)*SCALE),py=Math.floor((y+m.height*m.anchor)*SCALE);
  if(px<0||py<0||px>=entry.canvas.width||py>=entry.canvas.height)return false;
  return entry.alpha[(py*entry.canvas.width+px)*4+3]>100;
}
