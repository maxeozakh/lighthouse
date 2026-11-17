// The pictures that go with a link to the game: what is shown where the link is posted (card.png, 1200x630), and the mark in a
// browser's tab and on a phone's home screen (icon.png 64x64, touch.png 192x192: the lantern, lit). All three are the level at
// night, drawn by the game's own renderer and graded as the page grades it, a point of the picture shown some whole number of
// pixels across.
//   node card.js [--repo path/to/ink-studio] [--to prefix]     -> card.png, icon.png, touch.png beside this file (or prefix + name)
//   [--t s] the moment (where the beam is)   [--zoom k --lift y --toward k --side d] the card's view
//   [--it s --izoom k --ilift y] the same for the mark
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

// the mark: the lantern and the gallery under it, 32 points across
const top = [tx, G.height(tx, tz) + num('ilift', 12.3), tz],
  small = draw(num('it', 9.5), top, num('izoom', 3), 32, 32, 1, 0);
write('icon.png', times(small, 2));
write('touch.png', times(small, 6));
