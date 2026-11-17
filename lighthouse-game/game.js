// The page's side of Wickie: keys and pointer in, the keeper moved, the camera kept on him, the picture drawn in a 1.19:1 frame;
// what comes of going near her, what is heard (sound.js: among it the old man, who is not to be talked to but can be heard
// muttering by anyone who comes close); and the days: they go by whatever he does, and night follows day. The old man keeps
// hours by them: indoors for the night and out again in the morning, most days.
(() => {
  const canvas = document.getElementById('view'),
    ctx = canvas.getContext('2d'),
    $ = id => document.getElementById(id),
    scene = sceneFactory({ makeBuilder, makeSculpt, KIT }),
    ASPECT = 1.19, // the film's own frame
    ROWS = 200, // art pixels down the frame: the picture costs the same whatever the window or the zoom
    keys = new Set();
  // a phone has no keys to run him with: it is told to come back on a desktop, and nothing is built or listened for
  // (index.html?mobile shows that card on any machine; ?play goes past it)
  if ((matchMedia('(hover: none) and (pointer: coarse)').matches && !/[?&]play\b/.test(location.search)) || /[?&]mobile\b/.test(location.search)) {
    $('mobile').classList.add('on');
    return;
  }
  let W, G, rest, posedBuf, holder, img, t = 0, last = 0, frames = 0, fpsAt = 0;
  let yaw, yawTo, zoom = 0.5, zoomTo = 1, cam = [0, 0, 0], box = { w: 1, h: 1 }, ptr = null; // it opens far off and comes in
  // 'play': he runs about. 'dead': she has him, and that is the end of it: the count of his days is all that is left on the screen
  let mode = 'play', deadT = 0, heard = 0, strides = 0;
  const mem = { deaths: 0 },
    // the old man talks to himself. How much of it is heard: none from six paces, all of it at his elbow
    mutterAt = d => Math.pow(Math.max(0, Math.min(1, (6 - d) / 4.8)), 1.6),
    TOO_NEAR = 2.9, // of her: there is no talking to her, and no second step
    EARSHOT = 12, // of her: beyond this there is nothing of her to hear
    // how much of her song reaches him at a distance: nothing at the edge of earshot, a thread of it a few steps in, and all of
    // it only where it is already too late. It climbs slowly at first and fast at the end, so each step toward her is heard
    songAt = d => Math.pow(Math.max(0, Math.min(1, (EARSHOT - d) / (EARSHOT - TOO_NEAR))), 2.4),
    DAY = 90, // seconds from one sunrise to the next
    lut = new Uint8Array(256);
  // the days: clock counts them from the first sunrise and never goes back. What is shown is a bare number, and not a small one:
  // three years and something were gone before any of this began
  const FIRST = 1307 + ((Math.random() * 7) | 0); // (much the same each time: within a week, about where the wide spread it once had was centred)
  let clock = 0.03, dark = -1;
  // the old man's hours. At dusk he goes in and in the morning he comes out: but one night in seven or so he does not go in,
  // and stands out there till morning; and as often, having gone in, he does not come out for the whole of the day after.
  // (duskAt, dawnAt: when in the day he does it, a little different each time)
  const KEEPS = 0.85;
  let indoors = false, late = false, duskAt = 0.54, dawnAt = 0.96;
  const sm = s => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * (3 - 2 * s)),
    // how far into night a moment of the day is: light for the first half of it, a dusk, the dark, and a dawn that ends as the day does
    nightAt = f => (f < 0.5 ? 0 : f < 0.62 ? sm((f - 0.5) / 0.12) : f < 0.9 ? 1 : 1 - sm((f - 0.9) / 0.1));

  function layout() {
    let h = innerHeight,
      w = Math.round(h * ASPECT);
    if (w > innerWidth) {
      w = innerWidth;
      h = Math.round(w / ASPECT);
    }
    box = { w, h };
    const left = Math.round((innerWidth - w) / 2) + 'px',
      top = Math.round((innerHeight - h) / 2) + 'px';
    for (const el of [canvas, $('frame'), $('ui')]) {
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.left = left;
      el.style.top = top;
    }
    $('ui').style.fontSize = Math.max(14, Math.round(h / 31)) + 'px';
    $('hud').style.fontSize = Math.max(13, Math.round(h / 58)) + 'px';
  }

  function build() {
    W = scene.build(scene.seed);
    G = W.game;
    rest = W.data;
    posedBuf = null;
    holder = {
      data: rest,
      anim: W.anim,
      get posedBuf() {
        return posedBuf;
      },
      set posedBuf(v) {
        posedBuf = v;
      }
    };
    W.anim.update(0, 0);
    yaw = yawTo = W.cam.yaw;
    cam = [G.pl.x, G.pl.y + 1.6, G.pl.z];
    window.wickie = { W, G, keys, mem, die, songAt, mutterAt, days: v => (v === undefined ? clock : (clock = v)), state: () => ({ mode, indoors, duskAt, dawnAt }) }; // for poking at from the console
  }

  // which way he is asked to go, across the ground, from the keys or from where the pointer is held
  function wish() {
    let ix = 0,
      iy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (!ix && !iy && ptr) {
      const r = canvas.getBoundingClientRect(),
        dx = ptr.x - (r.left + r.width / 2),
        dy = ptr.y - (r.top + r.height * 0.56);
      if (Math.hypot(dx, dy) > 16) {
        ix = dx;
        iy = -dy / Math.sin(W.cam.pitch); // the ground is seen from above at a slant: up the screen is further than it looks
      }
    }
    if (!ix && !iy) return [0, 0];
    // up the screen is away from the camera; right is to its right
    const s = Math.sin(yaw),
      c = Math.cos(yaw);
    return [c * ix - s * iy, -s * ix - c * iy];
  }

  // he came too near. She is up off her rock: the picture goes to its negative and shakes, and then there is only the number the
  // count had reached. Nothing follows it: he is not put back
  function die() {
    mode = 'dead';
    ptr = null;
    deadT = 0;
    mem.deaths++;
    Sound.scream();
  }
  function dying(dt) {
    const was = deadT;
    deadT += dt;
    const at = s => was < s && deadT >= s;
    if (deadT < 1.8) {
      G.npc.mer.scream = Math.min(1, deadT / 0.2);
      canvas.style.filter = 'invert(1) contrast(1.5)';
      canvas.style.transform = 'translate(' + ((Math.random() * 12 - 6) | 0) + 'px,' + ((Math.random() * 12 - 6) | 0) + 'px)';
    }
    if (at(1.8)) {
      canvas.style.filter = canvas.style.transform = '';
      $('lived').textContent = $('day').textContent; // the count stopped where it was
      $('dead').classList.add('on');
      Sound.set({ song: 0, mutter: 0 }); // she has what she sang for
      Sound.duck(0.2, 0.2);
    }
  }

  function draw() {
    W.data = KIT.bones.posed(holder);
    const im = InkRender.render(W, {
      t,
      yaw,
      pitch: W.cam.pitch,
      zoom,
      target: cam,
      w: box.w,
      h: box.h,
      px: Math.max(1, Math.round(box.h / ROWS))
    });
    W.data = rest;
    if (canvas.width !== im.w || canvas.height !== im.h) {
      canvas.width = im.w;
      canvas.height = im.h;
      img = ctx.createImageData(im.w, im.h);
    }
    const src = im.rgb,
      dst = img.data;
    // black and white film: whatever tint the paint had is dropped, and each point is only as light as it is
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      dst[j] = dst[j + 1] = dst[j + 2] = lut[(src[i] * 77 + src[i + 1] * 150 + src[i + 2] * 29) >> 8];
      dst[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;
    const pl = G.pl,
      far = id => Math.hypot(pl.x - G.npc[id].x, pl.z - G.npc[id].z);
    let look = [pl.x, pl.y + 1.6, pl.z],
      close = 1;
    if (mode === 'play') {
      const [mx, mz] = wish();
      G.step(dt, mx, mz, keys.has('ShiftLeft') || keys.has('ShiftRight'));
      // a boot down at every half turn of his stride
      const s = Math.floor(pl.phase / Math.PI);
      if (s !== strides && pl.go > 0.5) Sound.step();
      strides = s;
      if (far('mer') < TOO_NEAR) die();
    } else {
      G.step(dt, 0, 0);
      dying(dt);
      if (deadT < 1.8) {
        // the two of them, and coming in on them
        const o = G.npc.mer;
        G.turn(o.x, o.z, dt);
        look = [(pl.x + o.x) / 2, pl.y + 1.3, (pl.z + o.z) / 2];
        close = 1.5 + deadT * 0.45;
      }
    }
    // what is heard depends on where he stands: the sea at its edge, her song near her, the horn by its engine house, the old man's
    // muttering by his door (and, fainter, through it when he is indoors)
    if (t - heard > 0.15) {
      heard = t;
      const d = far('mer'),
        e = Math.hypot(pl.x - G.places.engine[0], pl.z - G.places.engine[1]);
      Sound.set({ sea: 1 - Math.max(0, Math.min(1, G.inside(pl.x, pl.z) / 0.4)), song: mode === 'dead' && deadT >= 1.8 ? 0 : songAt(d), mutter: mode === 'play' ? mutterAt(far('wake')) * (G.npc.wake.here ? 1 : 0.4) : 0, horn: 1 / (1 + (e * e) / 90) });
    }
    // the days go by, whatever he is doing, until she has him
    if (mode !== 'dead') {
      clock += dt / DAY;
      const label = String(FIRST + Math.floor(clock));
      if ($('day').textContent !== label) $('day').textContent = label;
      const f = clock % 1,
        nightly = f >= duskAt && f < dawnAt;
      if (nightly !== late) {
        late = nightly;
        if (Math.random() < KEEPS) G.home((indoors = nightly)); // otherwise he stays as he is, in or out
        if (nightly) dawnAt = 0.94 + 0.05 * Math.random();
        else duskAt = 0.51 + 0.06 * Math.random();
      }
    }
    const n = nightAt(clock % 1);
    if (Math.abs(n - dark) > 0.004) {
      dark = n;
      G.grade(n, lut);
      G.night(n);
    }
    W.anim.update(dt, t);
    G.sea(t); // the swell comes on
    // the camera: turns a quarter at a time, and follows a little behind
    yaw += (yawTo - yaw) * (1 - Math.exp(-dt * 7));
    zoom += (Math.min(2.8, zoomTo * close) - zoom) * (1 - Math.exp(-dt * (t < 6 ? 0.9 : mode === 'play' ? 8 : 3)));
    const k = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < 3; i++) cam[i] += (look[i] - cam[i]) * k;
    draw();
    frames++;
    if (now - fpsAt > 500) {
      $('fps').textContent = Math.round((frames * 1000) / (now - fpsAt)) + ' fps';
      frames = 0;
      fpsAt = now;
    }
    if (mode === 'dead' && deadT > 2.6) return; // the black is up and the picture under it is not drawn again
    requestAnimationFrame(frame);
  }

  addEventListener('keydown', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    Sound.start();
    const c = ev.code,
      once = !ev.repeat;
    if (c === 'KeyM' && once) $('snd').textContent = Sound.mute() ? 'unstop yer ears' : 'stop yer ears';
    if (mode === 'play' && once) {
      if (c === 'KeyQ') yawTo += Math.PI / 2;
      else if (c === 'KeyE') yawTo -= Math.PI / 2;
    }
    keys.add(c);
    if (c.startsWith('Arrow') || c === 'Space') ev.preventDefault();
  });
  addEventListener('keyup', ev => keys.delete(ev.code));
  addEventListener('blur', () => {
    keys.clear();
    ptr = null;
  });
  canvas.addEventListener('pointerdown', ev => {
    Sound.start();
    if (mode !== 'play') return;
    ptr = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', ev => {
    if (ptr) ptr = { x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener('pointerup', () => (ptr = null));
  canvas.addEventListener('pointercancel', () => (ptr = null));
  addEventListener(
    'wheel',
    ev => {
      ev.preventDefault();
      zoomTo = Math.max(0.45, Math.min(2.2, zoomTo * Math.exp(-ev.deltaY * 0.0015)));
    },
    { passive: false }
  );
  addEventListener('resize', layout);

  layout();
  setTimeout(() => {
    build();
    $('veil').classList.add('gone'); // it opens out of black
    requestAnimationFrame(frame);
  }, 60);
})();
