export const SIZE=44;
const waterCache=new WeakMap();

export function baseTerrain(x,y){
  if(x<0||y<0||x>=SIZE||y>=SIZE)return 'outside';
  const river=35+Math.sin(y*.23)*1.8;
  if(Math.abs(x-river)<1.5)return 'water';
  if(x<4||y<4||x>40||y>40)return 'forest';
  return 'grass';
}

export function terrain(x,y,state){
  const base=baseTerrain(x,y),tiles=state?.waterTiles;
  if(base!=='grass'||!Array.isArray(tiles))return base;
  let water=waterCache.get(tiles);
  if(!water){water=new Set(tiles.map(tile=>`${tile.x},${tile.y}`));waterCache.set(tiles,water);}
  return water.has(`${x},${y}`)?'water':base;
}

export function normalizeWaterTiles(tiles,buildings,definitions,crops=[]){
  const seen=new Set();
  return (Array.isArray(tiles)?tiles:[]).filter(tile=>{
    if(!tile||!Number.isInteger(tile.x)||!Number.isInteger(tile.y)||baseTerrain(tile.x,tile.y)!=='grass')return false;
    const key=`${tile.x},${tile.y}`;
    if(seen.has(key)||crops.some(c=>c.x===tile.x&&c.y===tile.y))return false;
    if(buildings.some(b=>b.type!=='road'&&tile.x>=b.x&&tile.y>=b.y&&tile.x<b.x+definitions[b.type].size&&tile.y<b.y+definitions[b.type].size))return false;
    seen.add(key);return true;
  }).map(({x,y})=>({x,y}));
}
