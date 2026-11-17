// The toolkit's software renderer (cli/render.js), with its per-frame depth sort swapped for a counting sort.
// The original sorts every splat with a comparator callback each frame, which costs more than drawing them does in small scenes.
//   source(repo)  -> the patched renderer as script text ending in `return { render, ... }` (for build-html.js)
//   load(repo)    -> the same, ready to call from Node (for bench.js)
const fs = require('fs'),
  path = require('path');

const SORT_OLD = `  const order = new Uint32Array(N);
  for (let i = 0; i < N; i++) order[i] = i;
  order.sort((a, b) => depth[a] - depth[b]);`;
// far to near, ties in the order the splats were laid (as the original's stable sort leaves them): 65536 depth buckets
const SORT_NEW = `  const order = new Uint32Array(N);
  {
    let dmn = Infinity,
      dmx = -Infinity;
    for (let i = 0; i < N; i++) {
      const v = depth[i];
      if (v < dmn) dmn = v;
      if (v > dmx) dmx = v;
    }
    const ksc = 65535 / (dmx - dmn || 1),
      bucket = new Uint16Array(N),
      start = new Uint32Array(65537);
    for (let i = 0; i < N; i++) {
      const b = ((depth[i] - dmn) * ksc) | 0;
      bucket[i] = b;
      start[b + 1]++;
    }
    for (let k = 0; k < 65536; k++) start[k + 1] += start[k];
    for (let i = 0; i < N; i++) order[start[bucket[i]]++] = i;
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
