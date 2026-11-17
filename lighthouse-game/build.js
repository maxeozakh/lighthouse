// Packs the ink-studio toolkit, its software renderer, the level and the game into one self-contained page.
//   node build.js [--repo path/to/shapeshift-labs-ink-studio]     -> index.html beside this file
const fs = require('fs'),
  path = require('path');
const args = process.argv.slice(2),
  ri = args.indexOf('--repo'),
  repo = path.resolve(ri >= 0 ? args.splice(ri, 2)[1] : '/tmp/ink-studio'),
  here = __dirname,
  out = path.join(here, 'index.html'),
  studio = require(path.join(repo, 'index.js'));

const renderer = require('../fast-render.js').source(repo);
const level = fs.readFileSync(path.join(here, 'level.js'), 'utf8');
const game = fs.readFileSync(path.join(here, 'game.js'), 'utf8');
const sound = fs.readFileSync(path.join(here, 'sound.js'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
// the type: Redaction (MCKL, 2019; SIL Open Font License 1.1, see fonts/LICENSE-Redaction.md), a book face worn down to pixels.
// Grade 50 of it: the edges are still broken up, but every letter keeps its shape (at grade 70 an n could be a u).
const face = (family, file, style) =>
  `@font-face { font-family: '${family}'; font-style: ${style || 'normal'}; font-weight: 400; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(here, 'fonts', file)).toString('base64')}) format('woff2'); }`;
const fonts = [face('Redaction', 'redaction-50-latin-400-normal.woff2'), face('Redaction', 'redaction-50-latin-400-italic.woff2', 'italic')].join('\n  ');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>wickie</title>
<!-- Type: Redaction, copyright 2019 MCKL Inc., used under the SIL Open Font License 1.1 (https://scripts.sil.org/OFL). -->
<style>
  ${fonts}
  html, body { margin: 0; height: 100%; background: #000; color: #cfd0cb; font: 13px/1.4 'Redaction', Georgia, serif; overflow: hidden; -webkit-font-smoothing: none; font-smooth: never; }
  canvas { position: fixed; image-rendering: pixelated; touch-action: none; cursor: crosshair; }
  /* the edges of the frame fall off, as an old lens does */
  #frame { position: fixed; pointer-events: none; background: radial-gradient(ellipse at center, transparent 52%, rgba(0, 0, 0, 0.5) 100%); }
  #hud { position: fixed; left: 0; right: 0; bottom: 8px; text-align: center; letter-spacing: 0.06em; color: #8b8c87; user-select: none; pointer-events: none; text-shadow: 0 1px 2px #000; }
  #hud b { color: #d9dad4; font-weight: normal; }
  #fps { position: fixed; right: 12px; top: 10px; color: #5c5d59; font: 11px ui-monospace, Menlo, monospace; }
  /* it opens out of black, and quickly */
  #veil { position: fixed; inset: 0; background: #000; transition: opacity 0.7s ease; pointer-events: none; }
  #veil.gone { opacity: 0; }
  /* what is laid over the picture, inside its frame: sized from the frame's height, so it reads the same in any window */
  #ui { position: fixed; pointer-events: none; }
  /* the count of days, which nobody explains */
  #day { position: absolute; left: 3.2%; top: 2.6%; font-size: 0.8em; letter-spacing: 0.14em; color: #e4e5df; text-shadow: 0 0 6px #000, 0 1px 2px #000; }
  #dead { position: fixed; inset: 0; display: grid; place-items: center; background: #000; text-align: center; opacity: 0; pointer-events: none; transition: opacity 0.5s; }
  #dead.on { opacity: 1; }
  /* what a phone gets instead of the game */
  #mobile { position: fixed; inset: 0; display: none; place-items: center; background: #000; text-align: center; padding: 0 8vmin; }
  #mobile.on { display: grid; }
  #mobile p { margin: 0; }
  #mobile .a { font: 7vmin/1.25 'Redaction', Georgia, serif; color: #e4e5df; margin-bottom: 3vmin; }
  #mobile .b { font-size: 3.8vmin; letter-spacing: 0.08em; color: #8b8c87; }
  /* the end: the count where it stopped, and nothing else */
  #lived { margin: 0; padding-left: 0.16em; font: 5vh/1 'Redaction', Georgia, serif; letter-spacing: 0.16em; color: #e4e5df; }
</style>
</head>
<body>
<canvas id="view"></canvas>
<div id="frame"></div>
<div id="ui">
  <div id="day"></div>
</div>
<div id="hud"><b>WASD</b> or arrows roam the rock &nbsp;·&nbsp; <b>Shift</b> tread soft &nbsp;·&nbsp; <b>Q</b> / <b>E</b> look about ye &nbsp;·&nbsp; wheel peer close &nbsp;·&nbsp; <b>M</b> <span id="snd">stop yer ears</span></div>
<div id="fps"></div>
<div id="dead"><p id="lived"></p></div>
<div id="veil"></div>
<div id="mobile"><div><p class="a">this one needs a keyboard</p><p class="b">open mxz.sh/lighthouse on a desktop</p></div></div>
<script>
${safe(studio.bundle())}
const InkRender = (() => {
${safe(renderer)}
})();
const sceneFactory = (() => {
  const module = { exports: null };
${safe(level)}
  return module.exports;
})();
${safe(sound)}
${safe(game)}
</script>
</body>
</html>
`;
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
