"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateStruk, buildSvg, roundSell, formatRp, statusTheme } = require("../src/struk");

test("struk: roundSell psychological pricing", () => {
  // base=5000 -> minimum=6000 -> start=0 -> candidates 0,2k,5k,7k,10k... smallest >=6000 is 7000
  assert.strictEqual(roundSell(5000), 7000);
  // base=1000 -> minimum=2000 -> n=0 candidate 2000 >= 2000 -> best 2000
  assert.strictEqual(roundSell(1000), 2000);
  // base=0 -> minimum=1000 -> n=0 candidate 2000 >= 1000 -> best 2000 (best || minimum = 2000)
  assert.strictEqual(roundSell(""), 2000);
  assert.strictEqual(roundSell(null), 2000);
  assert.strictEqual(roundSell(0), 2000);
});

test("struk: formatRp", () => {
  assert.strictEqual(formatRp(15000), "Rp 15.000");
  assert.strictEqual(formatRp("15000"), "Rp 15.000");
  assert.strictEqual(formatRp(null), "Rp 0");
  assert.strictEqual(formatRp("abc"), "Rp 0");
});

test("struk: statusTheme", () => {
  assert.strictEqual(statusTheme("sukses").pill, "#16A34A");
  assert.strictEqual(statusTheme("SUKSES").pill, "#16A34A");
  assert.strictEqual(statusTheme("lunas").pill, "#16A34A");
  assert.strictEqual(statusTheme("gagal").pill, "#DC2626");
  assert.strictEqual(statusTheme("dibatalkan").pill, "#DC2626");
  assert.strictEqual(statusTheme("pending").pill, "#D97706");
  assert.strictEqual(statusTheme("").pill, "#D97706");
  assert.strictEqual(statusTheme(null).pill, "#D97706");
});

test("struk: buildSvg returns SVG string with escaped values", () => {
  const svg = buildSvg({
    trx: "123", tanggal: "16/10/2026 10:00", produk: "Pulsa Axis 5 Ribuan",
    provider: "Axis", nomor: "081234567890", idPelanggan: "", pelanggan: "Budi",
    metode: "QRIS Dana", harga: formatRp(roundSell(5000)), snRef: "", token: "", status: "sukses",
  });
  assert.strictEqual(typeof svg, "string");
  assert.ok(svg.includes("<svg"), svg.slice(0, 60));
  assert.ok(svg.includes("</svg>"));
  assert.ok(svg.includes("STRUK PEMBAYARAN"));
  assert.ok(svg.includes("081234567890"));
  // XSS attempt escaped
  const sxss = buildSvg({
    trx: "1", tanggal: "", produk: "<script>alert(1)</script>", provider: "", nomor: "",
    idPelanggan: "", pelanggan: "", metode: "", harga: "Rp 0", snRef: "", token: "", status: "pending",
  });
  assert.ok(!sxss.includes("<script>"));
  assert.ok(sxss.includes("&lt;script&gt;"));
});
