// The toolkit's software renderer (cli/render.js), made to draw the same picture in less time: its per-frame depth sort
// swapped for a radix sort, and (TRIMS, below) work left out wherever what it would come to is known beforehand.
// Up to there the picture is the same to the last bit, which is how each of these was tried. The lists after TRIMS go on
// from it: each says, above it, whether it keeps the picture to the last bit or how near it keeps it.
// The original sorts every splat with a comparator callback each frame, which costs more than drawing them does in small scenes.
//   source(repo)  -> the patched renderer as script text ending in `return { render, ... }` (for build.js)
//   load(repo)    -> the same, ready to call from Node (for shot.js, card.js, icons.js)
const fs = require('fs'),
  path = require('path');

const SORT_OLD = `  const order = new Uint32Array(N);
  for (let i = 0; i < N; i++) order[i] = i;
  order.sort((a, b) => depth[a] - depth[b]);`;
// Far to near, ties in the order the splats were laid: exactly the order the original's stable sort gives, by a radix sort on
// the bits of each depth (three passes of eleven bits).
// (It was a counting sort into 65536 buckets between the nearest and the farthest splat. But those two move every frame:
// rain falls, the beam turns. So the buckets' edges moved every frame, and two splats nearly as far off as one another
// were now in one bucket, drawn in the order they were laid, and now in two, drawn by depth. Where splats of different
// greys overlap closely, as on a rock made of two blocks, that showed as a flicker with nothing moving)
const SORT_NEW = `  const order = lent.order;
  {
    const bits = new Uint32Array(depth.buffer, depth.byteOffset, N);
    let ks = lent.ks,
      kd = lent.kd,
      src = order,
      dst = lent.dst;
    for (let i = 0; i < N; i++) {
      const b = bits[i];
      ks[i] = b >>> 31 ? ~b : b | 0x80000000; // a float's bits, made to count upward as the float does
      order[i] = i;
    }
    const cnt = lent.cnt;
    for (let shift = 0; shift < 33; shift += 11) {
      cnt.fill(0);
      for (let i = 0; i < N; i++) cnt[((ks[i] >>> shift) & 2047) + 1]++;
      for (let k = 0; k < 2048; k++) cnt[k + 1] += cnt[k];
      for (let i = 0; i < N; i++) {
        const p = cnt[(ks[i] >>> shift) & 2047]++;
        dst[p] = src[i];
        kd[p] = ks[i];
      }
      let w = src;
      src = dst;
      dst = w;
      w = ks;
      ks = kd;
      kd = w;
    }
    if (src !== order) order.set(src);
  }`;

// What is left out, each as [the original's lines, what stands in their place]. None of it changes a single point of the
// picture: every one is a thing the original works out and then does nothing with.
const TRIMS = [
  // The lists it works in are made once and kept from frame to frame (lent), not made anew for every picture: a dozen
  // of them as long as the world, thrown away sixty times a second, kept the browser sweeping up.
  // (The picture it hands back is still a new one each time; and whoever asks for the depths, with samples, is given
  // lists of their own: they may keep them)
  [
    `function render(world, o) {`,
    `let lent = null,
  lentPic = null;
function render(world, o) {`
  ],
  [
    `  const X = new Float32Array(N),
    Y = new Float32Array(N),
    Z = new Float32Array(N),
    AL = new Float32Array(N),
    SC = new Float32Array(N),
    depth = new Float32Array(N),
    add = new Float32Array(N),
    wet = new Float32Array(N);`,
    `  if (!lent || lent.N !== N) {
    const f = () => new Float32Array(N),
      u = () => new Uint32Array(N);
    lent = { N, X: f(), Y: f(), Z: f(), AL: f(), SC: f(), depth: f(), add: f(), wet: f(), order: u(), ks: u(), kd: u(), dst: u(), cnt: new Uint32Array(2049) };
  }
  const { X, Y, Z, AL, SC, depth, add, wet } = lent;
  add.fill(0);
  wet.fill(0);`
  ],
  [
    `  const col = new Float32Array(W * H * 3),
    dep = new Float32Array(W * H),
    gls = new Float32Array(W * H);`,
    `  if (!o.samples && (!lentPic || lentPic.n !== W * H)) lentPic = { n: W * H, col: new Float32Array(W * H * 3), dep: new Float32Array(W * H), gls: new Float32Array(W * H) };
  const col = o.samples ? new Float32Array(W * H * 3) : lentPic.col,
    dep = o.samples ? new Float32Array(W * H) : lentPic.dep,
    gls = o.samples ? new Float32Array(W * H) : lentPic.gls;
  if (!o.samples) gls.fill(0);
  // (does anything read the depths afterward: an outline, a contact shade, the clean-up, or whoever asked for samples)
  const deep = !!(o.samples || o.clean || (world.outline && world.outline.edge) || (world.ao && (world.ao.k === undefined ? 0.5 : world.ao.k) > 0));
  let glassy = false; // (has any glass been drawn yet: until it has, there is none anywhere to be thinned or bent through)`
  ],
  // A splat that cannot reach the picture is let go before anything more is worked out for it. How far across the
  // screen it can reach is at most what a ball as big as its three axes together would: that is cheap to know, and
  // never less than its true reach (which the original finds, at length, and only then lets the splat go)
  [
    `    if (cz > -near) continue;
    const kraw = Math.round(d[q + 11]),
      kind = kraw % 16,
      flags = Math.floor(kraw / 16),
      s2 = SC[i] * SC[i],
      pk = d[q + 7];
    let r = (pk % 256) / 255 + add[i],
      g = (Math.floor(pk / 256) % 256) / 255 + add[i],
      b = Math.floor(pk / 65536) / 255 + add[i];`,
    `    if (cz > -near) continue;
    const s2 = SC[i] * SC[i];
    {
      const iz = -1 / cz,
        j00 = focal * iz,
        j02 = focal * (clamp(cx * iz, -limx, limx) / iz) * iz * iz,
        j12 = focal * (clamp(cy * iz, -limy, limy) / iz) * iz * iz,
        most = (d[q + 4] + d[q + 8] + d[q + 10]) * s2,
        bx = 3.01 * Math.sqrt((j00 * j00 + j02 * j02) * most + 0.15) + 1,
        by = 3.01 * Math.sqrt((j00 * j00 + j12 * j12) * most + 0.15) + 1,
        mx = ((((tp / asp) * cx) / -cz) * 0.5 + 0.5) * W,
        my = (((tp * cy) / -cz) * 0.5 + 0.5) * H;
      if (mx + bx < 0 || mx - bx > W || my + by < 0 || my - by > H) continue;
    }
    const kraw = Math.round(d[q + 11]),
      kind = kraw & 15,
      flags = kraw >> 4,
      pk = d[q + 7];
    let r = (pk & 255) / 255 + add[i],
      g = ((pk >> 8) & 255) / 255 + add[i],
      b = (pk >> 16) / 255 + add[i];`
  ],
  // A splat is tried against every point of a box round it, three of its widths each way. But a point further out than
  // a certain ring of it comes to nothing (too faint to be put down at all), and that ring is known from how dense the
  // splat is: for a solid one it is well inside the box, which is drawn in to it
  [
    `      ex = Math.min(3 * Math.sqrt(A), 2048),
      ey = Math.min(3 * Math.sqrt(C), 2048);`,
    `      hard = al >= 1 && !o.soft,
      lo = Math.max(-4.5, Math.log((hard ? 0.388 : 0.00399) / al)), // (how far out, as the points are tried, there is still something)
      hi = Math.log((hard ? 0.6201 : 0.9901) / al), // (and how far in it is all one strength)
      ring = Math.sqrt(-2 * lo) + 1e-3,
      ex = Math.min(ring * Math.sqrt(A), 2048),
      ey = Math.min(ring * Math.sqrt(C), 2048);
    if (lo > 0) continue; // (so faint that there is nothing of it anywhere)`
  ],
  // And at a point of it the strength is found by raising e to a power, which is slow. Outside that ring there is no
  // need to: nothing is put down. Inside another, nearer its middle, there is none either: it is as strong as it gets
  [
    `        if (pw > 0 || pw < -4.5) continue;
        const gg = al * Math.exp(pw);
        let a = Math.min(0.99, gg);
        if (!o.soft && solid) a = 0.99 * sstep(0.38, 0.62, gg);
        if (a < 0.004) continue;`,
    `        if (pw > 0 || pw < lo) continue;
        let a = 0.99;
        if (pw < hi) {
          const gg = al * Math.exp(pw);
          a = hard ? 0.99 * sstep(0.38, 0.62, gg) : Math.min(0.99, gg);
          if (a < 0.004) continue;
        }`
  ],
  [
    `    const solid = al >= 1,
      wd = solid && !(flags & 1),
      glass = (flags & 16) !== 0,`,
    `    const solid = al >= 1,
      wd = solid && !(flags & 1),
      glass = (flags & 16) !== 0,
      thins = wd && glassy,`
  ],
  [
    `    drawn++;`,
    `    drawn++;
    if (glass) glassy = true;`
  ],
  // the depths are kept only if something is going to read them; the glass thinned only where there has been any
  [
    `        if (wd) {
          dep[p] = dn * a + dep[p] * ia;
          gls[p] *= ia;
        } else if (glass) gls[p] = Math.min(1, gls[p] + a * 0.5);`,
    `        if (wd) {
          if (deep) dep[p] = dn * a + dep[p] * ia;
          if (thins) gls[p] *= ia;
        } else if (glass) gls[p] = Math.min(1, gls[p] + a * 0.5);`
  ],
  // The second pass, over every point of the picture. Where no glass was drawn, none is looked for
  [
    `      if (!o.raw) {
        const gx = G(x + 1, y) - G(x - 1, y),`,
    `      if (!o.raw && glassy) {
        const gx = G(x + 1, y) - G(x - 1, y),`
  ],
  // nor the step in depth an outline would be drawn at, where the world has no outline
  [
    `      if (edge > 0 && dc - dm > edge) {`,
    `      if (edge > 0 && dc - (dc - Math.max(2 * dc - D(x - 1, y) - D(x + 1, y), 2 * dc - D(x, y + 1) - D(x, y - 1))) > edge) {`
  ],
  [
    `      const dc = dep[p],
        dm = dc - Math.max(2 * dc - D(x - 1, y) - D(x + 1, y), 2 * dc - D(x, y + 1) - D(x, y - 1));`,
    `      const dc = dep[p];`
  ],
  // The nearest colour of the palette: every colour was tried at every point. It is tried first against the one the
  // point before it came to (most often it is that one again, or near it), and after that a colour is let go as soon
  // as its red alone is further off than the best so far. (Of two equally near, the earlier in the palette, as it was)
  [
    `      let bd = 1e9,
        bi = 0;
      for (let i = 0; i < np; i++) {
        const e = pal[i],
          dr = r - e[0],
          dg = g - e[1],
          db = b - e[2],
          dd = dr * dr * 0.3 + dg * dg * 0.55 + db * db * 0.15;
        if (dd < bd) {
          bd = dd;
          bi = i;
        }
      }`,
    `      let bi = was,
        bd = 0;
      {
        const dr = r - PAL[bi * 3],
          dg = g - PAL[bi * 3 + 1],
          db = b - PAL[bi * 3 + 2];
        bd = dr * dr * 0.3 + dg * dg * 0.55 + db * db * 0.15;
      }
      for (let i = 0; i < np; i++) {
        const dr = r - PAL[i * 3],
          d0 = dr * dr * 0.3;
        if (d0 > bd) continue;
        const dg = g - PAL[i * 3 + 1],
          db = b - PAL[i * 3 + 2],
          dd = d0 + dg * dg * 0.55 + db * db * 0.15;
        if (dd < bd || (dd === bd && i < bi)) {
          bd = dd;
          bi = i;
        }
      }
      was = bi;`
  ],
  [
    `  for (let i = 0; i < np; i++) pal.push(hex(i));`,
    `  for (let i = 0; i < np; i++) pal.push(hex(i));
  const PAL = new Float64Array(np * 3);
  for (let i = 0; i < np; i++) PAL.set(pal[i], i * 3);
  let was = 0;`
  ]
];

// The nearest colour of the palette, found without trying them all: the palette is gone through in the order of its reds, outward
// from the colour the point before had, and no further either way than where the red alone is off by more than the best so far.
// (The same colour as trying all of them finds, to the last tie.)
const PALETTE = [
  [
    `  let was = 0;`,
    `  let was = 0;
  // the palette in order of its reds (RED), which colour of it each of those is (ORD), and where each colour is in that order (POS)
  const ORD = Int32Array.from(Array.from({ length: np }, (v, i) => i).sort((a, b) => PAL[a * 3] - PAL[b * 3] || a - b)),
    RED = new Float64Array(np),
    POS = new Int32Array(np);
  for (let k = 0; k < np; k++) {
    RED[k] = PAL[ORD[k] * 3];
    POS[ORD[k]] = k;
  }`
  ],
  [
    `      for (let i = 0; i < np; i++) {
        const dr = r - PAL[i * 3],
          d0 = dr * dr * 0.3;
        if (d0 > bd) continue;
        const dg = g - PAL[i * 3 + 1],
          db = b - PAL[i * 3 + 2],
          dd = d0 + dg * dg * 0.55 + db * db * 0.15;
        if (dd < bd || (dd === bd && i < bi)) {
          bd = dd;
          bi = i;
        }
      }`,
    `      {
        const at = POS[bi];
        for (let k = at - 1; k >= 0; k--) {
          const dr = r - RED[k],
            d0 = dr * dr * 0.3;
          if (d0 > bd) {
            if (dr > 0) break; // (redder than any of the rest by more than the best is off altogether)
            continue;
          }
          const i = ORD[k],
            dg = g - PAL[i * 3 + 1],
            db = b - PAL[i * 3 + 2],
            dd = d0 + dg * dg * 0.55 + db * db * 0.15;
          if (dd < bd || (dd === bd && i < bi)) {
            bd = dd;
            bi = i;
          }
        }
        for (let k = at + 1; k < np; k++) {
          const dr = r - RED[k],
            d0 = dr * dr * 0.3;
          if (d0 > bd) {
            if (dr < 0) break;
            continue;
          }
          const i = ORD[k],
            dg = g - PAL[i * 3 + 1],
            db = b - PAL[i * 3 + 2],
            dd = d0 + dg * dg * 0.55 + db * db * 0.15;
          if (dd < bd || (dd === bd && i < bi)) {
            bd = dd;
            bi = i;
          }
        }
      }`
  ]
];
// Whether a splat can reach the picture at all is asked before the sort, of the same numbers it was asked of after: so only
// those that can are sorted and drawn. (The same picture to the last bit.)
const SEEN = [
  [
    `lent = { N, X: f(), Y: f(), Z: f(), AL: f(), SC: f(), depth: f(), add: f(), wet: f(), order: u(), ks: u(), kd: u(), dst: u(), cnt: new Uint32Array(2049) };`,
    `lent = { N, X: f(), Y: f(), Z: f(), AL: f(), SC: f(), depth: f(), add: f(), wet: f(), order: u(), ks: u(), kd: u(), dst: u(), seen: u(), cnt: new Uint32Array(2049) };`
  ],
  [
    `  add.fill(0);
  wet.fill(0);`,
    `  add.fill(0);
  wet.fill(0);
  const seen = lent.seen;
  let nv = 0,
    mn = Infinity,
    anyGlass = false;`
  ],
  [
    `    depth[i] = V[2] * x + V[6] * y + V[10] * z + V[14];
  }
  let mn = Infinity;
  for (let i = 0; i < N; i++) if (depth[i] < mn) mn = depth[i];`,
    `    depth[i] = V[2] * x + V[6] * y + V[10] * z + V[14];
    if (depth[i] < mn) mn = depth[i];
    if (kraw & 256) anyGlass = true;
    // can it reach the picture at all (asked here just as it is asked again below, of the same numbers: those kept, not these)
    {
      const xk = X[i],
        yk = Y[i],
        zk = Z[i];
      if (AL[i] <= 0 || yk < -30) continue;
      const cx = V[0] * xk + V[4] * yk + V[8] * zk + V[12],
        cy = V[1] * xk + V[5] * yk + V[9] * zk + V[13],
        cz = V[2] * xk + V[6] * yk + V[10] * zk + V[14];
      if (cz > -near) continue;
      const s2 = SC[i] * SC[i],
        iz = -1 / cz,
        j00 = focal * iz,
        j02 = focal * (clamp(cx * iz, -limx, limx) / iz) * iz * iz,
        j12 = focal * (clamp(cy * iz, -limy, limy) / iz) * iz * iz,
        most = (d[q + 4] + d[q + 8] + d[q + 10]) * s2,
        bx = 3.01 * Math.sqrt((j00 * j00 + j02 * j02) * most + 0.15) + 1,
        by = 3.01 * Math.sqrt((j00 * j00 + j12 * j12) * most + 0.15) + 1,
        mx = ((((tp / asp) * cx) / -cz) * 0.5 + 0.5) * W,
        my = (((tp * cy) / -cz) * 0.5 + 0.5) * H;
      if (mx + bx < 0 || mx - bx > W || my + by < 0 || my - by > H) continue;
    }
    seen[nv++] = i;
  }`
  ],
  [
    `    for (let i = 0; i < N; i++) {
      const b = bits[i];
      ks[i] = b >>> 31 ? ~b : b | 0x80000000; // a float's bits, made to count upward as the float does
      order[i] = i;
    }`,
    `    for (let k = 0; k < nv; k++) {
      const b = bits[seen[k]];
      ks[k] = b >>> 31 ? ~b : b | 0x80000000; // a float's bits, made to count upward as the float does
      order[k] = seen[k];
    }`
  ],
  [
    `      for (let i = 0; i < N; i++) cnt[((ks[i] >>> shift) & 2047) + 1]++;`,
    `      for (let i = 0; i < nv; i++) cnt[((ks[i] >>> shift) & 2047) + 1]++;`
  ],
  [
    `      for (let i = 0; i < N; i++) {
        const p = cnt[(ks[i] >>> shift) & 2047]++;`,
    `      for (let i = 0; i < nv; i++) {
        const p = cnt[(ks[i] >>> shift) & 2047]++;`
  ],
  [
    `    if (src !== order) order.set(src);`,
    `    if (src !== order) for (let i = 0; i < nv; i++) order[i] = src[i];`
  ],
  [
    `  for (let n = 0; n < N; n++) {
    const i = order[n],`,
    `  for (let n = 0; n < nv; n++) {
    const i = order[ftb ? nv - 1 - n : n],`
  ],
  [
    `  let glassy = false;`,
    `  const ftb = FRONT;
  let glassy = false;`
  ]
];
// Near to far, where nothing needs it the other way (no glass, no outline, no contact shade): each point keeps how much of
// what is behind it still shows, and once that is next to nothing (three solid splats deep) nothing more is put there.
// This one is not the same to the last bit: the sums are made in another order, and what is under three solids is left out.
// Over three hundred pictures, one point or so in each lands on the palette colour next to the one it had.
const FRONT = [
  [
    `  const ftb = FRONT;`,
    `  const ftb = !o.samples && !deep && !anyGlass && !o.back2front;`
  ],
  [
    `lentPic = { n: W * H, col: new Float32Array(W * H * 3), dep: new Float32Array(W * H), gls: new Float32Array(W * H) };`,
    `lentPic = { n: W * H, col: new Float32Array(W * H * 3), dep: new Float32Array(W * H), gls: new Float32Array(W * H), thru: new Float32Array(W * H) };`
  ],
  [
    `  for (let i = 0; i < W * H; i++) {
    col[i * 3] = bg[0];
    col[i * 3 + 1] = bg[1];
    col[i * 3 + 2] = bg[2];
    dep[i] = 1;
  }`,
    `  const thru = ftb ? lentPic.thru : null; // (how much of what is behind still shows at each point: all of it, to begin with)
  if (ftb) {
    col.fill(0);
    thru.fill(1);
    dep.fill(1);
  } else
    for (let i = 0; i < W * H; i++) {
      col[i * 3] = bg[0];
      col[i * 3 + 1] = bg[1];
      col[i * 3 + 2] = bg[2];
      dep[i] = 1;
    }`
  ],
  [
    `    for (let iy = y0; iy <= y1; iy++) {
      const dy = iy + 0.5 - sy;
      for (let ix = x0; ix <= x1; ix++) {
        const dx = ix + 0.5 - sx,`,
    `    if (ftb) {
      for (let iy = y0; iy <= y1; iy++) {
        const dy = iy + 0.5 - sy;
        for (let ix = x0, p = iy * W + x0; ix <= x1; ix++, p++) {
          const th = thru[p];
          if (th < 5e-6) continue; // (covered: nothing put here now would show)
          const dx = ix + 0.5 - sx,
            pw = -0.5 * (k0 * dx * dx + k2 * dy * dy) - k1 * dx * dy;
          if (pw > 0 || pw < lo) continue;
          let a = 0.99;
          if (pw < hi) {
            const gg = al * Math.exp(pw);
            a = hard ? 0.99 * sstep(0.38, 0.62, gg) : Math.min(0.99, gg);
            if (a < 0.004) continue;
          }
          const p3 = p * 3,
            k = th * a;
          let pr = r,
            pg = g,
            pb = b;
          if (fi >= 0) {
            const u = clamp(Math.floor((i00 * dx + i01 * dy) * 2 + 2), 0, 3),
              v = clamp(Math.floor((i10 * dx + i11 * dy) * 2 + 2), 0, 3),
              c = FPAL[Math.floor(FN[fi + v] / (u === 0 ? 1 : u === 1 ? 64 : u === 2 ? 4096 : 262144)) % 64];
            if (c) {
              pr = c[0] + (fog[0] - c[0]) * fk;
              pg = c[1] + (fog[1] - c[1]) * fk;
              pb = c[2] + (fog[2] - c[2]) * fk;
            }
          }
          col[p3] += pr * k;
          col[p3 + 1] += pg * k;
          col[p3 + 2] += pb * k;
          thru[p] = th * (1 - a);
        }
      }
    } else
    for (let iy = y0; iy <= y1; iy++) {
      const dy = iy + 0.5 - sy;
      for (let ix = x0; ix <= x1; ix++) {
        const dx = ix + 0.5 - sx,`
  ],
  [
    `  if (o.samples) {
    // (the picture the contour look`,
    `  // (and behind all of it, the sky: as much of it as still shows)
  if (ftb)
    for (let p = 0; p < W * H; p++) {
      const th = thru[p];
      col[p * 3] += bg[0] * th;
      col[p * 3 + 1] += bg[1] * th;
      col[p * 3 + 2] += bg[2] * th;
    }
  if (o.samples) {
    // (the picture the contour look`
  ]
];
// Which points are still open is kept a bit each, thirty-two to a word: a splat's row asks a word or two and goes only to
// the open points, where before it went to every point of its box and asked each. (The same picture as FRONT alone.)
const BITS = [
  [
    `gls: new Float32Array(W * H), thru: new Float32Array(W * H) };`,
    `gls: new Float32Array(W * H), thru: new Float32Array(W * H), open: new Int32Array(((W + 31) >> 5) * H) };`
  ],
  [
    `    thru.fill(1);
    dep.fill(1);`,
    `    thru.fill(1);
    dep.fill(1);
    open.fill(-1);`
  ],
  [
    `  const thru = ftb ? lentPic.thru : null;`,
    `  const open = ftb ? lentPic.open : null, // (a bit for each point, a row's bits in words of thirty-two: set till the point is covered)
    OW = (W + 31) >> 5;
  const thru = ftb ? lentPic.thru : null;`
  ],
  [
    `    if (ftb) {
      for (let iy = y0; iy <= y1; iy++) {
        const dy = iy + 0.5 - sy;
        for (let ix = x0, p = iy * W + x0; ix <= x1; ix++, p++) {
          const th = thru[p];
          if (th < 5e-6) continue; // (covered: nothing put here now would show)
          const dx = ix + 0.5 - sx,`,
    `    if (ftb) {
      const w0 = x0 >> 5,
        w1 = x1 >> 5,
        m0 = -1 << (x0 & 31),
        m1 = (-1 >>> (31 - (x1 & 31))) | 0;
      for (let iy = y0; iy <= y1; iy++) {
        const dy = iy + 0.5 - sy,
          row = iy * W,
          orow = iy * OW;
        for (let wi = w0; wi <= w1; wi++) {
        let m = open[orow + wi];
        if (wi === w0) m &= m0;
        if (wi === w1) m &= m1;
        while (m !== 0) {
          const bit = m & -m,
            ix = (wi << 5) + 31 - Math.clz32(bit),
            p = row + ix;
          m ^= bit;
          const dx = ix + 0.5 - sx,`
  ],
  [
    `          const p3 = p * 3,
            k = th * a;`,
    `          const p3 = p * 3,
            th = thru[p],
            k = th * a;`
  ],
  [
    `          thru[p] = th * (1 - a);
        }
      }`,
    `          thru[p] = th * (1 - a);
          if (thru[p] < 5e-6) open[orow + wi] &= ~bit; // (covered three deep: nothing put here now would show)
        }
        }
      }`
  ]
];
// How strong a solid splat is at a point, across its soft edge, is read from a table and not worked out each time.
// (Over three hundred pictures, the same as FRONT alone to the last point.)
const TABLE = [
  [
    `let lent = null,
  lentPic = null;`,
    `let lent = null,
  lentPic = null;
// a solid splat's strength across its edge: from where it is all there (0) out to where there is nothing of it (-EDGE_W), in EDGE_N steps
const EDGE_W = 0.47,
  EDGE_N = 2048,
  EDGE = new Float64Array(EDGE_N + 2);
for (let j = 0; j < EDGE_N + 2; j++) EDGE[j] = 0.99 * sstep(0.38, 0.62, 0.6201 * Math.exp(-EDGE_W + (j * EDGE_W) / EDGE_N));`
  ],
  [
    `          let a = 0.99;
          if (pw < hi) {
            const gg = al * Math.exp(pw);
            a = hard ? 0.99 * sstep(0.38, 0.62, gg) : Math.min(0.99, gg);
            if (a < 0.004) continue;
          }
          const p3 = p * 3,
            th = thru[p],`,
    `          let a = 0.99;
          if (pw < hi) {
            if (hard) {
              const u = (pw - hi + EDGE_W) * (EDGE_N / EDGE_W),
                j = u | 0;
              a = EDGE[j] + (EDGE[j + 1] - EDGE[j]) * (u - j);
            } else a = Math.min(0.99, al * Math.exp(pw));
            if (a < 0.004) continue;
          }
          const p3 = p * 3,
            th = thru[p],`
  ]
];
// And nothing asked twice: all to the same answer as before.
const LEAN = [
  [
    `      z = Z[i];
    if (al <= 0 || y < -30) continue;
    const cx = V[0] * x + V[4] * y + V[8] * z + V[12],
      cy = V[1] * x + V[5] * y + V[9] * z + V[13],
      cz = V[2] * x + V[6] * y + V[10] * z + V[14];
    if (cz > -near) continue;
    const s2 = SC[i] * SC[i];
    {
      const iz = -1 / cz,
        j00 = focal * iz,
        j02 = focal * (clamp(cx * iz, -limx, limx) / iz) * iz * iz,
        j12 = focal * (clamp(cy * iz, -limy, limy) / iz) * iz * iz,
        most = (d[q + 4] + d[q + 8] + d[q + 10]) * s2,
        bx = 3.01 * Math.sqrt((j00 * j00 + j02 * j02) * most + 0.15) + 1,
        by = 3.01 * Math.sqrt((j00 * j00 + j12 * j12) * most + 0.15) + 1,
        mx = ((((tp / asp) * cx) / -cz) * 0.5 + 0.5) * W,
        my = (((tp * cy) / -cz) * 0.5 + 0.5) * H;
      if (mx + bx < 0 || mx - bx > W || my + by < 0 || my - by > H) continue;
    }`,
    `      z = Z[i];
    const cx = V[0] * x + V[4] * y + V[8] * z + V[12],
      cy = V[1] * x + V[5] * y + V[9] * z + V[13],
      cz = V[2] * x + V[6] * y + V[10] * z + V[14];
    const s2 = SC[i] * SC[i];`
  ],
  [
    `      const s2 = SC[i] * SC[i],
        iz = -1 / cz,
        j00 = focal * iz,
        j02 = focal * (clamp(cx * iz, -limx, limx) / iz) * iz * iz,
        j12 = focal * (clamp(cy * iz, -limy, limy) / iz) * iz * iz,
        most = (d[q + 4] + d[q + 8] + d[q + 10]) * s2,
        bx = 3.01 * Math.sqrt((j00 * j00 + j02 * j02) * most + 0.15) + 1,
        by = 3.01 * Math.sqrt((j00 * j00 + j12 * j12) * most + 0.15) + 1,
        mx = ((((tp / asp) * cx) / -cz) * 0.5 + 0.5) * W,
        my = (((tp * cy) / -cz) * 0.5 + 0.5) * H;
      if (mx + bx < 0 || mx - bx > W || my + by < 0 || my - by > H) continue;`,
    `      const mx = ((((tp / asp) * cx) / -cz) * 0.5 + 0.5) * W,
        my = (((tp * cy) / -cz) * 0.5 + 0.5) * H;
      if (!(mx >= 0 && mx <= W && my >= 0 && my <= H)) {
        const s2 = SC[i] * SC[i],
          iz = -1 / cz,
          j00 = focal * iz,
          j02 = focal * (clamp(cx * iz, -limx, limx) / iz) * iz * iz,
          j12 = focal * (clamp(cy * iz, -limy, limy) / iz) * iz * iz,
          most = (d[q + 4] + d[q + 8] + d[q + 10]) * s2,
          bx = 3.01 * Math.sqrt((j00 * j00 + j02 * j02) * most + 0.15) + 1,
          by = 3.01 * Math.sqrt((j00 * j00 + j12 * j12) * most + 0.15) + 1;
        if (mx + bx < 0 || mx - bx > W || my + by < 0 || my - by > H) continue;
      }`
  ],
  [
    `    const k0 = C / det,
      k1 = -Bq / det,
      k2 = A / det,
      hard = al >= 1 && !o.soft,
      lo = Math.max(-4.5, Math.log((hard ? 0.388 : 0.00399) / al)), // (how far out, as the points are tried, there is still something)
      hi = Math.log((hard ? 0.6201 : 0.9901) / al), // (and how far in it is all one strength)
      ring = Math.sqrt(-2 * lo) + 1e-3,`,
    `    const hard = al >= 1 && !o.soft;
    if (al !== alWas) {
      alWas = al;
      loWas = Math.max(-4.5, Math.log((hard ? 0.388 : 0.00399) / al)); // (how far out, as the points are tried, there is still something)
      hiWas = Math.log((hard ? 0.6201 : 0.9901) / al); // (and how far in it is all one strength)
      ringWas = Math.sqrt(-2 * loWas) + 1e-3;
    }
    const k0 = C / det,
      k1 = -Bq / det,
      k2 = A / det,
      lo = loWas,
      hi = hiWas,
      ring = ringWas,`
  ],
  [
    `  let drawn = 0;`,
    `  let drawn = 0,
    alWas = NaN, // (the strength of the splat before, and what was worked out from it)
    loWas = 0,
    hiWas = 0,
    ringWas = 0;`
  ],
  [
    `  let was = 0;`,
    `  let was = 0;
  const INK = new Uint8Array(np * 3);
  {
    const gr = world.anim && world.anim.grade;
    for (let i = 0; i < np; i++) {
      const h = world.pal[i];
      INK[i * 3] = gr ? Math.round(gr[i * 3] * 255) : (h >> 16) & 255;
      INK[i * 3 + 1] = gr ? Math.round(gr[i * 3 + 1] * 255) : (h >> 8) & 255;
      INK[i * 3 + 2] = gr ? Math.round(gr[i * 3 + 2] * 255) : h & 255;
    }
  }`
  ],
  [
    `      const h = world.pal[bi],
        gr = world.anim && world.anim.grade;
      if (gr) {
        out[q] = Math.round(gr[bi * 3] * 255);
        out[q + 1] = Math.round(gr[bi * 3 + 1] * 255);
        out[q + 2] = Math.round(gr[bi * 3 + 2] * 255);
      } else {
        out[q] = (h >> 16) & 255;
        out[q + 1] = (h >> 8) & 255;
        out[q + 2] = h & 255;
      }`,
    `      out[q] = INK[bi * 3];
      out[q + 1] = INK[bi * 3 + 1];
      out[q + 2] = INK[bi * 3 + 2];`
  ]
];
// And last, the one long function that draws a picture is cut into four that it calls, each of its long loops in a function of
// its own (what goes between them goes in one object, F, made new for each picture). Nothing else is changed by it: the same
// sums in the same order, the same picture to the last bit. It is for a phone's browser, which works a function up into a
// quick form by stages, and was a long while over one this long: seconds at a time, every so often, with the picture stalled.
function split(s) {
  const cut = (from, to) => {
    const a = s.indexOf(from), b = s.indexOf(to, a);
    if (a < 0 || b < 0 || s.indexOf(from, a + 1) >= 0) throw new Error('fast-render: the renderer has changed, this was not found once: ' + (a < 0 || s.indexOf(from, a + 1) >= 0 ? from : to).slice(0, 60));
    const body = s.slice(a, b);
    return { body, put: now => (s = s.slice(0, s.indexOf(from)) + now + s.slice(s.indexOf(from) + body.length)) };
  };
  const made = [];
  // 1. where each splat is at this moment, and which of them can reach the picture
  let r = cut('  const { X, Y, Z, AL, SC, depth, add, wet } = lent;\n  add.fill(0);', '  if (world.back) for (');
  made.push(`// where each splat is at this moment, what it looks like, and which of them can reach the picture at all (F.nv of them, in lent.seen)
function moved(F) {
  const { world, o, t, V, focal, near, tp, asp, W, H, limx, limy, N, d } = F;
${r.body}  F.nv = nv;
  F.mn = mn;
  F.anyGlass = anyGlass;
}`);
  r.put(`  // (what the parts of the work pass between them)
  const F = { world, o, t, V, focal, near, tp, asp, W, H, limx, limy, N, d, R, dist, fog, px, hex, nv: 0, mn: 0, anyGlass: false, order: null, ftb: false, deep: false, col: null, dep: null, gls: null, thru: null, open: null, OW: 0, drawn: 0, glassy: false };
  moved(F);
  const { depth } = lent,
    nv = F.nv,
    mn = F.mn,
    anyGlass = F.anyGlass;
`);
  // 2. the sort
  r = cut('  const order = lent.order;\n  {\n    const bits = ', '  if (!o.samples && (!lentPic');
  made.push(`// those that can reach the picture, put in order: far to near
function sorted(F) {
  const { N, nv } = F,
    { depth, seen } = lent;
${r.body}}`);
  r.put(`  sorted(F);
  const order = lent.order;
`);
  // 3. the splats drawn
  r = cut('  let drawn = 0,\n    alWas = NaN,', '  // (and behind all of it, the sky');
  made.push(`// each splat put into the picture
function splats(F) {
  const { world, o, t, V, focal, near, tp, asp, W, H, limx, limy, N, d, R, dist, fog, hex, nv, order, ftb, deep, col, dep, gls, thru, open, OW } = F,
    { X, Y, Z, AL, SC, add, wet } = lent;
  let glassy = false;
${r.body}  F.drawn = drawn;
  F.glassy = glassy;
}`);
  r.put(`  F.order = order;
  F.ftb = ftb;
  F.deep = deep;
  F.col = col;
  F.dep = dep;
  F.gls = gls;
  F.thru = thru;
  F.open = open;
  F.OW = OW;
  splats(F);
  const drawn = F.drawn;
  glassy = F.glassy;
`);
  // 4. the second pass, and what is given back
  r = cut('  // the second pass: an outline where the picture steps back sharply', '}\n// make every art pixel');
  made.push(`function finish(F) {
  const { world, o, W, H, R, px, hex, col, dep, gls, drawn, glassy } = F;
${r.body}}`);
  r.put(`  return finish(F);
`);
  const at = s.indexOf('// make every art pixel');
  return s.slice(0, at) + made.join('\n') + '\n' + s.slice(at);
}
function source(repo) {
  let s = fs.readFileSync(path.join(repo, 'cli', 'render.js'), 'utf8');
  if (!s.includes(SORT_OLD)) throw new Error('fast-render: the renderer has changed, the sort was not found');
  s = s.replace(SORT_OLD, SORT_NEW);
  for (const [old, now] of [...TRIMS, ...PALETTE, ...SEEN, ...FRONT, ...BITS, ...TABLE, ...LEAN]) {
    if (s.split(old).length !== 2) throw new Error('fast-render: the renderer has changed, this was not found once: ' + old.slice(0, 80));
    s = s.replace(old, () => now);
  }
  return split(s.replace(/^const PixelLook = require\([^\n]*\n/m, '').replace(/^module\.exports = ([^\n]*);\s*$/m, 'return $1;'));
}
function load(repo) {
  const PixelLook = require(path.join(repo, 'src', 'pixel-look.js'));
  return new Function('PixelLook', source(repo))(PixelLook);
}
module.exports = { source, load };
