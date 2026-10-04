import {drawSprite,spriteUrl} from './sprites';
const outline='#493c2d';
export function polygon(c,points,fill,stroke=outline,line=1.5){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
function rect(c,x,y,w,h,fill,stroke=outline){c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.strokeRect(x,y,w,h);}}
function ellipse(c,x,y,rx,ry,color,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.4;c.stroke();}}
function line(c,x,y,x2,y2,color=outline,w=1.4){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=w;c.stroke();}
function shadow(c,x,y,w){ellipse(c,x+8,y,w,w*.26,'#233c3438');}
function window(c,x,y,w=10,h=13){rect(c,x,y,w,h,'#304e50');rect(c,x+1,y+1,w/2-1,h-2,'#d9bc72',null);line(c,x+w/2,y,x+w/2,y+h,'#69513a');line(c,x,y+h/2,x+w,y+h/2,'#69513a');rect(c,x-2,y+h,w+4,3,'#a68152');}
function door(c,x,y,w=13,h=22){rect(c,x,y,w,h,'#65422e');for(let i=3;i<w;i+=4)line(c,x+i,y+1,x+i,y+h-1,'#956744',1);ellipse(c,x+w-3,y+h/2,1.2,1.2,'#e5c775');}
function flag(c,x,y,color='#d5a94e'){line(c,x,y,x,y-25,'#665236',2);polygon(c,[[x,y-25],[x+18,y-22],[x+15,y-12],[x,y-15]],color);}
function stones(c,x,y,w,h){for(let row=0;row<h/9;row++){let yy=y+row*9;line(c,x,yy,x+w,yy,'#7e817754',1);for(let xx=x+(row%2)*9;xx<x+w;xx+=18)line(c,xx,yy,xx,Math.min(yy+9,y+h),'#79776d70',1);}}
function roof(c,x,y,w,h,color='#a95436'){
 polygon(c,[[x-7,y],[x+w*.43,y-h],[x+w+7,y],[x+w*.5,y+10]],color);
 polygon(c,[[x+w*.43,y-h],[x+w+7,y],[x+w+7,y+7],[x+w*.43,y-h+6]],'#743d2e');
 for(let i=1;i<5;i++){let f=i/5;line(c,x-7+(w*.43+7)*f,y-h*f,x+w+7-(w*.57+7)*f,y-h*f,'#e59a5b80',1.3);}
 line(c,x-8,y,x+w*.43,y-h,'#ecc184',2.6);line(c,x+w*.43,y-h,x+w+7,y,'#e8ad70',2);
}
function house(c,x,y,w=66,h=43,color='#a95436'){
 shadow(c,x+w/2,y+3,w*.68);
 polygon(c,[[x,y-h],[x+w*.72,y-h+8],[x+w*.72,y+7],[x,y]],'#e3c89a');
 polygon(c,[[x+w*.72,y-h+8],[x+w,y-h-2],[x+w,y-4],[x+w*.72,y+7]],'#bba477');
 for(const dx of [3,w*.36,w*.7])line(c,x+dx,y-h+7,x+dx,y+(dx>w/2?6:0),'#725138',4);
 line(c,x,y-10,x+w*.72,y-4,'#755039',4);line(c,x+4,y-h+12,x+w*.34,y-14,'#97714d',2.6);
 roof(c,x,y-h+2,w,29,color);door(c,x+w*.42,y-20,13,23);window(c,x+9,y-29,12,12);window(c,x+w*.8,y-25,8,12);
 rect(c,x+w*.76,y-h-25,9,21,'#a79578');rect(c,x+w*.76-2,y-h-27,13,5,'#d6c4a0');
 ellipse(c,x-4,y-2,6,7,'#ae7046',outline);line(c,x-9,y-3,x+1,y-3,'#725436',2);
}
function tower(c,x,y,h=65,roofed=false){shadow(c,x,y+2,24);rect(c,x-16,y-h,32,h,'#b4b5a2');ellipse(c,x,y,16,5,'#929788',outline);rect(c,x-15,y-h+2,30,h-2,'#b4b5a2',null);rect(c,x+7,y-h+2,8,h-3,'#8b9486',null);stones(c,x-15,y-h+5,30,h-8);rect(c,x-3,y-h+18,6,13,'#4c5b54');ellipse(c,x,y-h,20,6,'#d8d4b8',outline);rect(c,x-20,y-h-9,40,9,'#cbc7ad');for(let i=0;i<4;i++)rect(c,x-20+i*11,y-h-16,7,10,'#d6d0b4');if(roofed){polygon(c,[[x-24,y-h-10],[x,y-h-61],[x+24,y-h-10]],'#3f7776');for(let i=1;i<5;i++)line(c,x-24+i*4,y-h-10-i*9,x+24-i*4,y-h-10-i*9,'#74a19a',1);flag(c,x,y-h-57);}}
export function drawTree(c,x,y,scale=1,variant=0){c.save();c.translate(x,y);c.scale(scale,scale);shadow(c,0,3,22);rect(c,-5,-29,10,32,'#7e5638');line(c,0,-15,-14,-27,'#7e5638',5);const pine=variant%4===0;if(pine){polygon(c,[[-27,-18],[0,-69],[27,-18]],'#355f47');polygon(c,[[-22,-33],[0,-78],[22,-33]],'#447a50');polygon(c,[[-15,-49],[0,-83],[15,-49]],'#6c9255');}else{ellipse(c,0,-41,29,28,'#345f46',outline);ellipse(c,-14,-44,19,21,'#507b47');ellipse(c,10,-49,21,24,'#608a4d');ellipse(c,-3,-60,20,18,'#779d57');ellipse(c,-10,-66,9,5,'#99b365');ellipse(c,20,-38,11,14,'#416d44');}c.restore();}
export function drawBuilding(c,b,unit=1){
 c.save();c.scale(unit,unit);const type=b.type;const level=b.level||1;
 if(b.hp<=0){shadow(c,0,0,32);for(let i=0;i<9;i++)polygon(c,[[i*7-30,0],[i*7-34,-8-i%3*4],[i*7-25,-12],[i*7-20,3]],'#989383');c.restore();return;}
 if(drawSprite(c,type)){if(level>1&&type!=='road'&&type!=='wall')flag(c,type==='castle'?65:30,type==='castle'?-100:-55);c.restore();return;}
 if(type==='house')house(c,-35,0,67,43,level>1?'#487b74':'#b9653e');
 if(type==='lumber'){house(c,-26,-1,59,40,'#477765');for(let i=0;i<3;i++){rect(c,-42+i*2,-9-i*7,30,8,'#92623e');ellipse(c,-12+i*2,-5-i*7,4,4,'#d3a66b',outline);}line(c,36,-4,39,-31,'#855b35',4);polygon(c,[[36,-29],[47,-34],[47,-24],[37,-22]],'#a6b3aa');}
 if(type==='barracks'){house(c,-39,0,77,51,'#6c7881');rect(c,-28,-34,19,21,'#af493d');polygon(c,[[-28,-14],[-19,-8],[-9,-14]],'#af493d');line(c,-25,-31,-13,-15,'#e1d0a1',2);line(c,-13,-31,-25,-15,'#e1d0a1',2);flag(c,29,-75,'#c46647');line(c,39,-1,39,-33,'#745637',2);line(c,44,-1,44,-30,'#745637',2);polygon(c,[[36,-32],[39,-41],[42,-32]],'#c6d1c5');}
 if(type==='market'){house(c,-31,-14,61,31,'#547c73');for(let i=0;i<5;i++)polygon(c,[[-36+i*15,-29],[-21+i*15,-29],[-21+i*15,-8],[-36+i*15,-8]],i%2?'#e0bd71':'#b9583f');for(let x=-35;x<40;x+=70)line(c,x,-9,x,11,'#785236',3);rect(c,-33,1,68,10,'#b68551');for(let i=0;i<9;i++)ellipse(c,-27+i*7,0,4,3,i%3?'#ddad4b':'#ae5a3c');}
 if(type==='quarry'){shadow(c,0,2,42);polygon(c,[[-38,0],[-33,-21],[-15,-40],[12,-32],[35,-10],[30,9]],'#8b938b');polygon(c,[[-33,-21],[-15,-40],[-3,-22],[-15,-6]],'#c0c3ae');polygon(c,[[-3,-22],[12,-32],[35,-10],[9,-11]],'#aab2a1');for(let i=0;i<4;i++)polygon(c,[[-27+i*17,8],[-30+i*17,-3],[-20+i*17,-9],[-13+i*17,5]],'#b9b9a2');line(c,22,-5,22,-57,'#7f5b38',5);line(c,-5,-56,35,-56,'#946b3d',5);line(c,22,-35,0,-56,'#7f5b38',3);line(c,-3,-55,-3,-24,'#574d32',1.5);rect(c,-12,-26,18,12,'#a38355');}
 if(type==='farm'){
 shadow(c,0,1,47);polygon(c,[[-44,-35],[39,-35],[44,9],[-41,9]],'#916f3e');
 for(let j=0;j<4;j++)for(let i=0;i<7;i++){const x=-34+i*10,y=-25+j*10;ellipse(c,x,y+5,4,2,'#705438');line(c,x,y+3,x,y-9,'#b3ad46',1.5);for(let k=0;k<3;k++){ellipse(c,x-2,y-5+k*3,2,3,'#efd373');ellipse(c,x+2,y-7+k*3,2,3,'#d5bd59');}}
 for(let x=-45;x<=45;x+=15){rect(c,x,-4,3,18,'#c9aa70');}line(c,-44,5,46,5,'#d6bd83',3);line(c,-45,-33,-43,13,'#d6bd83',3);line(c,42,-33,46,13,'#d6bd83',3);}
 if(type==='tower')tower(c,0,0,62+level*5,false);
 if(type==='wall'){shadow(c,0,1,24);rect(c,-24,-32,48,34,'#a8ac9a');polygon(c,[[-24,-32],[-18,-41],[30,-41],[24,-32]],'#d1cfb2');stones(c,-24,-31,48,32);for(let i=0;i<4;i++)rect(c,-24+i*14,-41,8,12,'#c7c5ac');rect(c,-24,-4,48,6,'#919b88');}
 if(type==='castle'){
 shadow(c,0,7,77);rect(c,-48,-90,97,83,'#c8c4a7');polygon(c,[[49,-90],[62,-104],[62,-12],[49,-7]],'#969e8c');stones(c,-48,-89,97,82);roof(c,-49,-91,98,45,'#407b7a');
 rect(c,-15,-141,30,55,'#d3ccb0');polygon(c,[[-23,-141],[0,-184],[23,-141]],'#467e7b');flag(c,0,-181);window(c,-7,-126,14,20);
 tower(c,-55,-6,68,true);tower(c,55,-6,68,true);rect(c,-34,-52,69,55,'#c8c6ae');stones(c,-34,-48,69,50);for(let i=0;i<5;i++)rect(c,-34+i*15,-62,9,13,'#ded6b7');
 c.beginPath();c.moveTo(-13,2);c.lineTo(-13,-22);c.arc(0,-22,13,Math.PI,0);c.lineTo(13,2);c.fillStyle='#524b3e';c.fill();for(let i=-8;i<12;i+=5)line(c,i,1,i,-27,'#a3824e',2);line(c,-12,-15,12,-15,'#bd9a60',2);
 rect(c,-42,-86,10,22,'#c4884c');rect(c,31,-86,10,22,'#c4884c');window(c,-28,-82,12,15);window(c,16,-82,12,15);
 if(level>1){flag(c,-55,-126,'#dca848');flag(c,55,-126,'#dca848');}
 }
 c.restore();
}
export function drawPerson(c,x,y,type='villager',phase=0,enemy=false){c.save();c.translate(x,y);shadow(c,0,1,5);const color=enemy?'#ad4f3b':type==='archer'?'#667d43':type==='guard'?'#526e83':type==='swordsman'?'#427875':'#b68051';line(c,-2,-2,-3+Math.sin(phase)*2,2,'#574532',2);line(c,2,-2,3-Math.sin(phase)*2,2,'#574532',2);rect(c,-4,-11,8,9,color);ellipse(c,0,-15,4.1,4.5,'#e4bd86',outline);ellipse(c,0,-18,4,2.5,type==='villager'?'#6a4c36':'#9da797');if(type!=='villager'){if(type==='archer'){c.beginPath();c.arc(5,-9,6,-1.4,1.4);c.strokeStyle='#ad8b53';c.lineWidth=1.4;c.stroke();}else{line(c,6,-2,6,-14,'#d5d8bd',2);ellipse(c,-5,-7,3.2,5,color,outline);}}c.restore();}
export function iconSvg(type){
 const paths={wood:'<path d="m6 22 17-12 6 7-17 12z" fill="#9b6036"/><ellipse cx="9" cy="25" rx="5" ry="6" fill="#d9ad73" transform="rotate(-37 9 25)"/><path d="m7 14 13-9 5 6-13 9z" fill="#b77d47"/><ellipse cx="10" cy="17" rx="4" ry="5" fill="#ebc28b"/>',stone:'<path d="m5 24 2-12 10-7 11 8 2 13-15 4z" fill="#97a79d"/><path d="m7 12 10-7 5 10-10 5z" fill="#cad0bb"/><path d="m12 20 10-5 8 11-15 4z" fill="#798e87"/>',food:'<path d="m12 29 11-25M17 22l-5-6m8 0-4-7" stroke="#9b7b36" fill="none"/><g fill="#dcae42"><ellipse cx="11" cy="17" rx="3" ry="5" transform="rotate(-35 11 17)"/><ellipse cx="16" cy="10" rx="3" ry="5" transform="rotate(-35 16 10)"/><ellipse cx="24" cy="10" rx="3" ry="5" transform="rotate(35 24 10)"/><ellipse cx="21" cy="18" rx="3" ry="5" transform="rotate(35 21 18)"/></g>',gold:'<ellipse cx="17" cy="23" rx="11" ry="5" fill="#b97c24"/><ellipse cx="17" cy="19" rx="11" ry="5" fill="#e3b647"/><ellipse cx="15" cy="14" rx="11" ry="5" fill="#ba882d"/><ellipse cx="15" cy="11" rx="11" ry="5" fill="#f0cd6c"/><path d="M13 8v6m4-5-4 4" stroke="#bb8e37"/>',people:'<circle cx="13" cy="10" r="5" fill="#e6c79b"/><path d="M4 28v-6a9 9 0 0 1 18 0v6" fill="#668878"/><circle cx="25" cy="13" r="4" fill="#e6c79b"/><path d="M24 21q8-1 7 7h-6" fill="#9aa982"/>',shield:'<path d="m17 4 11 5v10q-2 8-11 12Q6 25 6 19V9z" fill="#5d8277"/><path d="m17 8 7 4v7q-2 5-7 8z" fill="#a7b3a0"/>',sword:'<path d="m9 27 17-21 2-3 1 5-17 22z" fill="#c8d3c3"/><path d="m7 19 10 9M4 30l6-7" stroke="#b99551" stroke-width="3"/>',crown:'<path d="m5 11 7 6 5-11 5 11 8-6-3 17H8z" fill="#dcaf55"/><path d="M9 24h17" stroke="#f2d18c"/>',leaf:'<path d="M7 27C-1 4 23 3 29 4c1 21-14 30-22 23Z" fill="#6d9165"/><path d="m7 28 17-18" stroke="#d4dcb7"/>',hammer:'<path d="m9 30 14-20" stroke="#a57648" stroke-width="6"/><path d="m14 5 6-4 12 10-6 7z" fill="#96a297"/>'};
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><g stroke="#493e2c" stroke-width="1" stroke-linejoin="round">${paths[type]||paths.shield}</g></svg>`;
}
export const preview=spriteUrl;
