"use strict";

const { Bot, InputFile } = require("grammy");
const { BOT_TOKEN, ALLOWED_CHAT_IDS } = require("../src/config");
const { sanitizeButtonText, sanitizeCallbackData } = require("../src/util");

let bot = null;
let core = null;

function safeCall(fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === "function") {
      r.catch((e) => console.error("[BOT] handler error:", e && e.message));
    }
  } catch (e) {
    console.error("[BOT] handler error:", e && e.message);
  }
}

async function callWith429Retry(fn, label) {
  try {
    return await fn();
  } catch (e) {
    const code = e && e.error_code;
    const retryAfter = e && e.parameters && e.parameters.retry_after;
    if (code === 429 && Number(retryAfter) > 0) {
      const wait = Math.min(Number(retryAfter), 6);
      console.log("[429] " + label + " flood — tunggu " + wait + "s, retry 1x");
      await new Promise((r) => setTimeout(r, wait * 1000));
      return fn();
    }
    throw e;
  }
}

function createCompatibilityAdapter(coreBot) {
  return {
    onText(pattern, handler) {
      coreBot.on("message", (ctx, next) => {
        const text = ctx.message && ctx.message.text;
        if (typeof text !== "string") return next();
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match) safeCall(() => handler(ctx.message, match));
        return next();
      });
    },

    on(updateType, handler) {
      coreBot.on(updateType, (ctx, next) => {
        if (updateType === "message") safeCall(() => handler(ctx.message));
        else if (updateType === "callback_query") safeCall(() => handler(ctx.callbackQuery));
        else safeCall(() => handler(ctx.update));
        return next();
      });
    },

    sendMessage(chatId, text, options = {}) {
      return callWith429Retry(
        () =>
          coreBot.api.sendMessage(chatId, text, {
            link_preview_options: { is_disabled: true },
            ...options,
          }),
        "sendMessage"
      );
    },

    setMessageReaction(chatId, messageId, emoji) {
      return callWith429Retry(
        () => coreBot.api.setMessageReaction(chatId, messageId, [{ type: "emoji", emoji }]),
        "setMessageReaction"
      );
    },

    editMessageText(chatId, messageId, text, options = {}) {
      return callWith429Retry(
        () => coreBot.api.editMessageText(chatId, messageId, text, options),
        "editMessageText"
      );
    },

    sendRichMessage(chatId, html, fallback, options = {}) {
      const payload = { chat_id: chatId, rich_message: { html } };
      if (options.reply_markup) payload.reply_markup = options.reply_markup;
      if (options.reply_to_message_id) payload.reply_to_message_id = options.reply_to_message_id;
      return coreBot.api.raw.sendRichMessage(payload).catch(() =>
        coreBot.api.sendMessage(chatId, fallback, {
          parse_mode: options.parse_mode,
          reply_markup: options.reply_markup,
          ...(options.reply_to_message_id
            ? { reply_to_message_id: options.reply_to_message_id }
            : {}),
        })
      );
    },

    deleteMessage(chatId, messageId) {
      return coreBot.api.deleteMessage(chatId, messageId);
    },

    sendPhoto(chatId, photo, options = {}) {
      const input = Buffer.isBuffer(photo)
        ? new InputFile(photo, "captcha.png")
        : photo;
      return callWith429Retry(() => coreBot.api.sendPhoto(chatId, input, options), "sendPhoto");
    },

    answerCallbackQuery(callbackQueryId, options = {}) {
      return callWith429Retry(
        () => coreBot.api.answerCallbackQuery(callbackQueryId, options),
        "answerCallbackQuery"
      );
    },

    sendChatAction(chatId, action = "typing") {
      return coreBot.api.sendChatAction(chatId, action);
    },

    setMyCommands(commands) {
      return coreBot.api.setMyCommands(commands);
    },

    setChatMenuButton(options) {
      return coreBot.api.setChatMenuButton(options);
    },
  };
}

/**
 * Streaming loading resmi Bot API 10.x (sendMessageDraft).
 * Draft tampil sebagai preview animated (30 detik, ephemeral);
 * finish() mengirim pesan final yang persist — draft otomatis hilang.
 * Semua operasi diserialisasi agar draft selalu terkirim sebelum pesan final.
 */
const ACTIVE_STREAMS = new Map();

function stopStream(draftId) {
  const s = ACTIVE_STREAMS.get(Number(draftId));
  if (s) s.cancelled = true;
}

function startStream(chatId, stageText) {
  const draftId = Math.floor(Math.random() * 1e9) + 1;
  const state = { cancelled: false };
  ACTIVE_STREAMS.set(draftId, state);
  let chain = Promise.resolve();
  const enqueue = (fn) => {
    const p = chain.then(fn);
    chain = p.catch(() => {});
    return p;
  };
  const draft = (text) => {
    enqueue(() =>
      callWith429Retry(
        () => core.api.sendMessageDraft(chatId, draftId, text, { can_stop: true }),
        "sendMessageDraft"
      )
    ).catch(() => {});
  };
  const alive = () => {
    // [DOCS] sendMessageDraft: draft adalah preview ephemeral 30 detik yang
    // otomatis hilang begitu bot mengirim pesan. Tombol "stop" hanya menghentikan
    // draft BERJALAN — hasil final tetap harus dikirim (tidak boleh丢弃).
    if (!state.cancelled) return true;
    console.log("[STREAM] draft " + draftId + " di-stop user; hasil final tetap dikirim");
    return false;
  };

  draft(typeof stageText === "string" ? stageText : "");

  return {
    stage(text) {
      if (state.cancelled) return;
      draft(text);
    },
    isCancelled() {
      return state.cancelled;
    },
    finish(text, opts = {}) {
      const p = enqueue(() =>
        callWith429Retry(
          () =>
            core.api.sendMessage(chatId, text, {
              link_preview_options: { is_disabled: true },
              ...opts,
            }),
          "stream.finish"
        )
      );
      p.finally(() => {
        alive();
        ACTIVE_STREAMS.delete(draftId);
      }).catch(() => {});
      return p;
    },
    finishRich(html, opts = {}) {
      const p = enqueue(() =>
        callWith429Retry(() => core.api.sendRichMessage(chatId, { html }, opts), "stream.finishRich")
      );
      p.finally(() => {
        alive();
        ACTIVE_STREAMS.delete(draftId);
      }).catch(() => {});
      return p;
    },
    finishPhoto(photo, opts = {}) {
      const p = enqueue(() => {
        const input = Buffer.isBuffer(photo) ? new InputFile(photo, "image.png") : photo;
        return callWith429Retry(() => core.api.sendPhoto(chatId, input, opts), "stream.finishPhoto");
      });
      p.finally(() => {
        alive();
        ACTIVE_STREAMS.delete(draftId);
      }).catch(() => {});
      return p;
    },
    fail(text, opts = {}) {
      const p = enqueue(() =>
        callWith429Retry(() => core.api.sendMessage(chatId, text, opts), "stream.fail")
      );
      p.finally(() => {
        alive();
        ACTIVE_STREAMS.delete(draftId);
      }).catch(() => {});
      return p;
    },
  };
}

function initBot() {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN belum diisi. Isi di env/.env lalu jalankan ulang.");
  }
  const coreBot = new Bot(BOT_TOKEN);
  core = coreBot;
  coreBot.catch((err) => {
    const e = err.error || err;
    console.error("grammY error:", e.description || e.message || err.message);
  });
  bot = createCompatibilityAdapter(coreBot);
  setImmediate(() => {
    coreBot.start().catch((e) => {
      console.error("Telegram polling gagal:", e.message);
      process.exitCode = 1;
    });
  });
  return bot;
}

function isAllowed(chatId) {
  if (!ALLOWED_CHAT_IDS.length) return true;
  return ALLOWED_CHAT_IDS.includes(chatId);
}

function guard(fn) {
  return (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) {
      bot.sendMessage(
        chatId,
        "🔒 Fitur ini hanya untuk admin (ALLOWED_CHAT_IDS)."
      );
      return;
    }
    fn(msg);
  };
}

function reply(msg, text, opts) {
  return bot.sendMessage(msg.chat.id, text, opts);
}

/**
 * Bangun reply_markup inline keyboard dengan sanitasi:
 * - text selalu 1..64 karakter (tidak pernah kosong) — mencegah
 *   400 "can't parse InlineKeyboardButton: Can't find field \"text\"".
 * - callback_data selalu 1..64 byte; yang invalid menjadi "noop".
 * - tombol null/baris kosong dibuang.
 */
function inlineButtons(rows) {
  const nested = (rows || []).map((row) => (Array.isArray(row) ? row : [row]));
  const keyboard = [];
  for (const row of nested) {
    const out = [];
    for (const b of row) {
      if (!b || typeof b !== "object") {
        console.warn("[KB] tombol diabaikan (bukan objek):", JSON.stringify(b));
        continue;
      }
      const rawText = b.text;
      const text = sanitizeButtonText(rawText, "Menu");
      if (!String(rawText == null ? "" : rawText).trim()) {
        console.warn("[KB] label kosong diganti \"Menu\"; data=" + JSON.stringify(b.data));
      }
      if (b.url) {
        out.push({ text, url: b.url });
        continue;
      }
      const rawData = b.data;
      const data = sanitizeCallbackData(rawData);
      if (data === "noop" && String(rawData == null ? "" : rawData)) {
        console.warn("[KB] callback_data invalid/terlalu panjang -> noop:", JSON.stringify(rawData).slice(0, 120));
      }
      out.push({ text, callback_data: data });
    }
    if (out.length) keyboard.push(out);
  }
  return { reply_markup: { inline_keyboard: keyboard } };
}

function removeKeyboard() {
  return { reply_markup: { remove_keyboard: true } };
}

module.exports = {
  initBot,
  isAllowed,
  guard,
  reply,
  inlineButtons,
  removeKeyboard,
  startStream,
  stopStream,
  get bot() {
    return bot;
  },
};
