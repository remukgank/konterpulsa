"use strict";

/**
 * Lifecycle pesan foto QRIS.
 *
 * Foto QR yang dikirim bot dulu tidak pernah disimpan message_id-nya, sehingga
 * tombol "Konfirmasi Pembayaran" tetap aktif walau transaksi sudah final.
 * Modul ini menyimpan message_id per (chat, trx), lalu mengubah caption dan
 * mengosongkan keyboard saat status akhir tercapai.
 *
 * Idempoten: finalize() mengklaim (menghapus) entri lebih dulu sebelum edit,
 * sehingga pemanggilan ganda dari konfirmasi / polling / notifikasi tidak
 * menyebabkan editMessageCaption dobel.
 *
 * [DOCS https://core.telegram.org/bots/api#editmessagecaption]
 * [DOCS https://core.telegram.org/bots/api#editmessagereplymarkup]
 */
function createQrMessageTracker(bot, opts = {}) {
  const ttlMs = Number.isFinite(opts.ttlMs) ? opts.ttlMs : 24 * 60 * 60 * 1000;
  const log = typeof opts.log === "function" ? opts.log : () => {};
  /** @type {Map<string, {msgId:number, at:number}>} */
  const messages = new Map();

  const keyOf = (chatId, trx) => String(chatId) + ":" + String(trx);

  function track(chatId, trx, sent) {
    const msgId = sent && Number(sent.message_id);
    if (!msgId) return null;
    messages.set(keyOf(chatId, trx), { msgId, at: Date.now() });
    return msgId;
  }

  function has(chatId, trx) {
    return messages.has(keyOf(chatId, trx));
  }

  function prune(now = Date.now()) {
    for (const [k, v] of messages) if (now - v.at > ttlMs) messages.delete(k);
  }

  async function finalize(chatId, trx, caption) {
    const key = keyOf(chatId, trx);
    const rec = messages.get(key);
    if (!rec) return { skipped: true };
    messages.delete(key); // klaim dulu -> aman dipanggil dari 3 jalur sekaligus

    try {
      const result = await bot.editMessageCaption(chatId, rec.msgId, caption, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [] }, // [DOCS] keyboard kosong = tombol hilang
      });
      return { edited: true, msgId: rec.msgId, result };
    } catch (e) {
      const desc = String((e && (e.description || e.message)) || "").toLowerCase();
      // "not modified" dan pesan yang sudah dihapus user bukan error nyata.
      if (!desc.includes("not modified") && !desc.includes("message to edit not found")) {
        log("[QRMSG] gagal finalisasi foto QR #" + trx + ": " + (e && e.message));
      }
      return { failed: true, msgId: rec.msgId, error: e && e.message };
    }
  }

  return {
    track,
    has,
    prune,
    finalize,
    get size() {
      return messages.size;
    },
  };
}

module.exports = { createQrMessageTracker };
