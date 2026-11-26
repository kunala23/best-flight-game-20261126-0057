// Merapi Courier — procedural sound. Every sound is synthesised with the
// Web Audio API: an engine drone tied to the throttle, a chime for each ring,
// a thud for the landing, wind that rises with speed. No audio files, no
// network, and nothing plays until the player first interacts with the page.

export function makeAudio() {
  const audio = {
    context: null,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    windSource: null,
    enabled: true,
    started: false,
  };

  audio.unlock = function unlock() {
    if (audio.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audio.context = ctx;

      // Engine: two detuned sawtooth voices through a low-pass filter.
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 62;
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 31;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 2;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();

      // Wind: looped filtered noise whose gain follows airspeed.
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();

      audio.engineOsc = osc1;
      audio.engineOsc2 = osc2;
      audio.engineGain = gain;
      audio.windGain = windGain;
      audio.started = true;
    } catch {
      // Sound is garnish: a browser without Web Audio still plays fine.
      audio.context = null;
    }
  };

  // Call every frame while flying; the drone follows throttle and speed.
  audio.updateEngine = function updateEngine(throttle, speed, flying) {
    if (!audio.context || !audio.started) return;
    const ctx = audio.context;
    const t = ctx.currentTime;
    const target = audio.enabled && flying ? 0.02 + throttle * 0.05 : 0;
    audio.engineGain.gain.setTargetAtTime(target, t, 0.1);
    const freq = 52 + throttle * 68 + speed * 0.12;
    audio.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    audio.engineOsc2.frequency.setTargetAtTime(freq * 0.5, t, 0.08);
    const windTarget = audio.enabled && flying ? Math.min(0.06, speed * 0.00035) : 0;
    audio.windGain.gain.setTargetAtTime(windTarget, t, 0.2);
  };

  audio.chime = function chime(centre) {
    if (!audio.context || !audio.enabled) return;
    const ctx = audio.context;
    const notes = centre ? [880, 1318.5, 1760] : [659.25, 987.77];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  };

  audio.thud = function thud(hard) {
    if (!audio.context || !audio.enabled) return;
    const ctx = audio.context;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hard ? 90 : 70, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(hard ? 0.3 : 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  audio.alarm = function alarm() {
    if (!audio.context || !audio.enabled) return;
    const ctx = audio.context;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 740;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  };

  return audio;
}
