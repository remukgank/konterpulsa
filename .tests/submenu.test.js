"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { inlineButtons } = require("../bot/telegram");

// Load the real menu functions without starting polling or order transactions.
const source = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
const menuSource = source.slice(source.indexOf("const ORDER_MENU ="), source.indexOf("function brandOf("));
const chunkSource = source.slice(source.indexOf("function chunk("), source.indexOf("\n}", source.indexOf("function chunk(")) + 2);

async function renderSubmenu(menuKey, categories) {
  let rendered;
  const context = vm.createContext({
    flowEdit: async (_msg, _st, _title, rows) => {
      rendered = inlineButtons(rows).reply_markup.inline_keyboard;
    },
    reply: () => { throw new Error("Unexpected fallback response"); },
  });
  vm.runInContext(chunkSource + "\n" + menuSource, context);
  await context.handleSubmenu(1, {}, { cfg: { categories } }, menuKey);
  return rendered;
}

test("PLN submenu preserves labels, callbacks, two-column rows and back button", async () => {
  const keys = ["token_listrik", "pln_prabayar", "token_pln_h2h"];
  const keyboard = await renderSubmenu("pln", keys.map((key) => ({ key })));
  assert.deepEqual(keyboard.map((row) => row.length), [2, 1, 1]);
  assert.deepEqual(keyboard.flat().map((b) => b.callback_data), [
    ...keys.map((key) => "cat:" + key), "back:kategori",
  ]);
  assert.ok(keyboard.flat().every((b) => b.text && b.text !== "Menu"));
});

test("other categories submenu retains category labels and filters used categories", async () => {
  const keyboard = await renderSubmenu("lainnya", [
    { key: "pulsa", label: "Pulsa" },
    { key: "custom", label: "Kategori Tambahan" },
  ]);
  assert.deepEqual(keyboard, [
    [{ text: "Kategori Tambahan", callback_data: "cat:custom" }],
    [{ text: "⬅️ Menu Order", callback_data: "back:kategori" }],
  ]);
});

test("PLN submenu only includes categories supplied by the catalog", async () => {
  const keyboard = await renderSubmenu("pln", [{ key: "pln_prabayar" }]);
  assert.deepEqual(keyboard.flat().map((b) => b.callback_data), [
    "cat:pln_prabayar", "back:kategori",
  ]);
});
