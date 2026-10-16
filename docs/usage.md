# Penggunaan Bot KonterKuota

## Tampilan per peran

- **Admin** (`ALLOWED_CHAT_IDS`): `/start` menampilkan semua fitur termasuk
  💰 Saldo & 🧾 Mutasi (di bantuan, menu utama, dan reply keyboard).
- **User biasa**: `/start` TIDAK menampilkan Saldo & Mutasi sama sekali.
  Hanya Cari Harga, Riwayat, Order, dan Bantuan.
- Jika user biasa mengetik `/saldo` / `/mutasi` atau menekan tombol terkait,
  guard akan membalas: "🔒 Fitur ini hanya untuk admin (ALLOWED_CHAT_IDS)."

## Perintah

| Perintah | Fungsi | Butuh login |
|---|---|---|
| `/start` `/help` | Bantuan + tampilkan menu utama + reply keyboard | Tidak |
| `/menu` | Tampilkan menu utama (inline) | Tidak |
| `/harga <kata>` atau `/cari <kata>` | Cari produk & harga; tiap hasil bisa langsung order | Tidak |
| `/saldo` | Cek saldo & info akun *(khusus admin)* | Ya (admin) |
| `/riwayat [n]` | Riwayat transaksi (default 10, maks 25) + tombol detail & paginasi | Ya (login) |
| `/mutasi [n]` | Mutasi saldo *(khusus admin)* | Ya (admin) |
| `/notifikasi` | Notifikasi order terbaru *(khusus admin)* | Ya (admin) |
| `/deposit` | Riwayat & buat deposit / top-up saldo *(khusus admin)* | Ya (admin) |
| `/order` | Mulai transaksi interaktif | Ya (login) |
| `/kirimqr <id>` | Kirim ulang QR pembayaran transaksi *(khusus admin)* | Ya (admin) |
| `/batal` | Batalkan proses order yang berjalan | Ya |

Ketik perintah yang salah? Bot akan menyarankan perintah yang paling mirip
(contoh: `/starrt` → `/start`).

## Menu & tombol

- **Reply keyboard** muncul setelah `/start` (persisten):
  `🔍 Cari Harga`, `💰 Saldo Akun`, `📋 Riwayat`, `🧾 Mutasi`, `🛒 Order`, `❓ Bantuan`.
  Tekan salah satu untuk jalan pintas.
- **Menu utama inline** (`/menu` atau tombol `⬅️ Menu Utama`):
  Cari Harga, Saldo Saya, Riwayat, Mutasi, Order, Bantuan.

- **Tombol per-transaksi** (di riwayat & detail):
  `🖼️ Kirim QR #<id>` — kirim QR pembayaran QRIS ke chat (dan ke pengguna target jika admin kirim behalf).
  `🖨️ Cetak Struk` — kirim gambar struk pembayaran untuk dikirim ke pelanggan.
  `✅ Konfirmasi Pembayaran` — paksa cek status pembayaran QRIS.
  Riwayat yang panjang dilengkapi tombol `⬅️ Sebelumnya` / `Selanjutnya ➡️` (paginasi).

## Contoh `/harga`

```
/harga axis 5
/harga telkomsel 10 gb
```

Output:
```
• Axis — Axis 5.000: Rp 6.101
• Axis — Axis 50.000: Rp 50.470
...
```

Pada hasil pencarian, ada tombol `🛒` per produk (stok tersedia) untuk langsung
masuk alur order tanpa memilih kategori lagi (kategori, operator, dan paket
ditentukan otomatis; tinggal isi nomor + bayar + captcha).

## Contoh `/order` (alur interaktif)

1. Ketik `/order`.
2. Pilih **kategori produk** (PULSA, KUOTA TELKOMSEL, GAME, TOKEN PLN, dll).
3. Pilih **provider**.
4. Pilih **paket/nominal**.
5. Masukkan **Nomor HP** (atau **ID Pelanggan/ID Game** untuk kategori tertentu,
   **Barcode Voucher + Nomor HP** untuk aktivasi voucher).
6. Pilih **metode pembayaran**: Saldo Akun atau QRIS.
7. Bot kirim **gambar captcha** → ketik kode keamanannya.
8. Bot memproses; hasil dikirim (sukses → ID transaksi, atau daftar error).

> Ketik `/batal` kapan saja untuk membatalkan proses order.

## Catatan penting

- **Harga & ketersediaan** bisa berubah; selalu cek ulang sebelum order.
- Jika metode pembayaran yang dipilih tidak punya saldo cukup (mis. Saldo QRIS = 0),
  transaksi akan ditolak oleh server — top-up dulu.
- Captcha hanya berlaku sesaat; jika lewat waktu, buat order ulang (`/order`).
