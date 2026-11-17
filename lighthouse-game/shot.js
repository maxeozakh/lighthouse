// Builds the level in Node, walks the keeper somewhere, and saves what the game would show.
//   node shot.js out.png [--at x,z] [--face deg] [--yaw rad] [--zoom k] [--t s] [--walk n] [--w 1190 --h 1000] [--rows 200] [--scream 0..1] [--night 0..1] [--spot n|none] [--home s] [--out s] [--look x,z] [--bench]
// --walk n: take n frames of running toward --dir dx,dz first (to see collisions and the gait). --bench: time frames.
const path = require('path'),
  args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 ? args[i + 1] : d;
  },
  repo = path.resolve(opt('repo', '/tmp/ink-studio')),
  lib = require(path.join(repo, 'index.js')).load(),
  R = require('../fast-render.js').load(repo),
  PNG = require(path.join(repo, 'cli', 'png.js'));
let t0 = Date.now();
const scene = require('./level.js')(lib),
  W = scene.build(scene.seed),
  G = W.game;
console.log('build', Date.now() - t0, 'ms, splats', W.count);
const rest = W.data;
let buf;
const holder = { data: rest, anim: W.anim, get posedBuf() { return buf; }, set posedBuf(v) { buf = v; } };
const at = opt('at');
if (at) {
  const [x, z] = at.split(',').map(Number);
  if (G.blocked(x, z)) console.log('note:', x, z, 'is blocked');
  G.pl.x = x;
  G.pl.z = z;
}
if (opt('face') !== undefined) G.pl.face = (Number(opt('face')) * Math.PI) / 180;
let t = Number(opt('t', 1));
const dir = opt('dir', '0,0').split(',').map(Number),
  n = Number(opt('walk', 0));
G.step(0, 0, 0);
if (opt('scream') !== undefined) G.npc.mer.scream = Number(opt('scream'));
if (opt('night') !== undefined) G.night(Number(opt('night')));
if (opt('spot') !== undefined) G.stand(opt('spot') === 'none' ? null : G.spots[Number(opt('spot'))]);
// --home s: the old man is sent indoors, s seconds ago; --out s: he was indoors, and was sent out s seconds ago
for (const [flag, first] of [['home', false], ['out', true]])
  if (opt(flag) !== undefined) {
    if (first) {
      G.home(true);
      for (let i = 0; i < 200; i++) W.anim.update(1 / 30, 0);
    }
    G.home(!first);
    for (let i = 0; i < Number(opt(flag)) * 30; i++) W.anim.update(1 / 30, (t += 1 / 30));
  }
for (let i = 0; i < n; i++) {
  G.step(1 / 30, dir[0], dir[1]);
  t += 1 / 30;
}
if (n) console.log('walked to', G.pl.x.toFixed(2), G.pl.z.toFixed(2), 'y', G.pl.y.toFixed(2));
const w = Number(opt('w', 1190)),
  h = Number(opt('h', 1000)),
  view = () => ({ t, yaw: Number(opt('yaw', Math.PI / 4)), pitch: Number(opt('pitch', W.cam.pitch)), zoom: Number(opt('zoom', 1)), target: opt('look') ? [Number(opt('look').split(',')[0]), G.height(...opt('look').split(',').map(Number)) + 1, Number(opt('look').split(',')[1])] : [G.pl.x, G.pl.y + 1.6, G.pl.z], w, h, px: Math.max(1, Math.round(h / Number(opt('rows', 200)))) }),
  draw = () => {
    W.anim.update(1 / 30, t);
    if (!args.includes('--stillsea')) G.sea(t);
    W.data = lib.KIT.bones.posed(holder);
    const im = R.render(W, view());
    W.data = rest;
    const lut = G.grade(Number(opt('night', 0)), new Uint8Array(256)); // as the page does, by day as well
    for (let i = 0; i < im.rgb.length; i += 3) im.rgb[i] = im.rgb[i + 1] = im.rgb[i + 2] = lut[(im.rgb[i] * 77 + im.rgb[i + 1] * 150 + im.rgb[i + 2] * 29) >> 8];
    return im;
  };
W.anim.update(0, 0);
if (args.includes('--noao')) W.ao = null;
if (opt('dither') !== undefined) W.dither = Number(opt('dither'));
if (args.includes('--bench')) {
  t0 = Date.now();
  let im;
  for (let f = 0; f < 30; f++) {
    G.step(1 / 30, 1, 0.3);
    t += 1 / 30;
    im = draw();
  }
  console.log('frame', ((Date.now() - t0) / 30).toFixed(1), 'ms at', im.w + 'x' + im.h);
}
const im = draw(),
  out = args[0] && !args[0].startsWith('--') ? args[0] : null;
if (out) {
  const big = R.upscale ? R.upscale(im, im.px || 4) : im;
  PNG.write(out, big.w, big.h, big.rgb);
  console.log('wrote', out, big.w + 'x' + big.h, '(art', im.w + 'x' + im.h + ')');
}
