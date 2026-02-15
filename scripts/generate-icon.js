// Run with: node scripts/generate-icon.js
// Generates a simple 256x256 PNG icon for KENSHO Tracker

const fs = require("fs");
const path = require("path");

// Minimal 16x16 PNG for tray (green K on dark background)
// This is a base64-encoded hand-crafted PNG
// For production, replace with a proper designed icon

// We'll create a simple 1x1 green pixel PNG as ultimate fallback
// and rely on the SVG for the actual icon display

const outputDir = path.join(__dirname, "..", "public");

// Create a minimal valid PNG (16x16, green square with dark border)
// For a real app, you'd use a proper icon designer
// This creates a functional placeholder

const { createCanvas } = (() => {
  try {
    return require("canvas");
  } catch {
    return { createCanvas: null };
  }
})();

if (createCanvas) {
  const canvas = createCanvas(256, 256);
  const ctx = canvas.getContext("2d");

  // Dark background
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, 256, 256);

  // Green circle
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.fillStyle = "#10b981";
  ctx.fill();

  // K letter
  ctx.fillStyle = "#030712";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("K", 128, 135);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(outputDir, "icon.png"), buffer);
  console.log("✅ Icon generated at public/icon.png");
} else {
  console.log("⚠️  'canvas' package not installed. Creating minimal placeholder icon.");
  console.log("   For a proper icon, install 'canvas': npm install canvas");
  console.log("   Or simply replace public/icon.png with your own 256x256 PNG.");

  // Write a minimal valid 1x1 PNG as placeholder
  // This is enough to prevent Electron from crashing
  const minimalPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAADklEQVQ4jWNgGAWDEwAAAhAAAfkfwRkAAAAASUVORK5CYII=",
    "base64"
  );
  fs.writeFileSync(path.join(outputDir, "icon.png"), minimalPng);
  console.log("✅ Minimal placeholder icon created at public/icon.png");
  console.log("   Replace it with a proper 256x256 PNG icon when ready.");
}
