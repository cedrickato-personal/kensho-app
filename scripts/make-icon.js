// Generates a valid 256x256 PNG icon with no dependencies
// Dark background (#030712) with a green circle (#10b981) and white "K"
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 256, H = 256;

// Create RGBA pixel buffer
const pixels = Buffer.alloc(W * H * 4);

// Background color: #030712
const bg = [3, 7, 18, 255];
// Circle color: #10b981
const green = [16, 185, 129, 255];
// Letter color: white
const white = [255, 255, 255, 255];

const cx = 128, cy = 128, r = 100;

// Simple bitmap font for "K" — drawn as lines
function drawK(px, py, color) {
  // K shape: vertical bar + two diagonals
  for (let y = -40; y <= 40; y++) {
    // Vertical bar
    for (let x = -15; x <= -5; x++) {
      setPixel(px + x, py + y, color);
    }
    // Upper diagonal (\)
    const dx1 = Math.round(-5 + ((-y + 40) / 80) * 35);
    if (y <= 0) {
      for (let x = dx1 - 5; x <= dx1 + 5; x++) {
        setPixel(px + x, py + y, color);
      }
    }
    // Lower diagonal (/)
    if (y >= 0) {
      const dx2 = Math.round(-5 + ((y) / 40) * 35);
      for (let x = dx2 - 5; x <= dx2 + 5; x++) {
        setPixel(px + x, py + y, color);
      }
    }
  }
}

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

// Fill background
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4;
    // Check if inside circle
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const color = dist <= r ? green : bg;
    pixels[idx] = color[0];
    pixels[idx + 1] = color[1];
    pixels[idx + 2] = color[2];
    pixels[idx + 3] = color[3];
  }
}

// Draw K
drawK(cx, cy, white);

// Encode as PNG
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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT — raw pixel data with filter bytes
const rawData = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  rawData[y * (1 + W * 4)] = 0; // filter: none
  pixels.copy(rawData, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = zlib.deflateSync(rawData);

// IEND
const iend = Buffer.alloc(0);

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk("IHDR", ihdr),
  chunk("IDAT", compressed),
  chunk("IEND", iend),
]);

const outPath = path.join(__dirname, "..", "public", "icon.png");
fs.writeFileSync(outPath, png);
console.log(`✅ Icon generated: ${outPath} (${png.length} bytes, ${W}x${H})`);
