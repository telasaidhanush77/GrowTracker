#!/usr/bin/env node
/**
 * Generates GrowTracker icon assets matching the in-app GrowMark logo.
 * No external dependencies — uses Node.js built-in zlib only.
 * Run: node scripts/generate-icon.js
 */
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── Minimal PNG encoder ───────────────────────────────────────────────────────
function encodePNG(width, height, buf) {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    T[n] = c;
  }
  function crc32(d) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < d.length; i++) c = (c >>> 8) ^ T[(c ^ d[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const b = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b));
    return Buffer.concat([len, b, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    buf.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Canvas ───────────────────────────────────────────────────────────────────
function makeCanvas(w, h, r = 0, g = 0, b = 0, a = 0) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { buf[i*4]=r; buf[i*4+1]=g; buf[i*4+2]=b; buf[i*4+3]=a; }
  return { buf, w, h };
}

function blendAt(buf, W, H, px, py, R, G, B, A) {
  if (px < 0 || py < 0 || px >= W || py >= H) return;
  const i = (py * W + px) * 4;
  const sa = A / 255, da = buf[i+3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa < 0.001) return;
  buf[i]   = Math.round((R * sa + buf[i]   * da * (1-sa)) / oa);
  buf[i+1] = Math.round((G * sa + buf[i+1] * da * (1-sa)) / oa);
  buf[i+2] = Math.round((B * sa + buf[i+2] * da * (1-sa)) / oa);
  buf[i+3] = Math.round(oa * 255);
}

// Rounded rectangle fill with 1-px anti-aliased edge
function rrect({ buf, w, h }, x, y, rw, rh, corner, R, G, B, A = 255) {
  const x0 = Math.max(0, Math.floor(x - 1));
  const y0 = Math.max(0, Math.floor(y - 1));
  const x1 = Math.min(w - 1, Math.ceil(x + rw + 1));
  const y1 = Math.min(h - 1, Math.ceil(y + rh + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const qx = px + 0.5, qy = py + 0.5;
      const cx = Math.max(x + corner, Math.min(qx, x + rw - corner));
      const cy = Math.max(y + corner, Math.min(qy, y + rh - corner));
      const d  = Math.sqrt((qx - cx) ** 2 + (qy - cy) ** 2);
      const aa = Math.max(0, Math.min(1, corner + 0.5 - d));
      if (aa > 0) blendAt(buf, w, h, px, py, R, G, B, Math.round(A * aa));
    }
  }
}

// ─── GrowMark renderer ─────────────────────────────────────────────────────────
// Mirrors the React Native GrowMark component geometry exactly.
// containerRGB: [R,G,B] for the dark container — pass null to skip (bars drawn on existing bg)
// barRGB:       [R,G,B] for bars + peak dot
function drawGrowMark(canvas, cx, cy, size, containerRGB, barRGB, dotOpacity = 0.55) {
  const bar    = Math.round(size * 0.13);
  const gap    = Math.round(size * 0.08);
  const padB   = Math.round(size * 0.17);
  const outerR = Math.round(size * 0.26);
  const hs     = [Math.round(size * 0.30), Math.round(size * 0.52), Math.round(size * 0.74)];
  const left   = cx - size / 2;
  const top    = cy - size / 2;

  if (containerRGB) {
    rrect(canvas, left, top, size, size, outerR, ...containerRGB, 255);
  }

  const totalW    = 3 * bar + 2 * gap;
  const barsLeft  = cx - totalW / 2;
  const barsBottom = cy + size / 2 - padB;

  hs.forEach((h, idx) => {
    const bx = barsLeft + idx * (bar + gap);
    rrect(canvas, bx, barsBottom - h, bar, h, bar / 2, ...barRGB, 255);
  });

  // Peak dot: above tallest bar, right-aligned
  const dotSz    = Math.round(bar * 0.7);
  const tallTop  = barsBottom - hs[2];
  const dotY     = tallTop - dotSz - Math.round(bar * 0.2);
  const tallRight = barsLeft + 2 * (bar + gap) + bar;
  rrect(canvas, tallRight - dotSz, dotY, dotSz, dotSz, dotSz / 2,
    ...barRGB, Math.round(dotOpacity * 255));
}

function save(canvas, filename) {
  const out = path.join(__dirname, '..', 'assets', filename);
  fs.writeFileSync(out, encodePNG(canvas.w, canvas.h, canvas.buf));
  console.log(`  ✓  ${filename}  (${canvas.w}×${canvas.h})`);
}

// ─── Assets ───────────────────────────────────────────────────────────────────
console.log('\nGenerating GrowTracker icon assets…\n');

// icon.png — 1024×1024 — dark bg fills entire canvas (iOS masks to rounded square)
{
  const c = makeCanvas(1024, 1024, 17, 17, 17, 255); // #111111 background
  drawGrowMark(c, 512, 512, 720, null, [255, 255, 255]);
  save(c, 'icon.png');
}

// splash-icon.png — GrowMark on transparent (splash backgroundColor in app.json is #E6F4FE)
{
  const c = makeCanvas(1024, 1024, 0, 0, 0, 0);
  drawGrowMark(c, 512, 512, 480, [17, 17, 17], [255, 255, 255]);
  save(c, 'splash-icon.png');
}

// android-icon-foreground.png — bars + container, transparent outside (bg layer is #111111)
{
  const c = makeCanvas(1024, 1024, 0, 0, 0, 0);
  drawGrowMark(c, 512, 512, 560, [17, 17, 17], [255, 255, 255]);
  save(c, 'android-icon-foreground.png');
}

// android-icon-monochrome.png — bars only in white, no container (system applies tint)
{
  const c = makeCanvas(1024, 1024, 0, 0, 0, 0);
  drawGrowMark(c, 512, 512, 560, null, [255, 255, 255]);
  save(c, 'android-icon-monochrome.png');
}

// android-icon-background.png — solid #111111 (matches icon.png base)
{
  const c = makeCanvas(1024, 1024, 17, 17, 17, 255);
  save(c, 'android-icon-background.png');
}

// favicon.png — 64×64 for web tab
{
  const c = makeCanvas(64, 64, 17, 17, 17, 255);
  drawGrowMark(c, 32, 32, 48, null, [255, 255, 255]);
  save(c, 'favicon.png');
}

console.log('\nDone. Restart Expo (`npx expo start --clear`) to pick up the new splash icon.');
console.log('For the app icon to update on-device, do a full rebuild (`eas build`).\n');
