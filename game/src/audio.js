// Synthesised sound: every effect is an oscillator or a noise burst through
// WebAudio, so the game ships no audio files. Silent until the player first
// interacts (browsers block audio before a gesture), and M toggles mute.
export function createSounds() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(startFreq, endFreq, seconds, type, volume, delay = 0) {
    if (!ensure() || muted || context.state === 'suspended') return;
    try {
      const at = context.currentTime + delay;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), at + seconds);
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + seconds + 0.02);
    } catch {
      // Audio is decoration; a failure never breaks the game.
    }
  }

  function noise(seconds, volume, lowpass) {
    if (!ensure() || muted || context.state === 'suspended') return;
    try {
      const at = context.currentTime;
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = context.createGain();
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(at);
    } catch {
      // Audio is decoration; a failure never breaks the game.
    }
  }

  return {
    resume() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 880, 0.07, 'sine', 0.25);
    },
    shoot() {
      tone(920, 420, 0.09, 'square', 0.12);
    },
    pop() {
      noise(0.16, 0.3, 1400);
      tone(320, 90, 0.14, 'triangle', 0.25);
    },
    mote(combo) {
      const base = 620 + Math.min(combo, 5) * 90;
      tone(base, base * 1.5, 0.12, 'sine', 0.22);
    },
    hurt() {
      tone(180, 55, 0.35, 'sawtooth', 0.35);
      noise(0.25, 0.25, 500);
    },
    power() {
      tone(520, 780, 0.1, 'sine', 0.25);
      tone(780, 1170, 0.12, 'sine', 0.25, 0.09);
    },
    wave() {
      tone(440, 440, 0.12, 'triangle', 0.22);
      tone(554, 554, 0.12, 'triangle', 0.22, 0.11);
      tone(659, 659, 0.2, 'triangle', 0.22, 0.22);
    },
    bossRoar() {
      tone(110, 60, 0.7, 'sawtooth', 0.3);
      noise(0.5, 0.2, 300);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.22, 'triangle', 0.25, i * 0.13));
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, i) => tone(freq, freq * 0.9, 0.3, 'triangle', 0.25, i * 0.16));
    },
  };
}
