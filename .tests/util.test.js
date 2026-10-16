"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const util = require("../src/util");

test("util: escHtml escapes HTML entities", () => {
  assert.strictEqual(util.escHtml("<b>x & y</b>"), "&lt;b&gt;x &amp; y&lt;/b&gt;");
  assert.strictEqual(util.escHtml(null), "");
  assert.strictEqual(util.escHtml(undefined), "");
});

test("util: escMd escapes Markdown specials", () => {
  assert.strictEqual(util.escMd("_italic_"), "\\_italic\\_");
  assert.strictEqual(util.escMd("*bold*"), "\\*bold\\*");
  assert.strictEqual(util.escMd("normal"), "normal");
});

test("util: mdEmphasize wraps safe text in asterisks", () => {
  assert.strictEqual(util.mdEmphasize("axis 5"), "*axis 5*");
  assert.strictEqual(util.mdEmphasize("_underscore_"), "\\_underscore\\_");
  assert.strictEqual(util.mdEmphasize(""), "");
});

test("util: fmt returns dash for empty/null", () => {
  assert.strictEqual(util.fmt(""), "-");
  assert.strictEqual(util.fmt(null), "-");
  assert.strictEqual(util.fmt(0), 0);
  assert.strictEqual(util.fmt("Rp 5.000"), "Rp 5.000");
});

test("util: chunk splits array", () => {
  assert.deepStrictEqual(util.chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
  assert.deepStrictEqual(util.chunk([1], 5), [[1]]);
  assert.deepStrictEqual(util.chunk([], 3), [[]]);
});

test("util: clampInt", () => {
  assert.strictEqual(util.clampInt("5", 1, 25, 10), 5);
  assert.strictEqual(util.clampInt("99", 1, 25, 10), 25);
  assert.strictEqual(util.clampInt("0", 1, 25, 10), 1);
  assert.strictEqual(util.clampInt("abc", 1, 25, 10), 10);
});

test("util: statusIcon", () => {
  assert.strictEqual(util.statusIcon("Pending"), "⏳");
  assert.strictEqual(util.statusIcon("Sukses"), "✅");
  assert.strictEqual(util.statusIcon("Gagal"), "❌");
  assert.strictEqual(util.statusIcon("-"), "▫️");
  assert.strictEqual(util.statusIcon(null), "▫️");
});

test("util: isPendingStatus", () => {
  assert.strictEqual(util.isPendingStatus({ statusPembayaran: "Pending" }), true);
  assert.strictEqual(util.isPendingStatus({ statusPengisian: "Menunggu proses" }), true);
  assert.strictEqual(util.isPendingStatus({ status: "Sukses" }), false);
  assert.strictEqual(util.isPendingStatus({}), false);
  assert.strictEqual(util.isPendingStatus(null), false);
});

test("util: sanitizeButtonText never empty, max 64", () => {
  assert.strictEqual(util.sanitizeButtonText("", "Menu"), "Menu");
  assert.strictEqual(util.sanitizeButtonText("   ", "Menu"), "Menu");
  assert.strictEqual(util.sanitizeButtonText("OK", "Menu"), "OK");
  const long = "a".repeat(100);
  assert.strictEqual(util.sanitizeButtonText(long, "Menu").length, 64);
});

test("util: sanitizeCallbackData max 64 byte, fallback noop", () => {
  assert.strictEqual(util.sanitizeCallbackData("cat:pulsa"), "cat:pulsa");
  assert.strictEqual(util.sanitizeCallbackData(""), "noop");
  const long = "x".repeat(200);
  const out = util.sanitizeCallbackData(long);
  assert.ok(Buffer.byteLength(out, "utf8") <= 64, out);
});

test("util: notifBlocksHtml bounds items & chars", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    judul: "Judul " + i,
    waktu: "10:00",
    teks: "Isi notifikasi nomor " + i + ". " + "x".repeat(500),
    unread: i % 2 === 0,
  }));
  const r = util.notifBlocksHtml(items, { maxItems: 3, maxText: 80, head: "H" });
  assert.strictEqual(r.shown, 3);
  assert.ok(r.html.includes("Judul 0"));
  assert.ok(!r.html.includes("Judul 3"));
  assert.ok(r.html.includes("Isi notifikasi nomor 0"));
});

test("util: notifBlocksHtml empty", () => {
  const r = util.notifBlocksHtml([], { head: "H" });
  assert.ok(r.html.includes("Belum ada notifikasi"));
});

test("util: suggestCommand returns closest", () => {
  const cmds = [{ command: "start" }, { command: "menu" }, { command: "order" }, { command: "harga" }];
  assert.strictEqual(util.suggestCommand("/starrt", cmds), "start");
  assert.strictEqual(util.suggestCommand("/ordr", cmds), "order");
  assert.strictEqual(util.suggestCommand("/xyzqw", cmds), "");
  assert.strictEqual(util.suggestCommand("", cmds), "");
});

test("util: tgTimeCell", () => {
  assert.strictEqual(util.tgTimeCell(""), null);
  assert.strictEqual(util.tgTimeCell("not a date"), "not a date");
  // format ISO-like (YYYY-MM-DD HH:mm) can be parsed
  const out = util.tgTimeCell("2026-10-16 10:00");
  assert.ok(out.includes("<tg-time unix="), out);
  assert.ok(out.includes("2026-10-16 10:00"), out);
  // Indonesian format is NOT parseable by Date.parse -> defensive fallback to raw text
  assert.strictEqual(util.tgTimeCell("16/10/2026 10:00"), "16/10/2026 10:00");
});

test("util: voucherBtnLabel truncates", () => {
  const v = { nama: "Paket Sangat Panjang Nama Yang Memang Melebihi Enam Puluh Empat Karakter", harga: "15000", status: 1 };
  const lbl = util.voucherBtnLabel(v);
  assert.strictEqual(lbl.length, 64, "panjang label = " + lbl.length + " : " + lbl);
  assert.ok(lbl.includes("15.000"), lbl);
  const kosong = { nama: "Kosong", harga: "1000", status: 0 };
  assert.ok(util.voucherBtnLabel(kosong).includes("(Kosong)"));
});

test("util: formatHargaCompact", () => {
  assert.strictEqual(util.formatHargaCompact("15000"), "15.000");
  assert.strictEqual(util.formatHargaCompact("abc"), "-");
});

test("util: checkNomorPrefix", () => {
  assert.strictEqual(util.checkNomorPrefix({ regex: "/^(0812)[0-9]+$/" }, "08123456"), true);
  const bad = util.checkNomorPrefix({ regex: "/^(0812)[0-9]+$/" }, "08133456");
  assert.strictEqual(bad !== true, true);
  assert.ok(bad.examples.includes("0812"));
  assert.strictEqual(util.checkNomorPrefix({}, "0812"), true);
  assert.strictEqual(util.checkNomorPrefix(null, "0812"), true);
});
