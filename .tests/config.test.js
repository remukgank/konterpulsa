"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function readConfig(env) {
  const code =
    "const c = require(" +
    JSON.stringify(path.join(ROOT, "src", "config.js")) +
    "); console.log(JSON.stringify({ apiRoot: c.TELEGRAM_API_ROOT }));";
  const out = execFileSync(process.execPath, ["-e", code], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return JSON.parse(out.trim().split("\n").pop());
}

test("config: TELEGRAM_API_ROOT kosong bila env tidak diisi (default remote)", () => {
  const c = readConfig({ TELEGRAM_API_ROOT: "" });
  assert.equal(c.apiRoot, "");
});

test("config: TELEGRAM_API_ROOT membuang garis miring di akhir", () => {
  const c = readConfig({ TELEGRAM_API_ROOT: "http://localhost:9091///" });
  assert.equal(c.apiRoot, "http://localhost:9091");
});

test("config: TELEGRAM_API_ROOT tanpa garis miring tetap utuh", () => {
  const c = readConfig({ TELEGRAM_API_ROOT: "http://127.0.0.1:8081" });
  assert.equal(c.apiRoot, "http://127.0.0.1:8081");
});