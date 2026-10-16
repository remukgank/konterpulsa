"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isPhoneValidationError } = require("../src/order");

test("recognizes Indonesian phone validation errors from the order site", () => {
  assert.equal(isPhoneValidationError(["Nomor HP tidak benar"]), true);
  assert.equal(isPhoneValidationError(["Nomor tujuan tidak valid"]), true);
  assert.equal(isPhoneValidationError(["Phone number is invalid"]), true);
});

test("does not classify unrelated order errors as phone validation", () => {
  assert.equal(isPhoneValidationError(["Captcha salah"]), false);
  assert.equal(isPhoneValidationError(["Saldo tidak cukup"]), false);
  assert.equal(isPhoneValidationError([]), false);
});
