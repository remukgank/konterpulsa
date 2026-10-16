"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  parseCatalog,
  searchProducts,
  extractCsrfFromHtml,
  extractVar,
  decodeHtmlEntities,
  formatHarga,
} = require("../src/harga");

const ORDER_HTML = fs.readFileSync(path.join(__dirname, "fixtures", "order.html"), "utf8");

test("harga: parseCatalog extracts vouchers, payments, operators, csrf", () => {
  const cat = parseCatalog(ORDER_HTML);
  assert.ok(cat.vouchers.op1);
  assert.strictEqual(cat.vouchers.op1.length, 3);
  assert.strictEqual(cat.vouchers.op1[0].nama, "Pulsa Axis 5 Ribuan");
  assert.strictEqual(cat.vouchers.op1[0].harga, "5000");
  assert.strictEqual(cat.vouchers.op1[0].status, 1);
  assert.ok(cat.payments.qris_dana);
  assert.strictEqual(cat.payments.qris_dana.nama, "QRIS Dana");
  assert.ok(cat.operators.op1);
  assert.strictEqual(cat.operators.op1, "Axis");
});

test("harga: extractCsrfFromHtml", () => {
  assert.strictEqual(extractCsrfFromHtml(ORDER_HTML), "csrf-abc123");
  assert.strictEqual(extractCsrfFromHtml("<html></html>"), "");
});

test("harga: searchProducts matches case-insensitive", () => {
  const cat = parseCatalog(ORDER_HTML);
  const byAxis = searchProducts(cat, "axis");
  assert.ok(byAxis.length >= 2);
  assert.ok(byAxis.every((p) => p.nama.toLowerCase().includes("axis") || p.operatorName.toLowerCase().includes("axis")));
  const byTelkomsel = searchProducts(cat, "telkomsel");
  assert.strictEqual(byTelkomsel.length, 2);
  const none = searchProducts(cat, "zzznope");
  assert.strictEqual(none.length, 0);
});

test("harga: searchProducts returns status & id", () => {
  const cat = parseCatalog(ORDER_HTML);
  const r = searchProducts(cat, "pulsa axis 5");
  assert.strictEqual(r[0].voucherId, "v1");
  assert.strictEqual(r[0].status, 1);
});

test("harga: decodeHtmlEntities", () => {
  assert.strictEqual(decodeHtmlEntities("&amp; &lt; &gt;"), "& < >");
  assert.strictEqual(decodeHtmlEntities("&#39;"), "'");
  assert.strictEqual(decodeHtmlEntities("&#x1F600;"), "\u{1F600}");
});

test("harga: formatHarga", () => {
  assert.strictEqual(formatHarga("15000"), "Rp 15.000");
  assert.strictEqual(formatHarga(""), "Rp -");
  assert.strictEqual(formatHarga("abc"), "Rp -");
});
