"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { redactUrl } = require("../src/konterApi");

test("redactUrl menyembunyikan password dari log", () => {
  assert.equal(
    redactUrl("/beli/password_verify?password=rahasia123"),
    "/beli/password_verify?password=***"
  );
  assert.equal(
    redactUrl("/x?user_password=abc&y=1"),
    "/x?user_password=***&y=1"
  );
  assert.equal(redactUrl("/order?r=123"), "/order?r=123");
  assert.equal(redactUrl(""), "");
  assert.equal(redactUrl(null), "");
});
