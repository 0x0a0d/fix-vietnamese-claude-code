# ⚠️ Project Deprecated
> [!IMPORTANT]
> Từ Claude Code `v2.1.108`, Anthropic đã fix sẵn việc gõ tiếng Việt trong Claude Code.
> Nếu bạn đang dùng `v2.1.108` trở lên thì không cần chạy patch này nữa.
> Nếu bạn đang dùng bản thấp hơn `v2.1.108`, nên ưu tiên upgrade lên bản mới thay vì tiếp tục dùng patch.

# Claude Code Vietnamese IME Fix

Bản vá này dành cho các phiên bản Claude Code cũ chưa có fix upstream cho gõ tiếng Việt. Hỗ trợ cả bản **npm** và **binary** (macOS, Windows, Linux), tương thích với các bộ gõ như OpenKey, EVKey, PHTV, Unikey...

**Phiên bản đã test:**
- npm: v2.1.114
- binary: v2.1.114
(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))

## Cài đặt & Sử dụng

Chỉ dùng lệnh sau nếu bạn vẫn đang ở Claude Code `< 2.1.108` và chưa thể nâng cấp ngay:

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
- **Claude Code >= 2.1.108:** Không cần patch nữa.
- **Claude Code < 2.1.108:** Nên ưu tiên upgrade lên `2.1.108` hoặc mới hơn.
- **Nếu vẫn dùng patch cho bản cũ:** Bạn cần chạy lại lệnh patch mỗi khi Claude Code cập nhật sang một phiên bản cũ khác.
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
