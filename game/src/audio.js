// Sound, all synthesised with WebAudio — no audio files, no network. Footsteps tick
// as you move, an alarm stings when a guard spots you, a chime rings when you lift the
// Star, and a short fanfare plays on a clean getaway. A quiet low drone hums under the
// museum once you start. M mutes everything.
export function createAudio() {
  let context = null;
  let master = null;
  let drone = null;
  let muted = false;
  let stepHigh = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!context || !master) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (!context || !master) return;
    const start = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  function startDrone() {
    if (!context || !master || drone) return;
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(master);
    const oscA = context.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = context.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 55.7;
    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start();
    oscB.start();
    drone = { gain, oscA, oscB };
  }

  return {
    /** Call on the first user gesture; starts the context and the museum drone. */
    unlock() {
      if (!ensure()) return;
      startDrone();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    step() {
      if (!ensure()) return;
      stepHigh = !stepHigh;
      noiseBurst(0.07, 0.16, stepHigh ? 420 : 300);
    },
    alert() {
      if (!ensure()) return;
      tone(620, 0.14, 'square', 0.16);
      tone(880, 0.2, 'square', 0.16, 0.12);
    },
    pickup() {
      if (!ensure()) return;
      tone(880, 0.16, 'sine', 0.2);
      tone(1318, 0.28, 'sine', 0.2, 0.1);
    },
    win() {
      if (!ensure()) return;
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, index) => tone(freq, 0.3, 'triangle', 0.2, index * 0.11));
    },
    caught() {
      if (!ensure()) return;
      tone(220, 0.5, 'sawtooth', 0.18, 0, 110);
      tone(233, 0.5, 'sawtooth', 0.12, 0.05, 116);
    },
  };
}
