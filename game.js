// The page's side of Wickie: keys and pointer in (or, on a phone, thumbs), the keeper moved, the camera kept on him, the picture
// drawn in a 1.19:1 frame;
// what comes of going near her, what is heard (sound.js: among it the old man, who is not to be talked to but can be heard
// muttering by anyone who comes close); and the days: they go by whatever he does, and night follows day. The old man keeps
// hours by them: indoors for the night, and out again in the morning, most days.
(() => {
  const canvas = document.getElementById('view'),
    ctx = canvas.getContext('2d'),
    $ = id => document.getElementById(id),
    scene = sceneFactory({ makeBuilder, makeSculpt, KIT }),
    ASPECT = 1.19, // nearly square, as the first talking pictures were
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
  // 'play': he runs about. 'dead': she has him, and that is the end of it: the count of his cigarettes is all that is left on the screen
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
      if (always) return;
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
  // Unless he has asked for all of the row to be kept in sight (the ledger has a thing to tick for it; the browser keeps
  // that too: KEEP). Then nothing goes out of it, though what he has done is still counted, for when he asks no longer
  const KEEP = 'wickie.legend',
    whole = $('hud').innerHTML; // (the row as it was made, to put back)
  let always = false;
  try {
    always = localStorage.getItem(KEEP) === '1';
  } catch (e) {}
  // what was kept from another time is not in the row at all: it is taken out before anything is shown, with no going out
  try {
    for (const h of (localStorage.getItem(KNOWN) || '').split(' ')) {
      if (!h) continue;
      learnt.add(h);
      if (!always) for (const el of document.querySelectorAll('#hud [data-h="' + h + '"]')) el.remove();
    }
  } catch (e) {}
  function keep(on) {
    always = on;
    try {
      localStorage.setItem(KEEP, on ? '1' : '0');
    } catch (e) {}
    if (on) {
      $('hud').innerHTML = whole;
      if (Sound.deaf()) for (const el of document.querySelectorAll('#hud .snd')) el.textContent = 'unstop yer ears';
    } else for (const h of learnt) for (const el of document.querySelectorAll('#hud [data-h="' + h + '"]')) el.remove();
    layout(); // (under a thumb, what is pressed is put where the row leaves room for it)
    paint();
  }
  // the ledger: laid over the picture by Esc (under a thumb, by pressing its name in the row of hints) and put away the same
  // way. In it, how loud he has it: all of it, the music (the horn is of it), and what is not the music, each in so many steps (STEPS: all of them
  // is as loud as it was made); two things to tick, his ears stopped and the row of hints kept whole (keep(), above); and who
  // made what. What he sets the browser keeps (VOLS). While it is open he stands where he is, and the days go by as they do
  const VOLS = 'wickie.sound',
    STEPS = 10,
    vol = { all: STEPS, music: 7, rest: STEPS }, // (the music, and the horn with it, a little under the rest until he says otherwise)
    lines = [...document.querySelectorAll('#menu .vol')], // (the three of them, and under them the two to tick)
    ticked = c => (c === 'keep' ? always : Sound.deaf()),
    tick = c => (c === 'keep' ? keep(!always) : ears());
  let open = false, line = 0;
  try {
    const kept = (localStorage.getItem(VOLS) || '').split(' ').map(Number),
      names = Object.keys(vol);
    if (kept.length === names.length && kept.every(v => Number.isInteger(v) && v >= 0 && v <= STEPS)) names.forEach((k, i) => (vol[k] = kept[i]));
  } catch (e) {}
  // (a step is heard as a step: the level goes as the square of how far along he has it)
  const loud = () => Sound.volume({ all: (vol.all / STEPS) ** 2, music: (vol.music / STEPS) ** 2, rest: (vol.rest / STEPS) ** 2 }),
    paint = () =>
      lines.forEach((el, i) => {
        el.classList.toggle('sel', i === line);
        const v = vol[el.dataset.v],
          c = el.dataset.c;
        if (c) {
          el.classList.toggle('on', ticked(c));
          el.setAttribute('aria-checked', String(ticked(c)));
        }
        [...el.querySelectorAll('.pips i')].forEach((p, n) => p.classList.toggle('on', n < v));
      }),
    turnTo = (k, v) => {
      v = Math.max(0, Math.min(STEPS, v));
      if (v === vol[k]) return;
      vol[k] = v;
      loud();
      paint();
      try {
        localStorage.setItem(VOLS, Object.values(vol).join(' '));
      } catch (e) {}
    };
  function book(on) {
    open = on;
    $('menu').classList.toggle('on', on);
    $('menu').setAttribute('aria-hidden', String(!on));
    if (!on) return;
    learn('book');
    keys.clear();
    ptr = held = null;
    drop();
    paint();
  }
  // the keys, while it is open: up and down among its lines, left and right to turn the one he is on down or up (or, if it
  // is one to tick, to tick it or not: as Enter does, and the long key)
  function leaf(c) {
    const el = lines[line],
      k = el.dataset.v,
      by = c === 'ArrowLeft' || c === 'KeyA' ? -1 : c === 'ArrowRight' || c === 'KeyD' ? 1 : 0;
    if (c === 'ArrowUp' || c === 'KeyW') line = (line + lines.length - 1) % lines.length;
    else if (c === 'ArrowDown' || c === 'KeyS') line = (line + 1) % lines.length;
    else if (k && by) turnTo(k, vol[k] + by);
    else if (!k && (by || c === 'Enter' || c === 'Space')) tick(el.dataset.c);
    paint();
  }
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
  // the days: clock counts them from the first sunrise and never goes back. (They are not shown.)
  // What is shown is a bare number, the count of his cigarettes, and it begins at the same one every time: 1898, which
  // can be read as the year until it is seen to go up as he smokes
  const FIRST = 1898;
  // The count of his cigarettes is kept as a scoreboard keeps a score: each figure on a reel of its own, and one that
  // changes is wound up out of sight as the next comes up from under it, the right-hand one first. A reel is as wide as
  // the figure on it, and goes from the one width to the other as it turns.
  // (tally.n: what is shown; tally.on: when it was first put up; tally.till: when any reel still turning is to be stopped
  // where it belongs, in a browser that has not said that it is done)
  const tally = { n: '', on: 0, till: 0 },
    LAG = 90, // each reel begins so long after the one to its right (thousandths of a second)
    figure = c => {
      const i = document.createElement('i');
      i.textContent = c;
      return i;
    },
    // a reel has stopped: it keeps only the figure it shows
    still = reel => {
      if (!reel.classList.contains('go')) return;
      reel.classList.remove('go');
      reel.style.width = '';
      reel.firstChild.replaceChildren(reel.firstChild.lastChild);
    },
    settle = () => {
      for (const reel of $('cigs').children) still(reel);
      tally.till = 0;
    },
    // a number put up as it is, with no turning
    put = n => {
      tally.n = String(n);
      $('cigs').replaceChildren(
        ...tally.n.split('').map(c => {
          const reel = document.createElement('span'),
            strip = document.createElement('span');
          reel.className = 'reel';
          strip.append(figure(c));
          reel.append(strip);
          return reel;
        })
      );
    },
    // and one it is turned to
    roll = (n, now) => {
      const to = String(n);
      settle();
      if (to.length !== tally.n.length) return put(n);
      [...$('cigs').children].forEach((reel, k) => {
        if (to[k] === tally.n[k]) return;
        const strip = reel.firstChild,
          next = figure(to[k]);
        strip.append(next);
        const wide = next.getBoundingClientRect().width;
        reel.style.width = strip.firstChild.getBoundingClientRect().width + 'px';
        reel.style.setProperty('--wait', (to.length - 1 - k) * LAG + 'ms');
        reel.getBoundingClientRect(); // (so that it turns from where it is)
        reel.classList.add('go');
        reel.style.width = wide + 'px';
      });
      tally.n = to;
      tally.till = now + 5000;
    };
  $('cigs').addEventListener('transitionend', ev => {
    if (ev.propertyName === 'transform') still(ev.target.parentNode);
  });
  let clock = 0.03, dark = -1;
  // the old man's hours. Before the light begins to go he goes in, every night; and in the morning he comes out: but one
  // morning in seven or so (KEEPS) he does not, and is not seen for the whole of that day.
  // (duskAt, dawnAt: when in the day he does it, a little different each time)
  // The light is his. By day it is out. It is lit a little after he has gone in for the night (LIGHTS: he has the stair to
  // climb), which is as the dusk begins; in the morning it is put out, and a little after that (COMES) he comes out of his door.
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
    const letter = Math.max(14, Math.min(22, Math.round(h / 46))),
      fine = Math.max(1, Math.round(devicePixelRatio || 1)),
      room = Math.min(25 * letter, innerWidth) - 2.4 * letter, // (how long a line of it is)
      most = (0.5 * room) / (STEPS * Number($('menu').dataset.step)); // (a line's steps are to take no more than half of it)
    $('menu').style.fontSize = letter + 'px';
    // (its stone things, so many times the size they were drawn: a whole number of the screen's own points to each of theirs)
    $('menu').style.setProperty('--pix', Math.max(1, Math.min(Math.round((letter / 11) * fine), Math.floor(most * fine)) / fine));
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
      const side = fits ? Math.round(innerWidth * 0.05) : Math.max(4, Math.round((x - big) / 2));
      pad.style.padding = '0 ' + side + 'px'; // (at a side: in the middle of the black beside the picture)
      // and the one for his smoke: between the two, where they are in a row; or else under the one at the right
      const light = $('light');
      light.style.left = (fits ? Math.round((innerWidth - big) / 2) : innerWidth - side - big) + 'px';
      light.style.top = (fits ? pad.offsetTop + Math.round((pad.offsetHeight - big) / 2) : pad.offsetTop + pad.offsetHeight + 4) + 'px';
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
    window.wickie = { W, G, keys, mem, die, wish, hours, songAt, mutterAt, days: v => (v === undefined ? clock : (clock = v)), book, keep, learn, state: () => ({ book: open, vol, legend: always, learnt: [...learnt].join(' '), mode, indoors, duskAt, dawnAt, lamp, late, touch: TOUCH, quality, soft, stick: !!stick, zoomTo, yawTo, held }) }; // for poking at from the console
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
    G.pl.cig = 0;
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
      $('lived').textContent = FIRST + G.pl.smoked; // the count stopped where it was (and is shown now, if he never lit one)
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
    // black and white: whatever tint the paint had is dropped, and each point is only as light as it is
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      dst[j] = dst[j + 1] = dst[j + 2] = lut[(src[i] * 77 + src[i + 1] * 150 + src[i + 2] * 29) >> 8];
      dst[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  // the days go by, whatever he is doing, until she has him: the old man's hours, the lamp, and how dark it is
  function hours(dt) {
    if (mode !== 'dead') {
      clock += dt / DAY;
      const f = clock % 1,
        nightly = f >= duskAt && f < dawnAt;
      if (nightly !== late) {
        late = nightly;
        if (nightly) G.home((indoors = true));
        else if (Math.random() < KEEPS) comes = COMES; // (otherwise he stays in)
        if (nightly) dawnAt = 0.955 + 0.03 * Math.random();
        else duskAt = 0.42 + 0.03 * Math.random();
      }
      if (comes > 0 && (comes -= dt) <= 0) G.home((indoors = false));
      // the lamp: lit once he has been through his door a while, of a night, and out as soon as the night is over
      tends = late && !G.npc.old.here ? tends + dt : 0;
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
      const [mx, mz] = open ? [0, 0] : wish();
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
    // muttering by his door (but not once he is through it: he is up the tower then, and nothing of him is heard down here)
    if (t - heard > 0.15) {
      heard = t;
      const d = far('mer'),
        e = Math.hypot(pl.x - G.places.engine[0], pl.z - G.places.engine[1]);
      Sound.set({ sea: 1 - Math.max(0, Math.min(1, G.inside(pl.x, pl.z) / 0.4)), song: mode === 'dead' && deadT >= 1.8 ? 0 : songAt(d), mutter: mode === 'play' ? (G.npc.old.here ? mutterAt(far('old')) : 0) : 0, horn: 1 / (1 + (e * e) / 90) });
    }
    hours(dt);
    W.anim.update(dt, t);
    if (pl.flare) {
      pl.flare = false; // (his match has taken)
      Sound.strike();
    }
    // how many he has smoked: a bare number, and not there until he has lit the first. It does not begin at nothing: he
    // had smoked as many as that before he came
    // It is put up as it stood before this one, and then turned (roll()), so that it is seen what it is a count of
    if (pl.smoked) {
      const now = performance.now();
      if (!tally.on) {
        tally.on = now;
        put(FIRST);
        $('cigs').classList.add('on');
      } else if (now - tally.on > 900 && tally.n !== String(FIRST + pl.smoked)) roll(FIRST + pl.smoked, now);
      else if (tally.till && now > tally.till) settle();
    }
    G.sea(t); // the swell comes on
    // the camera: turns a quarter at a time (and not in a hurry), and follows a little behind
    yaw += (yawTo - yaw) * (1 - Math.exp(-dt * 5.6));
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
    if (c === 'Escape' && once) book(!open);
    if (open) {
      if (once || c.startsWith('Arrow')) leaf(c);
      if (c.startsWith('Arrow') || c === 'Space') ev.preventDefault();
      return;
    }
    if (c === 'KeyC' && once) light();
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
  // his smoke: he lights one, standing (and the row stops saying how, once he has); or, having one, is done with it
  function light() {
    if (mode === 'play' && G.smoke()) learn('smoke');
  }
  function ears() {
    const label = Sound.mute() ? 'unstop yer ears' : 'stop yer ears';
    for (const el of document.querySelectorAll('#hud .snd')) if (!el.closest('.known')) el.textContent = label;
    paint(); // (the ledger has it too, as a thing ticked)
  }
  document.addEventListener('pointerdown', ev => {
    if (ev.target.closest && ev.target.closest('.tap')) Sound.start();
    else Sound.wake();
    if (ev.pointerType === 'mouse' || mode !== 'play' || open || (ev.target.closest && ev.target.closest('button, .tap, #menu'))) return;
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
  $('light').addEventListener('pointerdown', light);
  // (what is pressed in the row of hints is looked for when it is pressed: the row may have been put back whole since)
  $('hud').addEventListener('click', ev => {
    const el = ev.target.closest && ev.target.closest('.tap');
    if (el) el.classList.contains('snd') ? ears() : book(true);
  });
  lines.forEach(
    (el, i) =>
      el.dataset.c &&
      el.addEventListener('click', () => {
        line = i;
        tick(el.dataset.c);
      })
  );
  $('back').addEventListener('click', () => book(false));
  // a line of the ledger, pressed or dragged along: it is turned to where the pointer is (left of the first step: to nothing)
  lines.forEach((el, i) => {
    const pips = el.querySelector('.pips');
    if (!pips) return;
    const at = ev => {
      const all = pips.querySelectorAll('i'),
        l = all[0].getBoundingClientRect().left,
        r = all[all.length - 1].getBoundingClientRect().right;
      line = i;
      turnTo(el.dataset.v, Math.ceil(((ev.clientX - l) / (r - l)) * STEPS));
      paint();
    };
    let drag = null;
    pips.addEventListener('pointerdown', ev => {
      drag = ev.pointerId;
      try {
        pips.setPointerCapture(drag); // (so that it goes on being dragged when the pointer is off the line)
      } catch (e) {}
      at(ev);
    });
    pips.addEventListener('pointermove', ev => ev.pointerId === drag && at(ev));
    for (const type of ['pointerup', 'pointercancel']) pips.addEventListener(type, () => (drag = null));
  });
  if (TOUCH) {
    // nothing of the page itself moves under a finger: no scrolling, no zooming, no menu on a long press
    for (const type of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(type, ev => ev.preventDefault());
    document.addEventListener('touchmove', ev => (ev.target.closest && ev.target.closest('#menu') && !ev.target.closest('.pips')) || ev.preventDefault(), { passive: false }); // (but the ledger, where it is longer than the screen, can be drawn up and down)
    addEventListener('orientationchange', () => setTimeout(layout, 250));
  }
  addEventListener(
    'wheel',
    ev => {
      if (open) return;
      ev.preventDefault();
      Sound.wake();
      zoomTo = Math.max(0.45, Math.min(2.2, zoomTo * Math.exp(-ev.deltaY * 0.0015)));
      if (mode === 'play') learn('zoom');
    },
    { passive: false }
  );
  addEventListener('resize', layout);

  layout();
  loud();
  paint();
  Sound.start(); // the weather, at once: or as soon as the browser lets a page be heard
  setTimeout(() => {
    build();
    $('veil').classList.add('gone'); // it opens out of black
    requestAnimationFrame(frame);
  }, 60);
})();
