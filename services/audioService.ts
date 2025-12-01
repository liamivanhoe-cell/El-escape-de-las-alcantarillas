
// A simple Web Audio API synth to generate retro background music without external files

type ThemeType = 'MENU' | 'SEWER' | 'CITY' | 'BOSS' | 'VICTORY' | 'GAME_OVER' | 'SHOP' | 'COMPETITIVE';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private currentGainNodes: GainNode[] = [];
  private isMuted: boolean = false;
  private volume: number = 0.3; // Default volume
  private currentTheme: ThemeType | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private noteIndex: number = 0;
  private tempo: number = 120;

  // Music Patterns (Note numbers: MIDI-ish style, relative to C4)
  private patterns: Record<ThemeType, { notes: number[], speed: number }> = {
    MENU: { notes: [0, 4, 7, 12, 7, 4, 0, -5], speed: 300 }, // C Major Arpeggio
    SEWER: { notes: [-12, -11, -8, -12, -5, -8, -11, -12], speed: 600 }, // Dark/Creepy
    CITY: { notes: [5, 5, 9, 5, 12, 12, 9, 5, 0, 4, 7, 4], speed: 250 }, // Upbeat
    BOSS: { notes: [0, 1, 0, 1, 0, 1, 12, 13, 12, 13, 6, 7], speed: 100 }, // Fast/Intense
    VICTORY: { notes: [0, 4, 7, 12, 16, 19, 24, 24, 24], speed: 150 },
    GAME_OVER: { notes: [7, 6, 5, 4, 3, 2, 1, 0, -5, -12], speed: 400 },
    // New Themes
    SHOP: { notes: [0, 4, 7, 11, 7, 4, 2, 5, 9, 12, 9, 5], speed: 400 }, // Maj7 / Jazzy feel
    COMPETITIVE: { notes: [-24, -24, -12, -12, -24, -24, -10, -10, -24, -24, -8, -8], speed: 120 } // Driving Bass
  };

  constructor() {
    // We defer initialization until user interaction
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(0);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx?.currentTime || 0);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  stop() {
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.currentOscillators.forEach(osc => {
      try { osc.stop(); } catch(e){}
      osc.disconnect();
    });
    this.currentGainNodes.forEach(g => g.disconnect());
    this.currentOscillators = [];
    this.currentGainNodes = [];
  }

  playTheme(theme: ThemeType) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.stop();
    this.init();
    
    this.noteIndex = 0;
    this.scheduleNote();
  }

  private scheduleNote() {
    if (!this.ctx || !this.masterGain || !this.currentTheme) return;

    const pattern = this.patterns[this.currentTheme];
    const note = pattern.notes[this.noteIndex];
    
    // Play sound
    this.playTone(this.midiToFreq(60 + note), pattern.speed / 1000);

    // Schedule next
    this.noteIndex = (this.noteIndex + 1) % pattern.notes.length;
    
    // If Victory/GameOver, stop at end
    if ((this.currentTheme === 'VICTORY' || this.currentTheme === 'GAME_OVER') && this.noteIndex === 0) {
        this.currentTheme = null;
        return;
    }

    this.timerID = window.setTimeout(() => this.scheduleNote(), pattern.speed);
  }

  private playTone(freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (this.currentTheme === 'COMPETITIVE') {
        osc.type = 'sawtooth';
    } else if (this.currentTheme === 'SHOP') {
        osc.type = 'sine';
    } else {
        osc.type = this.currentTheme === 'BOSS' ? 'sawtooth' : (this.currentTheme === 'SEWER' ? 'triangle' : 'square');
    }
    
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);

    // Clean up nodes after playing
    setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
    }, duration * 1000 + 100);
  }

  private midiToFreq(m: number) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  playSFX(type: 'jump' | 'hit' | 'collect' | 'shoot' | 'buy' | 'evil_laugh') {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);

      const now = this.ctx.currentTime;
      if (type === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'collect') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.linearRampToValueAtTime(1800, now + 0.1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      } else if (type === 'shoot') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } else if (type === 'buy') {
          // Coin jingle: fast arpeggio
          osc.type = 'sine';
          // Simulate multiple chimes with rapid frequency changes
          osc.frequency.setValueAtTime(2000, now);
          osc.frequency.setValueAtTime(2500, now + 0.05);
          osc.frequency.setValueAtTime(3000, now + 0.1);
          
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'evil_laugh') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(100, now + 1.5);
          
          // Tremolo effect using another oscillator logic simplified here by just modulation
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
          
          osc.start(now);
          osc.stop(now + 1.5);
      }
  }
}

export const audioManager = new AudioService();
