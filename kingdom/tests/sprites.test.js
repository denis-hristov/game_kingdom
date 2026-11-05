import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDINGS} from '../src/engine.js';
import {SPRITES,spriteLevel,spriteUrl} from '../src/sprites.js';

test('every playable building level and both wall directions have self-contained artwork',()=>{
  let count=0;
  for(const [type,meta] of Object.entries(SPRITES)){
    assert.equal(meta.anchors.length,BUILDINGS[meta.building??(type==='wall-vertical'?'wall':type)].max);
    for(let level=1;level<=meta.anchors.length;level++){
      const asset=new URL(`../public${spriteUrl(type,level)}`,import.meta.url);
      const svg=readFileSync(asset,'utf8');
      const [,width,height]=svg.match(/width="(\d+)" height="(\d+)"/);
      if(!meta.crop)assert.equal(meta.width/meta.height,Number(width)/Number(height),`${type} level ${level} aspect ratio`);
      else {const [x,y,w,h]=meta.crop;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=Number(width)&&y+h<=Number(height));}
      assert.match(svg,/data:image\/png;base64,/);
      assert.ok(meta.anchors[level-1]>0&&meta.anchors[level-1]<=1);
      count++;
    }
  }
  assert.equal(count,55);
});

test('artwork URLs follow upgrades, wall orientation, and supported save levels',()=>{
  assert.equal(spriteUrl('castle'),'/assets/buildings/castle-level-01.svg');
  assert.equal(spriteUrl('castle',5),'/assets/buildings/castle-level-05.svg');
  assert.equal(spriteUrl('house',3),'/assets/buildings/house-level-03.svg');
  assert.equal(spriteUrl('wall',2),'/assets/buildings/wall-horizontal-level-02.svg');
  assert.equal(spriteUrl('wall-vertical',3),'/assets/buildings/wall-vertical-level-03.svg');
  assert.equal(spriteUrl('house',5),spriteUrl('house',3));
  assert.equal(spriteUrl('road',3),spriteUrl('road',1));
  for(const level of [0,-2,NaN,Infinity,null])assert.equal(spriteLevel('castle',level),1);
});
