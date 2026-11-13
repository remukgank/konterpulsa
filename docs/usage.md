# Penggunaan Bot KonterPulsa

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
ditentukan otomatis; tinggal isi nomor + bayar).

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

### ⚡ Token PLN (tombol datar, harga termurah dulu)

Menu **Token PLN** tidak lagi memakai submenu channel. Di layar kategori langsung
tampil 4 tombol provider dengan harga paket termurah saat itu, diurutkan dari yang
paling murah:

| Tombol | Kategori web | Operator |
| --- | --- | --- |
| ⚡ Token PLN H2H | `token_pln_h2h` | 709 |
| 🏷️ PLN Prabayar | `token_listrik` | 785 |
| 🏷️ Token PLN Tanpa WA | `token_listrik` | 784 |
| ⚡ Token PLN Reguler | `pln_prabayar` | 654 |

- Satu klik → langsung daftar nominal provider tersebut (tanpa pilih kategori/channel lagi).
- Harga pada label diambil live dari daftar paket; jika server tidak mengirim harga,
  label tampil tanpa nominal dan tombol diletakkan paling bawah.
- Provider yang sudah tidak ada di katalog otomatis disembunyikan (tidak ada tombol mati).
- Tombol "⬅️ Provider" tetap membawa kembali ke daftar provider kategori itu.

### ✅ Konfirmasi Pembayaran (anti-spam)

Setelah QRIS dibayar, tombol **✅ Konfirmasi Pembayaran** tidak lagi menumpuk pesan baru:

- **Satu pesan status per transaksi** — pesan yang sama diperbarui
  (Pending → Diproses → Sukses), termasuk saat notifikasi situs masuk.
- Tekan berulang dalam **20 detik** → hanya notifikasi singkat ("Tunggu N detik"),
  tanpa pesan baru.
- Status sudah **Sukses/Batal/Gagal** → server tidak dipanggil lagi, cukup
  notifikasi "Transaksi sudah Sukses ✅".
- Pesan memakai kalimat biasa ("Konfirmasi diterima — menunggu verifikasi"),
  bukan kode HTTP mentah (mis. `307`); kode asli dicatat di log admin.
- Bila pesan status dihapus manual, bot otomatis mengirim pesan status baru.

## Catatan penting

- **Harga & ketersediaan** bisa berubah; selalu cek ulang sebelum order.
- Jika metode pembayaran yang dipilih tidak punya saldo cukup (mis. Saldo QRIS = 0),
  transaksi akan ditolak oleh server — top-up dulu.
- Captcha hanya berlaku sesaat; jika lewat waktu, buat order ulang (`/order`).
