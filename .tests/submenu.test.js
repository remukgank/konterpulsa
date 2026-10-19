"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { inlineButtons } = require("../bot/telegram");
const { formatHarga } = require("../src/harga");

// Load the real menu functions without starting polling or order transactions.
const source = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
const menuSource = source.slice(source.indexOf("const ORDER_MENU ="), source.indexOf("function brandOf("));
const chunkSource = source.slice(source.indexOf("function chunk("), source.indexOf("\n}", source.indexOf("function chunk(")) + 2);
const catOpStart = source.indexOf("async function handleCatOpPick(");
const catOpSource = source.slice(catOpStart, source.indexOf("\n}", catOpStart) + 2);

const orderStub = {
  categoryByKey: (cfg, key) => (cfg.categories || []).find((c) => c.key === key),
};

// Config live minimal: 4 operator Token PLN + harga termurah [OBSERVED /beli 17-10-2026].
function plnCfg(overrides) {
  return Object.assign(
    {
      categories: [
        { key: "token_listrik", label: "TOKEN LISTRIK", field: "id_plgn", operators: { 785: "PLN Prabayar", 784: "Token PLN (Tanpa WA)" } },
        { key: "pln_prabayar", label: "PLN PRABAYAR", field: "id_plgn", operators: { 654: "Token PLN" } },
        { key: "token_pln_h2h", label: "TOKEN PLN H2H", field: "id_plgn", operators: { 709: "Token PLN" } },
      ],
      operators: { 785: "PLN Prabayar", 784: "Token PLN (Tanpa WA)", 654: "Token PLN", 709: "Token PLN" },
      vouchers: {
        785: [{ id: "1", nama: "20.000", harga: 21850, status: 1 }],
        784: [{ id: "2", nama: "20.000", harga: 21995, status: 1 }],
        654: [{ id: "3", nama: "20.000", harga: 21995, status: 1 }],
        709: [{ id: "4", nama: "20.000", harga: 21845, status: 1 }],
      },
    },
    overrides || {}
  );
}

function menuContext() {
  const context = vm.createContext({
    flowEdit: async () => {},
    reply: async () => {},
    order: orderStub,
    formatHarga,
  });
  vm.runInContext(chunkSource + "\n" + menuSource, context);
  return context;
}

function orderMenuButtons(cfg) {
  const rows = menuContext().orderMenuRows(cfg);
  return inlineButtons(rows).reply_markup.inline_keyboard.flat();
}

async function renderSubmenu(menuKey, cfg) {
  let rendered;
  const context = vm.createContext({
    flowEdit: async (_msg, _st, _title, rows) => {
      rendered = inlineButtons(rows).reply_markup.inline_keyboard;
    },
    reply: () => { throw new Error("Unexpected fallback response"); },
    order: orderStub,
    formatHarga,
  });
  vm.runInContext(chunkSource + "\n" + menuSource, context);
  await context.handleSubmenu(1, {}, { cfg }, menuKey);
  return rendered;
}

async function pickCatOp(raw, cfg, st) {
  const calls = { vouchers: 0, replies: [] };
  const context = vm.createContext({
    reply: async (_msg, text) => { calls.replies.push(text); },
    order: orderStub,
    renderVouchers: async () => { calls.vouchers += 1; return "vouchers"; },
  });
  vm.runInContext(catOpSource, context);
  const out = await context.handleCatOpPick(1, {}, st || { cfg }, raw);
  calls.out = out;
  calls.state = st;
  return calls;
}

/* ---------- Opsi B: Token PLN flat 4 provider ---------- */

test("Token PLN exposes four flat provider buttons sorted by cheapest live price", async () => {
  const buttons = orderMenuButtons(plnCfg()).filter((b) => String(b.callback_data).startsWith("catop:"));
  assert.deepEqual(buttons.map((b) => b.callback_data), [
    "catop:token_pln_h2h:709", // 21.845 — termurah
    "catop:token_listrik:785", // 21.850
    "catop:token_listrik:784", // 21.995
    "catop:pln_prabayar:654", // 21.995
  ]);
  assert.deepEqual(buttons.map((b) => b.text), [
    "⚡ Token PLN H2H · " + formatHarga(21845),
    "🏷️ PLN Prabayar · " + formatHarga(21850),
    "🏷️ Token PLN Tanpa WA · " + formatHarga(21995),
    "⚡ Token PLN Reguler · " + formatHarga(21995),
  ]);
  // tidak ada lagi layer channel (submenu:pln) di menu utama
  assert.equal(orderMenuButtons(plnCfg()).some((b) => b.callback_data === "submenu:pln"), false);
});

test("Token PLN flat buttons stay within Telegram label and callback_data limits", () => {
  for (const b of orderMenuButtons(plnCfg())) {
    assert.ok(b.text.length >= 1 && b.text.length <= 64, "label 1-64 char: " + b.text);
    assert.ok(Buffer.byteLength(b.callback_data, "utf8") >= 1 && Buffer.byteLength(b.callback_data, "utf8") <= 64);
  }
});

test("cheapest price ignores empty vouchers and puts unknown price last", () => {
  const ctx = menuContext();
  assert.equal(ctx.cheapestFor(plnCfg(), 785), 21850);
  assert.equal(ctx.cheapestFor(plnCfg(), "785"), 21850);
  assert.equal(ctx.cheapestFor(plnCfg(), 999), null);
  assert.equal(ctx.cheapestFor({ vouchers: { 5: [{ id: "a", nama: "5.000", harga: 5000, status: 0 }] } }, 5), null);
  const buttons = orderMenuButtons(plnCfg({ vouchers: { 785: [], 784: [], 709: [{ id: "4", nama: "20.000", harga: 21845, status: 1 }], 654: [] } }))
    .filter((b) => String(b.callback_data).startsWith("catop:"));
  assert.deepEqual(buttons.map((b) => b.callback_data), [
    "catop:token_pln_h2h:709", // harga diketahui
    "catop:token_listrik:785", // tanpa harga -> tanpa nominal di label, di akhir
    "catop:token_listrik:784",
    "catop:pln_prabayar:654",
  ]);
  assert.equal(buttons[1].text, "🏷️ PLN Prabayar");
});

test("Token PLN flat buttons are skipped when the provider left the catalog", () => {
  const cfg = plnCfg();
  cfg.categories = cfg.categories.map((c) =>
    c.key === "token_listrik" ? { key: c.key, label: c.label, operators: { 784: c.operators[784] } } : c
  );
  const buttons = orderMenuButtons(cfg).filter((b) => String(b.callback_data).startsWith("catop:"));
  assert.deepEqual(buttons.map((b) => b.callback_data), [
    "catop:token_pln_h2h:709",
    "catop:token_listrik:784",
    "catop:pln_prabayar:654",
  ]);
  assert.equal(orderMenuButtons(plnCfg({ categories: [] })).some((b) => String(b.callback_data).startsWith("catop:")), false);
});

test("legacy submenu:pln button still shows the flat provider list with a back button", async () => {
  const keyboard = await renderSubmenu("pln", plnCfg());
  assert.deepEqual(keyboard.map((row) => row.length), [1, 1, 1, 1, 1]);
  assert.deepEqual(keyboard.flat().map((b) => b.callback_data), [
    "catop:token_pln_h2h:709",
    "catop:token_listrik:785",
    "catop:token_listrik:784",
    "catop:pln_prabayar:654",
    "back:kategori",
  ]);
});

test("flat provider button jumps straight to the voucher list of that operator", async () => {
  const st = { cfg: plnCfg() };
  const calls = await pickCatOp("token_listrik:785", plnCfg(), st);
  assert.equal(calls.vouchers, 1);
  assert.deepEqual(calls.replies, []);
  assert.equal(st.order.kategori, "token_listrik");
  assert.equal(st.order.operator, "785");
  assert.equal(st.order.field, "id_plgn");
  assert.equal(st.vouchPage, 0);
  assert.equal(calls.out, "vouchers");
});

test("flat provider button rejects unknown category or provider without crashing", async () => {
  const cfg = plnCfg();
  let st = { cfg };
  let calls = await pickCatOp("kategori_hantu:785", cfg, st);
  assert.equal(calls.vouchers, 0);
  assert.match(calls.replies[0], /Kategori tidak ditemukan/);

  st = { cfg };
  calls = await pickCatOp("token_listrik:999", cfg, st);
  assert.equal(calls.vouchers, 0);
  assert.match(calls.replies[0], /tidak tersedia/);

  calls = await pickCatOp("token_listrik:", cfg, { cfg });
  assert.equal(calls.vouchers, 0);

  calls = await pickCatOp("token_listrik:785", cfg, {});
  assert.equal(calls.vouchers, 0);
  assert.match(calls.replies[0], /Sesi expired/);
});

/* ---------- kategori lain (tidak berubah) ---------- */

test("other categories submenu retains category labels and filters used categories", async () => {
  const keyboard = await renderSubmenu("lainnya", Object.assign(plnCfg(), {
    categories: [
      { key: "pulsa", label: "Pulsa" },
      { key: "custom", label: "Kategori Tambahan" },
    ],
  }));
  assert.deepEqual(keyboard, [
    [{ text: "Kategori Tambahan", callback_data: "cat:custom" }],
    [{ text: "⬅️ Menu Order", callback_data: "back:kategori" }],
  ]);
});
