export const SPRITES = {
  castle: {width:180,height:210,anchors:[989/1120,991/1120,1041/1120,1000/1120,1023/1120]},
  house: {width:106,height:119.25,anchors:[642/720,668/720,664/720]},
  farm: {width:106,height:119.25,anchors:[657/720,654/720,679/720]},
  lumber: {width:106,height:119.25,anchors:[631/720,636/720,642/720]},
  quarry: {width:106,height:119.25,anchors:[648/720,647/720,665/720]},
  market: {width:106,height:119.25,anchors:[627/720,644/720,658/720]},
  barracks: {width:106,height:119.25,anchors:[652/720,677/720,674/720]},
  wall: {asset:'wall-horizontal',width:60,height:67.5,anchors:[613/720,566/720,592/720]},
  'wall-vertical': {width:60,height:67.5,anchors:[609/720,647/720,630/720]},
  tower: {width:88,height:99,anchors:[665/720,648/720,679/720]},
  road: {width:48,height:36,anchors:[1]},
  'gate-path-ns': {building:'wall',width:60,height:67.5,anchors:[624/720,627/720,607/720]},
  'gate-path-ew': {building:'wall',width:60,height:67.5,anchors:[670/720,672/720,659/720]},
};

// Crop transparent padding and align each bridge opening to the tile boundary.
const bridgeArtwork={
  'bridge-isolated':{crop:[123,166,384,374],bounds:[10,3,38,29]},
  'bridge-end-n':{crop:[124,85,390,324],bounds:[10,-5,38,29]},
  'bridge-end-e':{crop:[290,162,350,378],bounds:[10,3,48,29]},
  'bridge-end-s':{crop:[131,277,378,320],bounds:[10,3,38,36]},
  'bridge-end-w':{crop:[0,163,338,382],bounds:[0,3,38,29]},
  'bridge-ns':{crop:[123,72,394,533],bounds:[10,-5,38,36]},
  'bridge-ew':{crop:[0,166,640,381],bounds:[0,3,48,29]},
  'bridge-corner-ne':{crop:[113,76,514,428],bounds:[10,-5,48,29]},
  'bridge-corner-es':{crop:[115,168,525,438],bounds:[10,3,48,36]},
  'bridge-corner-sw':{crop:[0,165,501,438],bounds:[0,3,38,36]},
  'bridge-corner-wn':{crop:[1,80,495,428],bounds:[0,-5,38,29]},
  'bridge-t-nes':{crop:[113,74,527,543],bounds:[10,-5,48,36]},
  'bridge-t-esw':{crop:[0,166,640,465],bounds:[0,3,48,36]},
  'bridge-t-nsw':{crop:[0,78,512,542],bounds:[0,-5,38,36]},
  'bridge-t-new':{crop:[2,78,636,467],bounds:[0,-5,48,29]},
  'bridge-cross-nesw':{crop:[0,77,640,527],bounds:[0,-5,48,36]},
};
for(const [type,{crop,bounds:[left,top,right,bottom]}] of Object.entries(bridgeArtwork)){
  SPRITES[type]={building:'road',file:`${type}.svg`,crop,width:right-left,height:bottom-top,position:[left-24,top-36],anchors:[1]};
}

const cache=new Map();
const SCALE=4;
const baseUrl=import.meta.env?.BASE_URL??'/';

export function spriteLevel(type,level=1){
  const maximum=SPRITES[type]?.anchors.length??1;
  return Math.max(1,Math.min(maximum,Number.isFinite(level)?Math.floor(level):1));
}

const spriteKey=(type,level)=>`${type}:${spriteLevel(type,level)}`;
export function spriteUrl(type,level=1){
  const asset=SPRITES[type]?.asset??type;
  const file=SPRITES[type]?.file??`${asset}-level-${String(spriteLevel(type,level)).padStart(2,'0')}.svg`;
  return `${baseUrl}assets/buildings/${file}`;
}

export function preloadSprites(){
  const pending=[];
  for(const [type,meta] of Object.entries(SPRITES)){
    for(let level=1;level<=meta.anchors.length;level++){
      const key=spriteKey(type,level);
      if(cache.has(key)){pending.push(cache.get(key).ready);continue;}
      const entry={canvas:null,alpha:null,top:0,ready:null};cache.set(key,entry);
      entry.ready=new Promise(resolve=>{
        const image=new Image();
        const failed=()=>{console.warn(`Building image could not load: ${type}, level ${level}`);resolve(false);};
        image.onload=()=>{
          try{
            const canvas=document.createElement('canvas');
            canvas.width=Math.ceil(meta.width*SCALE);canvas.height=Math.ceil(meta.height*SCALE);
            const context=canvas.getContext('2d');
            if(meta.crop)context.drawImage(image,...meta.crop,0,0,canvas.width,canvas.height);
            else context.drawImage(image,0,0,canvas.width,canvas.height);
            entry.alpha=context.getImageData(0,0,canvas.width,canvas.height).data;
            for(let i=3;i<entry.alpha.length;i+=4)if(entry.alpha[i]>100){entry.top=Math.floor(i/4/canvas.width)*meta.height/canvas.height;break;}
            entry.canvas=canvas;resolve(true);
          }catch{failed();}
        };
        image.onerror=failed;
        image.src=spriteUrl(type,level);
      });
      pending.push(entry.ready);
    }
  }
  return Promise.all(pending);
}

export function drawSprite(context,type,level=1){
  const entry=cache.get(spriteKey(type,level)),meta=SPRITES[type];
  if(!entry?.canvas||!meta)return false;
  // Each level has different transparent padding; keep its base on the same ground line.
  const anchor=meta.anchors[spriteLevel(type,level)-1];
  const [x,y]=meta.position??[-meta.width/2,-meta.height*anchor];
  context.drawImage(entry.canvas,x,y,meta.width,meta.height);
  return true;
}

export function spriteTop(type,level=1){
  const meta=SPRITES[type];if(!meta)return 0;
  const anchor=meta.anchors[spriteLevel(type,level)-1];
  return (meta.position?.[1]??-meta.height*anchor)+(cache.get(spriteKey(type,level))?.top??0);
}

export function hitSprite(type,x,y,level=1){
  const entry=cache.get(spriteKey(type,level)),meta=SPRITES[type];
  if(!entry?.alpha||!meta)return false;
  const anchor=meta.anchors[spriteLevel(type,level)-1];
  const [left,top]=meta.position??[-meta.width/2,-meta.height*anchor];
  const px=Math.floor((x-left)*entry.canvas.width/meta.width),py=Math.floor((y-top)*entry.canvas.height/meta.height);
  if(px<0||py<0||px>=entry.canvas.width||py>=entry.canvas.height)return false;
  return entry.alpha[(py*entry.canvas.width+px)*4+3]>100;
}
