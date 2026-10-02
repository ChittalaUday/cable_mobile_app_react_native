// Makes an image's light, edge-connected background transparent, keeping white
// artwork inside it (e.g. icon badges), then previews it on the dark surface.
//  1. Tinted fill: from the border through light, non-pure-white pixels whose
//     colour changes gradually (sky haze, gradients).
//  2. White fill: from the border through pure-white pixels only. Badges are
//     ringed by tinted sky, so this never reaches them.
//  3. Speckle cleanup: light pixels mostly surrounded by background join it.
//  4. Feather the cut edge so it does not look stamped.
const Jimp = require(process.cwd() + '/node_modules/jimp');
// Usage: node scripts/cutout-background.cjs <in.png> <out.png>  (also writes <out>.preview-dark.png)
const [, , input, output] = process.argv;
const STEP = 6, MIN = 200, SOLID = 250;
(async () => {
  const img = await Jimp.read(input);
  const { width: w, height: h, data } = img.bitmap;
  const ch = (p, c) => data[p * 4 + c];
  const minOf = p => Math.min(ch(p, 0), ch(p, 1), ch(p, 2));
  const isWhite = p => minOf(p) >= SOLID;
  const isTint = p => minOf(p) >= MIN && !isWhite(p);
  const close = (a, b) => Math.max(...[0, 1, 2].map(c => Math.abs(ch(a, c) - ch(b, c)))) <= STEP;
  const bg = new Uint8Array(w * h);
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const fill = (ok, gradual) => {
    const stack = [];
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const p = y * w + x; if (ok(p)) { bg[p] = 1; stack.push(p); } }
    for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const p = y * w + x; if (ok(p)) { bg[p] = 1; stack.push(p); } }
    while (stack.length) {
      const p = stack.pop(); const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of N) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (bg[q] || !ok(q) || (gradual && !close(p, q))) continue;
        bg[q] = 1; stack.push(q);
      }
    }
  };
  fill(isTint, true);
  fill(isWhite, false);
  for (let pass = 0; pass < 4; pass++) {
    for (let p = 0; p < w * h; p++) {
      if (bg[p] || minOf(p) < MIN) continue;
      const x = p % w, y = (p / w) | 0; let around = 0;
      for (const [dx, dy] of N) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || bg[ny * w + nx]) around++; }
      if (around >= 3) bg[p] = 1;
    }
  }
  // Isolated light blobs left in the sky (noise, specks) are background too.
  // Real artwork — badges, house walls — is far larger than SPECK pixels.
  const SPECK = 6000;
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (bg[start] || seen[start] || minOf(start) < MIN) continue;
    const blob = [start]; seen[start] = 1;
    for (let k = 0; k < blob.length; k++) {
      const p = blob[k]; const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of N) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (bg[q] || seen[q] || minOf(q) < MIN) continue;
        seen[q] = 1; blob.push(q);
      }
    }
    if (blob.length < SPECK) for (const p of blob) bg[p] = 1;
  }
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) { data[p * 4 + 3] = 0; continue; }
    const x = p % w, y = (p / w) | 0;
    if (N.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && bg[ny * w + nx]; }))
      data[p * 4 + 3] = Math.round(255 * Math.min(1, (255 - minOf(p)) / 60 + 0.35));
  }
  await img.writeAsync(output);
  const preview = new Jimp(w, h, 0x0f1115ff); preview.composite(img, 0, 0);
  await preview.writeAsync(output.replace(/\.png$/, '.preview-dark.png'));
  console.log(`removed ${(100 * bg.reduce((a, b) => a + b, 0) / (w * h)).toFixed(1)}%`);
})();
