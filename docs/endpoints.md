# Dokumentasi Endpoint Bot KonterPulsa

Dokumen ini mencatat seluruh endpoint yang digunakan oleh Bot KonterPulsa, baik Telegram Bot API maupun backend situs konter (`konterpulsa.net`). Seluruh temuan endpoint telah diverifikasi secara empiris dengan request nyata ([OBSERVED]) dan/atau bersumber dari dokumentasi resmi ([DOCS]).

---

## 1. Telegram Bot API

Bot mendukung dua target API:
1. **Remote**: `https://api.telegram.org` [DOCS]
2. **Local Bot API Server**: `http://localhost:9091` [DOCS: https://core.telegram.org/bots/api#using-a-local-bot-api-server]
   - Berjalan lokal di VPS via PM2 `telegram-local-api` (`--local --http-port=9091`).
   - Latensi: 1–95 ms (dibanding remote: 430–860 ms).
   - Menghilangkan kendala `UND_ERR_CONNECT_TIMEOUT` (10 detik) akibat kegagalan rute IPv6 pada network host.

### Daftar Method Telegram Bot API yang Digunakan:

#### 1.1 `GET|POST /bot<token>/getMe`
- **Method**: `GET` / `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED: 200 OK via remote & local API]
- **Tujuan**: Verifikasi kredensial bot dan mengambil informasi akun bot (`id`, `username`, `is_bot`).
- **Contoh Response**:
  ```json
  {
    "ok": true,
    "result": {
      "id": 8466632737,
      "is_bot": true,
      "first_name": "Konter Pulsa",
      "username": "konterpulsabot",
      "can_join_groups": true,
      "can_read_all_group_messages": false,
      "supports_inline_queries": false
    }
  }
  ```

#### 1.2 `POST /bot<token>/getUpdates`
- **Method**: `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED]
- **Header**: `Content-Type: application/json`
- **Payload**: `{"offset": <number>, "timeout": 30, "allowed_updates": [...]}`
- **Tujuan**: Long polling untuk mengambil interaksi pesan (`message`), klik tombol (`callback_query`), dan event pembatalan draft (`stopped_message_generation`).

#### 1.3 `POST /bot<token>/sendMessage`
- **Method**: `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED]
- **Header**: `Content-Type: application/json`
- **Payload**: `{"chat_id": 1170158500, "text": "...", "parse_mode": "Markdown|HTML", "reply_markup": {...}}`
- **Tujuan**: Mengirim pesan teks ke pengguna dengan inline keyboard atau opsi reply.

#### 1.4 `POST /bot<token>/editMessageText`
- **Method**: `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED: 200 OK]
- **Header**: `Content-Type: application/json`
- **Payload**: `{"chat_id": 1170158500, "message_id": <id>, "text": "...", "reply_markup": {...}}`
- **Tujuan**: Mengubah tampilan pesan alur order (kategori, operator, voucher, konfirmasi) di tempat tanpa spam pesan baru.

#### 1.5 `POST /bot<token>/deleteMessage`
- **Method**: `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED]
- **Payload**: `{"chat_id": 1170158500, "message_id": <id>}`
- **Tujuan**: Menghapus pesan sementara / prompt lama saat berpindah mode.

#### 1.6 `POST /bot<token>/sendPhoto`
- **Method**: `POST` (multipart/form-data)
- **Status Keyakinan**: [DOCS] + [OBSERVED]
- **Payload**: `chat_id`, `photo` (Buffer attachment), `caption`, `reply_markup`
- **Tujuan**: Mengirim gambar QRIS tagihan, struk transaksi, dan gambar captcha.

#### 1.7 `POST /bot<token>/answerCallbackQuery`
- **Method**: `POST`
- **Status Keyakinan**: [DOCS] + [OBSERVED]
- **Payload**: `{"callback_query_id": "...", "text": "...", "show_alert": false}`
- **Tujuan**: Memberi tahu aplikasi Telegram bahwa klik tombol telah diterima, menghentikan ikon loading di tombol keyboard.

#### 1.8 `POST /bot<token>/sendRichMessage` (Bot API 8.0+)
- **Method**: `POST`
- **Status Keyakinan**: [DOCS: https://core.telegram.org/bots/api/rich-messages] + [OBSERVED: 200 OK via remote & local API]
- **Header**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "chat_id": 1170158500,
    "rich_message": {
      "html": "<table bordered striped><tr><th>Header</th></tr><tr><td>Data</td></tr></table>"
    }
  }
  ```
- **Tujuan**: Menampilkan tabel native bergaris untuk riwayat transaksi, mutasi saldo, dan daftar notifikasi.

#### 1.9 `POST /bot<token>/sendMessageDraft` (Bot API 8.0+)
- **Method**: `POST`
- **Status Keyakinan**: [DOCS: https://core.telegram.org/bots/api#sendmessagedraft] + [OBSERVED: 200 OK via remote & local API]
- **Header**: `Content-Type: application/json`
- **Payload**: `{"chat_id": 1170158500, "message_thread_id": 1, "draft": "Memproses order...", "can_stop": true}`
- **Tujuan**: Menampilkan live streaming animation / draft progress di aplikasi pengguna saat order sedang diproses.

---

## 2. Backend Situs Konter (`konterpulsa.net`)

Klien HTTP menggunakan modul `src/konterApi.js` dengan persistensi cookie session (`KONTER_COOKIE`). Base URL didefinisikan via `KONTER_BASE_URL` (default: `https://konterpulsa.net`).

### 2.1 `GET /order`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, latency ~1,7 s]
- **Auth**: Publik / Tanpa login (juga memuat status login jika cookie dikirim).
- **Format Response**: HTML dengan embedded JavaScript JSON catalog (`var voucher = [...]`, `var pembayaran = [...]`, `var operator = [...]`).
- **Data yang Diekstrak**:
  - `categories`: Daftar 71 kategori produk (`pulsa`, `token_listrik`, `voucher_game`, dsb.) beserta input field yang dibutuhkan (`nomor_hp`, `id_plgn`, `barcode_voucher`).
  - `operators`: Peta ID operator ke nama provider (410 operator).
  - `vouchers`: Peta operator ID ke daftar voucher (381 kelompok paket dengan harga & status).
  - `payments`: Daftar metode pembayaran aktif (QRIS, Saldo, Transfer Bank).
  - `csrf_token`: Nilai token CSRF untuk submit form.
  - `password_verify`: Nilai flag (`0` atau `1`) apakah akun perlu verifikasi password sebelum order.

### 2.2 `GET /beli/password_verify?password=<password>`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Query Param**: `password` (kata sandi akun web konter).
- **Contoh Response**:
  - Password benar: `{"success": true, "message": "Password valid"}`
  - Password salah: `{"success": false, "message": "Password salah"}`
- **Tujuan**: Membuka kunci sesi transaksi jika server meminta verifikasi kata sandi (`password_verify == 1`).

### 2.3 `POST /<kategori>` (Submit Order)
- **Method**: `POST`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Header**: `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- **Payload Form**:
  - `csrf_token`: Token CSRF dari `/order`
  - `operator`: ID operator provider
  - `voucher`: ID voucher paket
  - `pembayaran`: Kode pembayaran (mis. `qris_dana`, `saldo`)
  - `nomor_hp` / `id_plgn` / `barcode_voucher`: Nilai tujuan pelanggan
  - `captcha`: Kode captcha dari gambar `/captcha` (jika diminta)
  - `json_format`: `"1"`
- **Response**: JSON transaksi dengan field `status`, `message`, `trx_id`, dan URL QRIS jika bayar via QRIS.

### 2.4 `GET /captcha?r=<timestamp>`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, image/png, ~236 ms]
- **Auth**: Berbagi cookie session (`KONTER_COOKIE`).
- **Response**: Gambar PNG berukuran ~1–3 KB berisi karakter captcha numerik/alfanumerik.

### 2.5 `GET /akun/profil`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, ~407 ms]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Response**: HTML profil pengguna.
- **Data yang Diekstrak**: `nama`, `pengguna`, `email`, `noHp`, `statusAkun`, `jenisAkun`, `saldo`, `saldoQris`, `totalTransaksi`.

### 2.6 `GET /akun/riwayat-transaksi`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, ~167 ms]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Tabel riwayat transaksi terakhir (`id`, tanggal, produk, tujuan, harga, status transaksi).

### 2.7 `GET /akun/riwayat-transaksi/view/<id>`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Rincian transaksi, serial number (SN) / token PLN, status pengisian, dan QR code pembayaran jika belum lunas.

### 2.8 `GET /akun/riwayat-saldo`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, ~144 ms]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Tabel mutasi debit/kredit saldo akun.

### 2.9 `GET /akun/deposit`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, ~224 ms]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Riwayat pengajuan deposit dan daftar metode deposit aktif (Bank, E-Wallet, QRIS).

### 2.10 `POST /akun/deposit`
- **Method**: `POST`
- **Status Keyakinan**: [OBSERVED]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Payload**: `csrf_token`, `metode`, `nominal`
- **Tujuan**: Membuat tiket deposit saldo baru.

### 2.11 `GET /akun/deposit/view/<id>`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Rincian tagihan deposit, kode unik transfer, atau link gambar QRIS deposit.

### 2.12 `GET /akun/notifikasi`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200 OK, ~327 ms]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Data yang Diekstrak**: Daftar pesan notifikasi order dari sistem konter (sukses, gagal, refund).

### 2.13 `GET /payment/<key>/trx/<id>` & `GET /payment/<key>/deposit/<id>`
- **Method**: `GET`
- **Status Keyakinan**: [OBSERVED: HTTP 200/302]
- **Auth**: Membutuhkan `KONTER_COOKIE`.
- **Tujuan**: Trigger webhook / pengecekan manual status pelunasan pembayaran pihak ketiga.
