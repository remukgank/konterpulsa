"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isPhoneValidationError, needsPasswordVerify, parsePasswordVerifyNeeded } = require("../src/order");

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

test("recognizes password verification requirement from the order site", () => {
  // pesan asli server (typo 'passsword' ikut terdeteksi)
  assert.equal(needsPasswordVerify(["Silakan verifikasi passsword terlebih dahulu."]), true);
  assert.equal(needsPasswordVerify(["Silakan verifikasi password terlebih dahulu"]), true);
  assert.equal(needsPasswordVerify(["Silakan verifikasi kata sandi terlebih dahulu."]), true);
  assert.equal(needsPasswordVerify(["Password salah"]), false);
  assert.equal(needsPasswordVerify(["Nomor HP tidak benar"]), false);
  assert.equal(needsPasswordVerify([]), false);
});

test("parses password_verify flag from order page HTML", () => {
  assert.equal(parsePasswordVerifyNeeded('<span id="password_verify">1</span>'), true);
  assert.equal(parsePasswordVerifyNeeded('<span id="password_verify">0</span>'), false);
  assert.equal(parsePasswordVerifyNeeded('<span class="x" id="password_verify" >1</span>'), true);
  assert.equal(parsePasswordVerifyNeeded('<span id="password_verify_other">1</span>'), null);
  assert.equal(parsePasswordVerifyNeeded(""), null);
  assert.equal(parsePasswordVerifyNeeded(null), null);
});
