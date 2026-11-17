// The things a thumb presses, made the way everything else in the picture is made: a block of whitewashed stone cut to a
// shape, stood on end, lit from above, and drawn by the level's own renderer in as few pixels as the picture would have for a
// thing that size. What is not the shape is left clear. Two of them turn the view: an arrow that sets off upward and bends away
// to its side. The third is for his smoke: a cigarette lying, its end a little apart from it, and the smoke going up off that.
// The ledger's are of the same stone: a step of loudness is a slab stood on end (whitewashed when it is on, dark when it is
// not), and a thing to be ticked is a square frame of it in shadow, with a lit block in it when it is ticked.
//   require('./icons.js')(repo)  -> { size, left, right, smoke }: each a data: URL of a PNG, size pixels square, to be shown unsmoothed
//                                   and { pip, box }: each { w, h, on, off }, the two of a pair the same size (w by h pixels)
//   node icons.js [out.png] [pixels] [--repo path]  -> the three side by side, large, on black, to look at
//   node icons.js out.png --ledger [--repo path]    -> a line of steps, and the frame not ticked and ticked, the same way
const path = require('path'),
  zlib = require('zlib');

const ART = 24, // pixels across and down
  // the arrow's outline, facing the eye, turning right: up the shaft, round the cut corner, along the arm, the head
  SHAPE = [[-0.78, -0.8], [-0.44, -0.8], [-0.44, 0.1], [-0.24, 0.3], [0.3, 0.3], [0.3, 0.06], [0.86, 0.47], [0.3, 0.88], [0.3, 0.64], [-0.34, 0.64], [-0.78, 0.2]],
  // the cigarette, the end of it, and its smoke: three pieces
  SMOKE = [
    [[-0.93, -0.6], [-0.04, -0.6], [-0.04, -0.28], [-0.93, -0.28]],
    [[0.22, -0.6], [0.52, -0.6], [0.52, -0.28], [0.22, -0.28]],
    [[0.295, 0.06], [0.145, 0.33], [0.395, 0.6], [0.225, 0.88], [0.355, 0.88], [0.525, 0.6], [0.275, 0.33], [0.425, 0.06]]
  ],
  // a slab; a frame (what is inside one outline and not inside another); and the frame with its block
  rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
  PIP = [rect(-0.27, -0.55, 0.27, 0.55)],
  BOX = [{ of: rect(-0.6, -0.6, 0.6, 0.6), less: rect(-0.37, -0.37, 0.37, 0.37) }],
  BLOCK = [rect(-0.21, -0.21, 0.21, 0.21)],
  // how much of the stone's light each keeps: a step that is on and one that is not, the frame, the block in it
  LIT = 1.2,
  DARK = 0.3,
  FRAME = 0.62,
  DEEP = 0.1, // half of how thick the block is
  MID = [0.07, 0.02, 0], // the middle of it, which the eye is on
  // seen from a little to its right and from above, so that it has a front, a top and a side. FAR: how many times further off
  // than would fill the picture (and only the middle of what is seen from there kept): flatter, as the island is seen
  YAW = 0.5,
  PITCH = 0.55,
  DIST = 2.9,
  FAR = 3;

// how far a point is from the edge of an outline (less than nothing inside it)
const tools = repo => [require(path.join(repo, 'index.js')).load(), require('./fast-render.js').load(repo)];
const outline = pts => (x, y) => {
  let d = Infinity,
    s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const ex = pts[j][0] - pts[i][0],
      ey = pts[j][1] - pts[i][1],
      wx = x - pts[i][0],
      wy = y - pts[i][1],
      k = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey))),
      bx = wx - ex * k,
      by = wy - ey * k;
    d = Math.min(d, bx * bx + by * by);
    const a = y >= pts[i][1],
      b = y < pts[j][1],
      c = ex * wy > ey * wx;
    if ((a && b && c) || (!a && !b && !c)) s = -s;
  }
  return s * Math.sqrt(d);
};

function world({ makeBuilder, makeSculpt, KIT: K }, shapes) {
  // the level's greys, from wet rock up to whitewash in the sun; 0 is what lies behind (nothing: it is cut away afterwards)
  const B = makeBuilder(7, [0x000000, 0x1f2121, 0x2d2f2f, 0x3f4141, 0x4c4e4d, 0x6c6e6c, 0x8f918e, 0xb2b4b0, 0xd3d4d0, 0xededea]),
    S = K.sculpt(makeSculpt(B)),
    edges = shapes.map(s => {
      if (!s.of) return outline(s);
      const a = outline(s.of),
        b = outline(s.less);
      return (x, y) => Math.max(a(x, y), -b(x, y));
    }),
    edge = (x, y) => Math.min(...edges.map(e => e(x, y)));
  // the level's sun, with more between light and shade than its overcast gives: the three faces are to be three greys
  S.sun = B.norm([-0.5, 0.8, 0.35]);
  S.amb = 0.38;
  S.sky = 0.3;
  S.sunK = 0.75;
  const lo = [-0.95, -0.95, -DEEP - 0.1],
    hi = [1.0, 1.05, DEEP + 0.1],
    sd = (x, y, z) => {
      const a = edge(x, y),
        b = Math.abs(z) - DEEP;
      return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0));
    };
  S.solid(
    [0, 0, 0],
    Math.hypot(hi[0], hi[1], hi[2]),
    sd,
    (res, f) => {
      const n = [0, 1, 2].map(k => Math.ceil((hi[k] - lo[k]) / res));
      for (let i = 0; i <= n[0]; i++)
        for (let j = 0; j <= n[1]; j++)
          for (let l = 0; l <= n[2]; l++) {
            const x = lo[0] + ((hi[0] - lo[0]) * i) / n[0],
              y = lo[1] + ((hi[1] - lo[1]) * j) / n[1],
              z = lo[2] + ((hi[2] - lo[2]) * l) / n[2];
            if (Math.abs(sd(x, y, z)) < res * 0.5) f(x, y, z);
          }
    },
    { r: [2, 3, 4, 5, 6, 7, 8, 9] },
    { res: 0.06, reach: 0.2 }
  );
  S.bake();
  return B.finish({ cam: { target: MID, dist: DIST * FAR, pitch: PITCH, yaw: YAW }, detail: 12, dither: 0.3, radius: 3, ao: { k: 0, range: 0.8 }, fog: { c: 0, start: 1, max: 0 } });
}

// a block cut to shapes (each an outline; the arrow that turns right, if none are given), art pixels square: { w, h, rgba }
// (dim: so much of its light is kept)
function draw(lib, R, art, shapes = [SHAPE], dim = 1) {
  const W = world(lib, shapes),
    full = art * FAR,
    off = (full - art) / 2,
    view = { t: 0, w: full, h: full, px: 1 },
    im = R.render(W, view),
    far = R.render(W, Object.assign({ samples: true }, view)).depth, // (this one has its first row at the bottom)
    rgba = new Uint8Array(art * art * 4);
  for (let y = 0; y < art; y++)
    for (let x = 0; x < art; x++) {
      const p = (y * art + x) * 4,
        s = ((y + off) * full + x + off) * 3;
      if (far[(full - 1 - y - off) * full + x + off] >= 1) continue;
      // as the page does to its picture: the grey of it, a little dimmed
      rgba[p] = rgba[p + 1] = rgba[p + 2] = Math.min(255, Math.round(0.85 * dim * ((im.rgb[s] * 77 + im.rgb[s + 1] * 150 + im.rgb[s + 2] * 29) >> 8)));
      rgba[p + 3] = 255;
    }
  return { w: art, h: art, rgba };
}
// the one that turns left is the same seen in a glass, so that the two are a pair
function flip(im) {
  const rgba = new Uint8Array(im.rgba.length);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) for (let k = 0; k < 4; k++) rgba[(y * im.w + x) * 4 + k] = im.rgba[(y * im.w + im.w - 1 - x) * 4 + k];
  return { w: im.w, h: im.h, rgba };
}

// a pair of them, cut down to what the first of the two covers: { w, h, on, off }
function pair(on, off) {
  let x0 = on.w, y0 = on.h, x1 = 0, y1 = 0;
  for (let y = 0; y < on.h; y++)
    for (let x = 0; x < on.w; x++)
      if (on.rgba[(y * on.w + x) * 4 + 3]) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1,
    cut = im => {
      const rgba = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) rgba.set(im.rgba.subarray(((y + y0) * im.w + x0) * 4, ((y + y0) * im.w + x0 + w) * 4), y * w * 4);
      return { w, h, rgba };
    };
  return { w, h, on: cut(on), off: cut(off) };
}
// one laid over another (the block stands clear of the frame from where it is seen: nothing of the frame is before it)
function over(top, under) {
  const rgba = Uint8Array.from(under.rgba);
  for (let p = 0; p < rgba.length; p += 4) if (top.rgba[p + 3]) rgba.set(top.rgba.subarray(p, p + 4), p);
  return { w: under.w, h: under.h, rgba };
}
const ledger = repo => {
  const frame = draw(...tools(repo), ART, BOX, FRAME);
  return {
    pip: pair(draw(...tools(repo), ART, PIP, LIT), draw(...tools(repo), ART, PIP, DARK)),
    box: pair(over(draw(...tools(repo), ART, BLOCK, LIT), frame), frame)
  };
};

function png(w, h, rgba) {
  const chunk = (type, data) => {
      const td = Buffer.concat([Buffer.from(type, 'ascii'), data]),
        len = Buffer.alloc(4),
        cr = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      cr.writeUInt32BE(zlib.crc32(td));
      return Buffer.concat([len, td, cr]);
    },
    raw = Buffer.alloc((w * 4 + 1) * h),
    hd = Buffer.alloc(13);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  hd.writeUInt32BE(w, 0);
  hd.writeUInt32BE(h, 4);
  hd[8] = 8;
  hd[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = repo => {
  const right = draw(...tools(repo), ART),
    url = im => 'data:image/png;base64,' + png(im.w, im.h, im.rgba).toString('base64');
  const { pip, box } = ledger(repo),
    two = p => ({ w: p.w, h: p.h, on: url(p.on), off: url(p.off) });
  return { size: ART, left: url(flip(right)), right: url(right), smoke: url(draw(...tools(repo), ART, SMOKE)), pip: two(pip), box: two(box) };
};

if (require.main === module && process.argv.includes('--ledger')) {
  const args = process.argv.slice(2).filter(a => a !== '--ledger'),
    ri = args.indexOf('--repo'),
    repo = path.resolve(ri >= 0 ? args.splice(ri, 2)[1] : '/tmp/ink-studio'),
    file = args[0] || '/tmp/wickie-ledger.png',
    { pip, box } = ledger(repo),
    k = 6,
    row = [...Array(10).keys()].map(n => (n < 6 ? pip.on : pip.off)).concat([null, box.off, null, box.on]),
    w = row.reduce((a, im) => a + (im ? im.w + 1 : 6), 1) * k,
    h = (Math.max(pip.h, box.h) + 2) * k,
    sheet = new Uint8Array(w * h * 4);
  for (let i = 3; i < sheet.length; i += 4) sheet[i] = 255;
  let at = 1;
  for (const im of row) {
    if (im)
      for (let y = 0; y < im.h * k; y++)
        for (let x = 0; x < im.w * k; x++) {
          const p = (((y / k) | 0) * im.w + ((x / k) | 0)) * 4,
            q = ((y + k + (((h / k - 2 - im.h) / 2) | 0) * k) * w + x + at * k) * 4;
          if (im.rgba[p + 3]) sheet[q] = sheet[q + 1] = sheet[q + 2] = im.rgba[p];
        }
    at += im ? im.w + 1 : 6;
  }
  require('fs').writeFileSync(file, png(w, h, sheet));
  console.log('wrote', file, 'step', pip.w + 'x' + pip.h, 'frame', box.w + 'x' + box.h);
} else if (require.main === module) {
  const args = process.argv.slice(2),
    ri = args.indexOf('--repo'),
    repo = path.resolve(ri >= 0 ? args.splice(ri, 2)[1] : '/tmp/ink-studio'),
    file = args[0] || '/tmp/wickie-icons.png',
    art = Number(args[1]) || ART,
    k = Math.max(1, Math.round(240 / art)),
    gap = 2,
    w = (art * 3 + gap * 2) * k,
    h = art * k,
    sheet = new Uint8Array(w * h * 4),
    right = draw(...tools(repo), art);
  for (let i = 3; i < sheet.length; i += 4) sheet[i] = 255;
  [flip(right), right, draw(...tools(repo), art, SMOKE)].forEach((im, n) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < art * k; x++) {
        const p = (((y / k) | 0) * art + ((x / k) | 0)) * 4,
          q = (y * w + x + n * (art + gap) * k) * 4;
        if (im.rgba[p + 3]) sheet[q] = sheet[q + 1] = sheet[q + 2] = im.rgba[p];
      }
  });
  require('fs').writeFileSync(file, png(w, h, sheet));
  console.log('wrote', file, w + 'x' + h, '(art', art + 'x' + art + ' each)');
}
