# Claude Code Vietnamese IME Fix

Fix lỗi gõ tiếng Việt trong Claude Code CLI với các bộ gõ như OpenKey, EVKey, PHTV, Unikey... Hỗ trợ đa nền tảng (macOS và Windows).

**Phiên bản đã test:** Claude Code v2.0.64 → v2.1.29 (Chi tiết tại [CHANGELOG.md](/CHANGELOG.md))

## Vấn đề

Khi gõ tiếng Việt trong Claude Code CLI, các bộ gõ sử dụng kỹ thuật "backspace rồi thay thế" để chuyển đổi ký tự (ví dụ: `a` + `s` → `á`). Claude Code xử lý phần backspace (ký tự DEL `\x7f`) nhưng không đưa ký tự thay thế vào đúng vị trí, dẫn đến:

- Ký tự bị "nuốt" hoặc mất khi gõ.
- Văn bản hiển thị không đúng với những gì đã gõ.
- Gây khó khăn khi nhập liệu trực tiếp trong terminal.

Script này patch tệp `cli.js` của Claude Code để xử lý đúng các ký tự tiếng Việt sau khi nhận tín hiệu xóa từ bộ gõ.

## Cài đặt & Sử dụng

> [!IMPORTANT]
> **Yêu cầu:** Chỉ hỗ trợ phiên bản cài đặt qua **npm**. Nếu bạn cài Claude Code qua các đường dẫn khác (MSI installer, Homebrew binary), vui lòng gỡ cài đặt và cài lại qua npm:
> ```bash
> npm install -g @anthropic-ai/claude-code
> ```

### 2. Chạy patch

Bạn có thể chạy trực tiếp bằng **npx** (không cần tải file):

```bash
npx fix-vietnamese-claude-code
```

Hoặc nếu bạn đã tải tệp `patch-cli-claude-code.js` về máy:

```bash
node patch-cli-claude-code.js
```

Script sẽ tự động tìm kiếm đường dẫn đến tệp `cli.js` của Claude Code trên hệ thống của bạn và áp dụng bản vá.

### Tùy chọn nâng cao

Nếu script không tự động tìm thấy đường dẫn, bạn có thể chỉ định thủ công:

```bash
node patch-cli-claude-code.js -f "/đường/dẫn/đến/@anthropic-ai/claude-code/cli.js"
```

Xem hướng dẫn chi tiết:
```bash
node patch-cli-claude-code.js --help
```

## Lưu ý

- **Cập nhật:** Mỗi khi Claude Code được cập nhật phiên bản mới, bạn cần chạy lại script patch này vì tệp `cli.js` sẽ bị ghi đè.
- **Môi trường:** Đã kiểm tra và hoạt động tốt trên Windows (CMD/PowerShell) và macOS.

## Phát triển (Dành cho Developer)

Dự án sử dụng **Vitest** để kiểm tra tính đúng đắn của bản vá trên nhiều phiên bản Claude Code khác nhau.

```bash
# Cài đặt dependencies
npm install

# Chạy test
npm test
```

Script test sẽ tự động tải các phiên bản thực tế của Claude Code từ npm (từ `2.0.64` trở đi) để đảm bảo regex luôn khớp.

## Credits

Dự án tham khảo và cải tiến từ:
- [claude-code-vietnamese-fix](https://github.com/manhit96/claude-code-vietnamese-fix)
- [PHTV](https://github.com/phamhungtien/PHTV)

Trân trọng cảm ơn các tác giả đã đi trước!
