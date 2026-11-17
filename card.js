// The pictures that go with a link to the game: what is shown where the link is posted (card.png, 1200x630), and the mark in a
// browser's tab and on a phone's home screen (icon.png 64x64, touch.png 192x192: the tower at night, its beams out). The card
// is the level at night, drawn by the game's own renderer and graded as the page grades it, a point of the picture shown three
// pixels across; the mark is too small for that, and is set down by hand (mark()).
//   node card.js [--repo path/to/ink-studio] [--to prefix]     -> card.png, icon.png, touch.png beside this file (or prefix + name)
//   [--t s] the moment (where the beam is)   [--zoom k --lift y --toward k --side d] the card's view
// build.js does not run this (it takes a few seconds, and the pictures change only when the look of the level does): run it by
// hand and commit what it writes.
const path = require('path'),
  args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 ? args[i + 1] : d;
  },
  num = (k, d) => Number(opt(k, d)),
  repo = path.resolve(opt('repo', '/tmp/ink-studio')),
  to = opt('to', path.join(__dirname, path.sep)),
  lib = require(path.join(repo, 'index.js')).load(),
  R = require('./fast-render.js').load(repo),
  PNG = require(path.join(repo, 'cli', 'png.js'));
// (the weather is thrown by Math.random: the same every time this is run)
let seed = 7;
Math.random = () => {
  let z = (seed = (seed + 0x6d2b79f5) | 0);
  z = Math.imul(z ^ (z >>> 15), z | 1);
  z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
};
const scene = require('./level.js')(lib),
  W = scene.build(scene.seed),
  G = W.game,
  rest = W.data,
  lut = G.grade(1, new Uint8Array(256)),
  YAW = Math.PI / 4;
let buf;
const holder = { data: rest, anim: W.anim, get posedBuf() { return buf; }, set posedBuf(v) { buf = v; } };
// night, the lamp lit, the old man gone in
G.night(1);
G.home(true);
for (let s = -12; s < 0; s += 1 / 30) W.anim.update(1 / 30, s);
G.step(0, 0, 0);
const [tx, tz] = G.places.tower;

// the level as it is t seconds on, seen at a place, w x h points of the picture each px pixels across; its edges fall off by
// as much as dim (0: not at all), as the page's frame does
function draw(t, target, zoom, w, h, px, dim) {
  W.anim.update(1 / 30, t);
  G.sea(t);
  W.data = lib.KIT.bones.posed(holder);
  const im = R.render(W, { t, yaw: YAW, pitch: W.cam.pitch, zoom, target, w: w * px, h: h * px, px });
  W.data = rest;
  const big = R.upscale ? R.upscale(im, im.px || px) : im,
    rgb = big.rgb;
  for (let y = 0, p = 0; y < big.h; y++)
    for (let x = 0; x < big.w; x++, p += 3) {
      const r = Math.hypot((x + 0.5 - big.w / 2) / (big.w / 2), (y + 0.5 - big.h / 2) / (big.h / 2)) / Math.SQRT2,
        v = 1 - dim * Math.max(0, Math.min(1, (r - 0.52) / 0.48));
      rgb[p] = rgb[p + 1] = rgb[p + 2] = lut[(rgb[p] * 77 + rgb[p + 1] * 150 + rgb[p + 2] * 29) >> 8] * v;
    }
  return big;
}
// the same picture, each of its pixels k across
function times(im, k) {
  const out = new Uint8Array(im.w * k * im.h * k * 3);
  for (let y = 0; y < im.h * k; y++)
    for (let x = 0; x < im.w * k; x++) {
      const s = (((y / k) | 0) * im.w + ((x / k) | 0)) * 3,
        d = (y * im.w * k + x) * 3;
      out[d] = im.rgb[s];
      out[d + 1] = im.rgb[s + 1];
      out[d + 2] = im.rgb[s + 2];
    }
  return { w: im.w * k, h: im.h * k, rgb: out };
}
const write = (name, im) => {
  PNG.write(to + name, im.w, im.h, im.rgb);
  console.log('wrote', to + name, im.w + 'x' + im.h);
};

// the card: the game's first look at the rock, opened out wide, aimed a part of the way from the keeper to the tower and up
// and to one side, so that the whole tower stands in it with the cottage and the sea
const k = num('toward', 0.35),
  side = num('side', 4),
  aim = [G.pl.x + (tx - G.pl.x) * k + side * Math.cos(YAW), G.pl.y + num('lift', 3.2), G.pl.z + (tz - G.pl.z) * k - side * Math.sin(YAW)];
write('card.png', draw(num('t', 11.6), aim, num('zoom', 0.4), 400, 210, 3, 0.5));

// the mark: the tower at night with its two beams out, 32 points across. The level drawn that small is a grey smear, so this
// one is set down point by point, in the picture's greys: the beams broken up at their edges as the renderer breaks up what
// is thin, and everything in it two points wide at the least, so that it still reads at half the size (a browser's tab)
function mark() {
  const N = 32,
    NIGHT = 10,
    g = new Uint8Array(N * N).fill(NIGHT),
    set = (x, y, v) => x >= 0 && x < N && y >= 0 && y < N && (g[y * N + x] = v),
    row = (y, x0, x1, v) => {
      for (let x = x0; x <= x1; x++) set(x, y, v);
    },
    BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]],
    CX = 16, // the middle of the tower (between its two middle points)
    CY = 9, // and of the lamp
    TILT = -0.3; // the beams are seen a little from above: the one to the right goes up the picture, the other down
  // the beams: widening as they go, brightest along the middle and near the lamp
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = x + 0.5 - CX,
        far = Math.abs(dx),
        off = Math.abs(y + 0.5 - (CY + TILT * dx)) / (1.1 + far * 0.3);
      if (far < 2 || off > 1) continue;
      // (whole along its middle, and fainter the further out; broken up toward its edges)
      if (off < 0.42) set(x, y, Math.round(206 - far * 5.5));
      else if (1.25 - off - far / 40 > (BAYER[y & 3][x & 3] + 0.5) / 16) set(x, y, Math.round(150 - far * 3.5));
    }
  // the rock under it, and the sea either side
  row(31, 0, 31, 30), row(30, 0, 31, 30), row(29, 3, 28, 44), row(28, 7, 24, 44), row(30, 2, 29, 44), row(31, 0, 31, 44);
  // the tower: wider at the foot, its near side in the light and the other in its own shade; two small windows
  for (let y = 14; y <= 28; y++) {
    const half = 3 + Math.floor((y - 14) / 5);
    row(y, CX - half, CX + half - 1, 190);
    row(y, CX + half - 2, CX + half - 1, 120);
  }
  row(18, CX - 1, CX, 40), row(19, CX - 1, CX, 40), row(24, CX - 1, CX, 40), row(25, CX - 1, CX, 40);
  // the gallery, the lantern lit, and its cap
  row(13, CX - 5, CX + 4, 96), row(12, CX - 5, CX + 4, 60);
  for (let y = 7; y <= 11; y++) row(y, CX - 3, CX + 2, 244);
  row(6, CX - 4, CX + 3, 78), row(5, CX - 3, CX + 2, 78), row(4, CX - 2, CX + 1, 78), row(3, CX - 1, CX, 78);
  const rgb = new Uint8Array(N * N * 3);
  for (let i = 0; i < N * N; i++) rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = g[i];
  return { w: N, h: N, rgb };
}
const small = mark();
write('icon.png', times(small, 2));
write('touch.png', times(small, 6));
