// The two things a thumb presses to turn the view, made the way everything else in the picture is made: a block of whitewashed
// stone cut to an arrow that sets off upward and bends away to its side, stood on end, lit from above, and drawn by the level's
// own renderer in as few pixels as the picture would have for a thing that size. What is not arrow is left clear.
//   require('./icons.js')(repo)  -> { size, left, right }: each a data: URL of a PNG, size pixels square, to be shown unsmoothed
//   node icons.js [out.png] [pixels] [--repo path]  -> the two side by side, large, on black, to look at
const path = require('path'),
  zlib = require('zlib');

const ART = 24, // pixels across and down
  // the arrow's outline, facing the eye, turning right: up the shaft, round the cut corner, along the arm, the head
  SHAPE = [[-0.78, -0.8], [-0.44, -0.8], [-0.44, 0.1], [-0.24, 0.3], [0.3, 0.3], [0.3, 0.06], [0.86, 0.47], [0.3, 0.88], [0.3, 0.64], [-0.34, 0.64], [-0.78, 0.2]],
  DEEP = 0.1, // half of how thick the block is
  MID = [0.07, 0.02, 0], // the middle of it, which the eye is on
  // seen from a little to its right and from above, so that it has a front, a top and a side. FAR: how many times further off
  // than would fill the picture (and only the middle of what is seen from there kept): flatter, as the island is seen
  YAW = 0.5,
  PITCH = 0.55,
  DIST = 2.9,
  FAR = 3;

// how far a point is from the edge of an outline (less than nothing inside it)
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

function world({ makeBuilder, makeSculpt, KIT: K }) {
  // the level's greys, from wet rock up to whitewash in the sun; 0 is what lies behind (nothing: it is cut away afterwards)
  const B = makeBuilder(7, [0x000000, 0x1f2121, 0x2d2f2f, 0x3f4141, 0x4c4e4d, 0x6c6e6c, 0x8f918e, 0xb2b4b0, 0xd3d4d0, 0xededea]),
    S = K.sculpt(makeSculpt(B)),
    edge = outline(SHAPE);
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

// the arrow that turns right, art pixels square: { w, h, rgba }
function draw(lib, R, art) {
  const W = world(lib),
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
      rgba[p] = rgba[p + 1] = rgba[p + 2] = Math.round(0.85 * ((im.rgb[s] * 77 + im.rgb[s + 1] * 150 + im.rgb[s + 2] * 29) >> 8));
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

const tools = repo => [require(path.join(repo, 'index.js')).load(), require('../fast-render.js').load(repo)];

module.exports = repo => {
  const right = draw(...tools(repo), ART),
    url = im => 'data:image/png;base64,' + png(im.w, im.h, im.rgba).toString('base64');
  return { size: ART, left: url(flip(right)), right: url(right) };
};

if (require.main === module) {
  const args = process.argv.slice(2),
    ri = args.indexOf('--repo'),
    repo = path.resolve(ri >= 0 ? args.splice(ri, 2)[1] : '/tmp/ink-studio'),
    file = args[0] || '/tmp/wickie-icons.png',
    art = Number(args[1]) || ART,
    k = Math.max(1, Math.round(240 / art)),
    gap = 2,
    w = (art * 2 + gap) * k,
    h = art * k,
    sheet = new Uint8Array(w * h * 4),
    right = draw(...tools(repo), art);
  for (let i = 3; i < sheet.length; i += 4) sheet[i] = 255;
  [flip(right), right].forEach((im, n) => {
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
