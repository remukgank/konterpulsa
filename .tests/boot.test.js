"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("child_process");
const path = require("path");

const ENTRY = path.join(__dirname, "..", "src", "index.js");

test("boot: smoke test entry loads with dummy token (exit before polling)", async () => {
  const code = [
    "process.env.TELEGRAM_BOT_TOKEN = " + JSON.stringify("123456:ABCDEF"),
    "delete require.cache[require.resolve(" + JSON.stringify(ENTRY) + ")]",
    "try { require(" + JSON.stringify(ENTRY) + "); console.log('BOOT_OK'); } catch (e) { console.log('BOOT_ERR:' + e.message); process.exitCode = 1; }",
  ].join(";");
  let out = "";
  const cp = execFile(process.execPath, ["-e", code], { timeout: 5000, env: process.env });
  cp.stdout.on("data", (d) => { out += d.toString(); });
  await new Promise((res) => cp.on("close", res));
  setTimeout(() => { try { cp.kill("SIGTERM"); } catch {} }, 2000);
  assert.ok(out.includes("BOOT_OK"), out);
  assert.ok(!out.includes("BOOT_ERR"), out);
});

test("boot: entry throws when TELEGRAM_BOT_TOKEN missing", async () => {
  const code = [
    "delete process.env.TELEGRAM_BOT_TOKEN",
    "delete require.cache[require.resolve(" + JSON.stringify(ENTRY) + ")]",
    "try { require(" + JSON.stringify(ENTRY) + "); console.log('BOOT_OK'); } catch (e) { console.log('THREW:' + e.message); process.exitCode = 1; }",
  ].join(";");
  let out = "";
  const cp = execFile(process.execPath, ["-e", code], { timeout: 4000, env: process.env });
  cp.stdout.on("data", (d) => { out += d.toString(); });
  await new Promise((res) => cp.on("close", res));
  setTimeout(() => { try { cp.kill("SIGTERM"); } catch {} }, 2000);
  assert.ok(out.includes("THREW:TELEGRAM_BOT_TOKEN belum diisi"), out);
});
