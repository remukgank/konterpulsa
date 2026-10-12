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
