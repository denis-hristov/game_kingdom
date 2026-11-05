export const UNITS = {
  swordsman:{name:'Swordsman',desc:'A balanced fighter for expeditions.',cost:{food:30,gold:20},power:18,hp:90,attack:12,range:1.5,time:10},
  archer:{name:'Archer',desc:'Attacks from a distance with half a swordsman\'s damage.',cost:{food:25,wood:20,gold:15},power:15,hp:55,attack:6,range:5,time:12},
  guard:{name:'Guard',desc:'A resilient village defender with half a swordsman\'s damage.',cost:{food:35,stone:15,gold:20},power:16,hp:140,attack:6,range:1.5,time:14},
};

const RAID_FORMATIONS = [
  ['swordsman','guard','swordsman','archer','swordsman'],
  ['swordsman','archer','guard','archer','swordsman'],
  ['guard','swordsman','guard','archer','swordsman'],
];

export function raidRoster(wave){
 const formation=RAID_FORMATIONS[(wave-1)%RAID_FORMATIONS.length];
 return Array.from({length:3+wave*2},(_,index)=>formation[index%formation.length]);
}

export function raiderStats(type,wave=0,definitions=UNITS){
 const swordsman=definitions.swordsman,unit=definitions[type]||swordsman,ratio=unit.attack/swordsman.attack;
 return {
  maxHp:Math.round((55+wave*12)*unit.hp/swordsman.hp),
  attack:(10+wave*2)*ratio,
  buildingAttack:(12+wave*2)*ratio,
  range:unit.range,
  buildingRange:unit.range>2?4.5:.65,
  speed:type==='guard'?.34:type==='archer'?.42:.4,
 };
}
