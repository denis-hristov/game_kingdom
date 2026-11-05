let context;
let enabled = true;

export function setSoundEnabled(value) { enabled = value; }

export function unlockSound() {
  if (!enabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context ||= new AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => {});
  } catch { /* Audio is optional on devices without Web Audio. */ }
}

function strike(at, frequency, duration, volume) {
  const tone = context.createOscillator();
  const gain = context.createGain();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(frequency, at);
  tone.frequency.exponentialRampToValueAtTime(frequency / 3, at + duration);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(.001, at + duration);
  tone.connect(gain).connect(context.destination);
  tone.start(at); tone.stop(at + duration);
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .04), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const impact = context.createGain();
  noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency * 3;
  impact.gain.setValueAtTime(volume * .7, at);
  noise.connect(filter).connect(impact).connect(context.destination);
  noise.start(at); noise.stop(at + .04);
}

export function playSound(kind) {
  if (!enabled || !context || context.state !== 'running') return;
  const now = context.currentTime;
  if (kind === 'road') { strike(now, 720, .08, .1); strike(now + .09, 540, .1, .08); }
  else if (kind === 'remove') strike(now, 150, .2, .12);
  else if (kind === 'harvest') { strike(now, 620, .1, .07); strike(now + .07, 830, .12, .07); }
  else { strike(now, 280, .13, .12); strike(now + .12, 420, .12, .1); strike(now + .24, 560, .16, .08); }
}

export function changeSound(before, after) {
  if (after.time !== before.time || after.gameOver) return null;
  if (after.buildings.length > before.buildings.length) return after.buildings.at(-1).type === 'road' ? 'road' : 'build';
  if (after.buildings.length < before.buildings.length) return 'remove';
  if (after.buildings.some((b, i) => b.level > before.buildings[i].level || b.hp > before.buildings[i].hp || b.x !== before.buildings[i].x || b.y !== before.buildings[i].y)) return 'build';
  if ((after.waterTiles?.length||0)!==(before.waterTiles?.length||0)) return 'road';
  if (after.crops.length !== before.crops.length || after.crops.some((c, i) => c.progress < before.crops[i].progress)) return 'harvest';
  return null;
}
