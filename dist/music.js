(function () {
  "use strict";

  const beat = 60 / 92;
  const bars = [
    { keys: [53, 57, 60, 64, 67], bass: [41, 48, 52], lead: [[0.5, 69], [1.5, 72], [2, 74, 0.9], [3.5, 72]] },
    { keys: [53, 57, 60, 64, 69], bass: [38, 45, 48], lead: [[0, 69, 1.1], [2, 65], [2.5, 67], [3.5, 69]] },
    { keys: [53, 57, 58, 62, 67], bass: [43, 50, 53], lead: [[0, 70, 0.95], [1.5, 69], [2.5, 67, 0.9]] },
    { keys: [52, 58, 62, 65, 69], bass: [36, 43, 47], lead: [[0.5, 65], [1.5, 67], [2, 64, 1.0]] },
    { keys: [55, 59, 60, 64, 67], bass: [45, 52, 55], lead: [[0.5, 69], [1.5, 72], [2, 76, 1.0], [3.5, 74]] },
    { keys: [54, 60, 63, 65, 69], bass: [38, 45, 42], lead: [[0, 72], [1, 69, 0.8], [2.5, 66], [3.5, 69]] },
    { keys: [53, 57, 58, 62, 65], bass: [43, 46, 50], lead: [[0, 70, 0.8], [1.5, 72], [2.5, 74, 0.9]] },
    { keys: [52, 58, 62, 67, 69], bass: [36, 43, 45], lead: [[0, 67, 1.0], [2, 64], [2.5, 65, 1.15]] },
    { keys: [53, 57, 60, 62, 65], bass: [46, 53, 57], lead: [[0.5, 77, 0.65], [1.5, 76], [2, 74], [3, 72, 0.8]] },
    { keys: [53, 56, 59, 62, 65], bass: [47, 53, 56], lead: [[0, 71, 0.95], [1.5, 74], [2.5, 77, 0.8]] },
    { keys: [55, 59, 60, 64, 67], bass: [45, 52, 55], lead: [[0, 76, 1.1], [1.5, 72], [2.5, 71], [3.5, 69]] },
    { keys: [53, 57, 60, 64, 65], bass: [38, 45, 48], lead: [[0, 69, 0.9], [2, 65], [2.5, 64, 0.85]] },
    { keys: [53, 57, 58, 62, 67], bass: [43, 50, 53], lead: [[0.5, 70], [1.5, 72], [2, 74, 1.0], [3.5, 77]] },
    { keys: [52, 58, 62, 67, 69], bass: [36, 43, 46], lead: [[0, 76, 0.85], [1.5, 74], [2.5, 72], [3.5, 67]] },
    { keys: [53, 57, 62, 65, 67], bass: [41, 48, 50], lead: [[0, 69], [1, 67], [2, 65, 1.55]] },
    { keys: [53, 58, 62, 64, 67], bass: [36, 43, 48], lead: [[0.5, 62], [1.5, 64], [2.5, 67], [3.5, 65]] }
  ];

  const cues = {
    interaction: [[65, 0, 0.064], [72, 0.075, 0.044]],
    points: [[69, 0, 0.080], [72, 0.074, 0.065], [77, 0.148, 0.078]],
    buy: [[65, 0, 0.074], [69, 0.068, 0.065], [72, 0.136, 0.059], [77, 0.204, 0.081]],
    step: [[53, 0, 0.020]]
  };

  let audio;
  let enabled = false;
  let generation = 0;
  let interval;
  let silenceTimer;
  let nextBar = 0;
  let nextTime;
  let lastStep = -Infinity;
  let seed = 1429;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function makeAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;

    const context = new Audio();
    const master = context.createGain();
    const music = context.createGain();
    const effects = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const room = context.createConvolver();
    const wet = context.createGain();

    master.gain.value = 0;
    music.gain.value = 0.86;
    effects.gain.value = 0.8;
    compressor.threshold.value = -16;
    compressor.ratio.value = 2.5;
    wet.gain.value = 0.19;

    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 0.85), context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const samples = impulse.getChannelData(channel);
      let previous = 0;
      for (let i = 25; i < samples.length; i++) {
        previous = (random() * 2 - 1) * 0.52 + previous * 0.48;
        samples[i] = previous * Math.pow(1 - i / samples.length, 3);
      }
    }
    room.buffer = impulse;
    room.connect(wet).connect(master);
    music.connect(master);
    effects.connect(master);
    master.connect(compressor).connect(context.destination);

    const noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.28), context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1;

    return { context, master, music, effects, room, noise };
  }

  function voice(type, pitch, time, length, level, destination, pan = 0, reverb = false) {
    const { context, room } = audio;
    const envelope = context.createGain();
    const oscillator = context.createOscillator();
    const attack = type === "triangle" ? 0.014 : 0.008;
    const end = time + length;

    oscillator.type = type;
    oscillator.frequency.value = 440 * Math.pow(2, (pitch - 69) / 12);
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + attack);
    envelope.gain.exponentialRampToValueAtTime(level * 0.24, time + length * 0.54);
    envelope.gain.exponentialRampToValueAtTime(0.00001, end);
    oscillator.connect(envelope);

    if (pan && context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      envelope.connect(panner).connect(destination);
    } else {
      envelope.connect(destination);
    }
    if (reverb) envelope.connect(room);

    oscillator.start(time);
    oscillator.stop(end + 0.01);
  }

  function keys(pitch, time, length, level, pan, destination) {
    voice("triangle", pitch, time, length, level, destination, pan, true);
    voice("sine", pitch + 19, time + 0.002, 0.14, level * 0.24, destination, pan);
  }

  function kick(time, level) {
    const { context, music } = audio;
    const body = context.createOscillator();
    const gain = context.createGain();
    body.frequency.setValueAtTime(95, time);
    body.frequency.exponentialRampToValueAtTime(48, time + 0.1);
    gain.gain.setValueAtTime(0.00001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.21);
    body.connect(gain).connect(music);
    body.start(time);
    body.stop(time + 0.22);
  }

  function brush(time, length, level, frequency) {
    const { context, music, noise } = audio;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.75;
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + length);
    source.connect(filter).connect(envelope).connect(music);
    source.start(time, random() * (noise.duration - length));
    source.stop(time + length + 0.005);
  }

  function swing(position) {
    return (position + (position % 1 === 0.5 ? 0.11 : 0)) * beat;
  }

  function playBar(index, time) {
    const { music } = audio;
    const { keys: chord, bass, lead } = bars[index];

    const chordHits = index % 4 === 3 ? [[0, 1.5], [2.5, 0.91]] : [[0, 1.42], [1.5, 0.7], [3, 0.78]];
    chordHits.forEach(([position, length], hit) => {
      chord.forEach((pitch, note) => {
        if (hit && note === 0) return;
        const spread = note * (0.007 + random() * 0.003);
        const level = (0.017 + random() * 0.006) * (hit ? 0.7 : 1);
        keys(pitch, time + swing(position) + spread, length, level, (note - 2) * 0.20, music);
      });
    });

    const bassHits = index % 4 === 1 ? [0, 1.5, 3] : [0, 2, 3.5];
    bassHits.forEach((position, note) => {
      const start = time + swing(position) + 0.012;
      const length = [0.75, 0.52, 0.35][note];
      voice("sine", bass[note], start, length, note ? 0.039 : 0.054, music);
      voice("triangle", bass[note] + 12, start, length * 0.67, 0.009, music);
    });

    lead.forEach(([position, pitch, length = 0.56], note) => {
      const start = time + swing(position) + 0.018 + random() * 0.014;
      keys(pitch, start, length, (0.056 + random() * 0.013) * (note ? 0.84 : 1), 0.13, music);
    });

    kick(time + 0.006, 0.065);
    kick(time + swing(index % 2 ? 2.5 : 2), 0.045);
    [1, 3].forEach((position) => brush(time + swing(position) + 0.022, 0.18, 0.046, 1700));
    [0.5, 1.5, 2.5, 3.5].forEach((position) => {
      brush(time + swing(position) + random() * 0.017, 0.095, 0.022 + random() * 0.012, 5750);
    });
    if (index % 4 === 3) brush(time + swing(3.75), 0.08, 0.023, 2800);
  }

  function tick() {
    const now = audio.context.currentTime;
    if (nextTime < now) nextTime = now + 0.05;
    if (nextTime > now + 0.35) return;
    playBar(nextBar, nextTime);
    nextBar = (nextBar + 1) % bars.length;
    nextTime += 4 * beat;
  }

  function fade(level) {
    const now = audio.context.currentTime;
    const gain = audio.master.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else gain.cancelScheduledValues(now);
    gain.setTargetAtTime(level, now, 0.035);
  }

  function stop() {
    clearInterval(interval);
    interval = undefined;
    if (!audio) return;

    fade(0);
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if ((!enabled || document.hidden) && audio.context.state === "running") {
        audio.context.suspend().then(() => {
          if (enabled && !document.hidden) start();
        }).catch(() => {});
      }
    }, 260);
  }

  async function start() {
    const request = ++generation;
    clearTimeout(silenceTimer);
    try {
      audio ||= makeAudio();
      if (!audio) {
        enabled = false;
        return false;
      }
      if (audio.context.state !== "running") await audio.context.resume();
    } catch {
      if (request === generation) enabled = false;
      return false;
    }
    if (request !== generation || !enabled || document.hidden) return enabled;

    fade(0.68);
    if (interval === undefined) {
      const now = audio.context.currentTime;
      if (!(nextTime > now)) nextTime = now + 0.07;
      tick();
      interval = setInterval(tick, 100);
    }
    return true;
  }

  window.CozyAudio = {
    get enabled() {
      return enabled;
    },
    async setEnabled(value) {
      enabled = Boolean(value);
      if (enabled) return start();

      generation++;
      stop();
      return false;
    },
    cue(name) {
      if (!enabled || !audio || audio.context.state !== "running" || document.hidden) return;
      if (!Object.prototype.hasOwnProperty.call(cues, name)) return;
      const now = audio.context.currentTime;
      if (name === "step") {
        if (now - lastStep < 0.18) return;
        lastStep = now;
      }
      for (const [pitch, delay, level] of cues[name]) {
        keys(pitch, now + delay + 0.01, name === "step" ? 0.15 : 0.4, level, 0.1, audio.effects);
      }
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (!enabled) return;
    if (document.hidden) {
      generation++;
      stop();
    } else {
      start();
    }
  });
})();
