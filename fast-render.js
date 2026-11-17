// The toolkit's software renderer (cli/render.js), with its per-frame depth sort swapped for a radix sort.
// The original sorts every splat with a comparator callback each frame, which costs more than drawing them does in small scenes.
//   source(repo)  -> the patched renderer as script text ending in `return { render, ... }` (for build-html.js)
//   load(repo)    -> the same, ready to call from Node (for bench.js)
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
const SORT_NEW = `  const order = new Uint32Array(N);
  {
    const bits = new Uint32Array(depth.buffer, depth.byteOffset, N);
    let ks = new Uint32Array(N),
      kd = new Uint32Array(N),
      src = order,
      dst = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      const b = bits[i];
      ks[i] = b >>> 31 ? ~b : b | 0x80000000; // a float's bits, made to count upward as the float does
      order[i] = i;
    }
    const cnt = new Uint32Array(2049);
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

function source(repo) {
  let s = fs.readFileSync(path.join(repo, 'cli', 'render.js'), 'utf8');
  if (!s.includes(SORT_OLD)) throw new Error('fast-render: the renderer has changed, the sort was not found');
  return s
    .replace(SORT_OLD, SORT_NEW)
    .replace(/^const PixelLook = require\([^\n]*\n/m, '')
    .replace(/^module\.exports = ([^\n]*);\s*$/m, 'return $1;');
}
function load(repo) {
  const PixelLook = require(path.join(repo, 'src', 'pixel-look.js'));
  return new Function('PixelLook', source(repo))(PixelLook);
}
module.exports = { source, load };
