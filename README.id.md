<div align="center">

# 🧠 MeMesh Plugin

### Memori Proyek yang Bisa Dicari untuk Claude Code

Ingat keputusan, pola, dan konteks — di setiap sesi.

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)

[Instalasi](#instalasi) • [Penggunaan](#penggunaan) • [Pemecahan Masalah](#pemecahan-masalah) • [English](README.md)

</div>

---

## Mengapa Proyek Ini Ada

Saya sangat suka Claude Code. Cara saya membangun software jadi berubah total.

Proyek ini dimulai karena saya ingin membantu lebih banyak orang — terutama yang baru belajar coding — untuk mendapatkan manfaat maksimal dari Claude Code untuk vibe coding. Satu hal yang saya perhatikan: ketika proyek semakin besar, sulit untuk melacak semua keputusan yang dibuat antar sesi. Jadi saya membuat plugin (bersama Claude Code, tentu saja) yang mengingat untuk Anda.

> **Catatan**: Proyek ini awalnya bernama "Claude Code Buddy" dan telah diganti nama menjadi MeMesh Plugin untuk menghindari masalah merek dagang.

## Apa yang Bisa Dilakukan?

MeMesh Plugin memberikan proyek Anda **memori yang bisa dicari**.

Saat Anda bekerja dengan Claude Code, MeMesh secara otomatis menyimpan keputusan penting, konteks arsitektur, dan pelajaran yang dipelajari. Saat Anda memulai sesi berikutnya, Anda bisa bertanya "apa yang kita putuskan tentang auth?" dan langsung mendapat jawaban.

**Apa bedanya dengan memori bawaan Claude?**

Claude Code sudah punya auto memory dan CLAUDE.md — bagus untuk preferensi dan instruksi umum. MeMesh menambahkan **memori proyek** khusus yang bisa Anda cari dan query secara aktif, dengan dukungan pencarian berdasarkan makna (tidak hanya kata kunci persis).

Bayangkan seperti ini:
- **CLAUDE.md** = buku panduan Anda untuk Claude
- **MeMesh** = buku catatan yang bisa dicari dari semua yang dipelajari proyek Anda

---

## Instalasi

**Yang dibutuhkan**: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) dan Node.js 20+

```bash
npm install -g @pcircle/memesh
```

Restart Claude Code. Selesai.

**Cek apakah berhasil** — ketik ini di Claude Code:

```
buddy-help
```

Anda akan melihat daftar perintah.

<details>
<summary>Instalasi dari source code (untuk kontributor)</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
```

</details>

---

## Penggunaan

MeMesh menambahkan 3 perintah ke Claude Code:

| Perintah | Fungsi |
|----------|--------|
| `buddy-do "tugas"` | Jalankan tugas dengan konteks memori |
| `buddy-remember "topik"` | Cari keputusan dan konteks sebelumnya |
| `buddy-help` | Tampilkan perintah yang tersedia |

**Contoh:**

```bash
buddy-do "jelaskan codebase ini"
buddy-do "tambahkan autentikasi pengguna"
buddy-remember "keputusan desain API"
buddy-remember "kenapa pilih PostgreSQL"
```

Semua data disimpan secara lokal di komputer Anda. Keputusan disimpan selama 90 hari, catatan sesi selama 30 hari.

---

## Platform yang Didukung

| Platform | Status |
|----------|--------|
| **macOS** | ✅ Berjalan |
| **Linux** | ✅ Berjalan |
| **Windows** | ✅ Berjalan (WSL2 direkomendasikan) |

**Kompatibel dengan:**
- Claude Code CLI (terminal)
- Claude Code VS Code Extension
- Cursor (via MCP)
- Editor lain yang kompatibel MCP

**Claude Desktop (Cowork)**: Perintah dasar berfungsi, tetapi fitur memori membutuhkan versi CLI. Lihat [detail Cowork](docs/COWORK_SUPPORT.md).

---

## Pemecahan Masalah

**MeMesh tidak muncul?**

```bash
# Periksa instalasi
npm list -g @pcircle/memesh

# Periksa versi Node.js (butuh 20+)
node --version

# Jalankan ulang setup
memesh setup
```

Lalu restart Claude Code sepenuhnya.

Bantuan lainnya: [Panduan Pemecahan Masalah](docs/TROUBLESHOOTING.md)

---

## Pelajari Lebih Lanjut

- **[Memulai](docs/GETTING_STARTED.md)** — Panduan setup langkah demi langkah
- **[Panduan Pengguna](docs/USER_GUIDE.md)** — Panduan lengkap dengan contoh
- **[Perintah](docs/COMMANDS.md)** — Semua perintah yang tersedia
- **[Arsitektur](docs/ARCHITECTURE.md)** — Cara kerjanya di balik layar
- **[Kontribusi](CONTRIBUTING.md)** — Mau bantu? Mulai di sini
- **[Panduan Pengembangan](docs/DEVELOPMENT.md)** — Untuk kontributor

---

## Lisensi

MIT — Lihat [LICENSE](LICENSE)

---

<div align="center">

Ada masalah? [Buka Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new) — kami merespons cepat.

[Laporkan Bug](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new?labels=bug&template=bug_report.yml) • [Minta Fitur](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
