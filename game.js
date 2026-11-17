// The page's side of Wickie: keys and pointer in (or, on a phone, thumbs), the keeper moved, the camera kept on him, the picture
// drawn in a 1.19:1 frame;
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
    keys = new Set(),
    // a phone or a tablet has no keys: there a thumb does all of it, and the page shows what it needs for that
    // (index.html?touch shows the same on any machine)
    TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch\b/.test(location.search);
  if (TOUCH) document.body.classList.add('touch');
  let W, G, rest, posedBuf, holder, img, t = 0, last = 0, frames = 0, fpsAt = 0;
  // fingers. One of them put down and dragged is a stick: he goes the way it is dragged from where it was put down, softly
  // for a short drag and at a run for a longer one. Two of them, drawn apart or together, bring the picture nearer or further
  const fingers = new Map(),
    DEAD = 10, // a drag shorter than this is not one
    SOFT = 36, // nor a run, under this
    REACH = 48; // how far the stick's knob is drawn from its middle
  let stick = null, pinch = null, soft = false;
  // a slow machine: when a frame takes too long to make, the picture is made of fewer, bigger points (1: as designed)
  let quality = 1, spent = 0, counted = 0;
  let yaw, yawTo, zoom = 0.5, zoomTo = 1, cam = [0, 0, 0], box = { w: 1, h: 1 }, ptr = null; // it opens far off and comes in
  // 'play': he runs about. 'dead': she has him, and that is the end of it: the count of his days is all that is left on the screen
  let mode = 'play', deadT = 0, heard = 0, strides = 0;
  // the row of hints says a thing until he has done it: then that part of it goes out, and the room it took closes up slowly
  // (from the width it has to none: the page's styles say how long that takes), so the rest of the row draws together.
  // What he has done the browser keeps (KNOWN), so that he is not told it again the next time he comes
  const KNOWN = 'wickie.known',
    learnt = new Set(),
    learn = h => {
      if (learnt.has(h)) return;
      learnt.add(h);
      try {
        localStorage.setItem(KNOWN, [...learnt].join(' '));
      } catch (e) {} // (a browser that keeps nothing: he is told again next time, and that is all)
      for (const el of document.querySelectorAll('#hud [data-h="' + h + '"]')) {
        // (the row that is not shown, keys' or thumbs', has nothing to close)
        if (!el.getClientRects().length) {
          el.remove();
          continue;
        }
        // when it is the last of the row that is left, the dot that stood before it (it is the end of the part before) has
        // nothing to tell apart any more, and closes with it
        const gone = s => s && s.classList.contains('known');
        let next = el.nextElementSibling,
          prev = el.previousElementSibling;
        while (gone(next)) next = next.nextElementSibling;
        while (gone(prev)) prev = prev.previousElementSibling;
        if (!next && prev) {
          const whole = prev.getBoundingClientRect().width;
          prev.classList.add('bare');
          const dot = whole - prev.getBoundingClientRect().width;
          prev.classList.remove('bare');
          prev.style.setProperty('--dot', dot + 'px');
          prev.classList.add('end');
          void prev.offsetWidth;
          prev.style.setProperty('--dot', '0px');
        }
        el.style.width = el.getBoundingClientRect().width + 'px';
        el.classList.add('known');
        void el.offsetWidth; // (the width it starts from has to be taken in before the one it goes to is given)
        el.style.width = '0px';
        // it is taken away when it has closed, however long the page took over that (and in any case in the end)
        el.addEventListener('transitionend', ev => ev.propertyName === 'width' && el.remove());
        setTimeout(() => el.remove(), 8000);
      }
    };
  // what was kept from another time is not in the row at all: it is taken out before anything is shown, with no going out
  try {
    for (const h of (localStorage.getItem(KNOWN) || '').split(' ')) {
      if (!h) continue;
      learnt.add(h);
      for (const el of document.querySelectorAll('#hud [data-h="' + h + '"]')) el.remove();
    }
  } catch (e) {}
  let softAt = 0; // when a thumb began sending him softly (0: it is not)
  const mem = { deaths: 0 },
    // the old man talks to himself. How much of it is heard: none from six paces, all of it at his elbow
    mutterAt = d => Math.pow(Math.max(0, Math.min(1, (6 - d) / 4.8)), 1.6),
    TOO_NEAR = 1.8, // of her: there is no talking to her, and no second step (he can stand as near as 1.3: her rock stops him there)
    EARSHOT = 12, // of her: beyond this there is nothing of her to hear
    // how much of her song reaches him at a distance: nothing at the edge of earshot, a thread of it a few steps in, and all of
    // it only where it is already too late. It climbs slowly at first and fast at the end, so each step toward her is heard
    songAt = d => Math.pow(Math.max(0, Math.min(1, (EARSHOT - d) / (EARSHOT - TOO_NEAR))), 2.4),
    DAY = 90, // seconds from one sunrise to the next
    lut = new Uint8Array(256);
  // the days: clock counts them from the first sunrise and never goes back. What is shown is a bare number, and it begins at the
  // same one every time: 1898, which can be read as a count of days or as the year
  const FIRST = 1898;
  let clock = 0.03, dark = -1;
  // the old man's hours. Before the light begins to go he goes in, and in the morning he comes out: but one night in seven or
  // so he does not go in, and stands out there till morning; and as often, having gone in, he does not come out for the
  // whole of the day after. (duskAt, dawnAt: when in the day he does it, a little different each time)
  // The light is his. By day it is out. It is lit a little after he has gone in for the night (LIGHTS: he has the stair to
  // climb), which is as the dusk begins; in the morning it is put out, and a little after that (COMES) he comes out of his door.
  // The night he does not go in, there is nobody up there, and it is not lit at all.
  // (lamp: how far it is lit, 0..1, and shown, what the picture last had of it; tends: how long he has been in there, of a
  // night; comes: how long till he comes out)
  const KEEPS = 0.85,
    LIGHTS = 4,
    COMES = 4;
  let indoors = false, late = false, duskAt = 0.435, dawnAt = 0.97, lamp = 0, shown = -1, tends = 0, comes = 0;
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
    // (a phone held upright has room over and under the picture: it sits high, and the thumbs have what is under it)
    const x = Math.round((innerWidth - w) / 2),
      y = Math.round((innerHeight - h) * (TOUCH ? 0.2 : 0.5));
    for (const el of [canvas, $('frame'), $('ui')]) {
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
    $('ui').style.fontSize = Math.max(14, Math.round(h / 31)) + 'px';
    $('hud').style.fontSize = Math.max(13, Math.round(h / 58)) + 'px';
    if (TOUCH) {
      // the two that turn the view: in a row under the picture where there is room for one, or else one at either side of it
      // (they are drawn in pixels as big as the picture's own, as near as a thumb can do with)
      document.body.style.setProperty('--dab', Math.min(3, Math.max(2, Math.round(h / ROWS))));
      const pad = $('pad'),
        big = $('turnL').offsetWidth,
        under = innerHeight - (y + h) - $('hud').offsetHeight - 12,
        fits = under >= big + 8;
      pad.style.top = (fits ? y + h : Math.round(innerHeight * 0.14)) + 'px';
      pad.style.height = (fits ? Math.min(under, big + 36) : big + 36) + 'px';
      pad.style.padding = '0 ' + (fits ? Math.round(innerWidth * 0.05) : Math.max(4, Math.round((x - big) / 2))) + 'px'; // (at a side: in the middle of the black beside the picture)
    }
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
    window.wickie = { W, G, keys, mem, die, wish, hours, songAt, mutterAt, days: v => (v === undefined ? clock : (clock = v)), state: () => ({ mode, indoors, duskAt, dawnAt, lamp, late, touch: TOUCH, quality, soft, stick: !!stick, zoomTo, yawTo, held }) }; // for poking at from the console
  }

  // which way he is asked to go, across the ground, from the keys or from where the pointer is held.
  // Up is up the screen: but the view can be turned while he is going, and a turn of the view is not his being asked to go
  // another way. So what he is asked is read against the view as it stood when he was asked it (held: the asking, and the
  // view's angle it was read against), and he keeps on across the ground as he was going. It is read again, against the
  // view as it is now (or is turning to), when what is asked changes: other keys, or a thumb that has gone a good way round
  // (TURNED) from where it was when the view turned, or was lifted. A mouse held down is not kept so: he goes toward it,
  // and where it is is on the screen as it is
  const TURNED = (30 * Math.PI) / 180,
    GOES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
  let held = null;
  function wish() {
    let ix = 0,
      iy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    let by = null; // the angle of the view that what is asked is read against, where that is not the view's as it is
    if (ix || iy) {
      learn('roam');
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) learn('soft');
      const asked = ix + ',' + iy;
      if (!held || held.asked !== asked) held = { asked, yaw: yawTo };
      by = held.yaw;
    }
    soft = false;
    if (!ix && !iy && ptr) {
      const r = canvas.getBoundingClientRect(),
        dx = ptr.x - (r.left + r.width / 2),
        dy = ptr.y - (r.top + r.height * 0.56);
      if (Math.hypot(dx, dy) > 16) {
        ix = dx;
        iy = -dy / Math.sin(W.cam.pitch); // the ground is seen from above at a slant: up the screen is further than it looks
      }
    }
    if (!ix && !iy && stick) {
      const dx = stick.x - stick.x0,
        dy = stick.y - stick.y0,
        d = Math.hypot(dx, dy);
      if (d > DEAD) {
        ix = dx;
        iy = -dy / Math.sin(W.cam.pitch);
        soft = d < SOFT;
        learn('roam');
        const ang = Math.atan2(dy, dx);
        if (!held || held.asked !== 'thumb') held = { asked: 'thumb', yaw: yawTo, ang: null };
        if (held.yaw !== yawTo) {
          // the view has been turned under his thumb: from where the thumb was then, it has to go a good way round
          if (held.ang === null) held.ang = ang;
          else if (Math.abs(Math.atan2(Math.sin(ang - held.ang), Math.cos(ang - held.ang))) > TURNED) held = { asked: 'thumb', yaw: yawTo, ang: null };
        }
        by = held.yaw;
      }
    }
    if (by === null) held = null;
    if (!ix && !iy) return [0, 0];
    // up the screen is away from the camera; right is to its right
    const a = by === null ? yaw : by,
      s = Math.sin(a),
      c = Math.cos(a);
    return [c * ix - s * iy, -s * ix - c * iy];
  }

  // he came too near. She is up off her rock: the picture goes to its negative and shakes, and then there is only the number the
  // count had reached. Nothing follows it: he is not put back
  function die() {
    mode = 'dead';
    ptr = null;
    drop();
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
      px: Math.max(1, Math.round(box.h / ROWS)) / quality
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

  // the days go by, whatever he is doing, until she has him: the count of them, the old man's hours, the lamp, and how dark it is
  function hours(dt) {
    if (mode !== 'dead') {
      clock += dt / DAY;
      const label = String(FIRST + Math.floor(clock));
      if ($('day').textContent !== label) $('day').textContent = label;
      const f = clock % 1,
        nightly = f >= duskAt && f < dawnAt;
      if (nightly !== late) {
        late = nightly;
        // (otherwise he stays as he is, in or out)
        if (Math.random() < KEEPS) {
          if (nightly) G.home((indoors = true));
          else comes = COMES;
        }
        if (nightly) dawnAt = 0.955 + 0.03 * Math.random();
        else duskAt = 0.42 + 0.03 * Math.random();
      }
      if (comes > 0 && (comes -= dt) <= 0) G.home((indoors = false));
      // the lamp: lit once he has been through his door a while, of a night, and out as soon as the night is over
      tends = late && !G.npc.wake.here ? tends + dt : 0;
      const to = tends > LIGHTS ? 1 : 0;
      lamp += Math.max(-dt * 0.7, Math.min(dt * 0.7, to - lamp));
    }
    const n = nightAt(clock % 1);
    if (Math.abs(n - dark) > 0.004 || lamp !== shown) {
      dark = n;
      shown = lamp;
      G.grade(n, lut);
      G.night(n, lamp);
    }
  }

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60,
      began = performance.now();
    last = now;
    t += dt;
    const pl = G.pl,
      far = id => Math.hypot(pl.x - G.npc[id].x, pl.z - G.npc[id].z);
    let look = [pl.x, pl.y + 1.6, pl.z],
      close = 1;
    if (mode === 'play') {
      const [mx, mz] = wish();
      G.step(dt, mx, mz, keys.has('ShiftLeft') || keys.has('ShiftRight') || soft);
      // (every drag begins as a little one: it is treading soft only if he is kept at it a while)
      if (!soft) softAt = 0;
      else if (!softAt) softAt = now;
      else if (now - softAt > 800) learn('soft');
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
    hours(dt);
    W.anim.update(dt, t);
    G.sea(t); // the swell comes on
    // the camera: turns a quarter at a time, and follows a little behind
    yaw += (yawTo - yaw) * (1 - Math.exp(-dt * 7));
    zoom += (Math.min(2.8, zoomTo * close) - zoom) * (1 - Math.exp(-dt * (t < 6 ? 0.9 : mode === 'play' ? 8 : 3)));
    const k = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < 3; i++) cam[i] += (look[i] - cam[i]) * k;
    draw();
    frames++;
    // what the frame cost to make (not how long it was until the next: a page that is not looked at is not drawn at all).
    // Over 36 thousandths of a second each, a second or so running, and the picture is made a step coarser; never finer again
    if (t > 4 && mode === 'play') {
      spent += performance.now() - began;
      if (++counted >= 40) {
        if (spent / counted > 36 && quality > 0.6) quality = Math.max(0.6, quality * 0.86);
        spent = counted = 0;
      }
    }
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
    const c = ev.code,
      once = !ev.repeat;
    // (whatever he does first brings in what is not weather: all but stopping his ears)
    if (c === 'KeyM') Sound.start();
    else Sound.wake();
    if (c === 'KeyM' && once) {
      learn('ears'); // (the row stops saying it as it was: what it says is not changed as it goes out)
      ears();
    }
    if (mode === 'play' && once) {
      if (c === 'KeyQ') yawTo += Math.PI / 2;
      else if (c === 'KeyE') yawTo -= Math.PI / 2;
      if (c === 'KeyQ' || c === 'KeyE') learn('look');
    }
    keys.add(c);
    if (once && GOES.has(c)) held = null; // (a key that sends him, pressed or let go: what is asked is read again)
    if (c.startsWith('Arrow') || c === 'Space') ev.preventDefault();
  });
  addEventListener('keyup', ev => {
    keys.delete(ev.code);
    if (GOES.has(ev.code)) held = null;
  });
  addEventListener('blur', () => {
    keys.clear();
    ptr = null;
    drop();
  });
  // a mouse held down on the picture: he goes toward it
  canvas.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'mouse' || mode !== 'play') return;
    ptr = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', ev => {
    if (ptr && ev.pointerType === 'mouse') ptr = { x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener('pointerup', () => (ptr = null));
  canvas.addEventListener('pointercancel', () => (ptr = null));
  // fingers, anywhere on the page but on what is there to be pressed
  const far2 = () => {
      const [a, b] = [...fingers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    },
    knob = () => {
      const el = $('stick');
      el.style.display = stick ? 'block' : 'none';
      if (!stick) return;
      const dx = stick.x - stick.x0,
        dy = stick.y - stick.y0,
        k = Math.min(1, REACH / (Math.hypot(dx, dy) || 1));
      el.style.left = stick.x0 + 'px';
      el.style.top = stick.y0 + 'px';
      el.firstElementChild.style.transform = 'translate(' + Math.round(dx * k) + 'px,' + Math.round(dy * k) + 'px)';
    };
  function drop() {
    fingers.clear();
    stick = pinch = null;
    knob();
  }
  function ears() {
    const label = Sound.mute() ? 'unstop yer ears' : 'stop yer ears';
    for (const el of document.querySelectorAll('.snd')) if (!el.closest('.known')) el.textContent = label;
  }
  document.addEventListener('pointerdown', ev => {
    if (ev.target.closest && ev.target.closest('.tap')) Sound.start();
    else Sound.wake();
    if (ev.pointerType === 'mouse' || mode !== 'play' || (ev.target.closest && ev.target.closest('button, .tap'))) return;
    fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    // the first finger down is the stick; a second with it and the two are for bringing the picture nearer, and he stands
    stick = fingers.size === 1 ? { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY } : null;
    pinch = fingers.size === 2 ? { far: far2(), zoom: zoomTo } : null;
    knob();
  });
  document.addEventListener('pointermove', ev => {
    const f = fingers.get(ev.pointerId);
    if (!f) return;
    f.x = ev.clientX;
    f.y = ev.clientY;
    if (stick && stick.id === ev.pointerId) {
      stick.x = f.x;
      stick.y = f.y;
      knob();
    }
    if (pinch && fingers.size === 2) {
      zoomTo = Math.max(0.45, Math.min(2.2, (pinch.zoom * far2()) / pinch.far));
      if (Math.abs(far2() / pinch.far - 1) > 0.1) learn('zoom'); // (two fingers put down are not yet a pinch)
    }
  });
  for (const type of ['pointerup', 'pointercancel'])
    document.addEventListener(type, ev => {
      Sound.start(); // (a finger's touch lets a page make a sound only as it is lifted)
      if (!fingers.delete(ev.pointerId)) return;
      // (the finger left over from a pinch does not become a stick: it has to be lifted and put down again)
      if (stick && stick.id === ev.pointerId) stick = null;
      pinch = null;
      knob();
    });
  for (const [id, way] of [['turnL', 1], ['turnR', -1]])
    $(id).addEventListener('pointerdown', () => {
      if (mode !== 'play') return;
      yawTo += (way * Math.PI) / 2;
      learn('look');
    });
  for (const el of document.querySelectorAll('.tap')) el.addEventListener('click', ears);
  if (TOUCH) {
    // nothing of the page itself moves under a finger: no scrolling, no zooming, no menu on a long press
    for (const type of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(type, ev => ev.preventDefault());
    document.addEventListener('touchmove', ev => ev.preventDefault(), { passive: false });
    addEventListener('orientationchange', () => setTimeout(layout, 250));
  }
  addEventListener(
    'wheel',
    ev => {
      ev.preventDefault();
      Sound.wake();
      zoomTo = Math.max(0.45, Math.min(2.2, zoomTo * Math.exp(-ev.deltaY * 0.0015)));
      if (mode === 'play') learn('zoom');
    },
    { passive: false }
  );
  addEventListener('resize', layout);

  layout();
  Sound.start(); // the weather, at once: or as soon as the browser lets a page be heard
  setTimeout(() => {
    build();
    $('veil').classList.add('gone'); // it opens out of black
    requestAnimationFrame(frame);
  }, 60);
})();
