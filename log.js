// The log: what was done to the rock, from the first evening on, as a page of its own (changelog.html) in the game's type and
// greys. build.js writes it beside index.html.
//   require('./log.js')(fonts, head)  -> the page, fonts being the @font-face rules the game's page has and head what else
//   goes in its head (what a link to it is shown with)
// Each entry: when (the hour it was done, Central European Time, on DAY unless it says another day), what it is called, and what
// changed. They are kept oldest first and shown newest first, and are numbered as the game numbers its days: from 1898.
const FIRST = 1898,
  DAY = '17 Nov 2026',
  ENTRIES = [
    {
      at: '17:05',
      name: 'A rock to run about on',
      did: [
        'One level: the rock, the tower, the keepers’ cottage and the passage between them, a fog-signal house, a landing with a boat.',
        'Black and white, in a near-square frame whose edges fall off as an old lens does. Pale haze where a sky would be.',
        'The lamp turns, gulls wheel about the tower, rain comes down, foam lies along the shore.',
        '<b>WASD</b> to run, <b>Shift</b> to walk, <b>Q</b> and <b>E</b> to turn the view, the wheel to come nearer.'
      ]
    },
    {
      at: '17:24',
      name: 'Company, and something to hear',
      did: [
        'An old man by the cottage door, who could be spoken with.',
        'A mermaid on a slab out at the east point. Speaking with her a fourth time was once too many.',
        'Sound, all of it made in the page as it plays: wind, sea, the horn, a low music, her song.'
      ]
    },
    {
      at: '18:15',
      name: 'A face for the type, a voice for her',
      did: [
        'The type is Redaction: a book face worn down to pixels. First at a coarser grade, then at one where every letter keeps its shape.',
        'Her hair falls forward over her. The old man turns only his head to watch, not the whole of himself.',
        'There is no speaking with her any more. Coming too near is enough.',
        'Her song made again as a woman singing, and then higher. It is heard only from close by, and swells with each step toward her.',
        'Night follows day. And a number in the corner, which nobody explains; it stops when he does.'
      ]
    },
    {
      at: '19:07',
      name: 'No title, no talk, no second go',
      did: [
        'It opens out of black, quickly, with no title.',
        'The old man cannot be spoken with. He mutters, without words, and is heard by whoever comes close.',
        'Rocks stop the keeper at the shape that is drawn, and he slides along them instead of sticking.',
        'The mermaid modelled again as a figure: ribs, waist and hips, arms with hands, a face, hair down her back, a tail that tapers.',
        'The end is the number alone, on black. He is not put back.'
      ]
    },
    {
      at: '19:12',
      name: 'Put where it can be found',
      did: ['Published at mxz.sh/lighthouse. A phone was shown a card asking for a keyboard.']
    },
    {
      at: '19:39',
      name: 'Looked at again',
      did: [
        'The sea moves: long swell coming down from the north, white riding its light bands, foam running up the shore and falling back.',
        'The buildings made again, with pictures to go by. A long low passage with a row of small windows; the cottage in pale boards, with dormers and one brick chimney; the fog-signal house square under a pointed roof, a slim brick stack behind it, its horn out through the roof.',
        'A day and a night take a minute and a half, and half of that is daylight.',
        'The old man no longer goes missing. The key that put the keeper back where he began is gone.',
        'The picture a step dimmer by day.'
      ]
    },
    {
      at: '19:56',
      name: 'Greyer',
      did: [
        'The tower: stouter, less tapered, swelling out under a gallery with a tall rail, its whitewash worn off in patches.',
        'The greys measured, not guessed at, and set again. Nothing built is white; every wall sits under the sky; the faint tint is gone.',
        'The hints speak as keepers might: roam the rock, tread soft, look about ye, peer close, stop yer ears.',
        'A shed that stood on no picture of the place, taken away.',
        'The passage meets the tower at the middle of its wall. The name goes in small letters.'
      ]
    },
    {
      at: '20:14',
      name: 'He keeps hours',
      did: [
        'At dusk the old man walks to his door and goes in. In the morning he comes out and takes up his place. Most days.',
        'The passage between tower and cottage is twice as long.'
      ]
    },
    {
      at: '20:56',
      name: 'Thumbs',
      did: [
        'It plays on a phone. Drag anywhere to go, a short drag to go softly; pinch to come nearer; two things to press that turn the view.',
        'Those two are arrows cut from whitewashed stone, built and drawn by the game’s own renderer.',
        'A slow machine gets a picture made of fewer, bigger points, rather than a slower one.'
      ]
    },
    {
      at: '21:29',
      name: 'She watches',
      did: [
        'Wind and sea are heard as the page opens; the music waits for the first step. (Where a browser holds sound back, both wait for the first key or touch.)',
        'Her head comes round to whoever nears her, right over her shoulder, and her shoulders come part of the way with it.',
        'A smaller nose. And he must come a good deal nearer before she screams.'
      ]
    },
    {
      at: '22:01',
      name: 'The landing',
      did: [
        'A boathouse over the landing, open to the sea, a slip running down from it and a boat in the dark inside.',
        'The station is bigger, and there is open ground between it and the landing.',
        'Both boats are dories: a flat bottom, straight flaring sides, a sharp bow.',
        'The count begins at 1898, every time.',
        'Rocks no longer flicker: the picture is sorted exactly, back to front. And no brush grows out of stone.'
      ]
    },
    {
      at: '22:29',
      name: 'Outbuildings',
      did: [
        'A plank shed on the north shore, behind the station, its door to the west. It stood in two other places first.',
        'A bow-back chair by the shed’s door.',
        'The privy is gone: there is one small building, not two.',
        'The cistern stands out off the cottage’s corner, with a pump, and a pipe across to the house.'
      ]
    },
    {
      at: '22:54',
      name: 'Hints that know when to stop',
      did: [
        'Each hint in the row goes out once you have done what it says, and the others draw together slowly over the gap.',
        'What has been done is remembered by the browser, and is not said again on the next visit.',
        '<b>M</b> goes the same way. Under a thumb it stays: there it is the thing pressed.'
      ]
    },
    {
      at: '22:55',
      name: 'Knees and elbows',
      did: [
        'Both men have shoulders, a chest and a belly, and limbs in two parts.',
        'The young man’s knees lift and his elbows bend as he runs, and he leans into it. The old man takes short stiff steps, one leg stiffer than the other.',
        'The old man’s beard is grey and sits on his jaw. He has no pipe.'
      ]
    },
    {
      at: '23:14',
      name: 'Turning the view',
      did: [
        'Turning the view while he is going no longer bends his path: he keeps on across the ground as he was.',
        'The keys are read against the new view as soon as one of them is pressed or let go; a thumb, once it has gone a good way round or been lifted.'
      ]
    },
    {
      at: '23:22',
      name: 'The lamp is his',
      did: [
        'By day the lamp is out: no beam, and grey glass in the lantern.',
        'The old man goes in before the light fails, every night. A few seconds after he is through his door, the lamp comes up.',
        'In the morning it is put out, and a few seconds later he comes out. Most mornings: about one in seven he keeps indoors for the day.',
        'Once he has gone in he is not heard.'
      ]
    },
    {
      at: '23:45',
      name: 'A smoke',
      did: [
        '<b>C</b>, standing still: he lights a cigarette. It hangs in his hand with a thread of smoke off it; every few seconds the hand comes up, the end glows, and he lets the smoke out ahead of him.',
        'He lights it with a match, and it takes both hands. The cigarette goes to his lips and stays there; the box comes out of his coat; he strikes a match on it before his chest and brings the flame up, the other hand beside it against the wind. The end catches, the match is shaken out, the box goes back, and his hand takes the cigarette for the first pull.',
        'Now and then the wind has the first match before it has taken, and he strikes another.',
        'He takes longer between pulls, and not the same time twice.',
        'Now and then, after a pull, he knocks the ash off it, and a spark or two go from its end down the wind: once in a cigarette at the least. Less often, one goes as he draws on it.',
        'Done with it, he throws it down: a small turn of the hand, and it lands by his foot and lies there, its end going out, and fades away in a few seconds. One is not gone because another is lit or thrown.',
        'If he leaves off before it has caught, the cigarette stays at his lips, unlit, wherever he goes; and the next time he goes straight to his pocket for the matches.',
        'No two pulls are alike: a quick one, then a long one. He lets out as much smoke as he drew.',
        'Six pulls and it is done. Going anywhere, or <b>C</b> again, and he has dropped it.',
        'The lit end keeps its white after dark.',
        'Under a thumb: a third stone thing to press, beside the two that turn the view.'
      ]
    },
    {
      day: '18 Nov 2026',
      at: '00:01',
      name: 'The ledger',
      did: [
        '<b>Esc</b> lays a ledger over the picture; under a thumb, its name is there to be pressed in the row of hints.',
        'In it, how loud you have it: all of it, the music, and the wind, sea and voices, each by itself. The browser keeps what you set.',
        'Two things to tick there: your ears stopped, and the row of controls kept in sight for good (it goes out, a part at a time, as you learn it; ticked, all of it is put back and stays).',
        'Its steps of loudness and its ticks are cut of the same stone as the things a thumb presses.',
        'The view comes round a little slower when it is turned.',
        'It is called lighthouse now.',
        'The horn is counted with the music, and is as loud as you have that. The music begins at seven of its ten steps.',
        'The count of days is gone from the screen (the days go by as they did). In its place, a count of his cigarettes: not there until he has lit the first, and all that is left on the screen at the end.',
        'It begins at 1898: he did not take it up here.',
        'Its figures turn as a scoreboard\'s do: the one that changes is wound up out of sight as the next comes up from under it.',
        'And who made what.',
        'A link to the game is shown with a picture where it is posted, and the tab has the tower and its beams for a mark.',
        'The picture is drawn in half the time it took, and is the same picture to the last point of it.',
        'The two men stand a little higher: their boots were in the ground. And the dark round each has under him is thinner: a little of the ground shows through it.',
        'The small count of pictures a second, up in the corner, is gone: it is there only for who asks for it.',
        'The picture is drawn quicker again, by near half, for the sake of a phone: what is nearest is drawn first, and what it hides is not drawn at all.'
      ]
    }
  ];

module.exports = (fonts, head = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>lighthouse · the log</title>
${head}
<!-- Type: Redaction, copyright 2019 MCKL Inc., used under the SIL Open Font License 1.1 (https://scripts.sil.org/OFL); its text is in licenses.txt, beside this page. -->
<style>
  ${fonts}
  html { background: #000; }
  body { margin: 0; color: #a3a49f; font: 17px/1.6 'Redaction', Georgia, serif; letter-spacing: 0.02em; -webkit-font-smoothing: none; font-smooth: never; -webkit-text-size-adjust: 100%; }
  /* the edges fall off, as they do round the game's picture; and it opens out of black the same way */
  #frame { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 48%, rgba(0, 0, 0, 0.62) 100%); }
  #veil { position: fixed; inset: 0; background: #000; pointer-events: none; animation: open 0.7s ease 0.1s both; }
  @keyframes open { from { opacity: 1; } to { opacity: 0; } }
  main { max-width: 37em; margin: 0 auto; padding: 13vh 26px 20vh; }
  b { font-weight: normal; color: #d9dad4; }
  a { color: #d9dad4; text-decoration: none; border-bottom: 1px dotted #8b8c87; }
  a:hover { color: #fff; border-bottom-color: #d9dad4; }
  header h1 { margin: 0; font-size: 2.7em; font-weight: normal; line-height: 1.1; letter-spacing: 0.16em; color: #e4e5df; }
  header p { margin: 0.9em 0 0; color: #8b8c87; letter-spacing: 0.06em; }
  /* an entry: its number and its hour in the margin, as a log has them, and what was done beside */
  article { display: grid; grid-template-columns: 6.2em 1fr; column-gap: 1.4em; margin-top: 4.4em; }
  .n { font-size: 1.45em; line-height: 1.25; letter-spacing: 0.14em; color: #e4e5df; }
  .at { margin-top: 0.5em; font-size: 0.78em; line-height: 1.5; letter-spacing: 0.08em; color: #7d7e79; }
  .at span { display: block; }
  h2 { margin: 0.12em 0 0.7em; font-size: 1.3em; font-style: italic; font-weight: normal; line-height: 1.3; letter-spacing: 0.03em; color: #d9dad4; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { position: relative; margin: 0.5em 0; padding-left: 1.15em; }
  li::before { content: '·'; position: absolute; left: 0.15em; color: #8b8c87; }
  footer { margin-top: 7em; font-size: 0.82em; line-height: 1.7; letter-spacing: 0.05em; color: #7d7e79; }
  footer a { color: #a3a49f; }
  @media (max-width: 560px) {
    body { font-size: 16px; }
    main { padding: 9vh 20px 16vh; }
    header h1 { font-size: 2.2em; }
    article { display: block; margin-top: 3.6em; }
    .at { display: inline; margin-left: 0.9em; }
    .at span { display: inline; }
    .n { display: inline; }
    h2 { margin-top: 0.5em; }
  }
</style>
</head>
<body>
<main>
<header>
<h1>lighthouse</h1>
<p>The log: what was done to the rock, the latest of it first. <a href="./">Back to the rock</a></p>
</header>
${ENTRIES.map(
  (e, i) => `<article>
<div><div class="n">${FIRST + i}</div><div class="at"><span>${e.day || DAY}</span> <span>${e.at}</span></div></div>
<div><h2>${e.name}</h2>
<ul>
${e.did.map(d => `<li>${d}</li>`).join('\n')}
</ul></div>
</article>`
)
  .reverse()
  .join('\n')}
<footer>
<p>Built with <a href="https://github.com/siliconjungle/shapeshift-labs-ink-studio">ink-studio</a>, by siliconjungle, under the MIT License. Type: Redaction, by MCKL, under the SIL Open Font License. <a href="licenses.txt">The licences in full</a></p>
</footer>
</main>
<div id="frame"></div>
<div id="veil"></div>
</body>
</html>
`;
