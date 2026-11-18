// Every sound in Hearthlight is synthesised here with the Web Audio API: no sound files, no
// network. Effects are short enveloped oscillators and filtered noise; the music is a slow,
// generated lullaby in a minor pentatonic that darkens as the night goes on. M toggles all sound.

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
const ROOT = 196; // G3

export function createAudio() {
  let context = null;
  let master = null;
  let musicBus = null;
  let noise = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let intensity = 0;

  function ensure() {
    if (context) return context.state === 'running';
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    context = new Context();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = 0.22;
    musicBus.connect(master);
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, duration, { type = 'sine', gain = 0.3, slide = 0, delay = 0, bus = null } = {}) {
    if (!context || muted) return;
    const t = context.currentTime + delay;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(bus ?? master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function hiss(duration, { gain = 0.25, freq = 1200, q = 1, type = 'bandpass', delay = 0 } = {}) {
    if (!context || muted) return;
    const t = context.currentTime + delay;
    const src = context.createBufferSource();
    src.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(amp).connect(master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  const effects = {
    shoot() { tone(720 + Math.random() * 80, 0.07, { type: 'triangle', gain: 0.07, slide: 0.6 }); },
    hit() { hiss(0.05, { gain: 0.12, freq: 3200, q: 2 }); },
    kill() { tone(330, 0.18, { type: 'square', gain: 0.06, slide: 2.2 }); hiss(0.18, { gain: 0.16, freq: 5200, q: 0.8 }); },
    shatter() { hiss(0.45, { gain: 0.3, freq: 2400, q: 0.6 }); tone(140, 0.4, { type: 'sawtooth', gain: 0.08, slide: 0.4 }); },
    hurt() { tone(180, 0.3, { type: 'sawtooth', gain: 0.18, slide: 0.35 }); hiss(0.25, { gain: 0.2, freq: 400, type: 'lowpass' }); },
    hearthHit() { tone(90, 0.35, { type: 'sine', gain: 0.35, slide: 0.6 }); hiss(0.3, { gain: 0.15, freq: 900 }); },
    dash() { hiss(0.18, { gain: 0.22, freq: 1800, q: 0.7, type: 'highpass' }); },
    flare() { tone(110, 0.7, { type: 'sawtooth', gain: 0.18, slide: 3 }); hiss(0.7, { gain: 0.3, freq: 700, q: 0.5 }); },
    pickup() { tone(990, 0.08, { type: 'sine', gain: 0.08 }); tone(1480, 0.1, { type: 'sine', gain: 0.06, delay: 0.05 }); },
    heart() { [0, 4, 7].forEach((n, i) => tone(523 * 2 ** (n / 12), 0.25, { type: 'triangle', gain: 0.1, delay: i * 0.07 })); },
    wave() { [0, 7, 12].forEach((n, i) => tone(ROOT * 2 ** (n / 12), 0.6, { type: 'triangle', gain: 0.12, delay: i * 0.12 })); },
    upgrade() { [0, 5, 9, 12].forEach((n, i) => tone(392 * 2 ** (n / 12), 0.3, { type: 'sine', gain: 0.12, delay: i * 0.06 })); },
    boss() { tone(55, 1.6, { type: 'sawtooth', gain: 0.25, slide: 1.5 }); tone(82, 1.6, { type: 'sawtooth', gain: 0.18, slide: 0.7 }); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(ROOT * 2 * 2 ** (n / 12), 0.9, { type: 'triangle', gain: 0.12, delay: i * 0.11 })); },
    lose() { [12, 10, 7, 3, 0].forEach((n, i) => tone(ROOT * 2 ** (n / 12), 0.7, { type: 'sine', gain: 0.14, delay: i * 0.18 })); },
    click() { tone(600, 0.05, { type: 'square', gain: 0.05 }); },
  };

  return {
    /** Start audio on the first user gesture (browsers keep it silent until then). */
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume();
    },
    play(name) { if (effects[name]) effects[name](); },
    /** 0 on the title, rising with the wave number: the music thickens as the night deepens. */
    setIntensity(value) { intensity = value; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    get muted() { return muted; },
    /** Advance the generated music by `dt` seconds of real time. */
    update(dt) {
      if (!context || muted || context.state !== 'running') return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      const beat = 0.42 - intensity * 0.012;
      musicTimer += beat;
      const bar = Math.floor(musicStep / 8);
      const chordRoot = [0, -4, -2, -5][bar % 4];
      if (musicStep % 8 === 0) tone(ROOT / 2 * 2 ** (chordRoot / 12), beat * 7.5, { type: 'triangle', gain: 0.35, bus: musicBus });
      const degree = SCALE[(musicStep * 3 + bar * 2 + (musicStep % 3)) % SCALE.length];
      if (musicStep % 2 === 0 || intensity > 4) tone(ROOT * 2 ** ((degree + chordRoot) / 12), beat * 1.8, { type: 'sine', gain: 0.18, bus: musicBus });
      if (intensity > 2 && musicStep % 4 === 2) hiss(0.06, { gain: 0.05, freq: 6000, q: 1 });
      musicStep += 1;
    },
  };
}
