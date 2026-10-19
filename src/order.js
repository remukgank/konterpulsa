"use strict";

const { getHTML, request } = require("./konterApi");
const { extractVar, parseCatalog, extractSelectOptions, extractCsrfFromHtml, decodeHtmlEntities } = require("./harga");

const BASE_URL = require("./config").BASE_URL;

function categoryBlock(html, key, allKeys) {
  const si = html.indexOf('id="' + key + '"');
  if (si === -1) return null;
  const nextCats = (allKeys || [])
    .filter((k) => k !== key)
    .map((k) => 'id="' + k + '"')
    .filter((t) => html.indexOf(t) > si);
  nextCats.push('id="keterangan"');
  const end = Math.min(...nextCats.map((t) => html.indexOf(t)).filter((v) => v > -1));
  return html.slice(si, end === -1 ? html.length : end);
}

function parseCategories(html) {
  const cats = [];
  const m = html.match(/<select[^>]*id="produk-select"[\s\S]*?<\/select>/);
  const sel = m ? m[0] : html;
  const optRe = /<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g;
  const allKeys = [];
  let o;
  while ((o = optRe.exec(sel))) {
    if (o[1]) allKeys.push(o[1]);
  }
  optRe.lastIndex = 0;
  while ((o = optRe.exec(sel))) {
    const val = o[1];
    if (!val) continue;
    const label = decodeHtmlEntities(o[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    const blk = categoryBlock(html, val, allKeys) || "";
    cats.push({
      key: val,
      label,
      field: categoryFieldFromBlock(blk),
      operators: extractSelectOptions(blk, "operator"),
    });
  }
  return cats;
}

function categoryFieldFromBlock(blk) {
  const hasBarcode = /<input[^>]*name="barcode_voucher"/.test(blk);
  if (hasBarcode) return "barcode_voucher";
  const hasIdPlgn = /<input[^>]*name="id_plgn"/.test(blk);
  if (hasIdPlgn) return "id_plgn";
  return "nomor_hp";
}

async function getOrderConfig() {
  const r = await getHTML("/order");
  const catalog = parseCatalog(r.text);
  const validators = extractVar(r.text, "validator") || [];
  return {
    status: r.status,
    categories: parseCategories(r.text),
    operators: catalog.operators,
    vouchers: catalog.vouchers,
    payments: catalog.payments,
    validators,
    csrfToken: extractCsrfFromHtml(r.text),
    passwordVerifyNeeded: parsePasswordVerifyNeeded(r.text),
  };
}

function categoryByKey(cfg, key) {
  return cfg.categories.find((c) => c.key === key) || null;
}

function findCategoryForOperator(cfg, opId) {
  return cfg.categories.find((c) => c.operators && c.operators[opId]) || null;
}

function isPhoneValidationError(errors) {
  const message = (Array.isArray(errors) ? errors : [errors])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(?:nomor\s*(?:hp|handphone|telepon|tujuan)|nomor\s+tidak\s+(?:benar|valid|sesuai)|phone\s+number)\b/.test(message);
}

/**
 * Deteksi error server yang artinya sesi web belum diverifikasi kata sandi.
 * Pesan asli: "Silakan verifikasi passsword terlebih dahulu." [OBSERVED].
 */
function needsPasswordVerify(errors) {
  const message = (Array.isArray(errors) ? errors : [errors])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /verifikasi\s*(?:pass+word|kata\s*sandi)/.test(message);
}

/**
 * Ekstrak status verifikasi kata sandi sesi dari halaman order web:
 * <span id="password_verify">1|0</span> — "1" = perlu verifikasi, "0" = sudah.
 * Return true/false, atau null bila elemen tidak ditemukan (schema berubah).
 * [OBSERVED: GET /order & /beli (17-10-2026) -> "1" untuk sesi bot].
 */
function parsePasswordVerifyNeeded(html) {
  const m = String(html || "").match(/id="password_verify"[^>]*>\s*([01])\s*</);
  if (!m) return null;
  return m[1] === "1";
}

/**
 * Verifikasi kata sandi akun web untuk sesi cookie saat ini.
 * Endpoint diambil dari JS form order asli web:
 *   GET /beli/password_verify?password=<password>
 * Response JSON {"success":true|false,...} [OBSERVED: password salah ->
 * 200 {"success":false,"message":"Password salah"}].
 */
async function passwordVerify(password) {
  const r = await request("GET", "/beli/password_verify?password=" + encodeURIComponent(String(password || "")));
  let text = "";
  try {
    text = await r.text();
  } catch (e) {
    text = "";
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }
  return { status: r.status, json, text };
}

async function submitOrder({ kategori, operator, voucher, values, pembayaran, captcha, csrfToken }) {
  const endpoint = BASE_URL + "/" + kategori;

  const data = {
    csrf_token: csrfToken,
    operator,
    voucher,
    pembayaran,
    captcha,
    json_format: "1",
  };
  if (values) {
    if (values.nomor_hp) data.nomor_hp = values.nomor_hp;
    if (values.id_plgn) data.id_plgn = values.id_plgn;
    if (values.barcode_voucher) data.barcode_voucher = values.barcode_voucher;
  }

  const r = await request("POST", endpoint, { form: data });
  let text = "";
  try {
    text = await r.text();
  } catch (e) {
    text = "";
  }
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = null;
    }
  }
  return { status: r.status, json, text };
}

module.exports = {
  getOrderConfig,
  categoryByKey,
  findCategoryForOperator,
  isPhoneValidationError,
  needsPasswordVerify,
  parsePasswordVerifyNeeded,
  passwordVerify,
  submitOrder,
};
