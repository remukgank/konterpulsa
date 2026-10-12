"use strict";

const { getHTML, request } = require("./konterApi");

function cleanSaldo(v) {
  return v.replace(/\s*Tambah Saldo.*$/i, "").trim();
}

function stripTags(html) {  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse a `<tr><td>label</td><td>value</td></tr>` table into a key->value map.
function parseKeyValueTable(html) {
  const map = {};
  const trRe = /<tr>([\s\S]*?)<\/tr>/g;
  let tr;
  while ((tr = trRe.exec(html))) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
    if (tds.length < 2) continue;
    const key = stripTags(tds[0]);
    let val = stripTags(tds[1]);
    if (!key) continue;
    // remove leading ":" that appears in profile values
    val = val.replace(/^:\s*/, "");
    map[key] = val;
  }
  return map;
}

async function getProfil() {
  const r = await getHTML("/akun/profil");
  const kv = parseKeyValueTable(r.text);
  return {
    status: r.status,
    nama: kv["Nama Lengkap"] || "",
    pengguna: kv["Nama Pengguna"] || "",
    email: kv["Email"] || "",
    noHp: kv["No. HP"] || "",
    statusAkun: kv["Status Akun"] || "",
    jenisAkun: kv["Jenis Akun"] || "",
    saldo: cleanSaldo(kv["Saldo"] || ""),
    saldoQris: kv["Saldo Qris"] || "",
    totalTransaksi: kv["Total Transaksi"] || "",
    text: stripTags(r.text),
  };
}

function parseHistoryTable(html) {
  const rows = [];
  const m = html.match(/<tbody id="history_transaksi">([\s\S]*?)<\/tbody>/);
  if (!m) return rows;
  const tbody = m[1];
  const trRe = /<tr>([\s\S]*?)<\/tr>/g;
  let tr;
  while ((tr = trRe.exec(tbody))) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
    const linkIdx = tds.findIndex((c) => /\/view\/\d+/.test(c));
    if (linkIdx === -1 || tds.length < linkIdx + 6) continue;
    const idM = tds[linkIdx].match(/(?:riwayat-transaksi|history)\/view\/(\d+)/);
    const lastIdx = tds.length - 1;
    const lastRaw = tds[lastIdx] || "";
    const dtM = lastRaw.match(/data-title="([^"]*)"/);
    const status = lastIdx > linkIdx + 5 ? stripTags(dtM && dtM[1] ? dtM[1] : lastRaw) : "";
    rows.push({
      no: stripTags(tds[0] || ""),
      id: idM ? idM[1] : "",
      tanggal: stripTags(tds[linkIdx].replace(/<a[^>]*>/g, "").replace(/<\/a>/g, "")),
      provider: stripTags(tds[linkIdx + 1]),
      voucher: stripTags(tds[linkIdx + 2]),
      noHp: stripTags(tds[linkIdx + 3]),
      harga: stripTags(tds[linkIdx + 4]),
      pembayaran: stripTags(tds[linkIdx + 5]),
      status,
    });
  }
  return rows;
}

async function getHistory(limit = 5) {
  const r = await getHTML("/akun/riwayat-transaksi");
  const rows = parseHistoryTable(r.text);
  return { status: r.status, rows: rows.slice(0, limit) };
}

async function getHistoryDetail(id) {
  const r = await getHTML("/akun/riwayat-transaksi/view/" + encodeURIComponent(id));
  const kv = parseKeyValueTable(r.text);
  return {
    status: r.status,
    id,
    jenisProduk: kv["Jenis Produk"] || "",
    provider: kv["Provider"] || "",
    paket: kv["Paket"] || "",
    nominal: kv["Nominal"] || "",
    idPelanggan: kv["ID Pelanggan"] || "",
    noHp: kv["Nomor HP"] || "",
    harga: kv["Harga"] || "",
    pembayaran: kv["Pembayaran"] || "",
    tanggal: kv["Tanggal Pembelian"] || "",
    tanggalBayar: kv["Tanggal Pembayaran"] || "",
    statusPembayaran: kv["Status Pembayaran"] || "",
    statusPengisian: kv["Status Pengisian"] || "",
    snRef: kv["SN/Ref"] || kv["No Resi"] || kv["No Referensi"] || kv["Referensi"] || "",
    token: kv["Token"] || "",
    keterangan: kv["Keterangan"] || "",
  };
}

async function getPaymentQr(trx) {
  const view = await getHTML("/akun/riwayat-transaksi/view/" + encodeURIComponent(trx));
  const text = view.text || "";
  const inline = text.match(/<img[^>]*\ssrc="data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (inline) {
    try {
      const buffer = Buffer.from(inline[1], "base64");
      if (buffer && buffer.length > 100) return { ok: true, buffer, session: "inline", panjang: buffer.length };
    } catch (e) {}
  }
  const m = text.match(/(\/payment\/[^"'\s]*get_qr\/\d+)/);
  if (!m) return { ok: false, error: "Sesi QR tidak ditemukan." };
  const session = m[1];
  const qr = await getHTML(m[1]);
  const t = qr.text || "";
  if (/^ERROR/.test(t)) return { ok: false, error: t.slice(0, 160), session };
  let buffer = null;
  try {
    buffer = Buffer.from(t, "base64");
  } catch (e) {
    buffer = null;
  }
  return { ok: !!buffer && buffer.length > 100, buffer, session, panjang: t.length };
}

async function getMutasi(limit = 5) {
  const r = await getHTML("/akun/riwayat-saldo");
  const text = stripTags(r.text);
  const idx = text.indexOf("Mutasi Saldo ");
  const after = idx === -1 ? text : text.slice(idx);
  const lines = after.split(/(?=\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/);
  const rows = lines
    .map((l) => l.trim())
    .filter((l) => /^\d{2}\/\d{2}\/\d{4}/.test(l))
    .slice(0, limit)
    .map((l) => {
      const tm = l.match(/^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/);
      const tanggal = tm ? tm[1] : "";
      const jm = l.match(/([+\-]\d[\d.]*)\s+(\d[\d.]+\s*)$/);
      let jumlah = "";
      let saldoAkhir = "";
      if (jm) {
        jumlah = jm[1];
        saldoAkhir = jm[2];
      }
      let ket = l.slice(tanggal.length).replace(jm ? jm[0] : "", "");
      return { tanggal, keterangan: ket.trim(), jumlah, saldoAkhir };
    });
  return { status: r.status, rows };
}

async function getNotifikasi(limit = 10) {
  const r = await getHTML("/akun/notifikasi");
  const t = r.text || "";
  const items = [];
  const re = /<a\s[^>]*href="[^"]*\/akun\/notifikasi\/read\/(\d+)"[^>]*class="list-group-item"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(t))) {
    const id = m[1];
    const inner = m[2];
    const headM = inner.match(/<h5[^>]*class="list-group-item-heading"[^>]*>([\s\S]*?)<\/h5>/);
    const textM = inner.match(/<p[^>]*class="list-group-item-text"[^>]*>([\s\S]*?)<\/p>/);
    const head = headM ? headM[1] : "";
    const unread = /data-title="Belum dibaca"/.test(head);
    const waktuM = head.match(/<small>([^<]*)<\/small>/);
    const waktu = waktuM ? waktuM[1].trim() : "";
    const judul = head
      .replace(/\(\s*<small>[\s\S]*?<\/small>\s*\)/g, "")
      .replace(/<i[\s\S]*?<\/i>/g, "")
      .replace(/<small>[\s\S]*?<\/small>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const teks = textM
      ? textM[1].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ").trim()
      : "";
    items.push({ id, judul, waktu, teks, unread });
    if (items.length >= limit) break;
  }
  return { status: r.status, items };
}

module.exports = {
  getProfil,
  getHistory,
  getHistoryDetail,
  getPaymentQr,
  getMutasi,
  getNotifikasi,
  getDeposit,
  getDepositMethods,
  getDepositDetail,
  getDepositQr,
  createDeposit,
};

/* ==================== deposit ==================== */

function parseDepositTable(html) {
  const rows = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/g;
  let tr;
  while ((tr = trRe.exec(html))) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
    if (tds.length < 4) continue;
    const idM = tds[0].match(/\/akun\/deposit\/view\/(\d+)/);
    rows.push({
      id: idM ? idM[1] : "",
      tanggal: stripTags(tds[0]),
      jumlah: stripTags(tds[1]),
      metode: stripTags(tds[2]),
      status: stripTags(tds[3]),
    });
  }
  return rows;
}

async function getDeposit(limit = 10) {
  const r = await getHTML("/akun/deposit");
  return { status: r.status, rows: parseDepositTable(r.text).slice(0, limit) };
}

async function getDepositMethods() {
  const r = await getHTML("/akun/deposit");
  const t = r.text || "";
  const csrfM = t.match(/name="csrf_token"\s+value="([^"]*)"/);
  const selM = t.match(/<select[^>]*name="payment"[^>]*>([\s\S]*?)<\/select>/);
  const methods = [];
  if (selM) {
    const opts = [...selM[1].matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)];
    for (const o of opts) {
      const value = o[1];
      if (!value || /^https?:/i.test(value)) continue;
      methods.push({ value, label: stripTags(o[2]) });
    }
  }
  return { status: r.status, csrf: csrfM ? csrfM[1] : "", methods };
}

async function getDepositDetail(id) {
  const r = await getHTML("/akun/deposit/view/" + encodeURIComponent(id));
  const kv = parseKeyValueTable(r.text);
  return {
    http: r.status,
    id,
    tanggal: kv["Tanggal"] || "",
    jumlah: kv["Jumlah"] || "",
    metode: kv["Metode Pembayaran"] || kv["Pembayaran"] || "",
    status: kv["Status"] || "",
  };
}

async function getDepositQr(depId) {
  const view = await getHTML("/akun/deposit/view/" + encodeURIComponent(depId));
  const t = view.text || "";
  const inline = t.match(/<img[^>]*\ssrc="data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (inline) {
    try {
      const buffer = Buffer.from(inline[1], "base64");
      if (buffer && buffer.length > 100) return { ok: true, buffer, error: "" };
    } catch (e) {}
  }
  const full = t.match(/\/payment\/[^"']*get_qr\/\d+/);
  const sess = t.match(/get_qr\/(\d+)/);
  if (!full && !sess) return { ok: false, error: "QR belum tersedia untuk deposit ini." };
  const session = full ? full[0] : "/payment/qris_dana/get_qr/" + sess[1];
  const qr = await getHTML(session);
  const qt = qr.text || "";
  if (/^ERROR/.test(qt)) return { ok: false, error: qt.slice(0, 160) };
  let buffer = null;
  try {
    buffer = Buffer.from(qt, "base64");
  } catch (e) {
    buffer = null;
  }
  return { ok: !!buffer && buffer.length > 100, buffer, error: buffer ? "" : "QR belum siap." };
}

async function createDeposit({ amount, payment, csrfToken } = {}) {
  const pre = await getDepositMethods();
  const csrf = csrfToken || pre.csrf;
  const res = await request("POST", "/akun/deposit", {
    form: {
      csrf_token: csrf,
      amount: String(amount),
      payment,
      submit: "deposit",
    },
  });
  const status = res.status;
  const location = res.headers.get ? res.headers.get("location") : "";
  let body = "";
  try {
    body = await res.text();
  } catch (e) {
    body = "";
  }
  let id = "";
  let detail = null;
  let qr = null;
  try {
    const list = await getDeposit(1);
    id = list.rows[0] ? list.rows[0].id : "";
  } catch (e) {
    id = "";
  }
  if (id) {
    try {
      detail = await getDepositDetail(id);
    } catch (e) {
      detail = null;
    }
    try {
      qr = await getDepositQr(id);
    } catch (e) {
      qr = { ok: false, error: e.message };
    }
  }
  const ok = /^30\d$/.test(String(status)) || !!id;
  let message = "";
  if (!ok && body) {
    const plain = stripTags(body).replace(/\s+/g, " ").trim();
    const keep = ["gagal", "minimal", "maksimum", "deposit", "csrf", "sesi", "login", "invalid", "tidak", "nominal"].filter((k) => new RegExp(k, "i").test(plain));
    if (keep.length) message = plain.slice(0, 220);
    if (!keep.length && body.includes("<title>")) {
      const tm = body.match(/<title>([\s\S]*?)<\/title>/);
      message = tm ? tm[1] : "";
    }
  }
  return { ok, status, location, id, detail, qr, message };
}
