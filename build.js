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

const renderer = require('./fast-render.js').source(repo);
const level = fs.readFileSync(path.join(here, 'level.js'), 'utf8');
const game = fs.readFileSync(path.join(here, 'game.js'), 'utf8');
const sound = fs.readFileSync(path.join(here, 'sound.js'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
// the type: Redaction (MCKL, 2019; SIL Open Font License 1.1, see fonts/LICENSE-Redaction.md), a book face worn down to pixels.
// Grade 50 of it: the edges are still broken up, but every letter keeps its shape (at grade 70 an n could be a u).
const face = (family, file, style) =>
  `@font-face { font-family: '${family}'; font-style: ${style || 'normal'}; font-weight: 400; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(here, 'fonts', file)).toString('base64')}) format('woff2'); }`;
const fonts = [face('Redaction', 'redaction-50-latin-400-normal.woff2'), face('Redaction', 'redaction-50-latin-400-italic.woff2', 'italic')].join('\n  ');

// the two things a thumb presses to turn the view: a stone arrow each, made and drawn as the level is (icons.js), a pixel of it
// shown as big as a pixel of the picture
const icons = require('./icons.js')(repo),
  bend = side => `<img class="bend" src="${side < 0 ? icons.left : icons.right}" width="${icons.size}" height="${icons.size}" alt="" draggable="false">`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>wickie</title>
<!-- Type: Redaction, copyright 2019 MCKL Inc., used under the SIL Open Font License 1.1 (https://scripts.sil.org/OFL). -->
<style>
  ${fonts}
  html, body { margin: 0; height: 100%; background: #000; color: #cfd0cb; font: 13px/1.4 'Redaction', Georgia, serif; overflow: hidden; -webkit-font-smoothing: none; font-smooth: never; }
  /* under a thumb nothing of the page scrolls, zooms, or is picked out as text */
  body.touch, body.touch * { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  body.touch { overscroll-behavior: none; }
  canvas { position: fixed; image-rendering: pixelated; touch-action: none; cursor: crosshair; }
  /* the edges of the frame fall off, as an old lens does */
  #frame { position: fixed; pointer-events: none; background: radial-gradient(ellipse at center, transparent 52%, rgba(0, 0, 0, 0.5) 100%); }
  #hud { position: fixed; left: 0; right: 0; bottom: calc(8px + env(safe-area-inset-bottom)); padding: 0 12px; text-align: center; letter-spacing: 0.06em; color: #8b8c87; user-select: none; pointer-events: none; text-shadow: 0 1px 2px #000; }
  #hud b { color: #d9dad4; font-weight: normal; }
  /* each thing the row says is told apart from the next by a dot. Once he has done a thing, the row stops saying it: it goes
     out, and then the room it took is closed up slowly, so the rest of the row draws together over it and does not jump
     (game.js gives it the width it has, to close from, and takes it away at the end). What stops his ears stays: it is how
     he unstops them. (A part going out is cut off at its edges as it narrows: the room above and below it is for the two
     bent arrows, which stand taller than the words) */
  #hud .keys > span:not(:last-child)::after, #hud .thumbs > span:not(:last-child)::after { content: '\\00a0·\\00a0'; color: #8b8c87; }
  #hud [data-h] { display: inline-block; white-space: nowrap; }
  #hud .known { overflow: hidden; vertical-align: top; padding: 6px 0; margin: -6px 0; opacity: 0; transition: opacity 0.6s ease, width 1.4s ease-in-out 0.45s; }
  #fps { position: fixed; right: calc(12px + env(safe-area-inset-right)); top: calc(10px + env(safe-area-inset-top)); color: #5c5d59; font: 11px ui-monospace, Menlo, monospace; }
  /* it opens out of black, and quickly */
  #veil { position: fixed; inset: 0; background: #000; transition: opacity 0.7s ease; pointer-events: none; }
  #veil.gone { opacity: 0; }
  /* what is laid over the picture, inside its frame: sized from the frame's height, so it reads the same in any window */
  #ui { position: fixed; pointer-events: none; }
  /* the count of days, which nobody explains */
  #day { position: absolute; left: 3.2%; top: 2.6%; font-size: 0.8em; letter-spacing: 0.14em; color: #e4e5df; text-shadow: 0 0 6px #000, 0 1px 2px #000; }
  #dead { position: fixed; inset: 0; display: grid; place-items: center; background: #000; text-align: center; opacity: 0; pointer-events: none; transition: opacity 0.5s; }
  #dead.on { opacity: 1; }
  /* a phone: the row of hints says what a thumb does instead of what the keys do, and has two things to press that turn the
     view. Where a thumb is put down and dragged, a ring shows, and in it which way he is being sent */
  #hud .thumbs, #pad, #stick { display: none; }
  body.touch #hud { line-height: 1.9; }
  body.touch #hud .keys { display: none; }
  body.touch #hud .thumbs { display: inline; }
  #hud .thumbs > span { white-space: nowrap; }
  body.touch .tap { pointer-events: auto; padding: 8px 2px; color: #d9dad4; border-bottom: 1px dotted #8b8c87; }
  body.touch #pad { display: flex; position: fixed; left: 0; right: 0; box-sizing: border-box; align-items: center; justify-content: space-between; pointer-events: none; }
  #pad button { pointer-events: auto; display: grid; place-items: center; width: calc(var(--dab, 2) * ${icons.size}px + 12px); height: calc(var(--dab, 2) * ${icons.size}px + 12px); margin: 0; padding: 0; border: 0; background: none; }
  .bend { width: calc(var(--dab, 2) * ${icons.size}px); height: calc(var(--dab, 2) * ${icons.size}px); image-rendering: pixelated; pointer-events: none; }
  #pad button:active .bend { transform: translateY(calc(var(--dab, 2) * 1px)); filter: brightness(0.62); }
  #hud .bend { width: ${icons.size}px; height: ${icons.size}px; margin: -6px 1px; vertical-align: middle; }
  #stick { position: fixed; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%; border: 1px solid rgba(217, 218, 212, 0.3); pointer-events: none; }
  #stick i { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: rgba(217, 218, 212, 0.35); }
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
<div id="hud"><span class="keys"><span data-h="roam"><b>WASD</b> or arrows roam the rock</span><span data-h="soft"><b>Shift</b> tread soft</span><span data-h="look"><b>Q</b> / <b>E</b> look about ye</span><span data-h="zoom">wheel peer close</span><span><b>M</b> <span class="snd">stop yer ears</span></span></span><span class="thumbs"><span data-h="roam"><b>drag</b> roam the rock</span><span data-h="soft"><b>drag a little</b> tread soft</span><span data-h="look">${bend(-1)}${bend(1)} look about ye</span><span data-h="zoom"><b>pinch</b> peer close</span><span class="snd tap">stop yer ears</span></span></div>
<div id="pad"><button id="turnL" aria-label="look about ye, to the left">${bend(-1)}</button><button id="turnR" aria-label="look about ye, to the right">${bend(1)}</button></div>
<div id="stick"><i></i></div>
<div id="fps"></div>
<div id="dead"><p id="lived"></p></div>
<div id="veil"></div>
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
