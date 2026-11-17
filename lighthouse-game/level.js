// Wickie. One level after Robert Eggers' "The Lighthouse" (2019): the rock, the tower, the keepers' cottage and its outbuildings, in
// black and white. You are the young keeper; you can run about the island. The old keeper stands by the cottage door, and something
// pale lies on a rock at the east point. What comes of going near her and the days going by are the page's business; the level
// only stands the two of them there, turns their heads to watch, and has the lamps to light and the sea to move.
//
// Everything is kept coarse on purpose (big splats, few solids): the look first, details later.
// The world it returns carries W.game: { pl, spawn, height(x, z), blocked(x, z), step(dt, mx, mz, walk), turn(x, z, dt), npc, places,
// spots, stand(spot), night(n), grade(n, table), sea(t) } for the page to drive. npc.mer.scream (0..1) is hers to be given: at 1 she is up off her rock.
// The old man keeps to his door; stand(spot) can put him at another of spots ([x, z, the way he faces]), which only shot.js does.
// night(n), 0..1, lights the windows and brings up the beam (the darkening of the picture itself is done by the page, on what is
// drawn). sea(t) is the water at that moment.
module.exports = ({ makeBuilder, makeSculpt, KIT: K }) => ({
  id: 'wickie',
  name: 'wickie',
  seed: 5,
  build(seed) {
    const B = makeBuilder(seed, [
      0xb9bbb8, // 0 the haze: sky, and what the sea goes into
      0x0a0b0b, 0x141515, 0x1f2121, 0x2d2f2f, 0x3f4141, 0x565857, // 1-6 wet black rock
      0x161716, 0x212220, 0x2d2e2b, 0x3b3c38, 0x4c4d48, // 7-11 turf and dirt
      0x363b3c, 0x474d4e, 0x5a6061, 0x6e7474, 0x858a8a, // 12-16 the sea
      0x9da1a0, 0xb6b9b8, 0xd6d8d6, // 17-19 foam
      0x4c4e4d, 0x6c6e6c, 0x8f918e, 0xb2b4b0, 0xd3d4d0, 0xededea, // 20-25 the tower's whitewash
      0x232423, 0x353634, 0x4a4b48, 0x62635e, 0x7d7e77, // 26-30 weathered shingle and plank
      0x0b0c0c, 0x171818, 0x242525, 0x363837, // 31-34 iron, tar, the dark behind glass
      0xd8d9d2, 0xfafaf8, 0xffffff, // 35-37 the light (whiter than anything else here: night spares only what is this white)
      0x3a3a38, 0x595955, 0x7a7a74, 0x9a9a92, // 38-41 skin (dark, the way old film saw it)
      0x0f1010, 0x1b1c1c, 0x2b2c2b, 0x3c3d3c, // 42-45 dark wool
      0x444543, 0x5a5b58, 0x747571, // 46-48 lighter cloth
      0x8e908d, 0xc4c6c2, 0xf0f0ec, // 49-51 gull, beard
      0x9c9e9b, 0xb9bbb8, 0xd2d4d1, // 52-54 mist
      0x55564f, 0x73746b, 0x94958a // 55-57 dead grass
    ]);
    const S = K.sculpt(makeSculpt(B)),
      tags = K.deform.tags(S),
      n3 = B.n3,
      TAU = Math.PI * 2,
      hash = (a, b) => {
        const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
        return v - Math.floor(v);
      },
      sm = s => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * (3 - 2 * s)),
      lerp = (a, b, s) => a + (b - a) * s,
      // The station's buildings (tower, passage, cottage, engine house) were first drawn small beside the men: a passage a man
      // could hardly have gone down. The boathouse was made to a man's measure, and beside it they looked like models of
      // themselves. So they are all this much bigger than they were drawn, and the rock is bigger under them
      BIG = 1.3;
    // an overcast noon: light from everywhere, a little more from one side
    S.sun = B.norm([-0.5, 0.8, 0.35]);
    S.res = 0.2;
    S.amb = 0.34;
    S.sky = 0.42;
    S.sunK = 0.5;

    // a solid given only by a distance function inside a box (lo..hi, about c): points are taken from a grid and kept near the surface
    const sdfSolid = (c, lo, hi, sd, mat, o) =>
      S.solid(
        c,
        Math.hypot(Math.max(-lo[0], hi[0]), Math.max(-lo[1], hi[1]), Math.max(-lo[2], hi[2])),
        sd,
        (res, f) => {
          const hh = res * 0.5,
            n = [0, 1, 2].map(k => Math.max(1, Math.ceil((hi[k] - lo[k]) / res)));
          for (let i = 0; i <= n[0]; i++)
            for (let j = 0; j <= n[1]; j++)
              for (let l = 0; l <= n[2]; l++) {
                const x = lo[0] + ((hi[0] - lo[0]) * i) / n[0],
                  y = lo[1] + ((hi[1] - lo[1]) * j) / n[1],
                  z = lo[2] + ((hi[2] - lo[2]) * l) / n[2],
                  jx = x + (hash(x * 3.1, y + z) - 0.5) * res * 0.6,
                  jy = y + (hash(y * 2.3, z + x) - 0.5) * res * 0.6,
                  jz = z + (hash(z * 1.7, x + y) - 0.5) * res * 0.6;
                if (Math.abs(sd(jx, jy, jz)) < hh) f(jx, jy, jz);
              }
        },
        mat,
        Object.assign({ reach: 0.2 }, o)
      );

    // ---------------------------------------------------------------- the rock itself
    const IX = 26, // half its length, east to west
      IZ = 16, // half its breadth
      // the tower stands at the middle of it, and the passage from the tower to the cottage is long: so the half of the rock
      // east of the tower is drawn out by the length of the passage. And the landing is a walk from the station, not under its
      // windows: so the half south of the tower is drawn out too, and that is where the open ground between them is.
      // east(x), south(z): where a place of the plain oval lies on the rock as it is
      MORE = 9,
      EAST = (IX + MORE) / IX,
      SOUTH = 21 / IZ,
      east = x => (x > 0 ? x * EAST : x),
      south = z => (z > 0 ? z * SOUTH : z),
      MID = [MORE / 2, 0, (IZ * SOUTH - IZ) / 2], // the middle of it (the tower is not there)
      // where a place of the rock as it was first laid out (23 long each way, 5.2 more to the east, 15 broad) lies on this one
      moved = (x, z) => [(x > 0 ? (IX + MORE) / 28.2 : IX / 23) * x, (z > 0 ? (IZ * SOUTH) / 15 : IZ / 15) * z],
      // how far inside the shore a place is: 0 at the waterline, about 1 in the middle, below 0 at sea
      inside = (x, z) => {
        if (x > 0) x /= EAST;
        if (z > 0) z /= SOUTH;
        const a = Math.atan2(z / IZ, x / IX),
          ca = Math.cos(a),
          sa = Math.sin(a),
          wob = 0.34 * (n3(ca * 1.7 + 3, sa * 1.7 + 3, 1.3) - 0.5) + 0.16 * (n3(ca * 5 + 9, sa * 5 + 9, 4.1) - 0.5);
        return 1 - Math.hypot(x / IX, z / IZ) / (1 + wob);
      },
      bare = (x, z) => {
        const d = inside(x, z);
        if (d <= 0) return Math.max(-1.2, d * 5);
        const shore = sm(d / 0.2),
          // the tower stands on the highest of it. West, north and south the ground falls away from it quickly; east it goes
          // down slowly, a long back with the passage along it and the cottage at its end (the film's passage falls by less
          // than half the height of its own wall from one end to the other)
          // (south of it the fall is slower than to the north: a long open slope down toward the landing)
          knoll = Math.exp(-(x * x) / (x > 0 ? 780 : 110) - (z * z) / (z > 0 ? 190 : 95)),
          ridge = Math.exp(-((x + 14.7) * (x + 14.7)) / 64 - ((z + 4.3) * (z + 4.3)) / 30);
        return shore * (0.5 + 1.9 * knoll + 1.0 * ridge + 0.5 * (n3(x * 0.22, 0, z * 0.22) - 0.5) + 0.14 * (n3(x * 0.9, 1, z * 0.9) - 0.5)) + 0.06 * sm(d / 0.04);
      },
      // level ground under what is built: [x, z, half-width, half-depth]
      PADS = [],
      pad = (x, z, hw, hd) => {
        const p = { x, z, hw, hd, y: bare(x, z) };
        PADS.push(p);
        return p.y;
      },
      height = (x, z) => {
        const b = bare(x, z);
        let w = 0,
          y = 0;
        for (const p of PADS) {
          const dx = Math.max(0, Math.abs(x - p.x) - p.hw),
            dz = Math.max(0, Math.abs(z - p.z) - p.hd),
            k = 1 - sm(Math.hypot(dx, dz) / 1.6);
          if (k > w) {
            w = k;
            y = p.y + (p.sx ? p.sx * Math.max(-p.hw, Math.min(p.hw, x - p.x)) : 0); // (sx: a pad that goes down a hill, by so much a step)
          }
        }
        return b + (y - b) * w;
      };

    // where things stand (x east, z south: the camera looks from the south-east)
    const TOWER = [0, 0], // must be the origin: the beam turns about it
      TR = 1.7 * BIG, // how wide the tower is at the foot, from the middle
      COT = [TR + 10.2 * BIG + 2.9 * BIG, 0, 2.9 * BIG, 1.9 * BIG], // the cottage: middle, half-length, half-depth
      CDOOR = 0.3 * BIG, // where its door is along the south wall, from the middle
      // the long low passage from the tower to the cottage's west gable: tower, passage and cottage all on one line, so the
      // passage runs square into the middle of the tower's wall and both its walls die into the curve. As in the film it is
      // three times as long as the tower is wide at the foot, and not far off twice the length of the cottage
      PASS = [(TR - 0.5 + COT[0] - COT[2]) / 2, 0, (COT[0] - COT[2] - TR + 0.5) / 2, 0.62 * BIG], // (it begins inside the tower's wall)
      ENG = [-9.8, 4.0, 1.7 * BIG, 1.7 * BIG], // the fog signal's engine house: square, under a roof that comes to a point
      // the cistern: out in the open off the cottage's south-west corner (the corner nearest the tower on the side the door is
      // on): a stride south of the house's front and reaching back west of its gable, so there is room to walk between them
      WELL = [COT[0] - COT[2] - 0.9, COT[1] + COT[3] + 2.0],
      SPAWN = [PASS[0], 5.6],
      // the shed: the one small building off by itself, behind the station: down on the north shore among the rocks, across
      // the rock from the landing, its door in the west end. It is where the young man goes to be alone
      SHED = [13.4, -11.4, 1.25, 1.0], // its middle, half its length (east to west, as its ridge runs), half its width
      // the boathouse, on the south shore: [its middle, half its width, half its length]. It stands so far back from the water
      LANDX = -4.6,
      BOAT = (() => {
        let z = 8;
        while (z < 40 && inside(LANDX, z) > 0) z += 0.05;
        return [LANDX, z - 6.3, 1.4, 1.9];
      })();
    // the east point, at the water's edge: where she lies
    const MER = (() => {
        const ca = Math.cos(-0.22),
          sa = Math.sin(-0.22);
        let r = 1.3;
        while (r > 0.3 && inside(east(ca * IX * r), sa * IZ * r) < 0.035) r -= 0.004;
        return [east(ca * IX * r), sa * IZ * r];
      })(),
      WAKE = [COT[0] + CDOOR + 1.2, COT[1] + COT[3] + 0.7];
    const TPAD = TR + 0.9, // the level ground the tower stands on, from its middle
      Y0 = pad(TOWER[0], TOWER[1], TPAD, TPAD),
      YC = pad(COT[0], COT[1], COT[2] + 0.6, COT[3] + 0.6),
      YE = pad(ENG[0], ENG[1], ENG[2] + 0.5, ENG[3] + 0.5),
      YW = height(WELL[0], WELL[1]), // (the ground where the cistern stands)
      YS = pad(SHED[0], SHED[1], SHED[2] + 0.4, SHED[3] + 0.4);
    // the passage runs down from the tower's ground to the cottage's, and the ground under it is cut to go down with it: one
    // even slope from the edge of the tower's level ground (PX0) to the edge of the cottage's (PX1). PFALL is how much it
    // falls for each step east, PY how high its floor is at the middle of its length
    const PX0 = TOWER[0] + TPAD,
      PX1 = COT[0] - COT[2] - 0.6,
      PFALL = (YC - Y0) / (PX1 - PX0),
      PY = Y0 + PFALL * (PASS[0] - PX0);
    PADS.push({ x: (PX0 + PX1) / 2, z: PASS[1], hw: (PX1 - PX0) / 2, hd: PASS[3] + 0.1, y: (Y0 + YC) / 2, sx: PFALL });

    const GROUND = {
        r: [8, 9, 10, 10, 11],
        mod: (x, y, z) => 0.3 * (n3(x * 0.4, 3, z * 0.4) - 0.5) + 0.12 * (n3(x * 2.3, 7, z * 2.3) - 0.5),
        tex: (x, y, z, ny) => {
          if (y < 0.24) return n3(x * 3, 1, z * 3) > 0.5 ? 1 : 2; // the waterline: wet and black
          if (y < 0.5 || ny < 0.9) return [2, 3, 3, 4][(n3(x * 2.1, 2, z * 2.1) * 4) | 0]; // bare rock low down and on the steep
          if (n3(x * 0.6, 5, z * 0.6) > 0.62 && n3(x * 5, 2, z * 5) > 0.45) return n3(x * 9, 4, z * 9) > 0.6 ? 55 : 11; // dead grass
          return undefined;
        }
      },
      SEA = {
        // one flat grey, so the big dabs run together; long streaks of swell laid over it, foam where it meets the rock
        r: [14],
        tex: (x, y, z) => {
          const d = inside(x, z);
          if (d > -0.03 && n3(x * 1.3, 6, z * 1.3) > 0.34) return d > -0.012 ? 19 : 18;
          const b = n3(x * 0.09 + z * 0.03, 2, z * 0.34);
          return b > 0.72 ? 16 : b > 0.6 ? 15 : b < 0.3 ? 13 : undefined;
        }
      },
      ROCK = { r: [1, 1, 2, 3, 4, 5], mod: (x, y, z) => 0.3 * (n3(x * 1.4, y * 1.4, z * 1.4) - 0.5) },
      // the tower's wall: whitewash over rough brick, greyer than the painted boards. Rain has streaked it, the courses of
      // brick show through, the wash is gone in patches, and it is dirty at the foot. No door in it: the way in is by the passage
      WHITE = {
        r: [21, 22, 23, 23, 23, 24],
        mod: (x, y, z) =>
          0.22 * (n3(x * 2.5, y * 0.5, z * 2.5) - 0.5) +
          0.12 * (hash(Math.floor(y * 5), 11) - 0.5) +
          0.14 * (n3(x * 6, y * 6, z * 6) - 0.5) -
          0.2 * sm((n3(x * 0.9, y * 0.7, z * 0.9) - 0.56) / 0.14) -
          0.25 * sm((Y0 + 1.6 - y) / 1.6),
        tex: (x, y, z) => {
          const v = y - Y0;
          for (const [wy, side] of [[2.9, 0], [4.7, 1], [6.3, 0]]) {
            const u = side ? z : x,
              f = side ? x : z;
            if (f > 0.3 && Math.abs(u) < 0.17 * BIG && Math.abs(v - wy * BIG) < 0.3 * BIG) return 31; // a window
          }
          return undefined;
        }
      },
      WOOD = {
        r: [26, 27, 28, 29, 30],
        mod: (x, y, z) => 0.45 * (hash(Math.floor(y * 3.3), 1) - 0.5) + 0.25 * (n3(x * 3, y * 3, z * 3) - 0.5) // courses of shingle
      },
      PLANK = { r: [26, 27, 28, 29, 30], mod: (x, y, z) => 0.5 * (hash(Math.floor(x * 3), Math.floor(z * 3)) - 0.5) },
      // roofs: grey weathered shingle in courses, some of them darker where they have been patched
      ROOF = { r: [26, 27, 28, 29, 30], mod: (x, y, z) => 0.3 * (hash(Math.floor(y * 5.5), 7) - 0.5) + 0.3 * (n3(x * 1.7, y * 1.7, z * 1.7) - 0.5) },
      SLATE = { r: [26, 26, 27, 27, 28], mod: (x, y, z) => ROOF.mod(x, y, z) }, // the darker roofs: the cottage's, the passage's
      // walls: white-painted boards, the paint gone grey and coming off in places (in the film nothing built is as light as the sky)
      CLAP = { r: [20, 21, 22, 22, 23, 23], mod: (x, y, z) => 0.16 * (hash(Math.floor(y * 4.6), 3) - 0.5) + 0.5 * (n3(x * 1.3, y * 2.2, z * 1.3) - 0.5) },
      // the passage: whitewash over rough stone, dirtier than the boards
      WASH = { r: [20, 21, 21, 22, 22, 23], mod: (x, y, z) => 0.5 * (n3(x * 2.1, y * 2.1, z * 2.1) - 0.5) + 0.2 * (hash(Math.floor(x * 2.4 + y), Math.floor(y * 3.2) + Math.floor(z * 2.4)) - 0.5) },
      BRICK = { r: [4, 5, 28, 6, 29], mod: (x, y, z) => 0.6 * (hash(Math.floor(x * 3 + z * 3 + Math.floor(y * 6) * 0.5), Math.floor(y * 6)) - 0.5) },
      IRON = { r: [31, 32, 33, 34] },
      STONE = { r: [3, 4, 5, 6, 20], mod: (x, y, z) => 0.5 * (hash(Math.floor(x * 2.2 + y), Math.floor(y * 3) + Math.floor(z * 2.2)) - 0.5) },
      GLOW = { r: [36], em: true };

    S.ground(GROUND, { h: height, cx: MID[0], cz: MID[2], rad: 36, zs: 36 / 22, edge: 0, keep: (x, z) => height(x, z) > -0.12, res: 0.44 });
    S.ground(SEA, { h: () => -0.06, cx: MID[0], cz: MID[2], rad: 52, zs: 52 / 38, edge: 0.08, keep: (x, z) => height(x, z) < 0.1, res: 0.8 });

    // what stops you: circles [x, z, r], boxes [x0, x1, z0, z1] square to the island, and the blocks the rocks are made of, each
    // as it lies ({ c, h, ax }: its middle, its half-sizes, its own three directions), so that what stops him is the rock he sees
    const ROUND = [],
      BOXES = [],
      BLOCKS = [],
      block = (c, h, ax) => (BLOCKS.push({ c, h, ax, far: Math.hypot(h[0], h[1], h[2]) }), { res: 0.34, rd: 0.06, ax }),
      // is a place inside one of the rocks' blocks, or within pad of one
      rocky = (x, y, z, pad) => BLOCKS.some(k => [0, 1, 2].every(j => Math.abs(k.ax[j][0] * (x - k.c[0]) + k.ax[j][1] * (y - k.c[1]) + k.ax[j][2] * (z - k.c[2])) < k.h[j] + pad));

    // a rock: two blocks through one another, each turned its own way, so it has flat faces and hard edges
    const crag = (c, r, k) => {
      const h1 = [r[0] * 0.8, r[1] * 0.85, r[2] * 0.8],
        c2 = [c[0] + (hash(k, 24) - 0.5) * r[0], c[1] - r[1] * 0.2, c[2] + (hash(k, 25) - 0.5) * r[2]],
        h2 = [r[0] * 0.6, r[1] * 0.6, r[2] * 0.7];
      S.box(c, h1, ROCK, block(c, h1, B.frame(hash(k, 21) * TAU, (hash(k, 22) - 0.5) * 0.7, (hash(k, 23) - 0.5) * 0.7)));
      if (r[0] > 0.7) S.box(c2, h2, ROCK, block(c2, h2, B.frame(hash(k, 26) * TAU, (hash(k, 27) - 0.5) * 0.9, (hash(k, 28) - 0.5) * 0.9)));
    };
    // rocks: a ring of them where the sea breaks, some inland, a few standing off in the water
    for (let k = 0; k < 76; k++) {
      const a = (k / 76) * TAU + 0.07 * hash(k, 1),
        ca = Math.cos(a),
        sa = Math.sin(a);
      let r = 0.6;
      for (let i = 0; i < 40 && inside(east(ca * IX * r), south(sa * IZ * r)) > 0.02 + 0.07 * hash(k, 2); i++) r += 0.02;
      const x = east(ca * IX * r),
        z = south(sa * IZ * r),
        q = 0.45 + 0.85 * hash(k, 3) * hash(k, 4);
      if (Math.abs(x - BOAT[0]) < 2.9 && z > BOAT[1]) continue; // the landing is kept clear
      if (Math.abs(x - SHED[0]) < SHED[2] + 1.6 && Math.abs(z - SHED[1]) < SHED[3] + 1.6) continue; // and the shed's walls
      if (Math.hypot(x - MER[0], z - MER[1]) < 3.4) continue; // and the way down to her
      crag([x, height(x, z) + q * 0.2, z], [q * (1 + 0.5 * hash(k, 5)), q * (0.6 + 0.6 * hash(k, 6)), q * (1 + 0.5 * hash(k, 7))], k);
    }
    // (given as they lay on the rock when it was smaller, and carried out with it; the last four are on the new ground to the south)
    [[-14, -5.5, 1.5], [-11.5, -8, 1.1], [-16.5, 1.5, 1.0], [20.7, 4.5, 1.2], [22.2, -1, 0.9], [-2.5, -7.5, 1.3], [4.5, -8.5, 1.0], [-13, 8, 0.9], [16.2, 10.2, 0.8], [-3.6, 5.6, 0.6], [24.2, 2.4, 0.7], [10.5, -6.4, 1.0], [9.2, 9.4, 0.7], [3.2, 8.3, 1.0], [-9.4, 10.6, 0.8], [1.6, 11.6, 0.6], [11.8, 8.9, 0.8]].forEach(
      ([ox, oz, q], k) => {
        const [x, z] = moved(ox, oz);
        crag([x, height(x, z) + q * 0.2, z], [q * 1.25, q * (0.55 + 0.4 * hash(k, 11)), q], k + 100);
      }
    );
    [[-27, 6, 1.5, 2.6], [-25.5, 9.5, 0.9, 1.4], [31.7, -9, 1.3, 2.2], [9, 18.5, 1.0, 1.5], [-8, -18, 1.4, 2.4], [33.2, 7, 0.8, 1.2]].forEach(([ox, oz, q, hgt], k) => {
      const [x, z] = moved(ox, oz);
      crag([x, hgt * 0.3, z], [q, hgt, q * 0.9], k + 200);
    });

    // the rocks the shed stands among: two big ones between it and the sea, one at its east end
    [[-0.9, -2.7, 1.4, 1.3, 1.1], [2.2, -2.2, 1.2, 1.1, 1.2], [3.0, 0.5, 0.9, 0.8, 0.9]].forEach(([dx, dz, rx, ry, rz], k) => {
      const x = SHED[0] + dx,
        z = SHED[1] + dz;
      crag([x, Math.max(0, height(x, z)) + ry * 0.35, z], [rx, ry, rz], k + 300);
    });

    // ---------------------------------------------------------------- the tower
    // stout, and hardly narrower at the top than at the foot; under the gallery the wall swells out to carry it; the gallery
    // has a rail of thin bars; on it a low white drum, and on that the lantern
    const TH = 8 * BIG, // the height of its gallery above the ground (TR: how wide it is at the foot, from the middle)
      TN = 1.38 * BIG, // how wide it is at its neck, under the swell
      GR = 1.82 * BIG, // the gallery, from the middle to its rail
      TS = 0.6 * BIG, // how high the swell is
      RAIL = 1.15; // and the rail (a man leans on it: it is not as much bigger as the rest)
    S.lathe([0, Y0 - 0.3, 0], TH - TS + 0.3, t => TR + (TN - TR) * t, WHITE, { res: 0.22 });
    S.lathe([0, Y0 + TH - TS, 0], TS, t => TN + (GR - 0.14 * BIG - TN) * Math.pow(t, 1.6), WHITE, { res: 0.18 });
    S.lathe([0, Y0 + TH, 0], 0.12 * BIG, [GR + 0.05, GR + 0.05], IRON, { res: 0.16 }); // the gallery
    S.torus([0, Y0 + TH + RAIL, 0], GR, 0.026, IRON, { res: 0.08 });
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * TAU;
      S.tube([[Math.cos(a) * GR, Y0 + TH + 0.1, Math.sin(a) * GR], [Math.cos(a) * GR, Y0 + TH + RAIL, Math.sin(a) * GR]], 0.017, 0.017, IRON, { res: 0.075 });
    }
    S.lathe([0, Y0 + TH + 0.12 * BIG, 0], 0.72 * BIG, [1.1 * BIG, 1.06 * BIG], { r: WHITE.r, mod: WHITE.mod }, { res: 0.18 });
    // the lantern: lit glass between black bars, a black cap
    const LY = Y0 + TH + 0.84 * BIG;
    S.lathe([0, LY - 0.06 * BIG, 0], 0.36 * BIG, [1.16 * BIG, 0.92 * BIG], IRON, { res: 0.15 });
    S.lathe([0, LY + 0.3 * BIG, 0], 1.15 * BIG, [0.84 * BIG, 0.84 * BIG], {
      r: [36],
      em: true,
      tex: (x, y, z) => (((Math.atan2(z, x) / TAU + 1) * 8) % 1 < 0.16 ? 31 : n3(x * 6, y * 6, z * 6) > 0.6 ? 37 : 36)
    }, { res: 0.14, ghost: true });
    S.lathe([0, LY + 1.45 * BIG, 0], 0.75 * BIG, t => (1.0 * (1 - t * t) + 0.06) * BIG, IRON, { res: 0.15 });
    S.ball([0, LY + 2.28 * BIG, 0], 0.13 * BIG, IRON, { res: 0.08 });
    ROUND.push([0, 0, TR + 0.1]);

    // ---------------------------------------------------------------- buildings: walls and gables in one solid, a roof over them
    // marks: [side, u, y, half-width, half-height, colour]; side 'S' (the long south wall), 'N', 'E', 'W' (the gable ends), u along that wall
    // hole(x, y, z): a distance, measured from the middle of its floor, to what is cut out of the walls; paint(x, y, z): a colour
    // for a place on them, measured the same way; under: how far the walls go down below the floor
    const house = (c, y0, wallH, rise, o) => {
      o = o || {};
      const [cx, cz, hw, hd] = c,
        turn = !!o.turn, // the ridge runs north-south instead
        la = turn ? hd : hw, // half-length along the ridge
        lc = turn ? hw : hd, // half-width across it
        ac = (x, z) => (turn ? [z, x] : [x, z]),
        slope = o.slope || 0, // how much its floor climbs for each step along it (the passage goes down a hill)
        // the roof over a place: a ridge from end to end, or (hip) coming in from all four walls
        roofY = (a, q) => wallH + rise * (o.hip ? Math.min(1 - Math.abs(q) / lc, (la - Math.abs(a)) / lc) : 1 - Math.abs(q) / lc),
        tilt = Math.abs(slope) * la,
        marks = o.marks || [],
        mat = {
          r: (o.mat || WOOD).r,
          mod: (o.mat || WOOD).mod,
          tex: (x, y, z) => {
            const lx = x - cx,
              lz = z - cz,
              ly = y - y0 - slope * (turn ? lz : lx),
              own = o.paint && o.paint(lx, ly, lz);
            if (own !== undefined && own !== false) return own;
            for (const [side, u, my, mw, mh, col] of marks) {
              const onWall = side === 'S' ? lz > hd - 0.12 : side === 'N' ? lz < -hd + 0.12 : side === 'E' ? lx > hw - 0.12 : lx < -hw + 0.12,
                along = side === 'S' || side === 'N' ? lx : lz;
              if (onWall && Math.abs(along - u) < mw && Math.abs(ly - my) < mh) return col;
            }
            return undefined;
          }
        },
        ext = turn ? [lc, la] : [la, lc];
      sdfSolid(
        [cx, y0, cz],
        [-ext[0], -0.4 - tilt, -ext[1]],
        [ext[0], wallH + rise + tilt, ext[1]],
        (x, y, z) => {
          const [a, q] = ac(x, z),
            v = y - slope * a;
          return Math.max(Math.abs(a) - la, Math.abs(q) - lc, v - roofY(a, q) + 0.03, -v - (o.under === undefined ? 0.5 : o.under), o.hole ? -o.hole(x, y, z) : -9);
        },
        mat,
        { res: o.res || 0.2 }
      );
      const ov = 0.2;
      sdfSolid(
        [cx, y0, cz],
        [-ext[0] - ov, wallH - 0.45 - tilt, -ext[1] - ov],
        [ext[0] + ov, wallH + rise + 0.2 + tilt, ext[1] + ov],
        (x, y, z) => {
          const [a, q] = ac(x, z),
            v = y - slope * a;
          return Math.max(Math.abs(a) - la - ov, Math.abs(q) - lc - ov, v - roofY(a, q) - 0.1, roofY(a, q) - 0.24 - v);
        },
        !o.hip
          ? o.roof || ROOF
          : {
              // a roof that comes to a point: the two faces away from the light are darker, and the hips between the faces are capped
              r: ROOF.r,
              mod: (x, y, z) => ROOF.mod(x, y, z) + (Math.abs(z - cz) / lc > Math.abs(x - cx) / la ? (z > cz ? 0.1 : -0.2) : x > cx ? -0.24 : 0.06),
              tex: (x, y, z) => (Math.abs(Math.abs(z - cz) / lc - Math.abs(x - cx) / la) < 0.07 ? 30 : undefined)
            },
        { res: o.res || 0.2 }
      );
      BOXES.push([cx - hw, cx + hw, cz - hd, cz + hd]);
    };
    // the keepers' cottage: white boards under a shingle roof, a door and two windows to the south, a window in the east gable,
    // two dormers in the roof and one brick chimney on the ridge
    // (the door and the windows are a man's: they did not grow as much as the walls they are in)
    // (the west gable is wider than the passage that runs into it, and has a window in what shows of it south of the passage)
    const CWEST = (PASS[3] + COT[3]) / 2;
    house(COT, YC, 2.0 * BIG, 1.25 * BIG, {
      mat: CLAP,
      roof: SLATE,
      marks: [['S', CDOOR, 0.86, 0.38, 0.86, 31], ['S', -1.7 * BIG, 1.15 * BIG, 0.4, 0.46, 31], ['S', 1.9 * BIG, 1.15 * BIG, 0.4, 0.46, 31], ['E', 0, 1.2 * BIG, 0.4, 0.46, 31], ['E', 0, 2.55 * BIG, 0.24, 0.26, 31], ['W', CWEST, 1.15 * BIG, 0.36, 0.46, 31]]
    });
    for (const dx of [-1.5 * BIG, 1.6 * BIG]) {
      const c = [COT[0] + dx, YC + 2.7 * BIG, COT[1] + 1.18 * BIG];
      S.box(c, [0.34 * BIG, 0.3 * BIG, 0.42 * BIG], { r: CLAP.r, tex: (x, y, z) => (z > c[2] + 0.3 * BIG && Math.abs(x - c[0]) < 0.19 * BIG && Math.abs(y - c[1]) < 0.19 * BIG ? 31 : undefined) }, { res: 0.12 });
      S.box([c[0], c[1] + 0.35 * BIG, c[2] + 0.02], [0.44 * BIG, 0.05 * BIG, 0.5 * BIG], SLATE, { res: 0.13 });
    }
    const STACK = [COT[0] + 0.4 * BIG, YC + 3.95 * BIG, COT[1]]; // the top of the cottage's chimney
    S.box([STACK[0], YC + 3.4 * BIG, STACK[2]], [0.27 * BIG, 0.55 * BIG, 0.27 * BIG], BRICK, { res: 0.15 });
    // the passage from the tower to the cottage's west gable: long and low, going down with the ground. In each of its long
    // walls a door near the tower's end and four small windows after it, spaced as the film has them (unevenly; and set low
    // enough in the wall to be seen under the eave from where the game looks)
    const PL = COT[0] - COT[2] - TR, // its length, from the tower's wall to the cottage's
      pu = f => TR + PL * f - PASS[0]; // a place f of the way along it from the tower, as the wall's own measure has it
    house(PASS, PY, 1.5 * BIG, 0.45 * BIG, {
      mat: WASH,
      roof: SLATE,
      res: 0.18,
      slope: PFALL,
      marks: ['S', 'N'].flatMap(side => [[side, pu(0.1), 0.8, 0.33, 0.8, 31], ...[0.19, 0.45, 0.65, 0.92].map(f => [side, pu(f), 1.06, 0.27, 0.26, 31])])
    });
    // the engine house of the fog signal: white boards, a roof that comes to a point, double doors to the east; a thin brick
    // stack behind it, the horn out through the roof on the seaward side, coal heaped outside
    house(ENG, YE, 1.95 * BIG, 1.3 * BIG, { mat: CLAP, hip: true, marks: [['E', 0, 0.95, 0.55, 0.95, 21]] });
    // (the stack is a slight thing: a foot or so square, against the back wall, its top not a man's height over the point of the roof)
    const FLUE = [ENG[0] - ENG[2] - 0.17 * BIG, YE + 4.1 * BIG, ENG[1] - 0.8 * BIG]; // the top of its stack
    S.box([FLUE[0], YE + 2.05 * BIG, FLUE[2]], [0.15 * BIG, 2.05 * BIG, 0.15 * BIG], BRICK, { res: 0.09 });
    S.box([FLUE[0], FLUE[1] - 0.05, FLUE[2]], [0.185 * BIG, 0.055, 0.185 * BIG], BRICK, { res: 0.09 }); // the course that stands out round its top
    BOXES.push([FLUE[0] - 0.15 * BIG, FLUE[0] + 0.15 * BIG, FLUE[2] - 0.15 * BIG, FLUE[2] + 0.15 * BIG]);
    // the horn: a trumpet of black iron that comes out through the roof over the seaward wall, wider all the way to its mouth,
    // two flanges on it and a rim round the mouth; it stands only a little way out from the wall, on a post at the wall's foot
    const HUP = 0.03, // how much it lifts toward the mouth
      HV = B.norm([0, HUP, 1]), // the way it points: to the south, at the sea
      HORN = [ENG[0], YE + 2.42 * BIG, ENG[1] + ENG[3] - 1.0 * BIG], // its small end, inside the roof
      HL = 1.85 * BIG, // its length: the last 0.85 in every 1.85 of it is out past the wall
      bore = t => BIG * (0.145 + 0.09 * t + 0.05 * Math.pow(Math.max(0, (t - 0.8) / 0.2), 2) + (Math.abs(t - 0.4) < 0.022 || Math.abs(t - 0.64) < 0.022 ? 0.04 : 0) + (t > 0.965 ? 0.03 : 0));
    S.lathe(
      HORN,
      HL,
      bore,
      { r: IRON.r, tex: (x, y, z) => ((x - HORN[0]) * HV[0] + (y - HORN[1]) * HV[1] + (z - HORN[2]) * HV[2] > HL - 0.03 ? 31 : undefined) }, // its mouth is black
      { res: 0.08, ax: [[1, 0, 0], HV, [0, -HV[2], HV[1]]] }
    );
    const POST = [HORN[0], ENG[1] + ENG[3] + 0.24 * BIG];
    S.tube([[POST[0], height(POST[0], POST[1]) - 0.1, POST[1]], [POST[0], HORN[1] - 0.2 * BIG, POST[1]]], 0.09, 0.08, PLANK, { res: 0.09 });
    ROUND.push([POST[0], POST[1], 0.12]);
    // a tar barrel on its side in the grass beyond it
    const TUB = [ENG[0] + 0.7, ENG[1] + ENG[3] + 1.7];
    S.lathe([TUB[0] - 0.3, height(TUB[0], TUB[1]) + 0.25, TUB[1]], 0.6, t => 0.24 + 0.04 * Math.sin(t * Math.PI), { r: [31, 32, 33, 26] }, { res: 0.1, ax: [[0, 1, 0], [1, 0, 0], [0, 0, -1]] });
    ROUND.push([TUB[0], TUB[1], 0.36]);
    S.rock([ENG[0] + 0.9, YE + 0.15, ENG[1] - ENG[3] - 1.0], [0.9, 0.45, 0.7], { r: [1, 1, 2, 3] }, { res: 0.2 });
    ROUND.push([ENG[0] + 0.9, ENG[1] - ENG[3] - 1.0, 0.8]);
    // the shed: bare boards set upright, gone dark with weather, under a steep roof; one door of the same boards, in the west
    // gable (the end toward the tower) and a little to one side of its middle, with a paler frame; a plank for a step
    {
      const [cx, cz, hl, hw] = SHED,
        SDOOR = [0.28, 0.33, 1.42], // the door: where across the gable, half its width, its height
        BOARD = {
          r: [27, 28, 29, 29, 30, 30],
          // (each board its own grey: on the gable walls they are told apart along z, on the side walls along x)
          mod: (x, y, z) => 0.6 * (hash(Math.floor((Math.abs(x - cx) / hl > Math.abs(z - cz) / hw ? z : x) * 4.2), 9) - 0.5) + 0.22 * (n3(x * 2.2, y * 0.8, z * 2.2) - 0.5)
        };
      house(SHED, YS, 1.5, 1.0, {
        mat: BOARD,
        roof: SLATE,
        res: 0.15,
        paint: (x, y, z) => {
          const du = Math.abs(z - SDOOR[0]);
          if (x > 0.12 - hl || du > SDOOR[1] + 0.09 || y > SDOOR[2] + 0.09) return undefined;
          // (this end takes the most light of the four, so the door is darker than its boards and the frame paler, to be seen)
          return du > SDOOR[1] || y > SDOOR[2] ? 23 : hash(Math.floor(z * 6), 4) > 0.5 ? 26 : 27;
        }
      });
      S.box([cx - hl - 0.2, YS + 0.02, cz + SDOOR[0]], [0.2, 0.05, 0.5], PLANK, { res: 0.12 });
      // a plank left lying on the ground before it
      S.box([cx - hl - 1.5, height(cx - hl - 1.5, cz + 1.5) + 0.04, cz + 1.5], [0.75, 0.03, 0.1], { r: [29, 30, 30] }, { res: 0.11, ax: B.frame(1.15, 0, 0) });
      // a chair left out by the corner of that gable, on the other side from the door: a round seat on four splayed legs, a
      // hooped back with three sticks in it, turned a little toward the door. (Its sticks are stouter than a chair's are:
      // drawn true they would be thinner than the picture can show)
      {
        const px = cx - hl - 0.45,
          pz = cz - hw + 0.28,
          py = height(px, pz),
          turn = Math.PI - 0.4, // which way it faces: out from the wall
          f = [Math.cos(turn), Math.sin(turn)],
          at = (u, y, v) => [px + v * f[0] - u * f[1], py + y, pz + v * f[1] + u * f[0]], // (u across it, v the way it faces)
          CHAIR = { r: [32, 33, 26, 27] }, // dark wood: it stands against the palest wall the shed has
          SEAT = 0.37,
          hoop = u => SEAT + 0.43 * Math.sqrt(Math.max(0, 1 - (u / 0.19) ** 2)), // how high its back is, across it
          lean = y => -0.17 - 0.16 * (y - SEAT); // and how far back, at a height
        S.ball(at(0, SEAT, 0), [0.21, 0.04, 0.21], CHAIR, { res: 0.06 });
        for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.tube([at(u * 0.13, SEAT, v * 0.13), at(u * 0.2, 0, v * 0.2)], 0.03, 0.026, CHAIR, { res: 0.05 });
        const arc = [];
        for (let k = 0; k <= 10; k++) {
          const u = -0.19 * Math.cos((k / 10) * Math.PI);
          arc.push(at(u, hoop(u), lean(hoop(u))));
        }
        S.tube(arc, 0.028, 0.028, CHAIR, { res: 0.05 });
        for (const u of [-0.095, 0, 0.095]) S.tube([at(u, SEAT, -0.17), at(u, hoop(u), lean(hoop(u)))], 0.02, 0.02, CHAIR, { res: 0.045 });
        ROUND.push([px, pz, 0.26]);
      }
    }
    // the cistern: a square tank of rendered stone, stained and dark at the foot, with a pale low dome over it; a wooden hatch
    // on the dome's west side, propped up at a slant; an iron pump standing at its northern edge. Rain off the cottage's roof
    // comes down a pipe at the corner of the house, and from there a pipe goes across over the gap to the top of the pump
    {
      const [wx, wz] = WELL,
        TANK = { r: [20, 20, 21, 21, 22, 22], mod: (x, y, z) => 0.45 * (n3(x * 1.7, y * 1.7, z * 1.7) - 0.5) - 0.35 * sm((YW + 0.3 - y) / 0.45) },
        PUMP = [wx - 0.3, wz - 0.62],
        PT = YW + 1.8, // the top of the pump
        DOWN = [COT[0] - COT[2] - 0.06, COT[1] + COT[3] + 0.06]; // where the pipe comes down the house: at its corner
      S.box([wx, YW + 0.2, wz], [1.0, 0.55, 1.0], TANK, { res: 0.16 });
      S.box([wx, YW + 0.76, wz], [1.07, 0.06, 1.07], { r: [21, 22, 22, 23] }, { res: 0.15 }); // the course round its top
      S.ball([wx, YW + 0.8, wz], [0.97, 0.42, 0.97], { r: [22, 23, 23, 24] }, { res: 0.13 });
      S.box([wx - 0.5, YW + 1.1, wz + 0.2], [0.34, 0.04, 0.3], { r: [26, 27, 28] }, { res: 0.1, ax: B.frame(0, 0, 0.32) }); // the hatch
      S.lathe([PUMP[0], YW + 0.95, PUMP[1]], PT - YW - 0.95, t => (t < 0.12 || t > 0.86 ? 0.14 : 0.1), IRON, { res: 0.07 });
      S.tube([[PUMP[0], PT - 0.03, PUMP[1]], [PUMP[0], PT + 0.2, PUMP[1]], [PUMP[0] + 0.12, PT + 0.3, PUMP[1] - 0.1], [DOWN[0], PT + 0.3, DOWN[1]]], 0.05, 0.05, IRON, { res: 0.07 });
      S.tube([[DOWN[0], YC, DOWN[1]], [DOWN[0], YC + 2.0 * BIG - 0.1, DOWN[1]]], 0.05, 0.05, IRON, { res: 0.07 });
      BOXES.push([wx - 1.07, wx + 1.07, wz - 1.07, wz + 1.07]);
    }

    // a boat, as a dory is built: a flat bottom, straight sides that flare from the bottom boards up to the gunwale, a sharp bow
    // (toward +z of her own measure), a narrow flat stern, the gunwale lifting a little to both ends. She is open: a well inside
    // her planking, and two thwarts across it. c: the middle of her, at the gunwale; h: [half her beam, her depth, half her length];
    // o.inside: the colours inside her [bottom, sides]; o.ax: how she lies
    const boat = (c, h, mat, o) => {
      const [BW, BH, BL] = h,
        ax = o.ax || [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        own = (x, y, z) => ax.map(a => a[0] * (x - c[0]) + a[1] * (y - c[1]) + a[2] * (z - c[2])), // a place in the world, in her measure
        out = (x, y, z) => [0, 1, 2].map(j => c[j] + ax[0][j] * x + ax[1][j] * y + ax[2][j] * z), // and the other way
        SKIN = 0.075, // how thick her planking is drawn
        beam = t => BW * (t > 0.15 ? 1 - Math.pow((t - 0.15) / 0.85, 1.25) : t < -0.4 ? 1 - 0.4 * ((-t - 0.4) / 0.6) : 1),
        sheer = t => 0.14 * BH * t * t * (t > 0 ? 1.6 : 1),
        keel = t => -BH + 0.1 * BH * t * t,
        half = (t, y) => beam(t) * (0.6 + 0.4 * Math.max(0, Math.min(1, (y - keel(t)) / BH))),
        floor = t => keel(t) + 0.42 * BH,
        well = (x, y, z) => Math.max(Math.abs(x) - half(z / BL, y) + SKIN, floor(z / BL) - y, Math.abs(z) - BL + SKIN * 1.6, z - BL * 0.86),
        sd = (x, y, z) => {
          const t = z / BL;
          return Math.max(Math.abs(x) - half(t, y), y - sheer(t), keel(t) - y, Math.abs(z) - BL, -well(x, y, z));
        },
        [low, side] = o.inside || [27, 28];
      sdfSolid(c, [-BW, -BH, -BL], [BW, 0.25 * BH, BL], sd, {
        r: mat.r,
        mod: mat.mod,
        tex: (px, py, pz) => {
          const [x, y, z] = own(px, py, pz);
          return well(x, y, z) < 0.045 ? (y < floor(z / BL) + 0.05 ? low : side) : undefined;
        }
      }, { res: o.res || 0.085, ax: o.ax });
      for (const t of [0.3, -0.38]) S.box(out(0, -0.12 * BH, t * BL), [half(t, -0.12 * BH) - 0.03, 0.022, 0.075], { r: [28, 29, 30] }, { res: 0.075, ax: o.ax });
    };

    // the landing on the south shore. The boathouse stands over it, its gable to the sea: grey shingle walls, a dark roof, a wide
    // doorway with no door in it and a boat in the dark inside. Its back sits on the slope and its front is up on short posts,
    // and from the sill of the doorway a slip of timber goes down to the water
    const BDOOR = [0, 0.72, 1.58, 1.7], // the doorway: where across the gable, half its width, its height, how far in the dark goes
      YB = height(BOAT[0], BOAT[1] - BOAT[3]) + 0.04, // its floor
      SLIP = BOAT[0] + BDOOR[0], // the line the slip takes
      SLIP0 = BOAT[1] + BOAT[3] + 0.3, // where it leaves the sill
      SHINGLE = { r: [27, 28, 29, 30, 30, 22], mod: (x, y, z) => 0.5 * (hash(Math.floor(y * 4.2), 5) - 0.5) + 0.3 * (n3(x * 2.6, y * 2.6, z * 2.6) - 0.5) };
    house(BOAT, YB, 1.85, 1.3, {
      turn: true,
      mat: SHINGLE,
      roof: SLATE,
      res: 0.15,
      under: 0.07,
      hole: (x, y, z) => Math.max(Math.abs(x - BDOOR[0]) - BDOOR[1], BOAT[3] - BDOOR[3] - z, y - BDOOR[2], 0.03 - y),
      paint: (x, y, z) =>
        Math.abs(x - BDOOR[0]) < BDOOR[1] + 0.05 && z > BOAT[3] - BDOOR[3] - 0.08 && z < BOAT[3] - 0.07 && y < BDOOR[2] + 0.05 ? (y < 0.1 ? 33 : 31) : y < 0.05 ? 27 : undefined
    });
    // the boat kept in it: her bow shows in the doorway
    boat([SLIP, YB + 0.47, BOAT[1] + BOAT[3] - 1.25], [0.5, 0.42, 1.2], { r: [21, 22, 22, 23] }, { inside: [27, 28] });
    // the posts it stands on, wherever the ground has fallen away under it
    for (const dx of [-1, 1])
      for (const dz of [1, 0.2, -0.6]) {
        const x = BOAT[0] + dx * (BOAT[2] - 0.1),
          z = BOAT[1] + dz * (BOAT[3] - 0.1),
          y = height(x, z);
        if (YB - y > 0.12) S.box([x, (y - 0.1 + YB - 0.06) / 2, z], [0.075, (YB - 0.06 - y + 0.1) / 2, 0.075], PLANK, { res: 0.075 });
      }
    S.box([SLIP, YB - 0.04, BOAT[1] + BOAT[3] + 0.15], [BDOOR[1] + 0.14, 0.05, 0.17], PLANK, { res: 0.12 }); // the sill
    // the slip: two long timbers and planks across them. It leaves the sill in the air and comes to the ground a step or two down
    let slipEnd = SLIP0;
    while (slipEnd < 40 && height(SLIP, slipEnd) > 0.02) slipEnd += 0.1;
    const SLIPS = 1.5, // how far it goes before it is on the ground
      slipY = z => Math.max(0.02, height(SLIP, z), lerp(YB - 0.1, height(SLIP, SLIP0 + SLIPS), (z - SLIP0) / SLIPS));
    slipEnd += 0.9;
    for (let z = SLIP0; z < slipEnd; z += 0.42) S.box([SLIP, slipY(z) + 0.07, z], [0.8, 0.05, 0.17], PLANK, { res: 0.17 });
    for (const dx of [-0.62, 0.62]) S.tube([[SLIP + dx, slipY(SLIP0 - 0.2) - 0.05, SLIP0 - 0.2], [SLIP + dx, slipY(SLIP0 + SLIPS) - 0.05, SLIP0 + SLIPS]], 0.06, 0.06, { r: [26, 27, 28] }, { res: 0.09 });
    let slipDown = SLIP0; // where a man can step on to it
    while (slipDown < slipEnd && slipY(slipDown) - height(SLIP, slipDown) > 0.09) slipDown += 0.1;
    for (const dx of [-0.6, 0.6]) {
      const y = height(SLIP + dx, SLIP0 + 0.1);
      S.box([SLIP + dx, (y - 0.1 + slipY(SLIP0 + 0.1)) / 2, SLIP0 + 0.1], [0.07, (slipY(SLIP0 + 0.1) - y + 0.1) / 2, 0.07], PLANK, { res: 0.075 });
    }
    BOXES.push([SLIP - 0.78, SLIP + 0.78, BOAT[1] + BOAT[3], slipDown]);
    // the dory hauled up beside it
    const DORY = [SLIP + 2.3, slipEnd - 2.5];
    boat([DORY[0], height(DORY[0], DORY[1]) + 0.4, DORY[1]], [0.52, 0.42, 1.3], { r: [31, 32, 33, 26, 27] }, { inside: [26, 27], ax: B.frame(0.5, 0, 0.12) });
    ROUND.push([DORY[0] - 0.3, DORY[1] - 0.5, 0.65], [DORY[0] + 0.3, DORY[1] + 0.5, 0.65]);
    // what the tender left on the stones the other side of the slip: a case with a keg on it, two barrels, a sack of meal, a box
    const GOODS = [SLIP - 2.2, slipEnd - 3.3],
      gy = (dx, dz) => height(GOODS[0] + dx, GOODS[1] + dz),
      CASE = { r: [27, 28, 29, 30], mod: (x, y, z) => 0.5 * (hash(Math.floor(y * 9), Math.floor(x * 2 + z * 2)) - 0.5) },
      cask = (dx, dz, r, h, up) =>
        S.lathe([GOODS[0] + dx, gy(dx, dz) + (up || 0) - 0.03, GOODS[1] + dz], h, t => r * (0.84 + 0.2 * Math.sin(t * Math.PI)), {
          r: [26, 27, 28, 29],
          tex: (x, y, z) => { const v = (y - gy(dx, dz) - (up || 0) + 0.03) / h; return Math.abs(v - 0.22) < 0.06 || Math.abs(v - 0.78) < 0.06 ? 32 : undefined; }
        }, { res: 0.085 });
    S.box([GOODS[0], gy(0, 0) + 0.2, GOODS[1]], [0.33, 0.23, 0.26], CASE, { res: 0.11, ax: B.frame(0.3, 0, 0) });
    cask(-0.05, 0, 0.15, 0.3, 0.43);
    cask(0.62, -0.12, 0.2, 0.52);
    cask(-0.12, 0.62, 0.16, 0.36);
    S.ball([GOODS[0] + 0.6, gy(0.6, 0.5) + 0.2, GOODS[1] + 0.5], [0.2, 0.25, 0.13], { r: [29, 30, 22, 22] }, { res: 0.1, ax: B.frame(-0.4, 0.25, 0) });
    S.box([GOODS[0] + 1.05, gy(1.05, 0.75) + 0.1, GOODS[1] + 0.75], [0.26, 0.11, 0.18], CASE, { res: 0.1, ax: B.frame(-0.2, 0, 0) });
    ROUND.push([GOODS[0] + 0.15, GOODS[1] + 0.05, 0.62], [GOODS[0] + 0.7, GOODS[1] + 0.55, 0.5]);

    // ---------------------------------------------------------------- people
    // a figure standing at (x, z), facing south. tag(part) names the solids for a rig, or gives nothing for one that only stands
    const figure = (x, z, o) => {
      const y = height(x, z),
        g = part => ({ res: 0.06, tag: o.tag ? o.tag + (o.one ? '' : part) : undefined }), // one: the whole of him under one name
        gh = { res: 0.06, tag: o.tag ? o.tag + (o.head ? 'head' : '') : undefined }, // head: but his head under its own, so it can turn by itself
        at = (dx, dy, dz) => [x + dx, y + dy, z + dz],
        COAT = { r: o.coat },
        LEGS = { r: [42, 43, 44, 45] },
        SKIN = { r: [38, 39, 40, 41] };
      for (const sx of [-1, 1]) {
        const side = sx < 0 ? 'legL' : 'legR',
          arm = sx < 0 ? 'armL' : 'armR';
        S.tube([at(sx * 0.1, 0.56, 0), at(sx * 0.11, 0.1, 0)], 0.095, 0.08, LEGS, g(side));
        S.ball(at(sx * 0.11, 0.06, 0.04), [0.085, 0.06, 0.14], { r: [42, 42, 43] }, g(side));
        S.tube([at(sx * 0.25, 1.0, 0), at(sx * 0.29, 0.6, 0.03)], 0.075, 0.065, COAT, g(arm));
        S.ball(at(sx * 0.29, 0.54, 0.03), 0.065, SKIN, g(arm));
      }
      S.ball(at(0, 0.8, 0), [0.22, 0.32, 0.15], COAT, g(''));
      S.ball(at(0, 1.25, 0.01), [0.14, 0.155, 0.15], SKIN, gh);
      if (o.beard) S.ball(at(0, 1.14, 0.09), [0.13, 0.14, 0.1], { r: [49, 50, 51] }, gh); // the old man's beard
      else S.ball(at(0, 1.2, 0.135), [0.085, 0.025, 0.03], { r: [42, 43] }, gh); // the young man's moustache
      // a cap with a peak
      S.ball(at(0, 1.37, -0.01), [0.16, 0.075, 0.165], { r: [42, 43, 44] }, gh);
      S.ball(at(0, 1.34, 0.14), [0.11, 0.02, 0.07], { r: [42, 42, 43] }, gh);
      if (o.pipe) S.tube([at(0.03, 1.17, 0.16), at(0.08, 1.13, 0.3)], 0.018, 0.03, { r: [42, 43] }, gh);
    };
    figure(SPAWN[0], SPAWN[1], { tag: 'pl', coat: [45, 46, 47, 48, 48] });
    S.ball([SPAWN[0], height(SPAWN[0], SPAWN[1]) + 0.015, SPAWN[1]], [0.2, 0.01, 0.2], { r: [7] }, { res: 0.1, tag: 'pl', ghost: true }); // what he stands on: his own shadow
    figure(WAKE[0], WAKE[1], { tag: 'wk', one: true, head: true, coat: [42, 42, 43, 44], beard: true, pipe: true });
    const wakeAt = [WAKE[0], WAKE[1], 0.35]; // what stops you where he stands: it goes where he goes
    ROUND.push(wakeAt);

    // ---------------------------------------------------------------- her: on a slab at the east point, half in the weed, facing the land
    const MF = B.norm([0.3, 0, 1]), // the way she faces: down the shore, and three parts toward where the game looks from
      MR = [MF[2], 0, -MF[0]], // the way her tail lies: out to the water
      MT = Math.max(0.05, height(MER[0], MER[1])) + 0.3, // the top of the slab
      Q = 1.3, // she is long: a head taller than either of them, were she to stand
      mp = (a, h, b) => [MER[0] + (MF[0] * a + MR[0] * b) * Q, MT + h * Q, MER[1] + (MF[2] * a + MR[2] * b) * Q], // a the way she faces, h up, b along the tail
      MAX = [MR, [0, 1, 0], MF],
      mg = part => ({ res: 0.04, tag: 'mm' + part }),
      PALE = { r: [21, 22, 23, 24, 25, 25] }, // skin: pale, but with shadow enough in it for the form to show
      SCALE = { r: [12, 13, 14, 15, 16, 17], mod: (x, y, z) => 0.22 * (n3(x * 7, y * 7, z * 7) - 0.5) }, // wet scales: the sea's own greys, a little broken
      FIN = { r: [15, 16, 17, 18, 18] }, // the fin is thin, and the light comes through it
      TRESS = { r: [31, 32, 33, 26, 27], mod: (x, y, z) => 0.5 * (n3(x * 9, y * 1.5, z * 9) - 0.5) }; // dark hair, wet, in strands
    S.box([MER[0], MT - 0.21, MER[1]], [1.2, 0.2, 0.95], ROCK, { res: 0.26, rd: 0.07, ax: B.frame(0.4, 0.05, -0.04) });
    ROUND.push([MER[0], MER[1], 1.05]);
    for (let k = 0; k < 7; k++) {
      // weed thrown up round the slab
      const a = hash(k, 61) * TAU,
        x = MER[0] + Math.cos(a) * (1.3 + hash(k, 62)),
        z = MER[1] + Math.sin(a) * (1.3 + hash(k, 62));
      S.ball([x, Math.max(0, height(x, z)) + 0.03, z], [0.3 + 0.25 * hash(k, 63), 0.035, 0.2 + 0.2 * hash(k, 64)], { r: [1, 1, 7, 8] }, { res: 0.15 });
    }
    // She sits side-saddle on the slab, her weight on one arm, the other hand on her tail, which runs out toward the water and
    // lifts into its fin. She is made as a figure is modelled, not out of sticks: masses (the cage of the ribs, the waist, the
    // hips, the muscle of an arm) each given as a distance and run together into one skin. All of it is in her own measure:
    // a the way she faces, h up from the slab, b along her tail
    const smin = (p, q, k) => {
        const g = Math.max(k - Math.abs(p - q), 0) / k;
        return Math.min(p, q) - g * g * k * 0.25;
      },
      // an egg: middle c, half-sizes r
      egg = (a, h, b, c, r) => {
        const x = (a - c[0]) / r[0],
          y = (h - c[1]) / r[1],
          z = (b - c[2]) / r[2],
          k0 = Math.hypot(x, y, z),
          k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
        return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
      },
      // a limb: from p to q, as thick as rp at one end and rq at the other
      bone = (a, h, b, p, q, rp, rq) => {
        const ex = q[0] - p[0],
          ey = q[1] - p[1],
          ez = q[2] - p[2],
          t = Math.max(0, Math.min(1, ((a - p[0]) * ex + (h - p[1]) * ey + (b - p[2]) * ez) / (ex * ex + ey * ey + ez * ez)));
        return Math.hypot(a - p[0] - ex * t, h - p[1] - ey * t, b - p[2] - ez * t) - (rp + (rq - rp) * t);
      },
      LEAN = 0.09, // she leans on her arm: above the hips all of her is carried over toward it, more the higher
      // one piece of her: f(a, h, b) its distance, inside the box lo..hi (each [a, h, b])
      her = (lo, hi, f, mat, part, res, upright) =>
        sdfSolid(
          mp(0, 0, 0),
          [lo[2] * Q, lo[1] * Q, lo[0] * Q],
          [hi[2] * Q, hi[1] * Q, hi[0] * Q],
          (x, y, z) => Q * f(z / Q, y / Q, x / Q + (upright ? 0 : LEAN * (y / Q - 0.17))),
          mat,
          { res, tag: 'mm' + part, ax: MAX, reach: 0.1 }
        ),
      TL = [0.03, 0.085, 0.72], // where the end of her tail begins (and what it sways about)
      TAIL = mp(...TL),
      FLUKE = [-0.06, 0.46, 1.16], // where it becomes fin
      HB = -LEAN * (0.875 - 0.17), // where the lean has carried her head to
      HC = [0.035, 0.875, HB], // the middle of her head
      ARMS = [
        // the one she leans on: straight down to the rock beside her, the hand flat
        { s: [-0.005, 0.6, -0.16], e: [-0.06, 0.345, -0.235], w: [-0.035, 0.105, -0.29], hand: [0, 0.035, -0.31], lie: [0.05, 0.017, 0.034] },
        // the other: the elbow back, the hand lying on her tail
        { s: [-0.005, 0.6, 0.16], e: [-0.085, 0.355, 0.25], w: [0.125, 0.285, 0.38], hand: [0.165, 0.264, 0.405], lie: [0.044, 0.015, 0.028] }
      ];
    // her tail, from the hips: forward first, as knees would go, then round to the side and narrowing
    her(
      [-0.2, -0.03, -0.25],
      [0.34, 0.34, 0.84],
      (a, h, b) => {
        let d = egg(a, h, b, [0, 0.15, 0.01], [0.14, 0.135, 0.185]);
        d = smin(d, bone(a, h, b, [0.02, 0.15, 0.03], [0.14, 0.14, 0.2], 0.145, 0.132), 0.04);
        d = smin(d, bone(a, h, b, [0.14, 0.14, 0.2], [0.14, 0.115, 0.48], 0.132, 0.102), 0.03);
        return smin(d, bone(a, h, b, [0.14, 0.115, 0.48], TL, 0.102, 0.072), 0.03);
      },
      SCALE,
      '',
      0.03,
      true
    );
    her(
      [-0.2, 0, 0.62],
      [0.16, 0.52, 1.24],
      (a, h, b) => {
        let d = bone(a, h, b, TL, [-0.04, 0.12, 0.98], 0.072, 0.05);
        d = smin(d, bone(a, h, b, [-0.04, 0.12, 0.98], [-0.08, 0.27, 1.1], 0.05, 0.036), 0.02);
        return smin(d, bone(a, h, b, [-0.08, 0.27, 1.1], FLUKE, 0.036, 0.026), 0.02);
      },
      SCALE,
      'tail',
      0.032,
      true
    );
    // the fin: two broad thin lobes, spread like a swallow's tail and turned broadside to where the game looks from
    {
      const fn = B.norm([0.7, 0, 0.7]),
        fw = B.norm([0.7, 0, -0.7]);
      for (const sg of [-1, 1]) {
        const lobe = B.norm([fw[0] * 0.8 * sg, 0.6, fw[2] * 0.8 * sg]),
          cross = B.norm([fw[0] * 0.6 * sg, -0.8, fw[2] * 0.6 * sg]),
          c = mp(...FLUKE);
        S.ball([c[0] + lobe[0] * 0.16 * Q, c[1] + lobe[1] * 0.16 * Q, c[2] + lobe[2] * 0.16 * Q], [0.09 * Q, 0.19 * Q, 0.014 * Q], FIN, Object.assign(mg('tail'), { res: 0.034, ax: [cross, lobe, fn] }));
      }
    }
    // her body and her arms
    her(
      [-0.22, -0.02, -0.46],
      [0.27, 0.84, 0.52],
      (a, h, b) => {
        const s = Math.abs(b);
        let d = egg(a, h, b, [0, 0.25, 0], [0.105, 0.1, 0.15]); // the belly, down to where the scales begin
        d = smin(d, egg(a, h, b, [0, 0.37, 0], [0.074, 0.12, 0.098]), 0.05); // the waist
        d = smin(d, egg(a, h, b, [0.018, 0.5, 0], [0.09, 0.125, 0.116]), 0.05); // the ribs
        d = smin(d, bone(a, h, b, [-0.005, 0.608, -0.125], [-0.005, 0.608, 0.125], 0.046, 0.046), 0.04); // the shoulders
        d = smin(d, bone(a, h, s, [-0.012, 0.7, 0.02], [-0.012, 0.622, 0.115], 0.026, 0.034), 0.04); // the slope from the neck to them
        d = smin(d, bone(a, h, b, [0, 0.62, 0], [0.022, 0.79, 0], 0.037, 0.031), 0.04); // the neck
        d = smin(d, egg(a, h, s, [0.086, 0.512, 0.058], [0.046, 0.046, 0.048]), 0.022); // her breast (her hair lies over it)
        for (const m of ARMS) {
          let arm = smin(bone(a, h, b, m.s, m.e, 0.046, 0.036), bone(a, h, b, m.e, m.w, 0.036, 0.025), 0.012);
          arm = smin(arm, egg(a, h, b, m.hand, m.lie), 0.02);
          d = smin(d, arm, 0.02);
        }
        return d;
      },
      PALE,
      'top',
      0.036
    );
    // her head: the skull, the jaw under it and forward, a chin, a nose
    her(
      [-0.12, 0.72, HB - 0.13],
      [0.2, 1.02, HB + 0.13],
      (a, h, b) => {
        const x = a - HC[0],
          y = h - HC[1],
          z = b - HC[2];
        let d = egg(x, y, z, [-0.01, 0.012, 0], [0.092, 0.098, 0.08]);
        d = smin(d, egg(x, y, z, [0.03, -0.048, 0], [0.06, 0.062, 0.057]), 0.03);
        d = smin(d, egg(x, y, z, [0.068, -0.088, 0], [0.024, 0.02, 0.026]), 0.02);
        return smin(d, bone(x, y, z, [0.082, 0.004, 0], [0.093, -0.026, 0], 0.008, 0.0105), 0.012); // (a small one: at this size a nose that is all there reads as a beak)
      },
      PALE,
      'head',
      0.03,
      true
    );
    for (const sb of [-1, 1]) S.ball(mp(HC[0] + 0.07, HC[1] + 0.002, HB + sb * 0.034), 0.0135 * Q, { r: [31] }, { res: 0.025, tag: 'mmhead' });
    S.ball(mp(HC[0] + 0.086, HC[1] - 0.062, HB), [0.02 * Q, 0.008 * Q, 0.012 * Q], { r: [20] }, { res: 0.025, tag: 'mmhead', ax: MAX });
    // her hair, dark and wet. On her head: back off the brow, down behind the ears to the nape
    her(
      [-0.2, 0.68, HB - 0.14],
      [0.17, 1.03, HB + 0.14],
      (a, h, b) => {
        const x = a - HC[0],
          y = h - HC[1],
          z = b - HC[2];
        return smin(Math.max(egg(x, y, z, [-0.02, 0.022, 0], [0.105, 0.108, 0.094]), (x - 0.052 - 0.9 * (y - 0.035)) / 1.345), egg(x, y, z, [-0.06, -0.07, 0], [0.06, 0.09, 0.085]), 0.03);
      },
      TRESS,
      'head',
      0.032,
      true
    );
    // and the length of it: one fall down her back to the rock, where it lies; a tress forward over each shoulder, close across her
    // breast and ending at her ribs
    her(
      [-0.34, -0.03, -0.3],
      [0.22, 0.98, 0.26],
      (a, h, b) => {
        const s = Math.abs(b);
        let d = egg(a, h, b, [-0.1, 0.5, 0], [0.045, 0.43, 0.13]) + 0.005 * Math.sin(b * 95);
        d = smin(d, egg(a, h, b, [-0.17, 0.02, -0.03], [0.12, 0.03, 0.2]), 0.05);
        let tress = egg(a, h, s, [0.11, 0.505, 0.064], [0.034, 0.095, 0.036]);
        tress = smin(tress, bone(a, h, s, [0.098, 0.58, 0.066], [0.005, 0.672, 0.08], 0.02, 0.02), 0.025);
        tress = smin(tress, bone(a, h, s, [0.005, 0.672, 0.08], [-0.07, 0.82, 0.07], 0.02, 0.028), 0.02);
        return smin(d, tress, 0.02);
      },
      TRESS,
      'top',
      0.036
    );
    // a gull on the cistern's dome, watching
    S.ball([WELL[0] + 0.15, YW + 1.24, WELL[1] + 0.55], [0.1, 0.1, 0.2], { r: [49, 50, 51] }, { res: 0.05, ax: B.frame(0.9, -0.3, 0) });
    S.ball([WELL[0] + 0.26, YW + 1.39, WELL[1] + 0.64], 0.065, { r: [50, 51] }, { res: 0.045 });
    S.tube([[WELL[0] + 0.3, YW + 1.38, WELL[1] + 0.68], [WELL[0] + 0.38, YW + 1.35, WELL[1] + 0.74]], 0.025, 0.008, { r: [46, 47] }, { res: 0.035 });

    S.bake();

    // ---------------------------------------------------------------- air and water: these are loose splats, drawn as they are
    // the light: two beams turning about the tower (the renderer turns them: they are laid along x and carried round the origin)
    const BY = LY + 0.9 * BIG;
    for (const sg of [-1, 1])
      for (let i = 0; i < 44; i++) {
        const d = 1.3 + i * 0.62,
          k = i / 43;
        B.iso(sg * d, BY, 0, 0.3 + d * 0.07, B.P[k < 0.2 ? 37 : 36], 0.34 * Math.pow(1 - k, 1.5) + 0.02, { k: 5, ph: 0, sp: 0.42, em: true, nd: true });
      }
    B.iso(0, BY, 0, 1.5 * BIG, B.P[37], 0.3, { em: true, nd: true });
    // gulls wheeling round the tower, carried the same way
    for (let g = 0; g < 7; g++) {
      const a = B.R() * TAU,
        r = 4.5 + B.R() * 10,
        y = Y0 + 7 + B.R() * 9,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        an = { k: 5, ph: 0, sp: (0.16 + 0.2 * B.R()) * (g % 2 ? 1 : -1), em: true, nd: true };
      B.axial(x, y, z, [0, 1, 0], 0.035, 0.11, B.P[51], 3, an);
      B.axial(x - Math.cos(a) * 0.17, y + 0.04, z - Math.sin(a) * 0.17, [0, 1, 0], 0.025, 0.09, B.P[50], 3, an);
      B.axial(x + Math.cos(a) * 0.17, y + 0.04, z + Math.sin(a) * 0.17, [0, 1, 0], 0.025, 0.09, B.P[50], 3, an);
    }
    // smoke out of the two chimneys: thin, going up and thinning as it goes
    for (const [top, n] of [[STACK, 7], [FLUE, 9]])
      for (let k = 0; k < n; k++) B.iso(top[0] + B.rr(-0.06, 0.06), top[1] + 0.1, top[2] + B.rr(-0.06, 0.06), B.rr(0.11, 0.16), B.P[B.R() < 0.5 ? 17 : 52], 0.2, { k: 3, ph: k / n + B.R() * 0.05, sp: 0.55, rg: 3.2, ex: 1.5, nd: true });
    // dead brush: bare twigs standing out of the turf all over the rock, moving a little in the wind (he goes through them)
    for (let k = 0, made = 0; k < 1400 && made < 170; k++) {
      const x = east((B.R() * 2 - 1) * IX),
        z = south((B.R() * 2 - 1) * IZ),
        y = height(x, z);
      if (inside(x, z) < 0.07 || y < 0.3) continue;
      if (BOXES.some(b => x > b[0] - 0.5 && x < b[1] + 0.5 && z > b[2] - 0.5 && z < b[3] + 0.5) || ROUND.some(r => Math.hypot(x - r[0], z - r[1]) < r[2] + 0.4)) continue;
      if (Math.hypot(x - SPAWN[0], z - SPAWN[1]) < 1.2) continue;
      if (x < SHED[0] - SHED[2] && x > SHED[0] - SHED[2] - 2.4 && Math.abs(z - SHED[1]) < 1.3) continue; // nor before the shed's door
      if (rocky(x, y + 0.3, z, 0.65) || rocky(x, y + 0.9, z, 0.65)) continue; // nor out of a rock: its twigs would sway in and out of the stone
      made++;
      const ph = B.R() * TAU,
        tall = B.rr(0.7, 1.35);
      for (let j = 0, n = 5 + ((B.R() * 5) | 0); j < n; j++) {
        const dir = B.norm([B.rr(-0.55, 0.55), 1, B.rr(-0.55, 0.55)]),
          sl = B.rr(0.12, 0.26) * tall, // (a twig is seen for about twice this either side of its middle)
          bx = x + B.rr(-0.12, 0.12),
          bz = z + B.rr(-0.12, 0.12);
        B.stick(bx + dir[0] * sl * 1.8, y + dir[1] * sl * 1.8, bz + dir[2] * sl * 1.8, dir, sl, 0.028, B.P[[9, 10, 55, 55, 56][(B.R() * 5) | 0]], 1, { k: 14, ph, sp: B.rr(1.3, 2), rg: 0.07, ex: y });
      }
    }
    // foam that comes and goes along the shore, and crests out on the water
    for (let k = 0; k < 640; k++) {
      const a = B.R() * TAU,
        ca = Math.cos(a),
        sa = Math.sin(a);
      let r = 1.5;
      while (r > 0.5 && inside(east(ca * IX * r), south(sa * IZ * r)) < -0.01 - 0.05 * B.R()) r -= 0.02;
      B.axial(east(ca * IX * r), 0.02, south(sa * IZ * r), [0, 1, 0], 0.03, B.rr(0.2, 0.55), B.P[B.R() < 0.5 ? 19 : 18], 0.75, { k: 1, ph: B.R() * TAU, sp: B.rr(0.7, 1.6), nd: true });
    }
    for (let k = 0; k < 460; k++) {
      const x = MID[0] + (B.R() * 2 - 1) * 48,
        z = MID[2] + (B.R() * 2 - 1) * 35;
      if (inside(x, z) > -0.06 || Math.hypot((x - MID[0]) / 52, (z - MID[2]) / 38) > 0.9) continue;
      B.axial(x, 0.0, z, [0, 0, 1], 0.09, B.rr(0.5, 1.2), B.P[17], 0.6, { k: 1, ph: B.R() * TAU, sp: B.rr(0.4, 0.9), nd: true });
    }
    // haze lying on the water round the rock, rain over all of it
    K.mist(B, { at: MID, y: 0.3, depth: 2.4, rad: 48, zs: 45 / 32, n: 100, cols: [52, 53, 53, 54], a: 0.16, size: [1.6, 3.0], drift: 0.6, where: (x, z) => inside(x, z) < -0.1 });
    K.weather.fall(B, { kind: 'rain', box: [-IX - 3, IX + MORE + 3, -IZ - 3, IZ * SOUTH + 3], top: 17, n: 520, ground: (x, z) => Math.max(0, height(x, z)), cols: [18, 17, 53], speed: 12, size: 0.014, wind: [-3, 1.2] });

    const W = B.finish({
        cam: { target: [SPAWN[0], height(SPAWN[0], SPAWN[1]) + 1.6, SPAWN[1]], dist: 22, pitch: 0.62, yaw: Math.PI / 4 },
        detail: 12,
        dither: 0.3,
        radius: 17,
        ao: { k: 0, range: 0.8 }, // none: flat tones, and the sea's big dabs run together instead of reading as scales
        fog: { c: 53, start: 0.6, max: 0.72 }
      }),
      st = K.stage(W);

    // ---------------------------------------------------------------- the one who runs
    const PR = 0.24, // how wide he is
      RP = 0.2, // and how near a rock's face his middle may come (a rock has no wall to it: he can stand closer)
      blocked = (x, z) => {
        const y = height(x, z);
        if (y < 0.07) return true; // the sea
        for (const c of ROUND) if (Math.hypot(x - c[0], z - c[1]) < c[2] + PR) return true;
        for (const b of BOXES) if (x > b[0] - PR && x < b[1] + PR && z > b[2] - PR && z < b[3] + PR) return true;
        // a rock stops him where any of him, from the shin to the shoulder, would be inside one of its blocks
        for (const k of BLOCKS) {
          const dx = x - k.c[0],
            dz = z - k.c[2];
          if (Math.hypot(dx, dz) > k.far + RP) continue;
          for (const up of [0.22, 0.6, 1.0, 1.4]) {
            const dy = y + up - k.c[1];
            if (
              Math.abs(k.ax[0][0] * dx + k.ax[0][1] * dy + k.ax[0][2] * dz) < k.h[0] + RP &&
              Math.abs(k.ax[1][0] * dx + k.ax[1][1] * dy + k.ax[1][2] * dz) < k.h[1] + 0.05 &&
              Math.abs(k.ax[2][0] * dx + k.ax[2][1] * dy + k.ax[2][2] * dz) < k.h[2] + RP
            )
              return true;
          }
        }
        return false;
      },
      pl = { x: SPAWN[0], z: SPAWN[1], y: height(SPAWN[0], SPAWN[1]), face: 0.6, go: 0, phase: 0, speed: 0 },
      SY = pl.y,
      turnTo = (a, b, k) => {
        let d = (b - a) % TAU;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        return a + d * k;
      },
      // one step of the game: (mx, mz) the way he is asked to go across the ground (any length; 0, 0 to stand), walk to go slowly
      step = (dt, mx, mz, walk) => {
        const l = Math.hypot(mx, mz),
          want = l > 0.01 ? (walk ? 1.7 : 4.2) : 0;
        pl.speed += (want - pl.speed) * Math.min(1, dt * 10);
        if (l > 0.01) {
          const ux = mx / l,
            uz = mz / l,
            d = pl.speed * dt,
            nx = pl.x + ux * d,
            nz = pl.z + uz * d;
          if (!blocked(nx, nz)) (pl.x = nx), (pl.z = nz);
          else {
            // something is in the way. Feel round him for where it is; that says which way it faces, and he goes along it with
            // whatever of his stride is not spent against it (a wall, a rock's slanting face and the edge of the sea all alike)
            let ox = 0,
              oz = 0,
              went = false;
            for (let i = 0; i < 16; i++) {
              const cx = Math.cos((i / 16) * TAU),
                cz = Math.sin((i / 16) * TAU);
              if (blocked(pl.x + cx * 0.2, pl.z + cz * 0.2)) (ox += cx), (oz += cz);
            }
            const ol = Math.hypot(ox, oz);
            if (ol > 0.01) {
              const ex = -ox / ol, // the way out from it
                ez = -oz / ol,
                into = Math.min(0, ux * ex + uz * ez),
                tx = ux - into * ex,
                tz = uz - into * ez,
                tl = Math.hypot(tx, tz);
              // along it; and, where that is not quite clear (it is felt for, not known), along it and a little off it. Never a
              // step that takes him back the way he came: in a corner he stands
              if (tl > 0.08)
                for (const off of [0, 0.3, 0.7]) {
                  const sx = tx / tl + ex * off,
                    sz = tz / tl + ez * off,
                    sl = Math.hypot(sx, sz),
                    k = (d * tl) / sl;
                  if ((sx * ux + sz * uz) / sl < 0.15 || blocked(pl.x + sx * k, pl.z + sz * k)) continue;
                  pl.x += sx * k;
                  pl.z += sz * k;
                  went = true;
                  break;
                }
            }
            if (!went) pl.speed = 0;
          }
          pl.face = turnTo(pl.face, Math.atan2(ux, uz), Math.min(1, dt * 14));
        }
        pl.go += ((l > 0.01 ? 1 : 0) - pl.go) * Math.min(1, dt * 12);
        pl.phase += dt * (2.2 + pl.speed * 2.3);
        pl.y = height(pl.x, pl.z);
      },
      // turn him to face a place (the one he is speaking with)
      turn = (x, z, dt) => {
        pl.face = turnTo(pl.face, Math.atan2(x - pl.x, z - pl.z), Math.min(1, dt * 8));
      },
      npc = { wake: { x: WAKE[0], z: WAKE[1], face: 0.25, rest: 0.25, look: 0, here: true, at: 0, to: 0, gait: 0, phase: 0 }, mer: { x: MER[0], z: MER[1], look: -0.3, scream: 0 } },
      WY = height(WAKE[0], WAKE[1]),
      // where the old man may be found: [x, z, the way he faces]. By his door (where he begins), round the cottage, round the tower,
      // and down by the boathouse and the slip that goes to the water
      SPOTS = [
        [WAKE[0], WAKE[1], 0.25],
        [COT[0] + COT[2] + 1.0, COT[1] - 0.2, 1.4],
        [COT[0] - 0.9, COT[1] - COT[3] - 0.9, 3.0],
        [WELL[0] - 0.3, WELL[1] + 1.9, 0.2],
        [0.4 * BIG, 2.9 * BIG, 0.1],
        [-2.9 * BIG, 0.8 * BIG, -1.3],
        [2.3 * BIG, -2.3 * BIG, 2.4],
        [BOAT[0] + BOAT[2] + 0.9, BOAT[1] + 0.2, 0.5],
        [BOAT[0] - BOAT[2] - 0.9, BOAT[1] + 1.1, 0.2],
        [SLIP + 0.8, slipEnd - 2.2, -0.2]
      ],
      stand = spot => {
        const wk = npc.wake;
        wk.here = !!spot;
        wakeAt[2] = spot ? 0.35 : -9;
        if (!spot) return;
        wk.x = wakeAt[0] = spot[0];
        wk.z = wakeAt[1] = spot[1];
        wk.face = wk.rest = spot[2];
        wk.look = 0;
      },
      // The old man keeps hours: into the cottage for the night and out of it again by day (game.js says when; it is most
      // nights and most days, not all of them). He goes by his own door and at his own pace. WAY is the way he takes, from where
      // he stands to a step inside the wall; wk.at is how far along it he is, and wk.to how far he means to go
      DOOR = [COT[0] + CDOOR, COT[1] + COT[3]],
      WAY = [[WAKE[0], WAKE[1]], [DOOR[0] + 0.08, DOOR[1] + 0.5], [DOOR[0], DOOR[1] - 0.5]],
      HOPS = WAY.slice(1).map((q, i) => Math.hypot(q[0] - WAY[i][0], q[1] - WAY[i][1])),
      FAR = HOPS[0] + HOPS[1],
      home = indoors => {
        npc.wake.to = indoors ? FAR : 0;
      },
      keep = dt => {
        const wk = npc.wake,
          ease = Math.min(1, dt * 8);
        if (wk.at === wk.to) {
          wk.gait -= wk.gait * ease;
          if (!wk.at && wk.here) {
            // back where he stands: he turns to face as he did, and is in the way again once there is room for him to be
            wk.face = turnTo(wk.face, wk.rest, Math.min(1, dt * 3));
            if (wakeAt[2] < 0 && Math.hypot(pl.x - wk.x, pl.z - wk.z) > 0.75) wakeAt[2] = 0.35;
          }
          return;
        }
        const dir = wk.to > wk.at ? 1 : -1; // 1: going in
        wk.at = dir > 0 ? Math.min(wk.to, wk.at + dt * 0.8) : Math.max(wk.to, wk.at - dt * 0.8);
        const i = wk.at > HOPS[0] ? 1 : 0,
          a = WAY[i],
          b = WAY[i + 1],
          k = (wk.at - (i ? HOPS[0] : 0)) / HOPS[i];
        wk.x = wakeAt[0] = a[0] + (b[0] - a[0]) * k;
        wk.z = wakeAt[1] = a[1] + (b[1] - a[1]) * k;
        const way = Math.atan2((b[0] - a[0]) * dir, (b[1] - a[1]) * dir);
        wk.face = wk.here ? turnTo(wk.face, way, Math.min(1, dt * 6)) : way; // (coming out, he comes out facing the way he goes)
        wk.here = wk.at < FAR; // through the door, he is gone
        wakeAt[2] = -9; // nobody is stopped by a man walking
        wk.gait += (1 - wk.gait) * ease;
        wk.phase += dt * 5.2;
      },
      // the lamps: every dab of the beam and of the lit windows, and how strong it is by day and by night
      lamps = [],
      // and the panes of the windows somebody sits behind after dark: black glass by day, lamplight by night
      panes = [],
      WINDOWS = [
        [COT[0] - 1.7 * BIG, YC + 1.15 * BIG, COT[1] + COT[3], 0.48, 0.54, 0.2],
        [COT[0] + 1.9 * BIG, YC + 1.15 * BIG, COT[1] + COT[3], 0.48, 0.54, 0.2],
        [COT[0] + COT[2], YC + 1.2 * BIG, COT[1], 0.2, 0.54, 0.48],
        [COT[0] - COT[2], YC + 1.15 * BIG, COT[1] + CWEST, 0.2, 0.54, 0.44],
        ...[[0, 2.9, 1.2, 0.25, 0.4, 1], [1.2, 4.7, 0, 1, 0.4, 0.25], [0, 6.3, 1.2, 0.25, 0.4, 1]].map(w => w.map((v, i) => v * BIG + (i === 1 ? Y0 : 0))) // and the three up the tower's stair
      ],
      pack = c => c[0] + c[1] * 256 + c[2] * 65536,
      night = n => {
        for (const l of lamps) W.data[l.i * 16 + 3] = l.a * (l.day + (l.night - l.day) * n);
        const k = sm((n - 0.3) / 0.4),
          a = B.P[31],
          b = B.P[36],
          c = pack([0, 1, 2].map(j => Math.round(a[j] + (b[j] - a[j]) * k)));
        for (const i of panes) {
          W.data[i * 16 + 7] = c;
          W.data[i * 16 + 11] = k > 0.25 ? 32 : 0; // lit, it is a light: the haze and the dark leave it alone
        }
      },
      // what is done to the picture once drawn: a table from each level of grey to what it becomes. By day everything is a
      // little dimmer than it was painted (DIM: 1 would leave it alone); by night it all goes down and the darks close up, as far
      // as it did before there was any dimming.
      // What was all but white (the lamp, the lit windows) is left as it was, day and night
      DIM = 0.85,
      grade = (n, lut) => {
        for (let v = 0; v < 256; v++) {
          const x = v / 255,
            dark = (DIM + (1 - DIM) * n) * Math.pow(x, 1 + 0.35 * n) * (1 - 0.5 * n);
          lut[v] = Math.round(255 * (dark + (x - dark) * sm((x - 0.95) / 0.03)));
        }
        return lut;
      },
      // the sea is not still: its long streaks of swell come down from the north and change as they come, the white out on the
      // water rides them, and the foam along the shore runs up as each one comes in and falls back after it
      RUN = 0.65, // how fast the swell travels
      swell = (x, z, t) => n3(x * 0.09 + z * 0.03, 2 + t * 0.05, (z - t * RUN) * 0.34),
      TONE = [13, 14, 15, 16, 18, 19].map(i => pack(B.P[i])),
      water = [], // every dab of the sea: where it lies, how far off the shore, whether foam can lie on it
      white = [], // and every dab of foam on it, out on the water or along the shore
      GREY = [13, 14, 15, 16, 18, 19].map(i => B.P[i]),
      sea = t => {
        const d = W.data;
        for (const w of water) {
          // which of its greys the water is here (dark in the trough, light on the back of the swell), going over from one
          // to the next rather than jumping; and over that, how much foam: none, the grey of it, the white of it
          const b = swell(w.x, w.z, t);
          let c = sm((b - 0.28) / 0.04) + sm((b - 0.58) / 0.04) + sm((b - 0.7) / 0.04);
          if (w.foam) {
            const reach = 0.014 + 0.045 * sm((b - 0.3) / 0.4),
              f = sm((w.d + reach) / 0.012);
            if (f > 0) c += (4 + sm((w.d + reach * 0.4) / 0.008) - c) * f;
          }
          const i = Math.min(4, c | 0),
            k = c - i,
            p = GREY[i],
            q = GREY[i + 1];
          d[w.o + 7] = k < 0.004 ? TONE[i] : Math.round(p[0] + (q[0] - p[0]) * k) + Math.round(p[1] + (q[1] - p[1]) * k) * 256 + Math.round(p[2] + (q[2] - p[2]) * k) * 65536;
        }
        for (const w of white) {
          const b = swell(w.x, w.z, t);
          d[w.o + 3] = w.a * (w.shore ? 0.35 + 0.65 * sm((b - 0.3) / 0.4) : sm((b - 0.48) / 0.16));
        }
      },
      // how far round from the way one of them faces the keeper is, no further than a neck goes
      glance = (o, facing, most) => {
        let a = (Math.atan2(pl.x - o.x, pl.z - o.z) - facing) % TAU;
        if (a > Math.PI) a -= TAU;
        if (a < -Math.PI) a += TAU;
        return Math.max(-most, Math.min(most, a));
      },
      MFA = Math.atan2(MF[0], MF[2]),
      AWAY = -0.3,
      SEES = 9,
      HAS = 4.5,
      TWIST = 0.45,
      BODY = 0.55, // the most her shoulders turn, either way (her hands stay where they are: more than this and they would not)
      REACH = 2.1, // and the most her head does, shoulders and neck together: well over her shoulder
      BEHIND = 2.75, // further round than this he is at her back
      hip = (sx, dy) => [SPAWN[0] + sx, SY + dy, SPAWN[1]];
    K.puppet(W, {
      parts: {
        pl: { ids: tags.pl, pivot: [SPAWN[0], SY, SPAWN[1]] },
        legL: { ids: tags.pllegL, pivot: hip(-0.1, 0.58), parent: 'pl' },
        legR: { ids: tags.pllegR, pivot: hip(0.1, 0.58), parent: 'pl' },
        armL: { ids: tags.plarmL, pivot: hip(-0.25, 1.0), parent: 'pl' },
        armR: { ids: tags.plarmR, pivot: hip(0.25, 1.0), parent: 'pl' },
        wk: { ids: tags.wk, pivot: [WAKE[0], height(WAKE[0], WAKE[1]), WAKE[1]] },
        wkhead: { ids: tags.wkhead, pivot: [WAKE[0], height(WAKE[0], WAKE[1]) + 1.1, WAKE[1]], parent: 'wk' },
        mm: { ids: tags.mm, pivot: mp(0, 0, 0) },
        mmtop: { ids: tags.mmtop, pivot: mp(0, 0.2, 0), parent: 'mm' }, // all of her above the scales: it turns at the hips
        mmhead: { ids: tags.mmhead, pivot: mp(0.02, 0.77, -LEAN * 0.6), parent: 'mmtop' },
        mmtail: { ids: tags.mmtail, pivot: TAIL, parent: 'mm' }
      },
      pose(t, dt, p) {
        const sw = Math.sin(pl.phase) * pl.go,
          k = Math.min(1, pl.speed / 4.2),
          bob = 0.045 * Math.abs(Math.cos(pl.phase)) * pl.go * k;
        p.pose.pl = { pos: [pl.x - SPAWN[0], pl.y - SY + bob, pl.z - SPAWN[1]], rot: [0, (pl.face * 180) / Math.PI, 0], stretch: 1 + 0.012 * Math.sin(t * 1.6) * (1 - pl.go) };
        p.pose.legL = { rot: [sw * (22 + 26 * k), 0, 0] };
        p.pose.legR = { rot: [-sw * (22 + 26 * k), 0, 0] };
        p.pose.armL = { rot: [-sw * (18 + 30 * k), 0, 0] };
        p.pose.armR = { rot: [sw * (18 + 30 * k), 0, 0] };
        // neither of them turns about to watch him: the old man stands as he stood and only his head follows whoever comes near
        keep(dt);
        const wk = npc.wake,
          mer = npc.mer,
          deg = 180 / Math.PI,
          ease = Math.min(1, dt * 4);
        wk.look += ((Math.hypot(pl.x - wk.x, pl.z - wk.z) < 6 ? glance(wk, wk.face, 1.25) : 0) - wk.look) * ease;
        // (when he is nowhere he is put a long way under the rock)
        // (he is all of a piece and has no stride to show: going to his door he rocks from one foot to the other, as a stiff man does)
        p.pose.wk = {
          pos: wk.here ? [wk.x - WAKE[0], height(wk.x, wk.z) - WY + 0.035 * Math.abs(Math.sin(wk.phase)) * wk.gait, wk.z - WAKE[1]] : [0, -60, 0],
          rot: [0, wk.face * deg, 6 * Math.sin(wk.phase) * wk.gait],
          stretch: 1 + 0.012 * Math.sin(t * 1.3)
        };
        p.pose.wkhead = { rot: [0, wk.look * deg, 0] };
        // nor does she, and her tail keeps its own slow time. But she watches him come: with nobody near she looks a little
        // aside, as she was made (AWAY); from SEES off her head begins to come round to him, and is on him by the time he is at
        // HAS. Her shoulders come a part of the way with it (TWIST of what her head has turned from where it rests, and no
        // more than BODY), which is what can be seen of it from where the game looks. When she screams she is up and at him
        // He comes at her from the land, which is to one side of her and behind: so she looks a long way round, over her
        // shoulder. Right at her back she cannot see him, and keeps looking over the shoulder she was already looking over
        // (the landward one, if she had not turned yet), rather than swinging her head all the way about to the other
        const sees = sm((SEES - Math.hypot(pl.x - mer.x, pl.z - mer.z)) / (SEES - HAS)),
          round = glance(mer, MFA, Math.PI),
          at = Math.abs(round) > BEHIND ? (mer.look > AWAY + 0.1 ? REACH : -REACH) : Math.max(-REACH, Math.min(REACH, round));
        mer.look += (AWAY + (at - AWAY) * sees - mer.look) * Math.min(1, dt * 2.5);
        const sc = mer.scream,
          twist = Math.max(-BODY, Math.min(BODY, (mer.look - AWAY) * TWIST));
        p.pose.mm = { pos: [MF[0] * 0.3 * sc, 0.28 * sc, MF[2] * 0.3 * sc], stretch: 1 + 0.4 * sc + 0.012 * Math.sin(t * 1.1) };
        p.pose.mmtop = { rot: [0, twist * deg, 0] };
        p.pose.mmhead = { rot: [0, (mer.look - twist) * deg, 0], scale: 1 + 0.35 * sc };
        p.pose.mmtail = { rot: [0, 12 * Math.sin(t * 0.9) + 26 * sc * Math.sin(t * 23), 7 * Math.sin(t * 0.9 + 1)] };
      }
    });
    for (let i = 0; i < W.count; i++) {
      const o = i * 16,
        glows = (W.data[o + 11] & 32) !== 0;
      if (glows && Math.abs(W.data[o + 1] - BY) < 1e-4) lamps.push({ i, a: W.data[o + 3], day: 0.6, night: 1.5 });
      else if (W.data[o + 7] === pack(B.P[31]) && WINDOWS.some(w => Math.abs(W.data[o] - w[0]) < w[3] && Math.abs(W.data[o + 1] - w[1]) < w[4] && Math.abs(W.data[o + 2] - w[2]) < w[5])) panes.push(i);
      else {
        const x = W.data[o],
          y = W.data[o + 1],
          z = W.data[o + 2],
          c = W.data[o + 7],
          kind = Math.round(W.data[o + 11]) % 16;
        if (kind === 0 && Math.abs(y + 0.06) < 1e-4 && TONE.includes(c)) {
          const d = inside(x, z);
          water.push({ o, x, z, d, foam: d > -0.07 && n3(x * 1.3, 6, z * 1.3) > 0.34 });
        } else if (kind === 1 && Math.abs(y - 0.01) < 0.011 && (c === pack(B.P[17]) || c === TONE[4] || c === TONE[5])) white.push({ o, x, z, a: W.data[o + 3], shore: y > 0.01 });
      }
    }
    night(0);
    sea(0);
    W.panes = panes.length;
    W.blocks = BLOCKS;
    W.sea = [water.length, white.length];
    W.game = { pl, spawn: SPAWN, height, blocked, step, turn, npc, inside, spots: SPOTS, stand, home, night, grade, sea, places: { tower: TOWER, cottage: COT, engine: ENG, well: WELL, landing: [SLIP - 0.3, slipEnd - 1.2], boathouse: BOAT, shed: SHED, wake: WAKE, mermaid: MER } };
    return W;
  }
});
