// The toolkit's software renderer (cli/render.js), made to draw the same picture in less time: its per-frame depth sort
// swapped for a radix sort, and (TRIMS, below) work left out wherever what it would come to is known beforehand.
// The picture is the same to the last bit, which is how each of these was tried (and how any more of them should be).
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
      thins = wd && glassy;`
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

function source(repo) {
  let s = fs.readFileSync(path.join(repo, 'cli', 'render.js'), 'utf8');
  if (!s.includes(SORT_OLD)) throw new Error('fast-render: the renderer has changed, the sort was not found');
  s = s.replace(SORT_OLD, SORT_NEW);
  for (const [old, now] of TRIMS) {
    if (s.split(old).length !== 2) throw new Error('fast-render: the renderer has changed, this was not found once: ' + old.slice(0, 80));
    s = s.replace(old, () => now);
  }
  return s.replace(/^const PixelLook = require\([^\n]*\n/m, '').replace(/^module\.exports = ([^\n]*);\s*$/m, 'return $1;');
}
function load(repo) {
  const PixelLook = require(path.join(repo, 'src', 'pixel-look.js'));
  return new Function('PixelLook', source(repo))(PixelLook);
}
module.exports = { source, load };
