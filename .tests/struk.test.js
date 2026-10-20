"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateStruk, buildSvg, roundSell, formatRp, statusTheme, estTextWidth, fitSmartLines } = require("../src/struk");

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

test("struk: SN/Ref & Token panjang tampil penuh tanpa elipsis", () => {
  const sn = "1116-5582-3664-4430-2835-4927-3310";
  const token = "1234567890123456789012345678901";
  const svg = buildSvg({
    trx: "5344150", tanggal: "17/10/2026 05:12", produk: "PLN Prabayar — 50.000",
    provider: "Token PLN", nomor: "081252615009", idPelanggan: "86007117103", pelanggan: "-",
    metode: "QRIS", harga: "Rp 55.000", snRef: sn, token, status: "sukses",
  });
  assert.ok(svg.includes(sn), "SN utuh harus tampil penuh");
  assert.ok(svg.includes(token), "Token utuh harus tampil penuh");
  assert.ok(!svg.includes("…"), "tidak boleh ada elipsis pemotong");
});

test("struk: SN sangat panjang pada struk umum wrap penuh tanpa elipsis", () => {
  const sn = "1116-5582-3664-4430-2835-4927-3310-9988-7766-5544-3322";
  const svg = buildSvg({
    trx: "1", tanggal: "", produk: "Voucher Axis — 100.000.000", provider: "Axis",
    nomor: "081234567890", idPelanggan: "", pelanggan: "", metode: "QRIS",
    harga: "Rp 100.000.000", snRef: sn, token: "", status: "sukses",
  });
  const first = "1116-5582-3664-4430-2835-4927-";
  const second = "3310-9988-7766-5544-3322";
  assert.ok(svg.includes(first), "baris 1 SN harus tampil");
  assert.ok(svg.includes(second), "baris 2 SN harus tampil");
  assert.ok(!svg.includes("…"));
  // baris total: label di atas nilai (stacked), tidak berdampingan
  assert.ok(svg.includes(">Total Pembayaran</text>"));
  // nama item panjang + harga besar: font item menyusut supaya tidak menabrak kolom Harga
  assert.ok(/font-size="(?:9|10|11)"/.test(svg), "font item harus menyusut pada kasus panjang");
});

test("struk PLN memakai desain baru dan menampilkan SN/Ref lengkap sebagai informasi utama", () => {
  const sn = "3492-8081-2284-6100-5837-2944/MESIN/R1M/900VA/33.70";
  const svg = buildSvg({
    trx: "1234567", tanggal: "20/10/2026 10:42",
    produk: "PLN Prabayar — 50.000", provider: "Token PLN",
    nomor: "0812-0000-0000", idPelanggan: "86007117103", pelanggan: "Pelanggan PLN",
    metode: "QRIS", harga: "Rp 55.000", snRef: sn, token: "", status: "sukses",
  });

  assert.ok(svg.includes("PLN PRABAYAR"));
  assert.ok(svg.includes("SN / REF"));
  assert.ok(svg.includes("Referensi transaksi"));
  assert.ok(!svg.includes("BUKAN TOKEN"));
  const snLines = [...svg.matchAll(/<text class="pln-snref-code"[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
  assert.strictEqual(snLines.join(""), sn, "seluruh SN/Ref harus tampil persis");
});

test("struk PLN membedakan token dan SN/Ref serta tidak memotong kode panjang", () => {
  const sn = "3492-8081-2284-6100-5837-2944/MESIN/R1M/900VA/33.70";
  const token = "1234567890123456789012345678901234567890";
  const svg = buildSvg({
    trx: "1234567", tanggal: "20/10/2026 10:42",
    produk: "PLN Prabayar — 100.000", provider: "Token PLN",
    nomor: "0812-0000-0000", idPelanggan: "86007117103", pelanggan: "Pelanggan PLN",
    metode: "QRIS", harga: "Rp 105.000", snRef: sn, token, status: "sukses",
  });

  const snLines = [...svg.matchAll(/<text class="pln-snref-code"[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
  const tokenLines = [...svg.matchAll(/<text class="pln-token-code"[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
  assert.strictEqual(snLines.join(""), sn);
  assert.strictEqual(tokenLines.join(""), token);
  assert.ok(svg.indexOf("SN / REF") < svg.indexOf("KODE UNTUK METERAN"));
  assert.ok(!svg.includes("…"));
});

test("struk: estTextWidth & fitSmartLines", () => {
  const w = estTextWidth("1234567890", 11, false);
  assert.ok(w > 50 && w < 90, "estimasi lebar wajar: " + w);
  const short = fitSmartLines("ABC-123", 200, 11);
  assert.strictEqual(short.length, 1);
  assert.strictEqual(short[0].size, 11);
  const long = fitSmartLines("a".repeat(200), 200, 11);
  assert.ok(long.length >= 2, "teks sangat panjang harus wrap");
  assert.ok(long.every((l) => l.size >= 8), "ukuran font minimal 8");
});
