"use strict";

const { spawn } = require("child_process");

const WIDTH = 640;
const RENDER_TIMEOUT_MS = 15_000;

function escXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanText(value, maxLength = 200) {
  return String(value == null ? "" : value).slice(0, maxLength);
}

function parseRupiah(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  return Number.parseInt(digits, 10) || 0;
}

function roundSell(harga) {
  const base = parseRupiah(harga);
  const minimum = base + 1000;
  const start = Math.max(0, Math.floor(minimum / 5000) - 1);

  let best = 0;

  for (let n = start; n <= start + 3; n++) {
    for (const candidate of [n * 5000, n * 5000 + 2000]) {
      if (candidate >= minimum && (best === 0 || candidate < best)) {
        best = candidate;
      }
    }
  }

  return best || minimum;
}

function formatRp(value) {
  return "Rp " + parseRupiah(value).toLocaleString("id-ID");
}

const STATUS_THEMES = {
  success: {
    pill: "#16A34A",
    pillText: "Berhasil",
    bannerBg: "#DCFCE7",
    bannerBorder: "#86EFAC",
    bannerTitle: "Pembayaran Berhasil!",
    bannerSub: "Terima kasih telah menggunakan layanan kami.",
  },
  pending: {
    pill: "#D97706",
    pillText: "Menunggu",
    bannerBg: "#FEF3C7",
    bannerBorder: "#FCD34D",
    bannerTitle: "Transaksi Sedang Diproses!",
    bannerSub: "Pantau status transaksi melalui menu Riwayat.",
  },
  failed: {
    pill: "#DC2626",
    pillText: "Gagal",
    bannerBg: "#FEE2E2",
    bannerBorder: "#FCA5A5",
    bannerTitle: "Transaksi Gagal!",
    bannerSub: "Hubungi admin jika ada kendala terkait transaksi ini.",
  },
};

function statusTheme(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (["success", "sukses", "lunas", "berhasil"].includes(normalized) || /sukses|berhasil|success|lunas/.test(normalized)) {
    return STATUS_THEMES.success;
  }

  if (["failed", "gagal", "ditolak", "batal"].includes(normalized) || /gagal|ditolak|batal|failed/.test(normalized)) {
    return STATUS_THEMES.failed;
  }

  return STATUS_THEMES.pending;
}

function truncate(value, maxLength) {
  const text = String(value == null ? "" : value);
  return text.length > maxLength
    ? text.slice(0, maxLength - 1) + "…"
    : text;
}

function buildSvg(info = {}) {
  const theme = statusTheme(info.status);
  const price = escXml(info.harga || "-");
  const product = escXml(truncate(info.produk || "-", 34));
  const provider = escXml(truncate(info.provider || "", 26));
  const customer = escXml(cleanText(info.pelanggan || "-", 100));
  const phone = escXml(cleanText(info.nomor || "-", 40));
  const customerId = escXml(cleanText(info.idPelanggan || "-", 60));
  const method = escXml(cleanText(info.metode || "-", 60));
  const date = escXml(cleanText(info.tanggal || "-", 60));
  const transactionId = escXml("#" + cleanText(info.trx || "-", 60));
  const reference = escXml(truncate(cleanText(info.snRef || "", 100), 22));
  const token = escXml(truncate(cleanText(info.token || "", 100), 22));

  const font = 'font-family="DejaVu Sans, sans-serif"';

  const label = (x, y, text) =>
    `<text x="${x}" y="${y}" ${font} font-size="11" fill="#94A3B8">${escXml(text)}</text>`;

  const value = (x, y, text, size = 14, fill = "#0F172A", weight = "bold") =>
    `<text x="${x}" y="${y}" ${font} font-size="${size}" fill="${fill}" font-weight="${weight}">${text}</text>`;

  const icon = (x, y, letter) =>
    `<rect x="${x}" y="${y - 15}" width="34" height="34" rx="9" fill="#EFF6FF"/>` +
    `<text x="${x + 17}" y="${y + 7}" ${font} font-size="14" fill="#2563EB" font-weight="bold" text-anchor="middle">${escXml(letter)}</text>`;

  let y = 120;
  const body = [];

  body.push(`<rect x="0" y="120" width="${WIDTH}" height="8" fill="#F1F5F9"/>`);

  y = 168;
  body.push(
    `<text x="32" y="${y}" ${font} font-size="22" fill="#0F172A" font-weight="bold">STRUK PEMBAYARAN</text>`
  );
  body.push(
    `<text x="32" y="${y + 20}" ${font} font-size="11" fill="#64748B">Bukti transaksi Anda</text>`
  );
  body.push(`<rect x="428" y="${y - 24}" width="180" height="52" rx="12" fill="#EFF6FF"/>`);
  body.push(`<text x="444" y="${y - 4}" ${font} font-size="10" fill="#64748B">No. Transaksi</text>`);
  body.push(value(444, y + 16, transactionId, 16));

  y += 64;
  body.push(icon(32, y, "T"));
  body.push(label(80, y - 6, "Tanggal Transaksi"));
  body.push(value(80, y + 12, date, 13));
  body.push(icon(336, y, "ID"));
  body.push(label(382, y - 6, "ID Pelanggan"));
  body.push(value(382, y + 12, customerId, 13));

  y += 54;
  body.push(icon(32, y, "P"));
  body.push(label(80, y - 6, "Nama Pelanggan"));
  body.push(value(80, y + 12, customer, 13));
  body.push(icon(336, y, "N"));
  body.push(label(382, y - 6, "No. HP"));
  body.push(value(382, y + 12, phone, 13));

  y += 54;
  body.push(icon(32, y, "M"));
  body.push(label(80, y - 6, "Metode Pembayaran"));
  body.push(value(80, y + 12, method, 13));
  body.push(icon(336, y, "✓"));
  body.push(label(382, y - 6, "Status"));
  body.push(
    `<rect x="382" y="${y - 2}" width="104" height="26" rx="13" fill="${theme.pill}"/>` +
      `<text x="434" y="${y + 16}" ${font} font-size="12" fill="#FFFFFF" font-weight="bold" text-anchor="middle">${theme.pillText}</text>`
  );

  y += 54;
  body.push(`<line x1="32" y1="${y}" x2="608" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`);

  y += 34;
  body.push(`<rect x="32" y="${y - 22}" width="576" height="36" rx="8" fill="#0F172A"/>`);
  body.push(`<text x="52" y="${y + 1}" ${font} font-size="11" fill="#CBD5E1" font-weight="bold">No</text>`);
  body.push(`<text x="92" y="${y + 1}" ${font} font-size="11" fill="#CBD5E1" font-weight="bold">Item / Layanan</text>`);
  body.push(`<text x="370" y="${y + 1}" ${font} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Harga</text>`);
  body.push(`<text x="450" y="${y + 1}" ${font} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Jumlah</text>`);
  body.push(`<text x="592" y="${y + 1}" ${font} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Total</text>`);

  y += 52;
  body.push(`<rect x="32" y="${y - 28}" width="576" height="56" fill="#F8FAFC"/>`);
  body.push(`<text x="52" y="${y + 1}" ${font} font-size="12" fill="#64748B">1</text>`);
  body.push(value(92, y - 2, product, 12));

  if (provider) {
    body.push(`<text x="92" y="${y + 14}" ${font} font-size="10" fill="#94A3B8">${provider}</text>`);
  }

  body.push(`<text x="370" y="${y + 1}" ${font} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);
  body.push(`<text x="450" y="${y + 1}" ${font} font-size="12" fill="#334155" text-anchor="end">1</text>`);
  body.push(`<text x="592" y="${y + 1}" ${font} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);

  y += 48;

  if (info.snRef) {
    body.push(label(352, y, "SN / Ref"));
    body.push(`<text x="592" y="${y}" ${font} font-size="11" fill="#334155" text-anchor="end">${reference}</text>`);
    y += 22;
  }

  if (info.token) {
    body.push(label(352, y, "Token"));
    body.push(`<text x="592" y="${y}" ${font} font-size="11" fill="#334155" text-anchor="end">${token}</text>`);
    y += 22;
  }

  y += 8;
  body.push(label(352, y, "Subtotal"));
  body.push(`<text x="592" y="${y}" ${font} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);

  y += 24;
  body.push(label(352, y, "Biaya Admin"));
  body.push(`<text x="592" y="${y}" ${font} font-size="12" fill="#334155" text-anchor="end">Rp 0</text>`);

  y += 16;
  body.push(`<line x1="352" y1="${y}" x2="592" y2="${y}" stroke="#CBD5E1" stroke-width="1"/>`);

  y += 30;
  body.push(value(352, y, "Total Pembayaran", 13));
  body.push(
    `<text x="592" y="${y + 4}" ${font} font-size="20" fill="#0F172A" font-weight="bold" text-anchor="end">${price}</text>`
  );

  y += 40;
  body.push(
    `<rect x="32" y="${y}" width="576" height="64" rx="14" fill="${theme.bannerBg}" stroke="${theme.bannerBorder}" stroke-width="1"/>`
  );
  body.push(`<circle cx="72" cy="${y + 32}" r="18" fill="${theme.pill}"/>`);
  body.push(
    `<path d="M64 ${y + 32} L70 ${y + 38} L81 ${y + 26}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  body.push(value(104, y + 28, theme.bannerTitle, 14, "#14532D"));
  body.push(
    `<text x="104" y="${y + 46}" ${font} font-size="11" fill="#4D7C0F">${escXml(theme.bannerSub)}</text>`
  );

  y += 92;
  body.push(value(32, y, "Butuh Bantuan?", 13));
  body.push(
    `<text x="32" y="${y + 18}" ${font} font-size="11" fill="#64748B">Hubungi kami jika ada kendala atau pertanyaan seputar transaksi ini.</text>`
  );

  y += 40;
  body.push(`<rect x="32" y="${y - 14}" width="220" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="44" y="${y + 4}" ${font} font-size="11" fill="#334155">WA  0896-2255-2652</text>`);
  body.push(`<rect x="264" y="${y - 14}" width="170" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="276" y="${y + 4}" ${font} font-size="11" fill="#334155">TG  @cs_konterpulsanet</text>`);

  y += 34;
  body.push(`<rect x="32" y="${y - 14}" width="200" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="44" y="${y + 4}" ${font} font-size="11" fill="#334155">WEB  konterpulsa.net</text>`);

  y += 40;
  const height = y + 56;

  const header =
    `<defs><linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0A1628"/>` +
    `<stop offset="55%" stop-color="#1E3A8A"/>` +
    `<stop offset="100%" stop-color="#2563EB"/>` +
    `</linearGradient></defs>` +
    `<rect x="0" y="0" width="${WIDTH}" height="120" fill="url(#hdr)"/>` +
    `<rect x="32" y="28" width="64" height="64" rx="16" fill="#2563EB" stroke="#60A5FA" stroke-width="2"/>` +
    `<text x="64" y="72" ${font} font-size="30" fill="#FFFFFF" font-weight="bold" text-anchor="middle">K</text>` +
    `<text x="112" y="56" ${font} font-size="24" fill="#FFFFFF" font-weight="bold">KONTER<tspan fill="#60A5FA">PULSA</tspan></text>` +
    `<text x="112" y="78" ${font} font-size="10" fill="#93C5FD" letter-spacing="2">SOLUSI DIGITAL UNTUK SEMUA</text>` +
    `<text x="608" y="42" ${font} font-size="12" fill="#E2E8F0" text-anchor="end">Transaksi Aman</text>` +
    `<text x="608" y="60" ${font} font-size="12" fill="#E2E8F0" text-anchor="end">Proses Cepat</text>` +
    `<text x="608" y="78" ${font} font-size="12" fill="#E2E8F0" text-anchor="end">Selalu Terpercaya</text>` +
    `<rect x="580" y="34" width="20" height="50" rx="4" fill="#3B82F6" opacity="0.35"/>`;

  const footer =
    `<rect x="0" y="${height - 56}" width="${WIDTH}" height="56" fill="url(#hdr)"/>` +
    `<text x="${WIDTH / 2}" y="${height - 22}" ${font} font-size="13" fill="#E2E8F0" text-anchor="middle" font-style="italic">— Terima Kasih Sudah Percaya —</text>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">` +
    header +
    `<rect x="0" y="120" width="${WIDTH}" height="${height - 176}" fill="#F8FAFC"/>` +
    body.join("") +
    footer +
    `</svg>`
  );
}

function renderSvg(svg, timeoutMs = RENDER_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const chunks = [];

    const child = spawn(
      "magick",
      ["-density", "144", "svg:-", "-background", "none", "png:-"],
      { stdio: ["pipe", "pipe", "ignore"] }
    );

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", () => finish(null));
    child.on("close", (code) => {
      const output = Buffer.concat(chunks);
      finish(code === 0 && output.length > 0 ? output : null);
    });

    child.stdin.on("error", () => finish(null));
    child.stdin.end(svg);
  });
}

async function generateStruk(info) {
  try {
    const svg = buildSvg(info);
    return await renderSvg(svg);
  } catch {
    return null;
  }
}

module.exports = {
  generateStruk,
  buildSvg,
  roundSell,
  formatRp,
  statusTheme,
};
