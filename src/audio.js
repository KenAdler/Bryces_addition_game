// ═══════════════════════════════════════════════════════
//  BRYCE BEAST AUDIO ENGINE
//  - Background music (looping, intensity-aware)
//  - Correct fanfare
//  - Wrong fart
//  - Speech announcer ("CORRECT!" / "WRONG!")
// ═══════════════════════════════════════════════════════

let ctx = null;
let master = null;
let bgTimer = null;
let nextNoteTime = 0;
let patternBeat = 0;
let muted = false;
let intensity = 'normal'; // 'normal' | 'player' | 'tense'

const BPM   = 124;
const BEAT  = 60 / BPM;
const LOOK  = 0.25;   // seconds to schedule ahead
const TICK  = 80;     // ms between scheduler ticks

// ─── NOTE TABLE (Hz) ──────────────────────────────────
const N = {
  C3:130.81, D3:146.83, F3:174.61, G3:196.00,
  C4:261.63, D4:293.66, E4:329.63, G4:392.00,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  C6:1046.50
};

// ─── PATTERN (16 beats = 4 bars of 4/4) ───────────────
const PLEN = 16;

// [beat_offset, hz, dur_beats, vol]
const BASS = [
  [0,N.C3,.85,.35],[1,N.C3,.4,.25],[2,N.C3,.4,.22],[3,N.G3,.85,.32],
  [4,N.F3,.85,.35],[5,N.F3,.4,.25],[6,N.G3,.4,.22],[7,N.C3,.85,.32],
  [8,N.G3,.85,.35],[9,N.G3,.4,.25],[10,N.F3,.4,.22],[11,N.C3,.85,.32],
  [12,N.C3,.85,.35],[13,N.D3,.4,.28],[14,N.F3,.4,.25],[15,N.G3,.75,.32],
];

const MELODY = [
  [0,N.C5,.4,.12],[.5,N.E5,.3,.09],[1,N.G5,.4,.1],[1.5,N.F5,.3,.08],
  [2,N.E5,.5,.1],[3,N.C5,.4,.1],[3.5,N.D5,.3,.08],
  [4,N.F5,.4,.1],[4.5,N.G5,.3,.09],[5,N.A5,.5,.12],
  [5.5,N.G5,.3,.09],[6,N.F5,.35,.1],[6.5,N.E5,.3,.08],[7,N.C5,.8,.12],
  [8,N.G5,.4,.12],[8.5,N.A5,.3,.1],[9,N.G5,.4,.1],[9.5,N.F5,.3,.08],
  [10,N.E5,.5,.1],[11,N.G5,.4,.1],
  [12,N.C6,.35,.15],[12.5,N.G5,.3,.1],[13,N.E5,.4,.1],[13.5,N.D5,.3,.08],
  [14,N.C5,.5,.1],[14.5,N.D5,.3,.08],[15,N.E5,.7,.12],
];

// ─── INIT ─────────────────────────────────────────────
function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.4;
  master.connect(ctx.destination);
  nextNoteTime = ctx.currentTime + 0.05;
  patternBeat = 0;
  bgTimer = setInterval(scheduleTick, TICK);
}

function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.4, ctx.currentTime, 0.1);
  return muted;
}

function setIntensity(level) { intensity = level; }

// ─── BACKGROUND SCHEDULER ─────────────────────────────
function scheduleTick() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOK) {
    schedulePatternSlice(patternBeat, nextNoteTime);
    nextNoteTime += BEAT;
    patternBeat  = (patternBeat + 1) % PLEN;
  }
}

function schedulePatternSlice(b, t) {
  // Kick: beats 0, 4, 8, 12
  if (b % 4 === 0) kick(t, intensity === 'player' ? 0.7 : 0.5);

  // Snare: beats 4, 12  (every other bar's beat 2)
  if (b === 4 || b === 12) snare(t, 0.45);

  // Rimshot accent: beats 8
  if (b === 8) snare(t, 0.25);

  // Hi-hat every beat; extra off-beat when intense
  hihat(t, b % 2 === 0 ? 0.12 : 0.08);
  if (intensity !== 'normal') hihat(t + BEAT * 0.5, 0.05);

  // Bass
  BASS.filter(([beat]) => beat === b).forEach(([,hz,dur,vol]) =>
    bassNote(hz, t, dur * BEAT, vol)
  );

  // Melody — fractional beat notes scheduled at beat + 0.5 offset
  MELODY.filter(([beat]) => Math.floor(beat) === b).forEach(([beat,hz,dur,vol]) => {
    const offset = (beat % 1) * BEAT;
    melodyNote(hz, t + offset, dur * BEAT, vol * (intensity === 'player' ? 1.3 : 1));
  });
}

// ─── DRUM SYNTHESIZERS ────────────────────────────────
function kick(t, vol) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(master);
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.start(t); osc.stop(t + 0.26);
}

function snare(t, vol) {
  // Noise burst
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src   = ctx.createBufferSource();
  const filt  = ctx.createBiquadFilter();
  const gain  = ctx.createGain();
  src.buffer  = buf;
  filt.type   = 'bandpass';
  filt.frequency.value = 3500;
  src.connect(filt); filt.connect(gain); gain.connect(master);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  src.start(t);
}

function hihat(t, vol) {
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src  = ctx.createBufferSource();
  const filt = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  filt.type  = 'highpass';
  filt.frequency.value = 8000;
  src.connect(filt); filt.connect(gain); gain.connect(master);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  src.start(t);
}

// ─── TONAL SYNTHESIZERS ───────────────────────────────
function bassNote(hz, t, dur, vol) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type   = 'sawtooth';
  const filt = ctx.createBiquadFilter();
  filt.type  = 'lowpass';
  filt.frequency.value = 400;
  osc.connect(filt); filt.connect(gain); gain.connect(master);
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.setValueAtTime(vol, t + dur - 0.05);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
}

function melodyNote(hz, t, dur, vol) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type   = 'triangle';
  osc.connect(gain); gain.connect(master);
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.015);
  gain.gain.setValueAtTime(vol * 0.7, t + dur * 0.5);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
}

// ─── SOUND EFFECTS ────────────────────────────────────
function playCorrect() {
  if (!ctx) return;
  // Triumphant ascending fanfare: C-E-G-C one octave up
  const fanfare = [
    [N.C5, 0],
    [N.E5, 0.1],
    [N.G5, 0.2],
    [N.C6, 0.32],
  ];
  fanfare.forEach(([hz, offset]) => {
    const t    = ctx.currentTime + offset;
    const osc  = ctx.createOscillator();
    const osc2 = ctx.createOscillator(); // harmony
    const gain = ctx.createGain();
    osc.type   = 'triangle';
    osc2.type  = 'sine';
    osc.frequency.value  = hz;
    osc2.frequency.value = hz * 1.5; // fifth above
    osc.connect(gain); osc2.connect(gain); gain.connect(master);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t);  osc.stop(t + 0.46);
    osc2.start(t); osc2.stop(t + 0.46);
  });
}

function playWrong() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.75;

  // Noise source (the actual fart body)
  const bufSize = Math.floor(ctx.sampleRate * dur);
  const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src   = ctx.createBufferSource();
  src.buffer  = buf;

  // Low-pass filter — sweeps down for that "braaap" quality
  const filt  = ctx.createBiquadFilter();
  filt.type   = 'lowpass';
  filt.Q.value = 8;
  filt.frequency.setValueAtTime(600, now);
  filt.frequency.linearRampToValueAtTime(80, now + dur);

  // LFO to wobble the filter (creates the "flap" effect)
  const lfo      = ctx.createOscillator();
  const lfoGain  = ctx.createGain();
  lfo.frequency.value  = 18;
  lfoGain.gain.value   = 200;
  lfo.connect(lfoGain); lfoGain.connect(filt.frequency);

  // Volume envelope
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.04);
  gain.gain.setValueAtTime(0.85, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(filt); filt.connect(gain); gain.connect(master);
  src.start(now); lfo.start(now);
  src.stop(now + dur); lfo.stop(now + dur);

  // Also play a descending "womp" note underneath
  const womp = ctx.createOscillator();
  const wGain = ctx.createGain();
  womp.type = 'sine';
  womp.frequency.setValueAtTime(120, now);
  womp.frequency.exponentialRampToValueAtTime(40, now + dur);
  wGain.gain.setValueAtTime(0.4, now);
  wGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  womp.connect(wGain); wGain.connect(master);
  womp.start(now); womp.stop(now + dur);
}

// ─── SPEECH ANNOUNCER ────────────────────────────────
let synth = window.speechSynthesis;
let voices = [];

// Load voices (async on some browsers)
function loadVoices() {
  voices = synth.getVoices();
}
loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

function pickVoice() {
  // Prefer a deep male US/UK voice for the announcer
  const preferred = ['Google US English', 'Alex', 'Daniel', 'en-US', 'en-GB'];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name) || v.lang.includes(name));
    if (v) return v;
  }
  return voices[0] || null;
}

function announce(text) {
  if (!synth) return;
  synth.cancel(); // cut off any previous
  const utt   = new SpeechSynthesisUtterance(text);
  utt.voice   = pickVoice();
  utt.pitch   = 1.1;
  utt.rate    = 0.9;
  utt.volume  = 1;
  synth.speak(utt);
}
