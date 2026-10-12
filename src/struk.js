"use strict";

const { spawn } = require("child_process");

function escXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function roundSell(harga) {
  const base = parseInt(String(harga == null ? 0 : harga).replace(/[^0-9]/g, ""), 10) || 0;
  const min = base + 1000;
  const n0 = Math.max(0, Math.floor(min / 5000) - 1);
  let best = 0;
  for (let n = n0; n <= n0 + 3; n++) {
    for (const cand of [n * 5000, n * 5000 + 2000]) {
      if (cand >= min && (best === 0 || cand < best)) best = cand;
    }
  }
  return best || min;
}

function formatRp(n) {
  return "Rp " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function statusTheme(status) {
  const s = String(status || "");
  if (/sukses|lunas|berhasil|success/i.test(s)) {
    return {
      pill: "#16A34A",
      pillText: "Berhasil",
      bannerBg: "#DCFCE7",
      bannerBorder: "#86EFAC",
      bannerTitle: "Pembayaran Berhasil!",
      bannerSub: "Terima kasih telah menggunakan layanan kami.",
    };
  }
  if (/tunggu|pending|menunggu|proses|belum/i.test(s)) {
    return {
      pill: "#D97706",
      pillText: "Menunggu",
      bannerBg: "#FEF3C7",
      bannerBorder: "#FCD34D",
      bannerTitle: "Transaksi Sedang Diproses!",
      bannerSub: "Pantau status transaksi melalui menu Riwayat.",
    };
  }
  if (/gagal|ditolak|batal|failed/i.test(s)) {
    return {
      pill: "#DC2626",
      pillText: "Gagal",
      bannerBg: "#FEE2E2",
      bannerBorder: "#FCA5A5",
      bannerTitle: "Transaksi Gagal!",
      bannerSub: "Hubungi admin jika ada kendala terkait transaksi ini.",
    };
  }
  return {
    pill: "#64748B",
    pillText: "Pending",
    bannerBg: "#E2E8F0",
    bannerBorder: "#CBD5E1",
    bannerTitle: "Status Belum Diketahui",
    bannerSub: "Pantau perkembangan transaksi melalui menu Riwayat.",
  };
}

function truncate(s, n) {
  const t = String(s == null ? "" : s);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function buildSvg(info) {
  const W = 640;
  const theme = statusTheme(info.status);
  const price = escXml(info.harga || "-");
  const produk = escXml(truncate(info.produk || "-", 34));
  const provider = escXml(truncate(info.provider || "", 26));
  const pelanggan = escXml(info.pelanggan || "-");
  const nomor = escXml(info.nomor || "-");
  const idPel = escXml(info.idPelanggan || "-");
  const metode = escXml(info.metode || "-");
  const tanggal = escXml(info.tanggal || "-");
  const trx = escXml("#" + info.trx);

  const F = 'font-family="DejaVu Sans, sans-serif"';
  const label = (x, y, t) =>
    `<text x="${x}" y="${y}" ${F} font-size="11" fill="#94A3B8">${escXml(t)}</text>`;
  const value = (x, y, t, size, fill, weight) =>
    `<text x="${x}" y="${y}" ${F} font-size="${size || 14}" fill="${fill || "#0F172A"}" font-weight="${weight || "bold"}">${t}</text>`;
  const icon = (x, y, letter) =>
    `<rect x="${x}" y="${y - 15}" width="34" height="34" rx="9" fill="#EFF6FF"/>` +
    `<text x="${x + 17}" y="${y + 7}" ${F} font-size="14" fill="#2563EB" font-weight="bold" text-anchor="middle">${letter}</text>`;

  let y = 120;
  const body = [];

  body.push(`<rect x="0" y="120" width="${W}" height="8" fill="#F1F5F9"/>`);

  y = 168;
  body.push(`<text x="32" y="${y}" ${F} font-size="22" fill="#0F172A" font-weight="bold">STRUK PEMBAYARAN</text>`);
  body.push(`<text x="32" y="${y + 20}" ${F} font-size="11" fill="#64748B">Bukti transaksi Anda</text>`);
  body.push(`<rect x="428" y="${y - 24}" width="180" height="52" rx="12" fill="#EFF6FF"/>`);
  body.push(`<text x="444" y="${y - 4}" ${F} font-size="10" fill="#64748B">No. Transaksi</text>`);
  body.push(value(444, y + 16, trx, 16));

  y += 64;
  body.push(icon(32, y, "T"));
  body.push(label(80, y - 6, "Tanggal Transaksi"));
  body.push(value(80, y + 12, tanggal, 13));
  body.push(icon(336, y, "ID"));
  body.push(label(382, y - 6, "ID Pelanggan"));
  body.push(value(382, y + 12, idPel, 13));

  y += 54;
  body.push(icon(32, y, "P"));
  body.push(label(80, y - 6, "Nama Pelanggan"));
  body.push(value(80, y + 12, pelanggan, 13));
  body.push(icon(336, y, "N"));
  body.push(label(382, y - 6, "No. HP"));
  body.push(value(382, y + 12, nomor, 13));

  y += 54;
  body.push(icon(32, y, "M"));
  body.push(label(80, y - 6, "Metode Pembayaran"));
  body.push(value(80, y + 12, metode, 13));
  body.push(icon(336, y, "✓"));
  body.push(label(382, y - 6, "Status"));
  body.push(
    `<rect x="382" y="${y - 2}" width="104" height="26" rx="13" fill="${theme.pill}"/>` +
    `<text x="434" y="${y + 16}" ${F} font-size="12" fill="#FFFFFF" font-weight="bold" text-anchor="middle">${theme.pillText}</text>`
  );

  y += 54;
  body.push(`<line x1="32" y1="${y}" x2="608" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`);

  y += 34;
  body.push(`<rect x="32" y="${y - 22}" width="576" height="36" rx="8" fill="#0F172A"/>`);
  body.push(`<text x="52" y="${y + 1}" ${F} font-size="11" fill="#CBD5E1" font-weight="bold">No</text>`);
  body.push(`<text x="92" y="${y + 1}" ${F} font-size="11" fill="#CBD5E1" font-weight="bold">Item / Layanan</text>`);
  body.push(`<text x="370" y="${y + 1}" ${F} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Harga</text>`);
  body.push(`<text x="450" y="${y + 1}" ${F} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Jumlah</text>`);
  body.push(`<text x="592" y="${y + 1}" ${F} font-size="11" fill="#CBD5E1" font-weight="bold" text-anchor="end">Total</text>`);

  y += 52;
  body.push(`<rect x="32" y="${y - 28}" width="576" height="56" rx="0" fill="#F8FAFC"/>`);
  body.push(`<text x="52" y="${y + 1}" ${F} font-size="12" fill="#64748B">1</text>`);
  body.push(value(92, y - 2, produk, 12));
  if (provider) body.push(`<text x="92" y="${y + 14}" ${F} font-size="10" fill="#94A3B8">${provider}</text>`);
  body.push(`<text x="370" y="${y + 1}" ${F} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);
  body.push(`<text x="450" y="${y + 1}" ${F} font-size="12" fill="#334155" text-anchor="end">1</text>`);
  body.push(`<text x="592" y="${y + 1}" ${F} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);

  y += 48;
  if (info.snRef) {
    body.push(label(352, y, "SN / Ref"));
    body.push(`<text x="592" y="${y}" ${F} font-size="11" fill="#334155" text-anchor="end">${escXml(truncate(info.snRef, 22))}</text>`);
    y += 22;
  }
  if (info.token) {
    body.push(label(352, y, "Token"));
    body.push(`<text x="592" y="${y}" ${F} font-size="11" fill="#334155" text-anchor="end">${escXml(truncate(info.token, 22))}</text>`);
    y += 22;
  }

  y += 8;
  body.push(label(352, y, "Subtotal"));
  body.push(`<text x="592" y="${y}" ${F} font-size="12" fill="#334155" text-anchor="end">${price}</text>`);
  y += 24;
  body.push(label(352, y, "Biaya Admin"));
  body.push(`<text x="592" y="${y}" ${F} font-size="12" fill="#334155" text-anchor="end">Rp 0</text>`);
  y += 16;
  body.push(`<line x1="352" y1="${y}" x2="592" y2="${y}" stroke="#CBD5E1" stroke-width="1"/>`);
  y += 30;
  body.push(value(352, y, "Total Pembayaran", 13));
  body[body.length - 1] = `<text x="592" y="${y + 4}" ${F} font-size="20" fill="#0F172A" font-weight="bold" text-anchor="end">${price}</text>`;

  y += 40;
  body.push(
    `<rect x="32" y="${y}" width="576" height="64" rx="14" fill="${theme.bannerBg}" stroke="${theme.bannerBorder}" stroke-width="1"/>`
  );
  body.push(`<circle cx="72" cy="${y + 32}" r="18" fill="${theme.pill}"/>`);
  body.push(`<path d="M64 ${y + 32} L70 ${y + 38} L81 ${y + 26}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  body.push(value(104, y + 28, theme.bannerTitle, 14, "#14532D"));
  body.push(`<text x="104" y="${y + 46}" ${F} font-size="11" fill="#4D7C0F">${escXml(theme.bannerSub)}</text>`);

  y += 92;
  body.push(value(32, y, "Butuh Bantuan?", 13));
  body.push(`<text x="32" y="${y + 18}" ${F} font-size="11" fill="#64748B">Hubungi kami jika ada kendala atau pertanyaan seputar transaksi ini.</text>`);
  y += 40;
  body.push(`<rect x="32" y="${y - 14}" width="220" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="44" y="${y + 4}" ${F} font-size="11" fill="#334155">WA  0896-2255-2652</text>`);
  body.push(`<rect x="264" y="${y - 14}" width="170" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="276" y="${y + 4}" ${F} font-size="11" fill="#334155">TG  @cs_konterpulsanet</text>`);
  y += 34;
  body.push(`<rect x="32" y="${y - 14}" width="200" height="26" rx="13" fill="#F1F5F9"/>`);
  body.push(`<text x="44" y="${y + 4}" ${F} font-size="11" fill="#334155">WEB  konterpulsa.net</text>`);

  y += 40;
  const H = y + 56;

  const header =
    `<defs><linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#0A1628"/>` +
    `<stop offset="55%" stop-color="#1E3A8A"/>` +
    `<stop offset="100%" stop-color="#2563EB"/>` +
    `</linearGradient></defs>` +
    `<rect x="0" y="0" width="${W}" height="120" fill="url(#hdr)"/>` +
    `<rect x="32" y="28" width="64" height="64" rx="16" fill="#2563EB" stroke="#60A5FA" stroke-width="2"/>` +
    `<text x="64" y="72" ${F} font-size="30" fill="#FFFFFF" font-weight="bold" text-anchor="middle">K</text>` +
    `<text x="112" y="56" ${F} font-size="24" fill="#FFFFFF" font-weight="bold">KONTER<tspan fill="#60A5FA">PULSA</tspan></text>` +
    `<text x="112" y="78" ${F} font-size="10" fill="#93C5FD" letter-spacing="2">SOLUSI DIGITAL UNTUK SEMUA</text>` +
    `<text x="608" y="42" ${F} font-size="12" fill="#E2E8F0" text-anchor="end">Transaksi Aman</text>` +
    `<text x="608" y="60" ${F} font-size="12" fill="#E2E8F0" text-anchor="end">Proses Cepat</text>` +
    `<text x="608" y="78" ${F} font-size="12" fill="#E2E8F0" text-anchor="end">Selalu Terpercaya</text>` +
    `<rect x="580" y="34" width="20" height="50" rx="4" fill="#3B82F6" opacity="0.35"/>`;

  const footer =
    `<rect x="0" y="${H - 56}" width="${W}" height="56" fill="url(#hdr)"/>` +
    `<text x="${W / 2}" y="${H - 22}" ${F} font-size="13" fill="#E2E8F0" text-anchor="middle" font-style="italic">— Terima Kasih Sudah Percaya —</text>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    header +
    `<rect x="0" y="120" width="${W}" height="${H - 176}" fill="#F8FAFC"/>` +
    body.join("") +
    footer +
    `</svg>`
  );
}

function generateStruk(info) {
  return new Promise((resolve) => {
    let svg;
    try {
      svg = buildSvg(info);
    } catch (e) {
      return resolve(null);
    }
    const child = spawn("magick", ["-density", "144", "svg:-", "-background", "none", "png:-"]);
    const chunks = [];
    child.stdout.on("data", (d) => chunks.push(d));
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      const out = Buffer.concat(chunks);
      if (code !== 0 || !out.length) return resolve(null);
      resolve(out);
    });
    child.stdin.write(svg);
    child.stdin.end();
  });
}

module.exports = { generateStruk, roundSell, formatRp, statusTheme };
