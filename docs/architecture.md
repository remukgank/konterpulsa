# Arsitektur Bot KonterPulsa (KonterKuota)

Bot Telegram ini berinteraksi langsung dengan situs konter (via HTTP)
tanpa API khusus. Semua komunikasi meniru perilaku situs (fetch HTML + POST form),
sambil memanfaatkan fitur modern Telegram Bot API (streaming draft, rich message,
reaction, dan inline keyboard).

## Alur umum

```
Telegram (pengguna)
   │  (polling grammY)
   ▼
src/index.js  ── perintah/menu interaktif ──►  src/order.js  /  src/akun.js  /  src/harga.js  /  src/util.js
                                                          │                                                       │
                                                          ▼                                                       ▼
                                                 src/konterApi.js  (client HTTP dengan cookie)   (helper murni untuk tes)
                                                         │
                                                         ▼
                                               situs konter (HTTPS)
```

## Struktur folder

| File | Peran |
|---|---|
| `src/index.js` | Entry point; daftarkan semua handler perintah & alur interaktif order |
| `src/config.js` | Baca konfigurasi dari env / `.env` / Replit Secrets |
| `src/konterApi.js` | Client HTTP: request dengan cookie, refresh `csrf_cookie` dari `Set-Cookie`, ambil buffer (captcha), retry transient |
| `src/harga.js` | Baca katalog harga (public) & cari produk (tanpa login) |
| `src/akun.js` | Profil/saldo, riwayat transaksi, detail trx, mutasi saldo, deposit & notifikasi (butuh login) |
| `src/order.js` | Config order (kategori/operator/voucher/pembayaran) & submit order |
| `src/struk.js` | Render struk pembayaran (SVG → PNG via ImageMagick) + rumus harga jual |
| `src/ledger.js` / `src/depLedger.js` | Catatan transaksi & deposit per chat (file JSON) |
| `bot/telegram.js` | Wrapper `grammY` (adapter) + whitelist chat id + streaming draft |
| `src/util.js` | Helper murni (escHtml/escMd, notifBlocksHtml, sanitize tombol, suggestCommand, tgTimeCell, dst.) — diuji di `.tests/` |
| `scripts/test-*.js` | Skrip uji parsers/endpoint (tanpa Telegram) |
| `.tests/*.test.js` | Tes otomatis (node:test); jalankan `npm test` |
| `docs/*.md` | Dokumentasi |

## Endpoint yang dipakai (hasil analisa & verifikasi)

| Fungsi | Method & Path | Butuh login | Data dikirim |
|---|---|---|---|
| Katalog harga & produk | `GET /order` | Tidak | — |
| Cek profil & saldo | `GET /akun/profil` | Ya | — |
| Riwayat transaksi | `GET /akun/riwayat-transaksi` | Ya | — |
| Detail transaksi | `GET /akun/riwayat-transaksi/view/{id}` | Ya | — |
| Mutasi saldo | `GET /akun/riwayat-saldo` | Ya | — |
| Riwayat deposit | `GET /akun/deposit` | Ya | — |
| Metode deposit + CSRF | `GET /akun/deposit` | Ya | — |
| Detail deposit | `GET /akun/deposit/view/{id}` | Ya | — |
| Notifikasi | `GET /akun/notifikasi` | Ya | — |
| Konfirmasi pembayaran | `GET /payment/{key}/trx/{id}` | Ya | — |
| Konfirmasi deposit | `GET /payment/{key}/deposit/{id}` | Ya | — |
| Gambar captcha | `GET /captcha?r={ts}` | Ya (per-session) | — |
| **Submit order** | `POST /{kategori}` | Ya | `csrf_token, operator, voucher, nomor_hp\|id_plgn\|barcode_voucher, pembayaran, captcha, json_format=1` |

## Fitur Telegram Bot API yang dipakai

- `sendMessageDraft` + `draft_id`/`can_stop`: preview animasi saat memproses (draft hilang otomatis saat pesan final dikirim) — [DOCS] https://core.telegram.org/bots/api#sendmessagedraft
- `sendRichMessage`: tabel native (`<table bordered striped>`) untuk riwayat, saldo, mutasi, detail — [DOCS] https://core.telegram.org/bots/api/rich-messages
- `<tg-time unix="...">`: tanggal dinamis lokal pengguna — [DOCS] https://core.telegram.org/bots/api/formatting
- `setMessageReaction` ("👍"/"🎉"): feedback order & pembayaran — [DOCS] https://core.telegram.org/bots/api#setmessagereaction
- `stopped_message_generation`: deteksi user menekan tombol "stop" draft — [DOCS] https://core.telegram.org/bots/api#getting-updates
- `answerCallbackQuery`: ack setiap tombol (termasuk saat rate-limited) — [DOCS] https://core.telegram.org/bots/api#answercallbackquery
- `429/flood`: tangani `parameters.retry_after` dengan retry terbatas — [DOCS] ResponseParameters

## Kategori produk & field yang dibutuhkan

| Kategori | Endpoint | Field |
|---|---|---|
| `pulsa`, `kuota_*`, `nelpon_sms`, `voucher_*`, `indosat_gift`, `telkomsel_combo_sakti`, `paket_internet`, `dompet_digital`, `telkomsel_bulk` | `/pulsa`, dll | `nomor_hp` |
| `game`, `token_pln`, `pdam`, `tagihan`, `indosat_only4u`, `tv_prabayar`, `pbb` | sesuai kategori | `id_plgn` |
| `aktivasi_voucher` | `/aktivasi_voucher` | `barcode_voucher` + `nomor_hp` |

## Mekanisme CSRF & cookie

- Server (CodeIgniter) memakai CSRF: cookie `csrf_cookie` harus bernilai sama dengan
  field form `csrf_token`.
- `konterApi` selalu menyimpan cookie dari `Set-Cookie`, sehingga setelah satu kali
  `GET /order`, cookie `csrf_cookie` dan token form tersinkron.
- Sebelum submit order, bot mengambil `GET /order` segar untuk `csrf_token` yang
  cocok dengan cookie terbaru.

## Catatan penting order

- Setiap transaksi mewajibkan **captcha** yang dibangkitkan per-session. Bot mengunduh
  gambar captcha **dengan cookie yang sama** (`getBuffer`) lalu mengirim buffer-nya ke
  Telegram sebagai photo. User mengetik kode, bot submit dengan cookie yang sama.
  Ini penting: jika dikirim sebagai URL telanjang ke Telegram, Telegram men-download
  tanpa cookie sehingga captcha tidak cocok dengan session order.
- Pembayaran yang dipakai bot: **Saldo Akun** (`balance`, hanya admin) dan **QRIS**.
- QRIS: QR di-generasi & di-upscale, polling status otomatis (maks ~12,5 menit), dan
  tombol *Konfirmasi Pembayaran* untuk paksa cek status.

## Pengujian

- Semua file JS divisah sesuai syntax (`node --check <file>`).
- Tes otomatis ada di `.tests/` (node:test), jalankan `npm test`. Cover:
  parser HTML konter, `roundSell`/`formatRp`, `searchProducts`, helper `src/util.js`,
  dan smoke test boot entry.

## Keamanan

- Kredensial (cookie session) disimpan di `.env` / Replit Secrets, **tidak pernah di-commit**.
- Perintah sensitif (`/saldo`, `/riwayat`, `/mutasi`, `/order`, `/deposit`, `/notifikasi`)
  hanya jalan untuk `ALLOWED_CHAT_IDS`. Perintah `/harga` (read-only) bebas.
- Jika `ALLOWED_CHAT_IDS` kosong, semua chat bisa mengakses fitur sensitif
  (**TIDAK disarankan**; akan ada warning saat boot).
- Cookie session bisa kedaluwarsa; jika gagal, perbarui `KONTER_COOKIE` dari browser.
