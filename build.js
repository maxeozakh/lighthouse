// Packs the ink-studio toolkit, its software renderer, the level and the game into one self-contained page.
//   node build.js [--repo path/to/shapeshift-labs-ink-studio]     -> index.html beside this file
// and, beside that, the log of what has been done to it (log.js) as a page in the same type: changelog.html;
// and the licences of what is packed into them (the toolkit's and the type's), in full: licenses.txt
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
// what is packed into the page that is not ours: the toolkit (MIT: its notice has to go wherever a copy of it goes, so it is written
// into the page itself) and the type (SIL OFL). Both licences in full go beside the pages, in licenses.txt
const mit = fs.readFileSync(path.join(repo, 'LICENSE'), 'utf8').trim();
if (!/^MIT License/.test(mit) || /--/.test(mit)) throw new Error('the toolkit\'s licence is not the one expected: read ' + path.join(repo, 'LICENSE'));
const rule = '='.repeat(78),
  licences = [
    'lighthouse is built with the two things below. Their licences, in full.',
    rule,
    'ink-studio, a toolkit for making and drawing scenes (the page contains it, and a renderer made from its own)',
    'https://github.com/siliconjungle/shapeshift-labs-ink-studio',
    rule,
    mit,
    rule,
    'Redaction, the type (grade 50, regular and italic, as web fonts)',
    'https://www.redaction.us',
    rule,
    fs.readFileSync(path.join(here, 'fonts', 'LICENSE-Redaction.md'), 'utf8').trim()
  ].join('\n\n');
// the type: Redaction (MCKL, 2019; SIL Open Font License 1.1, see fonts/LICENSE-Redaction.md), a book face worn down to pixels.
// Grade 50 of it: the edges are still broken up, but every letter keeps its shape (at grade 70 an n could be a u).
const face = (family, file, style) =>
  `@font-face { font-family: '${family}'; font-style: ${style || 'normal'}; font-weight: 400; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(here, 'fonts', file)).toString('base64')}) format('woff2'); }`;
const fonts = [face('Redaction', 'redaction-50-latin-400-normal.woff2'), face('Redaction', 'redaction-50-latin-400-italic.woff2', 'italic')].join('\n  ');

// what a link to the page is shown with where it is posted, and the mark in a browser's tab (the pictures: card.js). Where it is
// posted wants whole addresses, so the page has to be told where it lives. (A browser keeps a mark it has once fetched: the
// number after its name is put up when the mark is changed, so that the new one is fetched)
const SITE = 'https://mxz.sh/lighthouse/',
  head = (title, about, page = '') => `<meta name="description" content="${about}">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="${SITE}${page}">
<link rel="icon" type="image/png" href="icon.png?2">
<link rel="apple-touch-icon" href="touch.png?2">
<meta property="og:type" content="website">
<meta property="og:site_name" content="lighthouse">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${about}">
<meta property="og:url" content="${SITE}${page}">
<meta property="og:image" content="${SITE}card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A lighthouse on a rock in the sea at night, its beam turning.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${about}">
<meta name="twitter:image" content="${SITE}card.png">
<meta name="twitter:image:alt" content="A lighthouse on a rock in the sea at night, its beam turning.">`;
for (const f of ['card.png', 'icon.png', 'touch.png']) if (!fs.existsSync(path.join(here, f))) throw new Error(f + ' is not here: node card.js');

// the two things a thumb presses to turn the view: a stone arrow each, made and drawn as the level is (icons.js), a pixel of it
// shown as big as a pixel of the picture
const icons = require('./icons.js')(repo),
  bend = side => `<img class="bend" src="${side < 0 ? icons.left : side > 0 ? icons.right : icons.smoke}" width="${icons.size}" height="${icons.size}" alt="" draggable="false">`; // (0: the one for his smoke)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>lighthouse</title>
${head('lighthouse', 'a rock in the sea, a light, two keepers, and something pale out at the east point. a small game in black and white')}
<!-- Type: Redaction, copyright 2019 MCKL Inc., used under the SIL Open Font License 1.1 (https://scripts.sil.org/OFL); its text is in licenses.txt, beside this page. -->
<!--
This page contains ink-studio (https://github.com/siliconjungle/shapeshift-labs-ink-studio) and a renderer made from its own, used under this licence:

${mit}
-->
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
     (game.js gives it the width it has, to close from, and takes it away at the end). When it is the last of the row that
     goes, the dot before it goes the same way (.end: its width is --dot, which game.js measures; .bare is how it measures).
     Under a thumb what stops his ears stays: there it is the thing pressed, to stop them and to unstop them. (A part going
     out is cut off at its edges as it narrows: the room above and below it is for the two bent arrows, which stand taller
     than the words) */
  #hud .keys > span:not(:last-child)::after, #hud .thumbs > span:not(:last-child)::after { content: '\\00a0·\\00a0'; color: #8b8c87; }
  #hud [data-h] { display: inline-block; white-space: nowrap; }
  #hud .known { overflow: hidden; vertical-align: top; padding: 6px 0; margin: -6px 0; opacity: 0; transition: opacity 0.6s ease, width 1.4s ease-in-out 0.45s; }
  #hud .keys > span.end::after, #hud .thumbs > span.end::after { display: inline-block; overflow: hidden; vertical-align: top; width: var(--dot); opacity: 0; transition: opacity 0.6s ease, width 1.4s ease-in-out 0.45s; }
  #hud .keys > span.bare::after, #hud .thumbs > span.bare::after { display: none; }
  #fps { position: fixed; right: calc(12px + env(safe-area-inset-right)); top: calc(10px + env(safe-area-inset-top)); color: #8a8b86; font: 11px ui-monospace, Menlo, monospace; }
  /* it opens out of black, and quickly */
  #veil { position: fixed; inset: 0; background: #000; transition: opacity 0.7s ease; pointer-events: none; }
  #veil.gone { opacity: 0; }
  /* what is laid over the picture, inside its frame: sized from the frame's height, so it reads the same in any window */
  #ui { position: fixed; pointer-events: none; }
  /* the count of his cigarettes, which nobody explains: not there until he has lit one */
  #cigs { position: absolute; left: 3.2%; top: 2.6%; font-size: 0.8em; line-height: 1.4; letter-spacing: 0.14em; white-space: nowrap; color: #e4e5df; filter: drop-shadow(0 0 6px #000) drop-shadow(0 1px 2px #000); opacity: 0; transition: opacity 0.8s ease; }
  #cigs.on { opacity: 1; }
  /* its figures are on reels, one each, as a scoreboard's are: a figure that changes is wound up out of its window as the
     next comes up from under it, and stops with the least overrun (a fiftieth of its travel) (game.js: roll()). (The shadow is the whole count's, and
     not each figure's, so that the windows do not cut it) */
  #cigs .reel { display: inline-block; height: 1.4em; overflow: hidden; vertical-align: top; }
  #cigs .reel > span { display: block; }
  #cigs .reel i { display: block; width: max-content; height: 1.4em; font-style: normal; }
  #cigs .reel.go { transition: width 0.8s ease-in-out var(--wait, 0s); }
  #cigs .reel.go > span { transform: translateY(-50%); transition: transform 0.8s cubic-bezier(0.5, 0, 0.25, 1.2) var(--wait, 0s); }
  #dead { position: fixed; inset: 0; display: grid; place-items: center; background: #000; text-align: center; opacity: 0; pointer-events: none; transition: opacity 0.5s; }
  #dead.on { opacity: 1; }
  /* the ledger: laid over everything by Esc. How loud he has it, a line for each thing and ten steps to a line; and who made
     what. (Under a thumb, where nothing else of the page is let move, it can be drawn up and down if it is longer than the
     screen: all of it but the steps, which are dragged along) */
  #menu { position: fixed; inset: 0; display: flex; overflow-y: auto; background: rgba(0, 0, 0, 0.86); color: #8b8c87; letter-spacing: 0.05em; line-height: 1.5; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.3s ease, visibility 0s 0.3s; user-select: none; -webkit-user-select: none; }
  #menu.on { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity 0.3s ease; }
  #menu .in { box-sizing: border-box; flex: none; width: min(25em, 100vw); margin: auto; padding: 1.5em 1.2em; } /* (in the middle; and from the top, where it is longer than the screen) */
  #menu b { color: #d9dad4; font-weight: normal; }
  #menu .vol { display: flex; align-items: center; justify-content: space-between; min-height: 2.3em; }
  #menu .vol.sel .name { color: #e4e5df; }
  body.touch #menu .vol.sel .name { color: inherit; }
  #menu .pips { display: flex; padding: 0.55em 0 0.55em 1.4em; cursor: pointer; touch-action: none; }
  /* its steps and its things to tick are of stone, as the things a thumb presses are (icons.js): shown so many times the
     size they were drawn (--pix, which game.js gives), each point of them a square */
  #menu .pips i { width: calc(var(--pix, 1) * ${icons.pip.w}px); height: calc(var(--pix, 1) * ${icons.pip.h}px); margin-left: calc(var(--pix, 1) * 2px); background: url(${icons.pip.off}) 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  #menu .pips i.on { background-image: url(${icons.pip.on}); }
  #menu .tick, #back { cursor: pointer; }
  #menu .tick .box { flex: none; width: calc(var(--pix, 1) * ${icons.box.w}px); height: calc(var(--pix, 1) * ${icons.box.h}px); background: url(${icons.box.off}) 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  #menu .tick.on .box { background-image: url(${icons.box.on}); }
  #menu .by { margin: 1.7em 0 0; font-size: 0.86em; line-height: 1.8; }
  #menu .by span { display: block; }
  #menu a { color: #d9dad4; text-decoration: none; border-bottom: 1px dotted #8b8c87; }
  #menu a:hover { color: #fff; }
  #back { margin-top: 1.9em; font-size: 0.86em; }
  body.touch #back b { display: none; }
  body.touch #back { color: #d9dad4; display: inline-block; border-bottom: 1px dotted #8b8c87; }
  body.touch #menu .vol { min-height: 2.8em; }
  body.touch #menu .pips { padding-top: 0.85em; padding-bottom: 0.85em; }
  body.touch #menu, body.touch #menu * { touch-action: pan-y; }
  body.touch #menu .pips, body.touch #menu .pips * { touch-action: none; }
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
  /* (the one for his smoke is not in the row with the two that turn the view: game.js says where it goes) */
  #pad #light { position: fixed; }
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
  <div id="cigs"></div>
</div>
<div id="hud"><span class="keys"><span data-h="roam"><b>WASD</b> or arrows roam the rock</span><span data-h="soft"><b>Shift</b> tread soft</span><span data-h="look"><b>Q</b> / <b>E</b> look about ye</span><span data-h="zoom">wheel peer close</span><span data-h="smoke"><b>C</b> have a smoke</span><span data-h="ears"><b>M</b> <span class="snd">stop yer ears</span></span><span data-h="book"><b>Esc</b> the ledger</span></span><span class="thumbs"><span data-h="roam"><b>drag</b> roam the rock</span><span data-h="soft"><b>drag a little</b> tread soft</span><span data-h="look">${bend(-1)}${bend(1)} look about ye</span><span data-h="zoom"><b>pinch</b> peer close</span><span data-h="smoke">${bend(0)} have a smoke</span><span><span class="snd tap">stop yer ears</span></span><span><span class="book tap">the ledger</span></span></span></div>
<div id="pad"><button id="turnL" aria-label="look about ye, to the left">${bend(-1)}</button><button id="turnR" aria-label="look about ye, to the right">${bend(1)}</button><button id="light" aria-label="have a smoke">${bend(0)}</button></div>
<div id="stick"><i></i></div>
<div id="dead"><div><p id="lived"></p></div></div>
<div id="menu" aria-hidden="true" data-step="${icons.pip.w + 2}"><div class="in">
<div class="vol" data-v="all"><span class="name">all of it</span><span class="pips"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
<div class="vol" data-v="music"><span class="name">the music</span><span class="pips"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
<div class="vol" data-v="rest"><span class="name">wind, sea and voices</span><span class="pips"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
<div class="vol tick" data-c="ears" role="checkbox" aria-checked="false"><span class="name">stop yer ears</span><span class="box"></span></div>
<div class="vol tick" data-c="keep" role="checkbox" aria-checked="false"><span class="name">keep the controls in sight</span><span class="box"></span></div>
<div class="vol tick" data-c="spark" role="checkbox" aria-checked="false"><span class="name">debug: always spark</span><span class="box"></span></div>
<p class="by">
<span>made by <a href="https://x.com/maxeozakh" target="_blank" rel="noopener">@maxeozakh</a></span>
<span>drawn with <a href="https://github.com/siliconjungle/shapeshift-labs-ink-studio" target="_blank" rel="noopener">ink-studio</a>, by <a href="https://x.com/JungleSilicon" target="_blank" rel="noopener">@JungleSilicon</a></span>
<span>set in <a href="https://www.redaction.us/" target="_blank" rel="noopener">Redaction</a>, by Forest Young and Jeremy Mickel</span>
<span>after <i>The Lighthouse</i> (2019), a film by Robert Eggers</span>
<span>(unofficial: no one from the film had a hand in it)</span>
<span><a href="changelog.html" target="_blank" rel="noopener">the log</a> · <a href="licenses.txt" target="_blank" rel="noopener">the licences</a></span>
</p>
<div id="back"><b>Esc</b> back to the rock</div>
</div></div>
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
fs.writeFileSync(path.join(here, 'licenses.txt'), licences + '\n');
console.log('wrote', path.join(here, 'licenses.txt'), (licences.length / 1024).toFixed(0) + ' KB');
// the log, in the same type
const logOut = path.join(here, 'changelog.html'),
  log = require('./log.js')(fonts, head('lighthouse · the log', 'What has been done to the rock, the latest of it first.', 'changelog.html'));
fs.writeFileSync(logOut, log);
console.log('wrote', logOut, (log.length / 1024).toFixed(0) + ' KB');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
