# AGENTS.md — Aturan Wajib Proyek Bot KonterPulsa

## Bahasa
- Selalu gunakan **bahasa Indonesia** untuk semua komunikasi, sekarang dan seterusnya.

## Workflow (wajib, urut)
1. Baca `.opencode/skills/audit-workflow/SKILL.md` di awal sesi.
2. **Proposal fix dulu → tunggu approve** sebelum mengubah kode.
3. Setelah approve → implement → **`node --check <file>` HARUS clean** setiap file yang diubah.
4. Jelaskan skenario functional test secara ringkas.
5. Cari potensi bug / error / ketidaksesuaian API.
6. LOG perubahan (file apa saja, folder mana).
7. Deploy/restart pm2 — **tanya user dulu**, verifikasi online + log tanpa error.
8. Commit + push + tag sesuai tingkat perubahan (patch/minor/major).

## Sumber kebenaran API
- **Telegram Bot API**: selalu cek docs resmi terbaru https://core.telegram.org/bots/api (boleh via jina.ai). Jangan asumsi.
- **Endpoint web konter**: verifikasi struktur HTML/endpoint live (curl) sebelum mengubah parsing. Saat ini: `konterpulsa.net` (lihat `.env` / env `KONTER_BASE_URL`).

## Standar fitur
- Fitur bot harus **modern & profesional** demi kenyamanan pengguna (tombol jelas, pesan informatif, error informatif).

## Keamanan
- Jangan commit cookie/token/secret. `.env` gitignored; secret hanya via environment/Replit Secrets.
- Jangan menaruh `KONTER_COOKIE` di `ecosystem.config.js` (ter-track git).

## Deploy
- `pm2 start/restart ecosystem.config.js --update-env` dari `/home/runner/workspace`.
- Env wajib: `TELEGRAM_BOT_TOKEN`, `KONTER_BASE_URL`, `KONTER_COOKIE`, `ALLOWED_CHAT_IDS`.
- Verifikasi: `pm2 jlist` status online + `pm2 logs konter-bot` tanpa error.

## Git
- Repo aktif: `github.com/remukgank/konterpulsa` (remote `konterpulsa`).
- Repo lama `konterkuota` = arsip — jangan di-push perubahan baru ke sana.
- Tag: kecil → patch `v1.x.Y`; sedang (fitur baru) → minor `v1.X.0`; besar (breaking) → major `vX.0.0`.

## Verifikasi sumber wajib (label + urutan)
Urutan sumber: (a) docs resmi via `https://r.jina.ai/<url>` → (b) spec/SDK/repo resmi vendor (baca source) → (c) endpoint discovery ([OBSERVED]: request live + sample response, secret di-redact; write dicatat: endpoint/payload-redact/response/efek) → (d) belum terverifikasi → label [UNVERIFIED] + lanjut item lain.
Label wajib tiap klaim: **[DOCS]** (URL+method), **[SDK/SPEC]** (repo/file/versi), **[OBSERVED]** (request yang dijalankan), **[UNVERIFIED]**. Endpoint discovery dibungkus defensif (validasi shape, field hilang/null tidak crash).

## Quality gate sebelum lapor
1. `node --check <file>` HARUS clean tiap file yang diubah.
2. **Smoke test boot**: `node -e "require('<entry>; console.log('BOOT OK'); process.exit(0)"` (exit sebelum `setImmediate` polling) + require modul non-entry.
3. Baca ulang diff sendiri: import, nama variabel, await, handler error.
4. Config/env yang berubah: catat **before → after** di laporan (rollback).
5. Format laporan per item: Temuan → Fix (file:baris) → Sumber+label+bukti → syntax check → before/after → risiko.
6. Klaim "sudah fix" tanpa bukti verifikasi = belum selesai.

## Standar error & anti-spam
- Semua error API Telegram **429/flood** → tangani `parameters.retry_after` (docs: ResponseParameters.retry_after) dengan retry terbatas & pesan informatif — jangan diam.
- Callback tombol WAJIB selalu di-ack (termasuk saat rate-limited) supaya loading tidak menggantung.
- Jangan membalas tiap pesan yang di-rate-limit (hindari spam); log saja.
- Web konter: defensif retry singkat untuk status transient (429/502/503) dengan backoff kecil.
