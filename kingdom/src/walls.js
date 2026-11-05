export function gateSprite(buildings, wall) {
  if(wall.type!=='wall'||!buildings.some(b=>b.type==='road'&&b.hp>0&&b.x===wall.x&&b.y===wall.y))return null;
  const roads=buildings.filter(b=>b.type==='road'&&b.hp>0);
  const northSouth=roads.filter(b=>b.x===wall.x&&Math.abs(b.y-wall.y)===1).length;
  const eastWest=roads.filter(b=>b.y===wall.y&&Math.abs(b.x-wall.x)===1).length;
  if(northSouth!==eastWest)return northSouth>eastWest?'gate-path-ns':'gate-path-ew';
  const walls=buildings.filter(b=>b.type==='wall'&&b.hp>0&&b.id!==wall.id);
  const horizontal=walls.filter(b=>b.y===wall.y&&Math.abs(b.x-wall.x)===1).length;
  const vertical=walls.filter(b=>b.x===wall.x&&Math.abs(b.y-wall.y)===1).length;
  return vertical>horizontal?'gate-path-ew':'gate-path-ns';
}

export function wallSprites(buildings, wall) {
  const gate=gateSprite(buildings,wall);
  if(gate)return [gate];
  const neighbors = buildings.filter(b => b.type === 'wall' && b.hp > 0 && b.id !== wall.id);
  const vertical = neighbors.some(b => b.x === wall.x && Math.abs(b.y - wall.y) === 1);
  const horizontal = neighbors.some(b => b.y === wall.y && Math.abs(b.x - wall.x) === 1);
  return vertical ? horizontal ? ['wall', 'wall-vertical'] : ['wall-vertical'] : ['wall'];
}
