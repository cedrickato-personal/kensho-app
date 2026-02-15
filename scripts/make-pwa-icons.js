// Generates PWA icons (192x192 and 512x512) from raw pixels
// Same design as make-icon.js: dark background with green circle and white "K"
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function generateIcon(size) {
  const W = size, H = size;
  const pixels = Buffer.alloc(W * H * 4);

  const bg = [3, 7, 18, 255];
  const green = [16, 185, 129, 255];
  const white = [255, 255, 255, 255];

  const cx = W / 2, cy = H / 2, r = W * 0.39;

  function setPixel(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 4;
    pixels[idx] = color[0];
    pixels[idx + 1] = color[1];
    pixels[idx + 2] = color[2];
    pixels[idx + 3] = color[3];
  }

  // Fill background + circle
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const color = dist <= r ? green : bg;
      setPixel(x, y, color);
    }
  }

  // Draw K
  const scale = size / 256;
  for (let y = -40; y <= 40; y++) {
    for (let x = -15; x <= -5; x++) setPixel(cx + x * scale, cy + y * scale, white);
    if (y <= 0) {
      const dx1 = Math.round(-5 + ((-y + 40) / 80) * 35);
      for (let x = dx1 - 5; x <= dx1 + 5; x++) setPixel(cx + x * scale, cy + y * scale, white);
    }
    if (y >= 0) {
      const dx2 = Math.round(-5 + ((y) / 40) * 35);
      for (let x = dx2 - 5; x <= dx2 + 5; x++) setPixel(cx + x * scale, cy + y * scale, white);
    }
  }

  // Encode PNG
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let t = n;
      for (let k = 0; k < 8; k++) t = t & 1 ? 0xEDB88320 ^ (t >>> 1) : t >>> 1;
      table[n] = t;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rawData = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    rawData[y * (1 + W * 4)] = 0;
    pixels.copy(rawData, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public");

[192, 512].forEach(size => {
  const png = generateIcon(size);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✅ Generated: ${outPath} (${png.length} bytes, ${size}x${size})`);
});
