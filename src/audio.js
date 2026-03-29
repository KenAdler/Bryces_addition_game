// ═══════════════════════════════════════════════════════
//  BRYCE BEAST AUDIO ENGINE
//  - Background music: Soda Pop (HTML5 Audio, looping)
//  - Correct fanfare (Web Audio API)
//  - Wrong fart    (Web Audio API)
//  - Speech announcer ("Correct!" / "Wrong!")
// ═══════════════════════════════════════════════════════

let ctx    = null;
let master = null;
let muted  = false;

// ─── BACKGROUND MUSIC (HTML5 Audio) ──────────────────
const bgAudio = new Audio('media/soda-pop.mp3');
bgAudio.loop   = true;
bgAudio.volume = 0.35;

function initAudio() {
  // iOS requires a user-gesture to start audio
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  ctx.resume();
  bgAudio.play().catch(() => {}); // catch autoplay block silently
}

function toggleMute() {
  muted = !muted;
  bgAudio.muted = muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.1);
  return muted;
}

// intensity hook kept for API compatibility — no-op with real music
function setIntensity() {}

// ─── SOUND EFFECTS ────────────────────────────────────
function playCorrect() {
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
  notes.forEach((hz, i) => {
    const t    = ctx.currentTime + i * 0.11;
    const osc  = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type  = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value  = hz;
    osc2.frequency.value = hz * 1.5;
    osc.connect(gain); osc2.connect(gain); gain.connect(master);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.start(t);  osc.stop(t + 0.43);
    osc2.start(t); osc2.stop(t + 0.43);
  });
}

function playWrong() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.75;

  // Noise body (the "braaap")
  const bufSize = Math.floor(ctx.sampleRate * dur);
  const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src  = ctx.createBufferSource();
  src.buffer = buf;

  const filt = ctx.createBiquadFilter();
  filt.type  = 'lowpass';
  filt.Q.value = 8;
  filt.frequency.setValueAtTime(600, now);
  filt.frequency.linearRampToValueAtTime(80, now + dur);

  // LFO wobble for the "flap"
  const lfo     = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 18;
  lfoGain.gain.value  = 200;
  lfo.connect(lfoGain); lfoGain.connect(filt.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.04);
  gain.gain.setValueAtTime(0.85, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(filt); filt.connect(gain); gain.connect(master);
  src.start(now); lfo.start(now);
  src.stop(now + dur); lfo.stop(now + dur);

  // Descending womp underneath
  const womp  = ctx.createOscillator();
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
const synth = window.speechSynthesis;
let voices  = [];

function loadVoices() { voices = synth.getVoices(); }
loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

function pickVoice() {
  const preferred = ['Google US English', 'Alex', 'Daniel', 'en-US', 'en-GB'];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name) || v.lang.includes(name));
    if (v) return v;
  }
  return voices[0] || null;
}

function announce(text) {
  if (!synth) return;
  synth.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.voice  = pickVoice();
  utt.pitch  = 1.1;
  utt.rate   = 0.9;
  utt.volume = 1;
  synth.speak(utt);
}
