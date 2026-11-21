"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { konfirmHttpHint, confirmGate } = require("../src/util");
const { createQrMessageTracker } = require("../src/qrMessage");

/* ---------- kalimat status konfirmasi (bukan kode HTTP mentah) ---------- */

test("konfirmasi: 2xx/3xx dianggap diterima, kode mentah tidak bocor ke pengguna", () => {
  for (const code of [200, 201, 204, 302, 307]) {
    const t = konfirmHttpHint(code);
    assert.match(t, /Konfirmasi diterima/);
    assert.equal(t.includes(String(code)), false, "kode HTTP tidak boleh tampil: " + t);
  }
});

test("konfirmasi: 4xx ditolak, 5xx server bermasalah, input aneh tetap aman", () => {
  assert.match(konfirmHttpHint(403), /ditolak server/);
  assert.match(konfirmHttpHint(429), /ditolak server/);
  assert.match(konfirmHttpHint(502), /sedang bermasalah/);
  assert.match(konfirmHttpHint("307"), /diterima/);
  assert.match(konfirmHttpHint(undefined), /Konfirmasi terkirim/);
  assert.match(konfirmHttpHint("abc"), /Konfirmasi terkirim/);
});

/* ---------- gerbang anti-spam ---------- */

test("konfirmasi: status final tidak memanggil server lagi", () => {
  for (const status of ["Sukses / Sukses", "sukses", "Batal", "Gagal / Gagal", "Ditolak"]) {
    const g = confirmGate({ status, lastAt: 0, now: 1_000_000 });
    assert.equal(g.blocked, true, status);
    assert.equal(g.reason, "final");
    assert.ok(g.toast.length > 0 && g.toast.length <= 200);
  }
  assert.equal(confirmGate({ status: "Pending / Pending", now: 1_000_000 }).blocked, false);
});

test("konfirmasi: status pembayaran sukses tapi pengisian pending tidak diberi emoji selesai", () => {
  const g = confirmGate({ status: "Sukses / Pending", lastAt: 0, now: 1_000_000 });
  assert.equal(g.blocked, true);
  assert.equal(g.toast.includes("✅"), false);
  assert.match(g.toast, /tidak perlu konfirmasi lagi/);
});

test("konfirmasi: cooldown 20 detik menahan tekan berulang dan memberi sisa waktu", () => {
  const now = 1_000_000;
  const lastAt = now - 5_000;
  const g = confirmGate({ status: "Pending / Pending", lastAt, now, cooldownMs: 20000 });
  assert.equal(g.blocked, true);
  assert.equal(g.reason, "cooldown");
  assert.equal(g.waitMs, 15_000);
  assert.match(g.toast, /Tunggu 15 detik/);

  const ok = confirmGate({ status: "Pending / Pending", lastAt: now - 21_000, now, cooldownMs: 20000 });
  assert.equal(ok.blocked, false);
});

/* ---------- satu pesan status per transaksi (anti-spam) ---------- */

const source = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
const start = source.indexOf("const STATUS_MSG = new Map();");
const end = source.indexOf("\nfunction gracefulShutdown", start);
const statusSource = source.slice(start, end);

function makeContext() {
  const calls = { replies: [], edits: [], answered: [], fails: 0 };
  let nextId = 500;
  const bot = {
    editMessageText: async (chatId, msgId, text, opts) => {
      if (calls.editShouldFail) {
        calls.editShouldFail = false;
        throw new Error("Bad Request: message to edit not found");
      }
      calls.edits.push({ chatId, msgId, text, opts });
    },
    answerCallbackQuery: async (id, opts) => {
      calls.answered.push({ id, opts });
    },
  };
  const context = vm.createContext({
    bot,
    createQrMessageTracker, // dipakai cuplikan STATUS_MSG di index.js
    reply: async (msg, text, opts) => {
      calls.replies.push({ chatId: msg.chat.id, text, opts });
      return { message_id: nextId++ };
    },
    console: { log: () => {} },
  });
  vm.runInContext(statusSource, context);
  return { context, calls };
}

test("status: kirim sekali lalu edit pesan yang sama, teks duplikat dilewati", async () => {
  const { context, calls } = makeContext();
  const first = await context.updateStatusOnce(1, 5345833, "Pending / Pending");
  assert.equal(first.sent, true);
  assert.equal(calls.replies.length, 1);
  assert.equal(calls.replies[0].chatId, 1);

  const dup = await context.updateStatusOnce(1, 5345833, "Pending / Pending");
  assert.equal(dup.skipped, true);
  assert.equal(calls.replies.length, 1, "teks sama tidak boleh kirim pesan baru");
  assert.equal(calls.edits.length, 0);

  const up = await context.updateStatusOnce(1, 5345833, "Sukses / Sukses");
  assert.equal(up.edited, true);
  assert.equal(calls.replies.length, 1, "update harus edit, bukan pesan baru");
  assert.equal(calls.edits.length, 1);
  assert.equal(calls.edits[0].msgId, first.msgId);
  assert.equal(calls.edits[0].text, "Sukses / Sukses");
});

test("status: transaksi berbeda punya pesan sendiri (tidak saling menimpa)", async () => {
  const { context, calls } = makeContext();
  const a = await context.updateStatusOnce(1, 111, "Pending");
  const b = await context.updateStatusOnce(1, 222, "Pending");
  assert.notEqual(a.msgId, b.msgId);
  assert.equal(calls.replies.length, 2);
  await context.updateStatusOnce(1, 222, "Sukses");
  assert.equal(calls.edits[0].msgId, b.msgId);
});

test("status: chat berbeda untuk transaksi sama tetap dipisah", async () => {
  const { context } = makeContext();
  const a = await context.updateStatusOnce(10, 111, "Pending");
  const b = await context.updateStatusOnce(20, 111, "Pending");
  assert.notEqual(a.msgId, b.msgId);
});

test("status: pesan yang sudah dihapus diedit gagal -> fallback kirim pesan baru", async () => {
  const { context, calls } = makeContext();
  await context.updateStatusOnce(1, 9, "Pending");
  calls.editShouldFail = true;
  const res = await context.updateStatusOnce(1, 9, "Sukses");
  assert.equal(res.sent, true);
  assert.equal(calls.replies.length, 2, "harus fallback kirim baru setelah edit gagal");
});

test("status: draft stream ditutup saat status hanya diedit (tidak menggantung)", async () => {
  const { context, calls } = makeContext();
  let closed = 0;
  await context.updateStatusOnce(1, 77, "Pending", { close: () => { closed += 1; } });
  assert.equal(closed, 0, "saat kirim pertama, draft diganti finish() bukan close()");

  const res = await context.updateStatusOnce(1, 77, "Sukses", { close: () => { closed += 1; } });
  assert.equal(res.edited, true);
  assert.equal(closed, 1, "draft harus ditutup setelah edit");

  await context.updateStatusOnce(1, 77, "Sukses", { close: () => { closed += 1; } });
  assert.equal(closed, 2, "draft juga ditutup saat teks sama (skip)");
  assert.equal(calls.replies.length, 1);
});

test("status: toast konfirmasi dijawab sekali dengan teks <= 200 karakter", async () => {
  const { context, calls } = makeContext();
  context.ackWithToast({ id: "cb-1" }, "Tunggu 15 detik sebelum konfirmasi lagi.");
  assert.equal(calls.answered.length, 1);
  assert.equal(calls.answered[0].id, "cb-1");
  assert.match(calls.answered[0].opts.text, /Tunggu 15 detik/);
  assert.ok(calls.answered[0].opts.text.length <= 200);
  assert.equal(vm.runInContext("ACKED_QUERIES.has('cb-1')", context), true);
});
