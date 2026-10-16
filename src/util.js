"use strict";

/**
 * Helper murni (tanpa side effect, tanpa I/O) — aman di-require dari test manapun.
 * Semua yang bisa gagal parse (escHtml/escMd/clamp/label tombol) tinggal di sini
 * supaya bisa diuji tanpa jaringan & tanpa Telegram.
 */

const MD_SPECIAL = /[_*`[\]]/;

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escMd(s) {
  return String(s == null ? "" : s).replace(/([\\_*`[\]])/g, "\\$1");
}

/** Nilai web/user yang ditampilkan di parse_mode Markdown tanpa format. */
function mdPlain(s) {
  return escMd(String(s == null ? "" : s).replace(/\s+/g, " ").trim());
}

/**
 * Nilai yang ingin ditebalkan. Kalau mengandung karakter Markdown,
 * JANGAN dibungkus *...* (escaping di dalam entity tidak diizinkan oleh Bot API),
 *Instead teks polos + escape.
 */
function mdEmphasize(s) {
  const raw = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (!MD_SPECIAL.test(raw)) return "*" + raw + "*";
  return escMd(raw);
}

function fmt(n) {
  return n === "" || n == null ? "-" : n;
}

function chunk(arr, n) {
  const out = [];
  const size = Math.max(1, Number(n) || 1);
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function statusIcon(st) {
  const s = String(st || "");
  if (/tunggu|pending|menunggu|proses|belum/i.test(s)) return "⏳";
  if (/sukses|lunas|berhasil|success/i.test(s)) return "✅";
  if (/gagal|ditolak|batal|expire|failed/i.test(s)) return "❌";
  return "▫️";
}

function isPendingStatus(e) {
  if (!e) return false;
  const st = [e.statusPembayaran, e.statusPengisian, e.status]
    .map((x) => String(x == null ? "" : x))
    .join(" ")
    .toLowerCase();
  return /tunggu|pending|menunggu|proses|belum/i.test(st);
}

/** Label tombol inline: selalu 1..64 karakter, tidak pernah kosong. */
function sanitizeButtonText(t, fallback) {
  let s = String(t == null ? "" : t).replace(/\s+/g, " ").trim();
  if (!s) s = String(fallback || "Menu");
  if (s.length > 64) s = s.slice(0, 63).trimEnd() + "…";
  return s;
}

/** callback_data: 1..64 byte; fallback "noop" supaya tidak pernah invalid. */
function sanitizeCallbackData(d) {
  const s = String(d == null ? "" : d);
  if (!s) return "noop";
  return Buffer.byteLength(s, "utf8") <= 64 ? s : Buffer.from(s, "utf8").subarray(0, 64).toString("utf8").replace(/\uFFFD$/, "");
}

const MAX_TG_TEXT = 4096;

/**
 * Bangun blok HTML notifikasi TANPA memotong di tengah tag.
 * Returns { html, shown, truncated }.
 */
function notifBlocksHtml(items, opts = {}) {
  const maxItems = clampInt(opts.maxItems, 1, 20, 6);
  const maxChars = clampInt(opts.maxText, 200, 600, 400);
  const head = opts.head || "🔔 <b>Notifikasi Terbaru</b>";
  const list = Array.isArray(items) ? items : [];
  const picked = [];
  const notes = [];
  for (const n of list) {
    if (picked.length >= maxItems) break;
    const judul = String((n && n.judul) || "").replace(/\s+/g, " ").trim();
    const waktu = String((n && n.waktu) || "").trim();
    let teks = String((n && n.teks) || "").replace(/\s+/g, " ").trim();
    if (teks.length > maxChars) teks = teks.slice(0, maxChars - 1).trimEnd() + "…";
    const icon = n && n.unread ? "🔵" : "▫️";
    picked.push(
      (picked.length + 1) + ". " + icon + " <b>" + escHtml(judul || "(tanpa judul)") + "</b>\n" +
      (waktu ? "📅 " + escHtml(waktu) + "\n" : "") +
      (teks ? "<blockquote>" + escHtml(teks) + "</blockquote>" : "")
    );
    notes.push(n);
  }
  if (list.length > picked.length) notes.push({ extra: list.length - picked.length });
  let html = picked.length ? head + "\n\n" + picked.join("\n\n") : head + "\n\n<i>Belum ada notifikasi.</i>";
  // pemotongan aman: hanya di batas blok (baris kosong), tag HTML selalu tertutup
  if (html.length > MAX_TG_TEXT) {
    const blocks = html.split("\n\n");
    const keep = [];
    let len = head.length + 2;
    for (const b of blocks) {
      if (b === head || keep.length === 0) { keep.push(b); continue; }
      if (len + b.length + 2 > MAX_TG_TEXT - 60) break;
      keep.push(b);
      len += b.length + 2;
    }
    html = keep.join("\n\n") + "\n\n<i>… notifikasi lain disembunyikan. Ketik /notifikasi tanpa batas untuk ringkasan.</i>";
  }
  return { html, shown: picked.length, notes };
}

/** Jarak Levenshtein sederhana (bounded) untuk saran perintah. */
function editDistance(a, b, max = 4) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[n];
}

/** Saran perintah terdekat; return "" kalau tidak yakin. */
function suggestCommand(text, commands, maxDist = 2) {
  const t = String(text || "").replace(/^\//, "").trim().toLowerCase();
  if (!t) return "";
  const names = (commands || []).map((c) => (typeof c === "string" ? c : c.command)).filter(Boolean);
  let best = "";
  let bestD = maxDist + 1;
  for (const name of names) {
    const d = editDistance(t, name, maxDist);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return bestD <= maxDist ? best : "";
}

/** <tg-time> resmi Bot API; fallback teks polos kalau tanggal tak ter-parse. */
function tgTimeCell(dateStr) {
  const raw = String(dateStr || "").trim();
  if (!raw) return null;
  const t = Date.parse(raw.replace(" ", "T"));
  if (isNaN(t)) return raw;
  return '<tg-time unix="' + Math.floor(t / 1000) + '">' + escHtml(raw) + "</tg-time>";
}

function voucherBtnLabel(v) {
  const price = formatHargaCompact(v && v.harga);
  const kosong = v && v.status === 0 ? " (Kosong)" : "";
  const suffix = " · " + price + kosong;
  let name = (v && v.nama) || "Paket";
  let label = name + suffix;
  if (label.length > 64) {
    const budget = Math.max(64 - suffix.length - 1, 8);
    name = name.slice(0, budget).replace(/\s+$/, "");
    label = name + "…" + suffix;
  }
  if (label.length > 64) label = label.slice(0, 63) + "…";
  return label;
}

function formatHargaCompact(h) {
  const n = parseInt(h, 10);
  return isNaN(n) ? "-" : n.toLocaleString("id-ID");
}

/**
 * Validasi prefix nomor terhadap regex validator dari situs.
 * return true | { examples: string }  (kalau tidak cocok)
 */
function checkNomorPrefix(vEntry, nomor) {
  if (!vEntry || !vEntry.regex) return true;
  try {
    const m = String(vEntry.regex).match(/^\/(.*)\/([gimsuy]*)$/);
    const re = m ? new RegExp(m[1], m[2]) : new RegExp(String(vEntry.regex));
    if (re.test(nomor)) return true;
    const pref = (String(vEntry.regex).match(/\d{3,4}/g) || []).slice(0, 5);
    return { examples: pref.join(" / ") || "08xx" };
  } catch (e) {
    return true;
  }
}

module.exports = {
  escHtml,
  escMd,
  mdPlain,
  mdEmphasize,
  fmt,
  chunk,
  clampInt,
  statusIcon,
  isPendingStatus,
  sanitizeButtonText,
  sanitizeCallbackData,
  notifBlocksHtml,
  editDistance,
  suggestCommand,
  tgTimeCell,
  voucherBtnLabel,
  formatHargaCompact,
  checkNomorPrefix,
  MAX_TG_TEXT,
};
