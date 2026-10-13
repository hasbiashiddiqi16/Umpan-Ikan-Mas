// Pembuat poster popup sambutan: seluruh teks dilebur ke dalam gambar.
//
// Jalankan dari akar repo (butuh paket bantu di luar dependensi aplikasi):
//   npm install --no-save @napi-rs/canvas && node scripts/build-promo-poster.mjs
//
// Hasilnya dua berkas di public/images/ (ponsel 860x1280 dan layar lebar
// 1640x1040, masing-masing 2x ukuran tampil) plus pemeriksaan otomatis:
// setiap baris teks harus muat di kolomnya, kontras teks pada latar poster
// minimal 4,5:1, dan koordinat tombol untuk tautan bening di komponen.
// Angka pada poster (jumlah racikan, ulasan, provinsi) ikut dibekukan di sini,
// jadi jalankan ulang skrip ini setiap kali angka atau kalimatnya berubah.
import sharp from "sharp";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { stat } from "node:fs/promises";

const ART = "public/images/promo-welcome.jpg";
const LOGO = "public/images/logo-umpan-mas.png";
const GEIST = "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf";

GlobalFonts.registerFromPath(GEIST, "Geist");

const PANEL = "#0f2a1c";
const GOLD = "#f0e2bd";
const WHITE = "#ffffff";

/* ---------- teks (dipakai juga untuk verifikasi kontras) ---------- */
const COPY = {
  brand: "UMPAN MAS",
  title: ["Selamat datang,", "pemancing!"],
  subtitle: {
    desktop: ["Katalog umpan ikan mas lengkap dengan cuaca,", "kondisi air, dan pengalaman komunitas."],
    mobile: ["Katalog umpan ikan mas lengkap dengan cuaca,", "kondisi air, dan pengalaman komunitas."],
  },
  stats: [
    { value: "200", label: "racikan umpan" },
    { value: "5.000", label: "ulasan komunitas" },
    { value: "38", label: "provinsi" },
  ],
  features: {
    desktop: [
      { icon: "target", text: "Cari racikan dari cuaca, kondisi air, dan budget." },
      { icon: "spark", text: "AI Umpan & Sistem Pakar bantu meracik dari bahanmu." },
      { icon: "pin", text: "Kolom provinsi terisi otomatis kalau lokasi diizinkan." },
      { icon: "fish", text: "Semua resep pakai kroto 1 ons dan amis Deho / Sunbell." },
    ],
    mobile: [
      { icon: "target", text: "Cari racikan dari cuaca, kondisi air, dan budget." },
      { icon: "spark", text: "AI Umpan & Sistem Pakar bantu meracik dari bahanmu." },
      { icon: "fish", text: "Semua resep pakai kroto 1 ons dan amis Deho / Sunbell." },
    ],
  },
  buttons: [
    { label: "Mulai jelajahi racikan", primary: true, arrow: true },
    { label: "Tanya AI Umpan", primary: false, arrow: false },
  ],
  footnote: {
    desktop: "Tampil sekali di perangkat ini · tutup dengan Esc atau klik di luar kartu",
    mobile: "Tampil sekali di perangkat ini · ketuk di luar kartu untuk menutup",
  },
};

/* ---------- alat gambar ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function tracked(ctx, text, x, y, tracking) {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
  return cursor - tracking - x;
}

function trackedWidth(ctx, text, tracking) {
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + tracking;
  return width - tracking;
}

function icon(ctx, kind, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "target") {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "spark") {
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.quadraticCurveTo(cx + s * 0.18, cy - s * 0.18, cx + s, cy);
    ctx.quadraticCurveTo(cx + s * 0.18, cy + s * 0.18, cx, cy + s);
    ctx.quadraticCurveTo(cx - s * 0.18, cy + s * 0.18, cx - s, cy);
    ctx.quadraticCurveTo(cx - s * 0.18, cy - s * 0.18, cx, cy - s);
    ctx.fill();
  } else if (kind === "pin") {
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.14, size * 0.3, Math.PI * 0.85, Math.PI * 0.15, false);
    ctx.lineTo(cx, cy + size * 0.46);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.14, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "fish") {
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.06, cy, size * 0.36, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.28, cy);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function arrowGlyph(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x + size * 0.55, y - size * 0.32);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.55, y + size * 0.32);
  ctx.stroke();
  ctx.restore();
}

/* ---------- latar ---------- */
async function desktopBackground() {
  return sharp(ART).resize(1640, 1040, { fit: "cover", position: "right" }).jpeg({ quality: 92 }).toBuffer();
}

async function mobileBand() {
  // Ambil sisi kanan gambar (ikan + pelet), lalu pilih potongan vertikalnya.
  const cropped = await sharp(ART).extract({ left: 448, top: 0, width: 832, height: 647 }).toBuffer();
  return sharp(cropped)
    .resize(860, 669, { fit: "fill" })
    .extract({ left: 0, top: 104, width: 860, height: 430 })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/* ---------- poster desktop ---------- */
async function buildDesktop({ withText = true } = {}) {
  const W = 1640, H = 1040;
  const buttons = COPY.buttons.map((b) => ({ ...b }));
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(await loadImage(await desktopBackground()), 0, 0, W, H);

  // Lapisan gelap yang cepat menipis setelah kolom teks agar ikan tetap terlihat.
  const scrim = ctx.createLinearGradient(0, 0, W, 0);
  scrim.addColorStop(0, "rgba(15,42,28,.965)");
  scrim.addColorStop(0.5, "rgba(15,42,28,.94)");
  scrim.addColorStop(0.585, "rgba(15,42,28,.66)");
  scrim.addColorStop(0.68, "rgba(15,42,28,.3)");
  scrim.addColorStop(0.8, "rgba(15,42,28,.11)");
  scrim.addColorStop(1, "rgba(15,42,28,.05)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  const M = 88, CW = 760, textRight = M + CW;
  if (!withText) return { canvas, textRight, buttons };

  // Badge merek
  ctx.font = "700 26px Geist";
  const brandW = trackedWidth(ctx, COPY.brand, 3.6);
  const badgeH = 62, badgeW = 34 + 46 + 16 + brandW + 34;
  roundRect(ctx, M, 84, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(M + 34 + 23, 84 + badgeH / 2, 23, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f7f8f4";
  ctx.fillRect(M + 34, 84, 46, 62);
  ctx.drawImage(await loadImage(LOGO), M + 34, 84 + 4, 46, 46);
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.font = "700 26px Geist";
  tracked(ctx, COPY.brand, M + 34 + 46 + 16, 84 + badgeH / 2 + 9, 3.6);

  // Judul
  ctx.fillStyle = WHITE;
  ctx.font = "700 88px Geist";
  ctx.fillText(COPY.title[0], M, 250);
  ctx.fillText(COPY.title[1], M, 344);

  // Subjudul
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "400 30px Geist";
  ctx.fillText(COPY.subtitle.desktop[0], M, 412);
  ctx.fillText(COPY.subtitle.desktop[1], M, 452);

  // Kartu statistik
  const cardGap = 20, cardW = (CW - cardGap * 2) / 3, cardH = 118, cardY = 500;
  COPY.stats.forEach((stat, i) => {
    const x = M + i * (cardW + cardGap);
    roundRect(ctx, x, cardY, cardW, cardH, 22);
    ctx.fillStyle = "rgba(255,255,255,.085)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.font = "700 46px Geist";
    ctx.textAlign = "center";
    ctx.fillText(stat.value, x + cardW / 2, cardY + 58);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "400 22px Geist";
    ctx.fillText(stat.label, x + cardW / 2, cardY + 94);
    ctx.textAlign = "left";
  });

  // Sorotan fitur
  ctx.font = "400 25px Geist";
  COPY.features.desktop.forEach((feature, i) => {
    const y = 672 + i * 50;
    ctx.beginPath();
    ctx.arc(M + 18, y - 8, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240,226,189,.14)";
    ctx.fill();
    icon(ctx, feature.icon, M + 18, y - 8, 22, GOLD);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(feature.text, M + 52, y);
  });

  // Tombol
  const btnY = 902, btnH = 96;
  let btnX = M;
  for (const button of buttons) {
    ctx.font = "700 28px Geist";
    const textW = ctx.measureText(button.label).width;
    const padX = 36;
    const arrowW = button.arrow ? 34 + 14 : 0;
    const w = padX * 2 + textW + arrowW;
    if (button.primary) {
      const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      grad.addColorStop(0, "#3f8a5c");
      grad.addColorStop(1, "#2c6543");
      roundRect(ctx, btnX, btnY, w, btnH, 22);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.fillText(button.label, btnX + padX, btnY + btnH / 2 + 10);
      if (button.arrow) arrowGlyph(ctx, btnX + padX + textW + 14, btnY + btnH / 2, 34, WHITE);
    } else {
      roundRect(ctx, btnX, btnY, w, btnH, 22);
      ctx.fillStyle = "rgba(255,255,255,.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = WHITE;
      ctx.fillText(button.label, btnX + padX, btnY + btnH / 2 + 10);
    }
    button.box = { x: btnX, y: btnY, w, h: btnH };
    btnX += w + 24;
  }

  // Catatan kaki
  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = "400 20px Geist";
  ctx.fillText(COPY.footnote.desktop, M, 1002);

  return { canvas, textRight, buttons };
}

/* ---------- poster mobile ---------- */
async function buildMobile({ withText = true } = {}) {
  const W = 860, H = 1280, BAND = 430;
  const buttons = COPY.buttons.map((b) => ({ ...b }));
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(await loadImage(await mobileBand()), 0, 0, W, BAND);

  // Peralihan lembut dari gambar ke panel
  const blend = ctx.createLinearGradient(0, BAND - 120, 0, BAND + 40);
  blend.addColorStop(0, "rgba(15,42,28,0)");
  blend.addColorStop(1, "rgba(15,42,28,1)");
  ctx.fillStyle = blend;
  ctx.fillRect(0, BAND - 120, W, 160);

  const M = 56, CW = W - M * 2;
  if (!withText) return { canvas, textRight: M + CW, buttons };

  ctx.font = "700 24px Geist";
  const brandW = trackedWidth(ctx, COPY.brand, 3.4);
  const badgeH = 58, badgeW = 30 + 42 + 14 + brandW + 30;
  roundRect(ctx, M, 486, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(M + 30 + 21, 486 + badgeH / 2, 21, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f7f8f4";
  ctx.fillRect(M + 30, 486, 42, badgeH);
  ctx.drawImage(await loadImage(LOGO), M + 30, 486 + 4, 42, 42);
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.font = "700 24px Geist";
  tracked(ctx, COPY.brand, M + 30 + 42 + 14, 486 + badgeH / 2 + 8, 3.4);

  ctx.fillStyle = WHITE;
  ctx.font = "700 68px Geist";
  ctx.fillText(COPY.title[0], M, 640);
  ctx.fillText(COPY.title[1], M, 712);

  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "400 25px Geist";
  ctx.fillText(COPY.subtitle.mobile[0], M, 768);
  ctx.fillText(COPY.subtitle.mobile[1], M, 802);

  const cardGap = 18, cardW = (CW - cardGap * 2) / 3, cardH = 106, cardY = 842;
  COPY.stats.forEach((stat, i) => {
    const x = M + i * (cardW + cardGap);
    roundRect(ctx, x, cardY, cardW, cardH, 20);
    ctx.fillStyle = "rgba(255,255,255,.085)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.font = "700 40px Geist";
    ctx.textAlign = "center";
    ctx.fillText(stat.value, x + cardW / 2, cardY + 52);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "400 19px Geist";
    ctx.fillText(stat.label, x + cardW / 2, cardY + 84);
    ctx.textAlign = "left";
  });

  ctx.font = "400 22px Geist";
  COPY.features.mobile.forEach((feature, i) => {
    const y = 1000 + i * 46;
    ctx.beginPath();
    ctx.arc(M + 16, y - 7, 16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240,226,189,.14)";
    ctx.fill();
    icon(ctx, feature.icon, M + 16, y - 7, 20, GOLD);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(feature.text, M + 46, y);
  });

  const btnY = 1124, btnH = 88, gap = 22;
  const w = (CW - gap) / 2;
  let btnX = M;
  for (const button of buttons) {
    ctx.font = "700 24px Geist";
    if (button.primary) {
      const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      grad.addColorStop(0, "#3f8a5c");
      grad.addColorStop(1, "#2c6543");
      roundRect(ctx, btnX, btnY, w, btnH, 20);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.textAlign = "center";
      ctx.fillText(button.label, btnX + w / 2, btnY + btnH / 2 + 9);
      ctx.textAlign = "left";
    } else {
      roundRect(ctx, btnX, btnY, w, btnH, 20);
      ctx.fillStyle = "rgba(255,255,255,.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = WHITE;
      ctx.textAlign = "center";
      ctx.fillText(button.label, btnX + w / 2, btnY + btnH / 2 + 9);
      ctx.textAlign = "left";
    }
    button.box = { x: btnX, y: btnY, w, h: btnH };
    btnX += w + gap;
  }

  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = "400 20px Geist";
  ctx.textAlign = "center";
  ctx.fillText(COPY.footnote.mobile, W / 2, 1252);
  ctx.textAlign = "left";

  return { canvas, textRight: M + CW, buttons };
}

/* ---------- pemeriksaan ---------- */
const srgbToLinear = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const overWhite = (bg, o) => bg.map((c) => c * (1 - o) + 255 * o);

/** Kontras terburuk teks putih beropasitas `opacity` pada kolom teks poster. */
function verifyTextColumn(canvas, { x0, x1, y0, y1 }, opacity, label) {
  const ctx = canvas.getContext("2d");
  const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let worst = { ratio: Infinity };
  for (let x = x0; x < x1; x += 2) {
    for (let y = y0; y < y1; y += 2) {
      const i = (y * width + x) * 4;
      const bg = [data[i], data[i + 1], data[i + 2]];
      const ratio = contrast(luminance(overWhite(bg, opacity)), luminance(bg));
      if (ratio < worst.ratio) worst = { ratio, x, y, bg };
    }
  }
  const ok = worst.ratio >= 4.5;
  console.log(`  ${ok ? "OK  " : "GAGAL"} ${label}: ${worst.ratio.toFixed(2)}:1 pada x=${worst.x} y=${worst.y} rgb(${worst.bg})`);
  return ok;
}

/** Setiap baris teks harus muat di kolom. */
function verifyFits(ctx, lines, maxWidth, label) {
  let ok = true;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) {
      ok = false;
      console.log(`  GAGAL ${label}: "${line}" ${w.toFixed(0)}px > ${maxWidth}px`);
    }
  }
  if (ok) console.log(`  OK   ${label}: semua baris muat di kolom ${maxWidth}px`);
  return ok;
}

/* ---------- jalan ---------- */
let failures = 0;
const fail = (msg) => { failures += 1; console.log(`GAGAL ${msg}`); };

const desktop = await buildDesktop();
const mobile = await buildMobile();
const desktopBg = await buildDesktop({ withText: false });
const mobileBg = await buildMobile({ withText: false });

console.log("Pemeriksaan poster desktop:");
const dctx = desktop.canvas.getContext("2d");
dctx.font = "700 88px Geist";
if (!verifyFits(dctx, COPY.title, 760, "judul")) failures += 1;
dctx.font = "400 30px Geist";
if (!verifyFits(dctx, COPY.subtitle.desktop, 760, "subjudul")) failures += 1;
dctx.font = "400 25px Geist";
if (!verifyFits(dctx, COPY.features.desktop.map((f) => f.text), 760 - 52, "sorotan fitur")) failures += 1;
if (desktop.buttons[1].box.x + desktop.buttons[1].box.w > 88 + 760) fail("tombol desktop keluar kolom");
if (!verifyTextColumn(desktopBg.canvas, { x0: 88, x1: 848, y0: 84, y1: 1024 }, 0.62, "teks pada kolom teks (termasuk catatan kaki)")) failures += 1;

console.log("Pemeriksaan poster mobile:");
const mctx = mobile.canvas.getContext("2d");
mctx.font = "700 68px Geist";
if (!verifyFits(mctx, COPY.title, 748, "judul")) failures += 1;
mctx.font = "400 25px Geist";
if (!verifyFits(mctx, COPY.subtitle.mobile, 748, "subjudul")) failures += 1;
mctx.font = "400 22px Geist";
if (!verifyFits(mctx, COPY.features.mobile.map((f) => f.text), 748 - 46, "sorotan fitur")) failures += 1;
if (mobile.buttons[1].box.x + mobile.buttons[1].box.w > 804) fail("tombol mobile keluar kolom");
if (!verifyTextColumn(mobileBg.canvas, { x0: 56, x1: 804, y0: 470, y1: 1268 }, 0.62, "teks pada panel (termasuk catatan kaki)")) failures += 1;

await sharp(desktop.canvas.toBuffer("image/png")).jpeg({ quality: 80, mozjpeg: true }).toFile("public/images/promo-welcome-desktop.jpg");
await sharp(mobile.canvas.toBuffer("image/png")).jpeg({ quality: 80, mozjpeg: true }).toFile("public/images/promo-welcome-mobile.jpg");

console.log("\nHasil:");
for (const file of ["public/images/promo-welcome-desktop.jpg", "public/images/promo-welcome-mobile.jpg"]) {
  const meta = await sharp(file).metadata();
  const { size } = await stat(file);
  console.log(`  ${file}: ${meta.width}x${meta.height}, ${(size / 1024).toFixed(0)} KB`);
}

console.log("\nKoordinat tombol (untuk tautan transparan di komponen):");
for (const [name, poster] of [["desktop", desktop], ["mobile", mobile]]) {
  const { width, height } = poster.canvas;
  poster.buttons.forEach((button, i) => {
    const { x, y, w, h } = button.box;
    console.log(`  ${name}#${i} ${button.label}: left ${(x / width * 100).toFixed(2)}%, top ${(y / height * 100).toFixed(2)}%, width ${(w / width * 100).toFixed(2)}%, height ${(h / height * 100).toFixed(2)}%`);
  });
}

console.log(failures === 0 ? "\nSEMUA PEMERIKSAAN LOLOS" : `\n${failures} PEMERIKSAAN GAGAL`);
