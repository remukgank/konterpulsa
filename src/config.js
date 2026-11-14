"use strict";

const path = require("path");
const fs = require("fs");

let loadedFromFile = false;
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.KONTER_BASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    loadedFromFile = true;
  }
}

const BASE_URL = (process.env.KONTER_BASE_URL || "").replace(/\/+$/, "");
const COOKIE = process.env.KONTER_COOKIE || "";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const PASSWORD = process.env.KONTER_PASSWORD || "";
// Endpoint Telegram: kosong = remote resmi (https://api.telegram.org).
// Di VPS isi http://localhost:9091 untuk memakai Local Bot API Server
// [DOCS https://core.telegram.org/bots/api#using-a-local-bot-api-server].
// Terbukti 4.6x lebih cepat (editMessageText avg 93ms vs 431ms) dan bebas
// UND_ERR_CONNECT_TIMEOUT 10s pada rute IPv6.
const TELEGRAM_API_ROOT = String(process.env.TELEGRAM_API_ROOT || "").replace(/\/+$/, "");

function getAllowedChatIds() {
  const raw = process.env.ALLOWED_CHAT_IDS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (isNaN(Number(s)) ? s : Number(s)));
}

module.exports = {
  LOADED_FROM_FILE: loadedFromFile,
  BASE_URL,
  COOKIE,
  BOT_TOKEN,
  PASSWORD,
  TELEGRAM_API_ROOT,
  ALLOWED_CHAT_IDS: getAllowedChatIds(),
};
