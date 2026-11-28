// Every sound in the game, synthesised with WebAudio: no audio files, no
// network. A tiny helper builds short oscillator blips; each effect composes
// a few of them. Created lazily on the first user gesture (browsers block
// audio before one) and silenced by the mute toggle.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  /** One tone: frequency slides from `from` to `to` over `seconds`. */
  function tone({ from, to = from, seconds = 0.12, type = 'sine', gain = 0.16, when = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  return {
    /** Call on the first key press or click so later sounds are allowed. */
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone({ from: 280, to: 560, seconds: 0.16, type: 'sine', gain: 0.14 });
    },
    land() {
      tone({ from: 140, to: 70, seconds: 0.08, type: 'triangle', gain: 0.1 });
    },
    corn() {
      tone({ from: 880, to: 1320, seconds: 0.1, type: 'sine', gain: 0.14 });
      tone({ from: 1320, to: 1760, seconds: 0.1, type: 'sine', gain: 0.1, when: 0.07 });
    },
    feather() {
      tone({ from: 660, to: 990, seconds: 0.12, type: 'triangle', gain: 0.12 });
      tone({ from: 990, to: 1480, seconds: 0.14, type: 'triangle', gain: 0.1, when: 0.09 });
    },
    golden() {
      tone({ from: 523, seconds: 0.1, type: 'sine', gain: 0.13 });
      tone({ from: 659, seconds: 0.1, type: 'sine', gain: 0.13, when: 0.09 });
      tone({ from: 784, seconds: 0.16, type: 'sine', gain: 0.13, when: 0.18 });
    },
    feed() {
      tone({ from: 523, seconds: 0.09, type: 'sine', gain: 0.14 });
      tone({ from: 659, seconds: 0.09, type: 'sine', gain: 0.14, when: 0.08 });
      tone({ from: 784, seconds: 0.09, type: 'sine', gain: 0.14, when: 0.16 });
      tone({ from: 1046, seconds: 0.18, type: 'sine', gain: 0.14, when: 0.24 });
    },
    hit() {
      tone({ from: 220, to: 55, seconds: 0.28, type: 'sawtooth', gain: 0.2 });
      tone({ from: 110, to: 40, seconds: 0.2, type: 'square', gain: 0.12, when: 0.02 });
    },
    spotted() {
      tone({ from: 392, to: 311, seconds: 0.14, type: 'square', gain: 0.1 });
      tone({ from: 311, to: 233, seconds: 0.18, type: 'square', gain: 0.1, when: 0.12 });
    },
    stage() {
      tone({ from: 523, to: 784, seconds: 0.16, type: 'triangle', gain: 0.12 });
      tone({ from: 784, to: 1046, seconds: 0.2, type: 'triangle', gain: 0.1, when: 0.12 });
    },
    escape() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((note, i) => tone({ from: note, seconds: 0.16, type: 'triangle', gain: 0.13, when: i * 0.11 }));
    },
    caught() {
      const notes = [392, 370, 349, 311];
      notes.forEach((note, i) => tone({ from: note, seconds: 0.24, type: 'sawtooth', gain: 0.11, when: i * 0.2 }));
    },
  };
}
