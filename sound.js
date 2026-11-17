// The sound of the rock. Nothing is played from a file: the wind, the sea, the rain, the fog signal, a low drone under all of it, glass
// tones that come and go, the gulls, her singing, his footfalls and the old man's muttering are made here out of oscillators and noise.
//   Sound.start()            the weather (wind, sea, rain, the gulls): asked for as the page opens, and it comes up out of nothing.
//                            A browser that will not let a page be heard before it has been touched holds it back until the first
//                            key, click or tap, so every one of those calls this again
//   Sound.wake()             the rest (the drone, the glass tones, the fog signal), which wait until he does something
//   Sound.set({ sea, song, horn, mutter })   0..1 each: how near the water he is, how near her, the engine house, the old man
//   Sound.step() .strike() .scream() .duck(level) .mute() .deaf()
//   Sound.volume({ all, music, rest })       0..1 each: how loud he has all of it, the music (the drone and the glass tones) and
//                            everything that is not the music (they can be given before there is anything to hear)
//   index.html?quiet: no sound at all. index.html?deaf: all of it runs, with the ears stopped (for trying when things begin)
//   Sound.test({ secs, only, vol })  renders it without playing it and measures how loud each second is (for checking levels)
const Sound = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);

  // everything that sounds, built on a context (the one that plays, or one that only renders)
  function make(ctx) {
    const sr = ctx.sampleRate,
      now = () => ctx.currentTime,
      gain = (v, to) => {
        const g = ctx.createGain();
        g.gain.value = v;
        if (to) g.connect(to);
        return g;
      },
      filter = (type, f, q, to) => {
        const b = ctx.createBiquadFilter();
        b.type = type;
        b.frequency.value = f;
        b.Q.value = q;
        if (to) b.connect(to);
        return b;
      },
      osc = (type, f, to, when, until) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.connect(to);
        o.start(when || 0);
        if (until) o.stop(until);
        return o;
      },
      // a slow wobble added to something
      lfo = (f, depth, param, when, until) => osc('sine', f, gain(depth, param), when, until),
      // four seconds of noise that joins up with itself, so it can go round for ever without a tick
      noise = brown => {
        const n = sr * 4,
          f = sr >> 2,
          x = new Float32Array(n + f),
          buf = ctx.createBuffer(1, n, sr),
          d = buf.getChannelData(0);
        let v = 0;
        for (let i = 0; i < n + f; i++) {
          const w = Math.random() * 2 - 1;
          v = brown ? (v + 0.02 * w) / 1.02 : w;
          x[i] = brown ? v * 3.5 : w;
        }
        for (let i = 0; i < n; i++) d[i] = i < f ? (x[i] * i + x[n + i] * (f - i)) / f : x[i];
        return buf;
      },
      loop = (buf, to) => {
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(to);
        s.start();
        return s;
      };

    const SONG = 0.3, // her voice at its nearest
      MUTTER = 0.34; // and his
    const master = gain(0.9),
      all = gain(1), // how loud he has it (vol())
      door = gain(1), // (open() shuts it and lets it open slowly)
      limit = ctx.createDynamicsCompressor();
    master.connect(all);
    all.connect(door);
    door.connect(limit);
    limit.connect(ctx.destination);
    // two things he can have louder or quieter, each by itself (vol()): the music, and all the rest
    const world = gain(1, master),
      music = gain(1, master),
      amb = gain(1, world), // the place
      fx = gain(1, world), // what he and they do in it
      tune = gain(1, music); // the music: the drone, the glass tones, and the horn, which goes with them (hushed when the place is: duck())
    // a big hollow room for the gulls and the voices to ring in, and one like it for the music and the horn
    const verb = ctx.createConvolver(),
      verbM = ctx.createConvolver(),
      wet = gain(0.5, amb);
    {
      const n = sr * 3,
        buf = ctx.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
      }
      verb.buffer = verbM.buffer = buf;
      verb.connect(wet);
      verbM.connect(gain(0.5, tune));
    }
    const white = noise(false),
      brown = noise(true);

    // the wind: a wide band of it that gusts, and a thin whistle round the tower
    const windG = gain(0.045, amb),
      windF = filter('bandpass', 420, 0.9, windG);
    loop(white, windF);
    lfo(0.07, 170, windF.frequency);
    lfo(0.19, 70, windF.frequency);
    lfo(0.11, 0.02, windG.gain);
    const whisG = gain(0.007, amb),
      whisF = filter('bandpass', 1500, 14, whisG);
    loop(white, whisF);
    lfo(0.13, 400, whisF.frequency);
    lfo(0.09, 0.005, whisG.gain);
    // the sea: a low weight that comes and goes, and the hiss of it running back off the rock
    const seaG = gain(0.1, amb),
      seaF = filter('lowpass', 520, 0.6, seaG);
    loop(brown, seaF);
    lfo(0.125, 0.05, seaG.gain);
    const washG = gain(0.008, amb),
      washF = filter('bandpass', 1900, 0.5, washG);
    loop(white, washF);
    lfo(0.125, 0.006, washG.gain);
    // the rain
    const rainG = gain(0.014, amb);
    loop(white, filter('highpass', 5000, 0.5, rainG));
    // the drone: two low reeds a hair apart, the fifth above, and something under them felt more than heard
    const droneG = gain(0, tune),
      droneF = filter('lowpass', 240, 3, droneG);
    droneG.connect(verbM);
    osc('sawtooth', 73.42, droneF).detune.value = -5;
    osc('sawtooth', 73.42, droneF).detune.value = 6;
    osc('sawtooth', 110, gain(0.4, droneF));
    osc('sine', 36.71, gain(1.2, droneG));
    lfo(0.045, 90, droneF.frequency);

    // a tone as from a wet finger round a glass: it swells, holds and goes
    const bow = (when, f, len, level) => {
      len = len || 9;
      const g = gain(0, tune),
        end = when + len + 0.1;
      g.connect(verbM);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(level || 0.024, when + len * 0.4);
      g.gain.linearRampToValueAtTime(0, when + len);
      for (const [m, k] of [[1, 1], [1.004, 0.8], [2.01, 0.25], [3, 0.08]]) lfo(4.5, f * m * 0.004, osc('sine', f * m, gain(k, g), when, end).frequency, when, end);
    };
    // the fog signal: one long blast with a grunt at the end of it. (It is counted with the music: as loud as he has that)
    const horn = (when, level) => {
      level = level || 0.25;
      const len = 3,
        g = gain(0, tune),
        f = filter('lowpass', 300, 1.2, g),
        end = when + len + 0.5;
      g.connect(verbM);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(level, when + 0.18);
      g.gain.setValueAtTime(level, when + len - 0.5);
      g.gain.linearRampToValueAtTime(level * 0.8, when + len - 0.15);
      g.gain.linearRampToValueAtTime(0, when + len + 0.4);
      f.frequency.setValueAtTime(300, when);
      f.frequency.linearRampToValueAtTime(620, when + 0.5);
      for (const [fr, type, k] of [[87.3, 'sawtooth', 1], [87.9, 'sawtooth', 0.8], [130.9, 'sawtooth', 0.5], [43.65, 'square', 0.5]]) {
        const o = osc(type, fr, gain(k, f), when, end);
        o.frequency.setValueAtTime(fr, when + len - 0.45);
        o.frequency.exponentialRampToValueAtTime(fr * 0.75, when + len + 0.2);
      }
    };
    // a gull: a few cries, each one up and then falling
    const gull = when => {
      const n = 2 + ((Math.random() * 4) | 0),
        lvl = rnd(0.05, 0.11),
        tone = rnd(0.85, 1.15);
      let t = when;
      for (let k = 0; k < n; k++) {
        const g = gain(0, amb),
          o = osc('sawtooth', 1500 * tone, filter('bandpass', 2300 * tone, 3, g), t, t + 0.4);
        g.connect(verb);
        o.frequency.setValueAtTime(1500 * tone, t);
        o.frequency.linearRampToValueAtTime(2500 * tone, t + 0.07);
        o.frequency.linearRampToValueAtTime(1700 * tone, t + 0.3);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(lvl, t + 0.03);
        g.gain.linearRampToValueAtTime(0, t + 0.32);
        t += rnd(0.3, 0.4);
      }
    };
    // her voice. What makes a sung note sound like a throat and not a machine is mostly what is unsteady in it, so: a soft-edged
    // source (each overtone weaker than a reed's), the mouth as four resonances that move from vowel to vowel, breath in with the
    // tone, a vibrato that is not there when a note begins and opens as it is held, the pitch never quite still, notes slid into,
    // and each one swelling and easing. How near he is sets three things, as distance does: how loud she is, how much of the
    // top of her voice arrives (far off it is dull, as through weather), and how much of it is her and how much the echo of her
    const songDry = gain(0.3, amb),
      songAir = filter('lowpass', 1100, 0.5),
      songG = gain(0, songAir),
      songIn = gain(1),
      throat = (() => {
        const n = 48,
          re = new Float32Array(n),
          im = new Float32Array(n);
        for (let k = 1; k < n; k++) im[k] = 1 / Math.pow(k, 1.9); // (a woman's: nearly all of it in the note itself, little above)
        return ctx.createPeriodicWave(re, im);
      })(),
      mouth = [[950, 4, 1], [1400, 8, 0.4], [3100, 10, 0.13], [4200, 10, 0.05]].map(([f, q, k]) => {
        const b = filter('bandpass', f, q, gain(k, songG));
        songIn.connect(b);
        return b;
      });
    songAir.connect(songDry);
    songAir.connect(gain(1.5, verb));
    const VOWEL = { ah: [950, 1400, 3100], oh: [620, 1050, 2950], oo: [460, 900, 2900] }, // a small mouth: every resonance sits higher than a man's
      // what she sings, in steps of the scale above her lowest note, and how long each is held. No words to any of it
      PHRASES = [
        [[0, 2], [3, 1], [2, 1], [7, 3], [5, 1], [3, 2], [2, 1], [-1, 1], [0, 4]],
        [[7, 3], [8, 1], [7, 2], [3, 2], [5, 1], [3, 1], [2, 4]],
        [[0, 1], [2, 1], [3, 2], [7, 2], [12, 4], [10, 1], [8, 1], [7, 4]],
        [[12, 3], [10, 1], [8, 2], [7, 2], [3, 1], [2, 1], [0, 5]],
        [[3, 2], [2, 1], [0, 1], [-2, 2], [0, 1], [3, 1], [5, 2], [3, 4]]
      ];
    // one phrase of it; gives back how long until the next should start
    const sing = (when, which) => {
      const beat = rnd(0.62, 0.78),
        low = 587.33 * [1, 1, 0.8909, 1.1225][(Math.random() * 4) | 0], // a soprano: her lowest note is above where most singing ends
        notes = PHRASES[which === undefined ? (Math.random() * PHRASES.length) | 0 : which],
        total = notes.reduce((s, n) => s + n[1], 0) * beat,
        end = when + total + 3,
        e = gain(0, songIn),
        o = ctx.createOscillator(),
        vib = gain(0, o.detune), // how wide the vibrato is, in hundredths of a semitone
        air = ctx.createBufferSource();
      o.setPeriodicWave(throat);
      o.connect(e);
      o.start(when);
      o.stop(end);
      const wob = osc('sine', rnd(5.6, 6.3), vib, when, end);
      wob.connect(gain(0.0012, e.gain)); // and it is a little louder at the top of each turn of it
      lfo(rnd(0.6, 0.9), 0.25, wob.frequency, when, end); // which does not keep time either
      lfo(rnd(0.7, 1.1), 7, o.detune, when, end); // the pitch wanders, as a held note does
      lfo(rnd(2.1, 2.9), 4, o.detune, when, end);
      air.buffer = white;
      air.loop = true;
      air.connect(filter('highpass', 2200, 0.5, gain(0.06, e)));
      air.start(when, Math.random() * 3);
      air.stop(end);
      let t = when;
      notes.forEach(([st, n], i) => {
        const f = low * Math.pow(2, st / 12),
          len = n * beat,
          held = n >= 2,
          v = VOWEL[st >= 7 ? 'ah' : i % 3 === 1 ? 'oo' : 'oh']; // she opens her mouth for the high ones
        if (i === 0) {
          o.frequency.setValueAtTime(f * 0.95, t); // up to the first note from under it
          o.frequency.setTargetAtTime(f, t, 0.1);
        } else o.frequency.setTargetAtTime(f, t, rnd(0.04, 0.075));
        vib.gain.setTargetAtTime(3, t, 0.04);
        vib.gain.setTargetAtTime(held ? rnd(26, 38) : 10, t + Math.min(0.32, len * 0.4), 0.22);
        e.gain.setTargetAtTime(0.5, t, 0.06);
        e.gain.setTargetAtTime(held ? rnd(0.85, 1) : 0.7, t + 0.1, Math.max(0.12, len * 0.28));
        e.gain.setTargetAtTime(0.42, t + len * 0.78, Math.max(0.06, len * 0.12));
        // the first resonance is never left below the note itself: a singer's jaw drops as she goes up, for the same reason
        mouth[0].frequency.setTargetAtTime(Math.max(v[0], f * 1.04), t, 0.11);
        mouth[1].frequency.setTargetAtTime(Math.max(v[1], f * 1.5), t, 0.11);
        mouth[2].frequency.setTargetAtTime(v[2], t, 0.11);
        t += len;
      });
      vib.gain.setTargetAtTime(8, t, 0.3);
      e.gain.setTargetAtTime(0, t, 0.5);
      return total + rnd(2.5, 5);
    };
    // the old man, talking to himself. There are no words in it to make out: a rough low voice, a mouth that changes shape a few
    // times a second, the hiss or stop of a consonant now and then, each run of it sinking in pitch as speech does, and all of it
    // dull, as said into a beard. Its level is set by how near he is
    const mutG = gain(0, amb),
      mutAir = filter('lowpass', 650, 0.5, mutG),
      mutIn = gain(1),
      gruff = (() => {
        const n = 40,
          re = new Float32Array(n),
          im = new Float32Array(n);
        for (let k = 1; k < n; k++) im[k] = 1 / Math.pow(k, 1.1);
        return ctx.createPeriodicWave(re, im);
      })(),
      jaw = [[520, 4, 1], [1150, 6, 0.5], [2400, 8, 0.14]].map(([f, q, k]) => {
        const b = filter('bandpass', f, q, gain(k, mutAir));
        mutIn.connect(b);
        return b;
      }),
      MOUTHS = [[680, 1150, 2450], [480, 1650, 2450], [430, 850, 2350], [330, 950, 2250], [520, 1350, 2450], [600, 1000, 2400]];
    mutIn.connect(filter('lowpass', 260, 0.7, gain(0.5, mutAir))); // the chest of it
    mutG.connect(gain(0.2, verb));
    // one run of it, a few syllables to a dozen; gives back how long until the next should start
    const mutter = when => {
      const n = 3 + ((Math.random() * 10) | 0),
        f0 = rnd(88, 116),
        e = gain(0, mutIn),
        o = ctx.createOscillator();
      o.setPeriodicWave(gruff);
      o.connect(e);
      let t = when;
      for (let i = 0; i < n; i++) {
        const len = rnd(0.1, 0.21) * (i === n - 1 ? 1.6 : 1),
          f = f0 * (1 - 0.24 * (i / n)) * rnd(0.94, 1.08) * (Math.random() < 0.16 ? 1.2 : 1), // sinking, with a word leaned on here and there
          m = MOUTHS[(Math.random() * MOUTHS.length) | 0],
          lvl = rnd(0.45, 1);
        o.frequency.setTargetAtTime(f, t, 0.03);
        jaw.forEach((b, j) => b.frequency.setTargetAtTime(m[j], t, 0.022));
        e.gain.setTargetAtTime(lvl, t, 0.016);
        e.gain.setTargetAtTime(0.05, t + len * 0.68, 0.02); // the mouth shuts between them
        if (Math.random() < 0.38) {
          // a consonant: a short breath of noise ahead of the syllable
          const c = ctx.createBufferSource(),
            cg = gain(0, mutAir),
            at = Math.max(when, t - 0.03);
          c.buffer = white;
          c.connect(filter('bandpass', rnd(1500, 3600), 1.2, cg));
          c.start(at, Math.random() * 3, 0.09);
          cg.gain.setValueAtTime(0.1 * lvl, at);
          cg.gain.exponentialRampToValueAtTime(0.001, at + rnd(0.035, 0.07));
        }
        t += len + (Math.random() < 0.12 ? rnd(0.12, 0.32) : 0); // and now and then he stops for breath
      }
      e.gain.setTargetAtTime(0, t, 0.05);
      lfo(rnd(24, 33), 0.1, e.gain, when, t + 0.4); // gravel in it
      lfo(rnd(7, 11), 2.5, o.frequency, when, t + 0.4);
      o.start(when);
      o.stop(t + 0.4);
      return t - when + rnd(0.4, 3);
    };
    // a boot on wet ground
    const step = when => {
      when = when || now();
      const g = gain(0, fx),
        s = ctx.createBufferSource();
      s.buffer = brown;
      s.connect(filter('bandpass', rnd(300, 460), 1.2, g));
      s.start(when, Math.random() * 3.5, 0.1);
      g.gain.setValueAtTime(0.32, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
    };
    // a match: the rasp of its head along the box, and then the breath of it taking
    const strike = when => {
      when = when || now();
      const g = gain(0, fx),
        f = gain(0, fx),
        rasp = ctx.createBufferSource(),
        take = ctx.createBufferSource();
      rasp.buffer = take.buffer = white;
      rasp.connect(filter('bandpass', rnd(3600, 4400), 1.1, g));
      rasp.start(when, Math.random() * 3.5, 0.16);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.05, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.13);
      take.connect(filter('bandpass', 1500, 0.5, f));
      take.start(when + 0.07, Math.random() * 3, 0.6);
      f.gain.setValueAtTime(0.0001, when + 0.07);
      f.gain.exponentialRampToValueAtTime(0.03, when + 0.13);
      f.gain.exponentialRampToValueAtTime(0.0005, when + 0.6);
    };
    // what she does at the last: a shriek driven hard, and then the water closing over
    const scream = when => {
      when = when || now();
      const g = gain(0, fx),
        sh = ctx.createWaveShaper(),
        curve = new Float32Array(1024),
        end = when + 2.2;
      for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 3);
      sh.curve = curve;
      sh.connect(g);
      g.connect(verb);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.3, when + 0.04);
      g.gain.setValueAtTime(0.3, when + 1.5);
      g.gain.linearRampToValueAtTime(0, when + 2.0);
      for (const f of [1180, 1247, 1771, 2360]) {
        const o = osc('sawtooth', f, gain(0.3, sh), when, end);
        o.frequency.setValueAtTime(f, when);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, when + 0.25);
        o.frequency.exponentialRampToValueAtTime(f * 1.3, when + 1.7);
        lfo(13, f * 0.04, o.frequency, when, end);
      }
      const hiss = ctx.createBufferSource();
      hiss.buffer = white;
      hiss.connect(filter('bandpass', 3200, 0.7, gain(0.5, sh)));
      hiss.start(when, 0, 2.1);
      const bg = gain(0, fx),
        b = osc('sine', 70, bg, when + 1.4, when + 5);
      b.frequency.setValueAtTime(70, when + 1.4);
      b.frequency.exponentialRampToValueAtTime(28, when + 4.4);
      bg.gain.setValueAtTime(0, when + 1.4);
      bg.gain.linearRampToValueAtTime(0.5, when + 1.6);
      bg.gain.exponentialRampToValueAtTime(0.001, when + 4.8);
    };

    return {
      horn,
      bow,
      gull,
      sing,
      mutter,
      step,
      strike,
      scream,
      // all of it comes up out of nothing over a few seconds, rather than starting
      open: when => {
        door.gain.setValueAtTime(0, when || 0);
        door.gain.linearRampToValueAtTime(1, (when || 0) + 3);
      },
      // the drone comes up slowly, so the first thing heard is the weather
      rise: when => {
        droneG.gain.setValueAtTime(0, when || 0);
        droneG.gain.linearRampToValueAtTime(0.026, (when || 0) + 8);
      },
      set: o => {
        const t = now();
        if (o.sea !== undefined) seaG.gain.setTargetAtTime(0.05 + 0.16 * o.sea, t, 0.5), washG.gain.setTargetAtTime(0.004 + 0.014 * o.sea, t, 0.5);
        if (o.song !== undefined) {
          const c = Math.sqrt(o.song); // (the level falls away much faster than this: this is nearer to the distance itself)
          songG.gain.setTargetAtTime(SONG * o.song, t, 0.4);
          songAir.frequency.setTargetAtTime(1100 * Math.pow(8, c), t, 0.4);
          songDry.gain.setTargetAtTime(0.3 + 0.7 * c, t, 0.4);
        }
        if (o.mutter !== undefined) {
          mutG.gain.setTargetAtTime(MUTTER * o.mutter, t, 0.25);
          mutAir.frequency.setTargetAtTime(650 * Math.pow(3.4, Math.sqrt(o.mutter)), t, 0.25);
        }
      },
      duck: (v, tc) => [amb, tune].forEach(b => b.gain.setTargetAtTime(v, now(), tc || 0.3)),
      vol: o => {
        all.gain.setTargetAtTime(o.all, now(), 0.05);
        music.gain.setTargetAtTime(o.music, now(), 0.05);
        world.gain.setTargetAtTime(o.rest, now(), 0.05);
      },
      mute: m => master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05),
      // for the test: silence what runs all the time, leaving one thing to be heard alone
      hush: () => [windG, whisG, seaG, washG, rainG, droneG].forEach(g => g.disconnect()),
      peek: () => ({ door: +door.gain.value.toFixed(3), drone: +droneG.gain.value.toFixed(4), master: +master.gain.value.toFixed(3), all: +all.gain.value.toFixed(3), music: +music.gain.value.toFixed(3), rest: +world.gain.value.toFixed(3) })
    };
  }

  // a glass tone and, a little after, another that sits badly against it
  const tones = (g, t) => {
    const f = [146.83, 220, 293.66, 349.23, 440][(Math.random() * 5) | 0],
      len = rnd(8, 13);
    g.bow(t, f, len);
    g.bow(t + rnd(2, 4), f * [16 / 15, 45 / 32, 6 / 5][(Math.random() * 3) | 0], len * 0.8, 0.018);
  };

  let ac = null,
    g = null,
    muted = false,
    vols = { all: 1, music: 1, rest: 1 },
    woken = false,
    hornK = 0.5,
    song = 0,
    mut = 0;
  const awake = () => ac.state === 'running' && !document.hidden,
    // something that happens again and again, at uneven times, for as long as the page can be heard
    every = (fn, lo, hi, first) => {
      const tick = () => {
        if (awake()) fn(ac.currentTime + 0.1);
        setTimeout(tick, rnd(lo, hi) * 1000);
      };
      setTimeout(tick, first * 1000);
    };
  function start() {
    if (ac) {
      if (ac.state !== 'running') ac.resume(); // (held back by the browser: this is a key or a touch, and now it may)
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || /[?&]quiet\b/.test(location.search)) return; // index.html?quiet: no sound at all (for trying things without the horn going)
    ac = new AC();
    g = make(ac);
    g.vol(vols);
    g.open(ac.currentTime); // (a context that is held back stands at this moment until it is let go: so it opens from there)
    if (/[?&]deaf\b/.test(location.search)) g.mute((muted = true));
    if (document.hidden) {
      // opened where it cannot be seen (a tab behind another): it is not to be heard from there either, until it is looked at
      ac.suspend();
      document.addEventListener('visibilitychange', function seen() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', seen);
        ac.resume();
      });
    }
    every(t => g.gull(t), 7, 19, 3);
    const phrase = () => setTimeout(phrase, (awake() && song > 0.004 ? g.sing(ac.currentTime + 0.1) : 1.5) * 1000); // she sings only when there is someone to hear
    phrase();
    const chat = () => setTimeout(chat, (awake() && mut > 0.004 ? g.mutter(ac.currentTime + 0.1) : 0.6) * 1000); // nor does he waste it on nobody
    chat();
  }
  // he has done something: what is not weather begins. The drone comes in under it (a little after the weather, if that has only
  // just been let start), and from here the fog signal sounds and the tones come and go
  function wake() {
    start();
    if (!ac || woken) return;
    woken = true;
    const t = ac.currentTime;
    g.rise(t + (t < 3 ? 2.5 : 0.2));
    every(t => g.horn(t, 0.05 + 0.14 * hornK), 21, 27, 7);
    every(t => tones(g, t), 13, 24, 11);
  }

  // render some seconds of it and say how loud each was (root-mean-square) and the loudest sample of all
  async function test(o) {
    o = o || {};
    const sr = 44100,
      secs = o.secs || 30,
      ctx = new OfflineAudioContext(2, sr * secs, sr),
      t = make(ctx),
      only = o.only;
    if (o.vol) t.vol(Object.assign({ all: 1, music: 1, rest: 1 }, o.vol));
    if (only) t.hush();
    else t.rise(0);
    if (!only) t.set({ sea: 0.5 });
    if (!only || only === 'horn') t.horn(4, 0.12);
    if (!only || only === 'gull') t.gull(2);
    if (!only || only === 'tones') t.bow(8, 293.66, 9), t.bow(10, 293.66 * 16 / 15, 7, 0.018);
    if (!only || only === 'song') t.set({ song: o.song !== undefined ? o.song : only ? 1 : 0.4 }), t.sing(only ? 1 : 14, o.phrase);
    if (!only || only === 'steps') for (let k = 0; k < 8; k++) t.step(0.5 + k * 0.3);
    if (only === 'strike') t.strike(1);
    if (!only || only === 'mutter') {
      t.set({ mutter: o.mutter !== undefined ? o.mutter : only ? 1 : 0.5 });
      for (let at = only ? 0.5 : 11, end = only ? secs - 2 : 13; at < end; ) at += t.mutter(at);
    }
    if (!only || only === 'scream') t.scream(secs - 6);
    const buf = await ctx.startRendering(),
      a = buf.getChannelData(0),
      b = buf.getChannelData(1),
      rms = [];
    let peak = 0;
    for (let s = 0; s < secs; s++) {
      let e = 0;
      for (let i = s * sr; i < (s + 1) * sr; i++) {
        const v = (a[i] + b[i]) / 2;
        e += v * v;
        if (Math.abs(a[i]) > peak) peak = Math.abs(a[i]);
        if (Math.abs(b[i]) > peak) peak = Math.abs(b[i]);
      }
      rms.push(+Math.sqrt(e / sr).toFixed(4));
    }
    if (o.wave) return { sr, wave: a };
    return { rms, peak: +peak.toFixed(3) };
  }

  return {
    start,
    wake,
    test,
    set: o => {
      if (o.horn !== undefined) hornK = o.horn;
      if (o.song !== undefined) song = o.song;
      if (o.mutter !== undefined) mut = o.mutter;
      if (g) g.set(o);
    },
    step: () => g && g.step(),
    strike: () => g && g.strike(),
    scream: () => g && g.scream(),
    duck: (v, tc) => g && g.duck(v, tc),
    volume: o => {
      Object.assign(vols, o);
      if (g) g.vol(vols);
    },
    mute: () => {
      muted = !muted;
      if (g) g.mute(muted);
      return muted;
    },
    deaf: () => muted, // (are his ears stopped)
    state: () => (ac ? ac.state : 'none'),
    peek: () => (g ? Object.assign({ state: ac.state, at: +ac.currentTime.toFixed(2), woken, muted }, g.peek()) : null)
  };
})();
