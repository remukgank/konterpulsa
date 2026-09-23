"use strict";

const { execFile } = require("child_process");

function escPango(s) {
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(esc(s == null ? "" : s));
}

function roundSell(harga) {
  const base = parseInt(String(harga == null ? 0 : harga).replace(/[^0-9]/g, ""), 10) || 0;
  let sell = Math.ceil(base / 1000) * 1000;
  if (sell - base < 1000) sell += 1000;
  return sell;
}

function formatRp(n) {
  return "Rp " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function generateStruk(info) {
  return new Promise((resolve) => {
    const mono = 'font_family="DejaVu Sans Mono"';
    const sans = 'font_family="DejaVu Sans"';
    const sz = (pt) => `size="${pt * 1024}"`;

    const row = (label, value) => {
      const v = typeof value === "undefined" || value === null || value === "" ? "-" : escPango(value);
      return `<span ${mono} ${sz(10)} foreground="#888888">${label.padEnd(14, " ")}</span><span ${mono} ${sz(10)}>${v}</span>`;
    };

    const rowBold = (label, value) => {
      const v = typeof value === "undefined" || value === null || value === "" ? "-" : escPango(value);
      return `<span ${sans} ${sz(10)} foreground="#888888">${label.padEnd(14, " ")}</span><span ${sans} ${sz(10)} weight="bold">${v}</span>`;
    };

    const hr = `<span ${mono} ${sz(8)} foreground="#E0E0E0">${"─".repeat(42)}</span>`;

    const lines = [
      `<span ${sans} ${sz(18)} weight="bold" foreground="#2E7D32">KONTERKUOTA</span>`,
      `<span ${mono} ${sz(8)} foreground="#AAAAAA">STRUK PEMBAYARAN</span>`,
      "",
      hr,
      "",
      row("No", "#" + info.trx),
      row("Tanggal", info.tanggal),
      "",
      hr,
      "",
      rowBold("Produk", info.produk),
      ...(info.provider ? [row("Provider", info.provider)] : []),
      row("Nomor", info.nomor),
      ...(info.idPelanggan ? [row("ID Pelanggan", info.idPelanggan)] : []),
      "",
      ...(info.snRef ? [rowBold("SN/Ref", info.snRef)] : []),
      ...(info.token ? [row("Token", info.token)] : []),
      ...(info.status ? [row("Status", info.status)] : []),
      "",
      hr,
      "",
      row("Metode", info.metode),
      "",
      hr,
      "",
      `<span ${sans} ${sz(13)} weight="bold" foreground="#2E7D32">TOTAL ${escPango(info.harga)}</span>`,
      "",
      hr,
      "",
      `<span ${mono} ${sz(8)} foreground="#AAAAAA">Terima kasih atas pembelian Anda</span>`,
    ];

    const markup = lines.join("\n");

    execFile(
      "magick",
      ["pango:" + markup, "-bordercolor", "#F1F8E9", "-border", "24x32", "-background", "white", "png:-"],
      { encoding: "buffer" },
      (err, out) => {
        if (err || !out || !out.length) return resolve(null);
        resolve(out);
      }
    );
  });
}

module.exports = { generateStruk, roundSell, formatRp };
