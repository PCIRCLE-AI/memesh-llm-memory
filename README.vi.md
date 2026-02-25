<div align="center">

# 🧠 MeMesh Plugin

### Bộ nhớ dự án có thể tìm kiếm cho Claude Code

Ghi nhớ các quyết định, mẫu thiết kế và ngữ cảnh — xuyên suốt mọi phiên làm việc.

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)

[Cài đặt](#cài-đặt) • [Cách dùng](#cách-dùng) • [Xử lý sự cố](#xử-lý-sự-cố) • [English](README.md)

</div>

---

## Tại sao tạo dự án này

Tôi rất thích Claude Code. Nó đã thay đổi cách tôi xây dựng phần mềm.

Dự án này bắt đầu vì tôi muốn giúp nhiều người hơn — đặc biệt là những người mới học lập trình — tận dụng tối đa Claude Code cho vibe coding. Một điều tôi nhận ra: khi dự án lớn dần, rất khó để theo dõi tất cả các quyết định đã được đưa ra qua các phiên làm việc. Vì vậy tôi đã xây dựng một plugin (cùng với Claude Code, tất nhiên) để ghi nhớ giúp bạn.

> **Lưu ý**: Dự án này ban đầu có tên "Claude Code Buddy" và đã được đổi tên thành MeMesh Plugin để tránh các vấn đề về thương hiệu.

## Nó làm được gì?

MeMesh Plugin cung cấp cho dự án của bạn một **bộ nhớ có thể tìm kiếm**.

Khi bạn làm việc với Claude Code, MeMesh tự động lưu các quyết định quan trọng, ngữ cảnh kiến trúc và bài học kinh nghiệm. Lần sau khi bạn bắt đầu phiên mới, bạn có thể hỏi "chúng ta đã quyết định gì về auth?" và nhận câu trả lời ngay lập tức.

**Khác gì so với bộ nhớ tích hợp của Claude?**

Claude Code đã có auto memory và CLAUDE.md — rất tốt cho các tùy chọn và hướng dẫn chung. MeMesh bổ sung thêm **bộ nhớ dự án** chuyên dụng mà bạn có thể chủ động tìm kiếm và truy vấn, với khả năng tìm kiếm theo ý nghĩa (không chỉ từ khóa chính xác).

Hãy nghĩ như thế này:
- **CLAUDE.md** = sách hướng dẫn sử dụng cho Claude
- **MeMesh** = sổ tay tìm kiếm được về mọi thứ dự án đã học

---

## Cài đặt

**Bạn cần**: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) và Node.js 20+

```bash
npm install -g @pcircle/memesh
```

Khởi động lại Claude Code. Xong.

**Kiểm tra hoạt động** — gõ lệnh này trong Claude Code:

```
buddy-help
```

Bạn sẽ thấy danh sách các lệnh.

<details>
<summary>Cài đặt từ mã nguồn (cho người đóng góp)</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
```

</details>

---

## Cách dùng

MeMesh thêm 3 lệnh vào Claude Code:

| Lệnh | Chức năng |
|------|-----------|
| `buddy-do "nhiệm vụ"` | Chạy nhiệm vụ với ngữ cảnh bộ nhớ |
| `buddy-remember "chủ đề"` | Tìm kiếm các quyết định và ngữ cảnh trước đó |
| `buddy-help` | Hiển thị các lệnh có sẵn |

**Ví dụ:**

```bash
buddy-do "giải thích codebase này"
buddy-do "thêm xác thực người dùng"
buddy-remember "quyết định thiết kế API"
buddy-remember "tại sao chọn PostgreSQL"
```

Tất cả dữ liệu được lưu trên máy của bạn. Các quyết định được giữ 90 ngày, ghi chú phiên được giữ 30 ngày.

---

## Nền tảng hỗ trợ

| Nền tảng | Trạng thái |
|----------|-----------|
| **macOS** | ✅ Hoạt động |
| **Linux** | ✅ Hoạt động |
| **Windows** | ✅ Hoạt động (khuyên dùng WSL2) |

**Hoạt động với:**
- Claude Code CLI (terminal)
- Claude Code VS Code Extension
- Cursor (qua MCP)
- Các editor tương thích MCP khác

**Claude Desktop (Cowork)**: Các lệnh cơ bản hoạt động, nhưng tính năng bộ nhớ cần phiên bản CLI. Xem [chi tiết Cowork](docs/COWORK_SUPPORT.md).

---

## Xử lý sự cố

**MeMesh không hiển thị?**

```bash
# Kiểm tra đã cài đặt chưa
npm list -g @pcircle/memesh

# Kiểm tra phiên bản Node.js (cần 20+)
node --version

# Chạy lại setup
memesh setup
```

Sau đó khởi động lại Claude Code hoàn toàn.

Thêm trợ giúp: [Hướng dẫn xử lý sự cố](docs/TROUBLESHOOTING.md)

---

## Tìm hiểu thêm

- **[Bắt đầu](docs/GETTING_STARTED.md)** — Hướng dẫn cài đặt từng bước
- **[Hướng dẫn sử dụng](docs/USER_GUIDE.md)** — Hướng dẫn đầy đủ với ví dụ
- **[Lệnh](docs/COMMANDS.md)** — Tất cả các lệnh có sẵn
- **[Kiến trúc](docs/ARCHITECTURE.md)** — Cách hoạt động bên trong
- **[Đóng góp](CONTRIBUTING.md)** — Muốn giúp? Bắt đầu tại đây
- **[Hướng dẫn phát triển](docs/DEVELOPMENT.md)** — Cho người đóng góp

---

## Giấy phép

MIT — Xem [LICENSE](LICENSE)

---

<div align="center">

Có vấn đề? [Mở Issue](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new) — chúng tôi phản hồi nhanh.

[Báo lỗi](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new?labels=bug&template=bug_report.yml) • [Yêu cầu tính năng](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
