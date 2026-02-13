# Claude Code Vietnamese IME Fix

Fix lỗi gõ tiếng Việt trong Claude Code CLI cho các bộ gõ (OpenKey, EVKey, PHTV, Unikey...). Hỗ trợ cả phiên bản **npm** và **binary** (macOS, Windows, Linux).

**Phiên bản đã test:**
- npm: v2.1.42
- binary: v2.1.42
(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))

## Cài đặt & Sử dụng

Gõ lệnh sau trong terminal để áp dụng bản vá:

```bash
npx fix-vietnamese-claude-code
```

Lệnh trên sẽ tự động tìm và vá tệp `cli.js` (npm) hoặc file binary của Claude Code trên hệ thống của bạn.

### Tùy chọn nâng cao

Nếu cài đặt ở đường dẫn không mặc định, bạn có thể chỉ định thủ công:

```bash
# Đối với bản npm cli.js
npx fix-vietnamese-claude-code -f "/đường/dẫn/đến/cli.js"

# Đối với bản binary
npx fix-vietnamese-claude-code -f "/đường/dẫn/đến/claude"
```

## Lưu ý
- **Cập nhật:** Bạn cần chạy lại lệnh patch mỗi khi Claude Code cập nhật phiên bản mới.
- **Môi trường:** Đã kiểm tra tốt trên Windows (CMD/PowerShell), macOS và Linux.

## Phát triển
Dự án sử dụng **Vitest** để kiểm tra tính đúng đắn trên nhiều phiên bản.

```bash
npm install
npm test
```

## Credits

Dự án tham khảo và cải tiến từ:
- [claude-code-vietnamese-fix](https://github.com/manhit96/claude-code-vietnamese-fix)
- [PHTV](https://github.com/phamhungtien/PHTV)

Trân trọng cảm ơn các tác giả đã đi trước!
