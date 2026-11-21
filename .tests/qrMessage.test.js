"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createQrMessageTracker } = require("../src/qrMessage");

function fakeBot(overrides = {}) {
  const calls = [];
  return {
    calls,
    async editMessageCaption(chatId, msgId, caption, options) {
      calls.push({ chatId, msgId, caption, options });
      if (overrides.throwError) throw overrides.throwError;
      return { ok: true };
    },
  };
}

test("track: simpan message_id per (chat, trx), abaikan nilai invalid", () => {
  const t = createQrMessageTracker(fakeBot());
  assert.equal(t.track(1170158500, "5353923", { message_id: 777 }), 777);
  assert.equal(t.has(1170158500, "5353923"), true);
  assert.equal(t.size, 1);
  assert.equal(t.track(1170158500, "5353923", { message_id: 0 }), null);
  assert.equal(t.track(999, "5353923", { message_id: 888 }), 888);
  assert.equal(t.size, 2);
});

test("finalize: edit caption + hapus keyboard, dan idempoten", async () => {
  const bot = fakeBot();
  const t = createQrMessageTracker(bot);
  t.track(1170158500, "5353923", { message_id: 777 });

  const first = await t.finalize(1170158500, "5353923", "✅ lunas");
  assert.equal(first.edited, true);
  assert.equal(bot.calls.length, 1);
  assert.deepEqual(bot.calls[0], {
    chatId: 1170158500,
    msgId: 777,
    caption: "✅ lunas",
    options: { parse_mode: "Markdown", reply_markup: { inline_keyboard: [] } },
  });

  const second = await t.finalize(1170158500, "5353923", "✅ lunas");
  assert.equal(second.skipped, true);
  assert.equal(bot.calls.length, 1, "finalize tidak boleh mengedit dua kali");
});

test("finalize: error 'not modified' / 'message to edit not found' tidak melempar", async () => {
  for (const desc of ["Bad Request: message is not modified", "Bad Request: message to edit not found"]) {
    const err = Object.assign(new Error(desc), { description: desc });
    const t = createQrMessageTracker(fakeBot({ throwError: err }));
    t.track(1, "42", { message_id: 5 });
    const r = await t.finalize(1, "42", "caption");
    assert.equal(r.failed, true);
    assert.equal(r.msgId, 5);
    assert.equal(t.has(1, "42"), false, "entri tetap diklaim walau edit gagal");
  }
});

test("prune: entri yang melewati TTL dibuang", () => {
  const t = createQrMessageTracker(fakeBot(), { ttlMs: 1000 });
  t.track(1, "a", { message_id: 1 });
  t.prune(Date.now());
  assert.equal(t.size, 1);
  t.prune(Date.now() + 2000);
  assert.equal(t.size, 0);
});

test("inlineButtons: 'noop' sengaja tidak memicu warning, data kosong memicu", () => {
  const { inlineButtons } = require("../bot/telegram");
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    const intentional = inlineButtons([[{ text: "Halaman 1/2", data: "noop" }]]);
    assert.equal(intentional.reply_markup.inline_keyboard[0][0].callback_data, "noop");
    assert.equal(warnings.length, 0, "tombol penanda halaman tidak boleh dianggap error");

    inlineButtons([[{ text: "Tombol rusak" }]]);
    assert.equal(warnings.length, 1, "data yang hilang tetap harus diperingatkan");
  } finally {
    console.warn = originalWarn;
  }
});
