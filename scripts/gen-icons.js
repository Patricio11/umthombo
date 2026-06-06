/**
 * Generates the full favicon / icon / social-image set from the brand mark.
 * Run with:  node scripts/gen-icons.js
 * (Requires devDependencies: sharp, png-to-ico)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OLIVE = "#4b5a30";
const CREAM = "#faf6ed";
const INK = "#2a2420";
const INKSOFT = "#5a5048";
const WHITE = "#ffffff";
const FONT = "Helvetica, Arial, sans-serif";

// The brand mark (serif "U" chalice + flourish + droplet) in a 0 0 64 72 box.
const mark = (fg) => `
  <path d="M14 10 v22 a18 18 0 0 0 36 0 V10 h-7 v22 a11 11 0 0 1 -22 0 V10 Z" fill="${fg}"/>
  <rect x="9" y="8" width="17" height="4.5" rx="2" fill="${fg}"/>
  <rect x="38" y="8" width="17" height="4.5" rx="2" fill="${fg}"/>
  <path d="M10 56 C 20 48, 26 64, 32 56 C 38 48, 44 64, 54 56" stroke="${fg}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="48" r="2.4" fill="${fg}"/>`;

// App icon  olive rounded square, cream mark.
const iconSquare = (rounded) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${rounded ? 'rx="116"' : ""} fill="${OLIVE}"/>
  <g transform="translate(120,103) scale(4.25)">${mark(CREAM)}</g>
</svg>`;

// Apple icon  square (iOS masks corners itself), a touch more padding.
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${OLIVE}"/>
  <g transform="translate(136,120) scale(3.75)">${mark(CREAM)}</g>
</svg>`;

// Transparent standalone marks for reuse.
const markOnly = (fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72" width="64" height="72">${mark(fg)}</svg>`;

// Social / Open Graph image  1200x630, cream paper, olive mark + wordmark.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREAM}"/>
  <circle cx="1140" cy="120" r="320" fill="${OLIVE}" opacity="0.08"/>
  <circle cx="120" cy="560" r="200" fill="#a6402c" opacity="0.06"/>
  <g transform="translate(96,116) scale(2.5)">${mark(OLIVE)}</g>
  <text x="96" y="372" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="700" letter-spacing="-2" fill="${INK}">Umthombo Creations</text>
  <text x="98" y="432" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="400" fill="${INKSOFT}">Eco-conscious essentials, handcrafted with care.</text>
  <rect x="100" y="466" width="64" height="4" rx="2" fill="${OLIVE}"/>
  <text x="100" y="514" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="${OLIVE}">Cape Town &#183; Candles &#183; Body &#183; Home &#183; Hampers</text>
</svg>`;

// ── Logo lockups & wordmark (mark + "Umthombo Creations") ──────────────
// Horizontal lockup: mark on the left, two-line wordmark on the right.
const lockupH = (markC, textC) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 472 104" width="472" height="104">
  <g transform="translate(6,14) scale(1.05)">${mark(markC)}</g>
  <text x="104" y="58" font-family="${FONT}" font-size="50" font-weight="700" letter-spacing="-1.5" fill="${textC}">Umthombo</text>
  <text x="106" y="90" font-family="${FONT}" font-size="24" font-weight="500" letter-spacing="6" fill="${textC}">CREATIONS</text>
</svg>`;

// Stacked lockup: mark centred above the two-line wordmark.
const lockupV = (markC, textC) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 250" width="340" height="250">
  <g transform="translate(138,6)">${mark(markC)}</g>
  <text x="170" y="172" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" letter-spacing="-1" fill="${textC}">Umthombo</text>
  <text x="172" y="204" text-anchor="middle" font-family="${FONT}" font-size="21" font-weight="500" letter-spacing="6" fill="${textC}">CREATIONS</text>
</svg>`;

// Wordmark only (no mark).
const wordmark = (textC) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 382 108" width="382" height="108">
  <text x="2" y="58" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1.5" fill="${textC}">Umthombo</text>
  <text x="4" y="92" font-family="${FONT}" font-size="25" font-weight="500" letter-spacing="6.5" fill="${textC}">CREATIONS</text>
</svg>`;

// Circular badge (for stamps / social avatars that crop to a circle).
const badge = (bg, fg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="256" fill="${bg}"/>
  <g transform="translate(120,103) scale(4.25)">${mark(fg)}</g>
</svg>`;

const appDir = path.join(__dirname, "..", "src", "app");
const pubDir = path.join(__dirname, "..", "public");
const brandDir = path.join(pubDir, "brand");

async function main() {
  const pngToIco = (await import("png-to-ico")).default;

  fs.writeFileSync(path.join(appDir, "icon.svg"), iconSquare(true));

  fs.writeFileSync(path.join(pubDir, "logo-mark.svg"), markOnly(OLIVE));
  fs.writeFileSync(path.join(pubDir, "logo-mark-cream.svg"), markOnly(CREAM));
  fs.writeFileSync(path.join(pubDir, "logo-icon.svg"), iconSquare(true));

  const squareBuf = Buffer.from(iconSquare(true));

  const p16 = await sharp(squareBuf).resize(16, 16).png().toBuffer();
  const p32 = await sharp(squareBuf).resize(32, 32).png().toBuffer();
  const p48 = await sharp(squareBuf).resize(48, 48).png().toBuffer();
  await sharp(squareBuf).resize(512, 512).png().toFile(path.join(pubDir, "icon-512.png"));
  await sharp(squareBuf).resize(192, 192).png().toFile(path.join(pubDir, "icon-192.png"));

  const ico = await pngToIco([p16, p32, p48]);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);

  await sharp(Buffer.from(appleSvg)).resize(180, 180).png().toFile(path.join(appDir, "apple-icon.png"));

  await sharp(Buffer.from(og)).png().toFile(path.join(appDir, "opengraph-image.png"));
  await sharp(Buffer.from(og)).png().toFile(path.join(appDir, "twitter-image.png"));

  // ── Full brand-asset suite → public/brand/ ──────────────────────────
  fs.mkdirSync(brandDir, { recursive: true });
  const brand = {
    // standalone marks (transparent)
    "mark-olive.svg": markOnly(OLIVE),
    "mark-cream.svg": markOnly(CREAM),
    "mark-ink.svg": markOnly(INK),
    "mark-white.svg": markOnly(WHITE),
    // horizontal lockups
    "lockup-horizontal.svg": lockupH(OLIVE, INK), // light backgrounds
    "lockup-horizontal-mono-olive.svg": lockupH(OLIVE, OLIVE),
    "lockup-horizontal-cream.svg": lockupH(CREAM, CREAM), // dark/olive backgrounds
    // stacked lockups
    "lockup-stacked.svg": lockupV(OLIVE, INK),
    "lockup-stacked-cream.svg": lockupV(CREAM, CREAM),
    // wordmarks
    "wordmark-ink.svg": wordmark(INK),
    "wordmark-olive.svg": wordmark(OLIVE),
    // circular badges
    "badge-olive.svg": badge(OLIVE, CREAM),
    "badge-cream.svg": badge(CREAM, OLIVE),
  };
  for (const [name, svg] of Object.entries(brand)) {
    fs.writeFileSync(path.join(brandDir, name), svg);
  }

  // Raster exports for places that don't take SVG.
  // Social profile avatar (olive square, cream mark — platforms crop to circle).
  await sharp(Buffer.from(iconSquare(false)))
    .resize(1080, 1080)
    .png()
    .toFile(path.join(brandDir, "avatar-1080.png"));
  // Horizontal lockup PNG on transparent (email signatures, decks).
  await sharp(Buffer.from(lockupH(OLIVE, INK)))
    .resize(944)
    .png()
    .toFile(path.join(brandDir, "lockup-horizontal.png"));
  await sharp(Buffer.from(lockupH(CREAM, CREAM)))
    .resize(944)
    .png()
    .toFile(path.join(brandDir, "lockup-horizontal-cream.png"));

  console.log("Generated icon + brand-asset set ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
