# Vì sao đã có session trước khi login?

## Hành vi hiện tại

Khi bạn chưa đăng nhập nhưng đã thấy cookie `connect.sid` (session) trong Postman hoặc trình duyệt, đó là **đúng với thiết kế** của project. Session được tạo và gửi cookie trong hai trường hợp:

1. **Có dùng flash message** (redirect kèm thông báo)
2. **Sau khi login** (lưu `req.session.user`)

---

## Nguyên nhân 1: Flash message (chính)

**Flash** dùng **session** để lưu tin nhắn một lần (ví dụ: "Vous devez être connecté pour accéder à cette page") rồi hiển thị sau khi redirect.

Luồng điển hình:

1. Bạn truy cập route **cần đăng nhập** khi chưa login (ví dụ **GET /dashboard**).
2. Middleware **isAuthenticated** chạy → thấy không có `req.session.user`.
3. Nó gọi **setFlash(req, 'error', 'Vous devez être connecté...')** rồi **res.redirect('/login')**.
4. Trong **setFlash** có: `req.session.flashMessage = { type, message }` → **session bị sửa**.
5. **express-session** thấy session đã thay đổi → **lưu session** và gửi **Set-Cookie** trong response 302.
6. Trình duyệt / Postman nhận cookie → lần sau bạn đã có session **trước khi** bấm Login.

Session lúc này **chỉ chứa** `flashMessage` (để trang /login hiển thị thông báo), **chưa có** `req.session.user`. Sau khi vào /login, middleware **flashToLocalsMiddleware** đọc và xóa `flashMessage` (getFlash), nên thông báo chỉ hiện một lần.

**Kết luận:** Mọi redirect có gọi **setFlash** (lỗi đăng nhập, “phải đăng nhập”, v.v.) đều có thể tạo hoặc cập nhật session và gửi cookie. Vì vậy “chưa login đã có session” là bình thường khi đã từng bị redirect với flash.

---

## Nguyên nhân 2: Cấu hình express-session

Trong **`app/middleware/session.js`**:

- **saveUninitialized: false** → session **mới** (chưa sửa gì) **không** được lưu, **không** gửi cookie.
- Session chỉ được lưu và gửi cookie khi **có thay đổi** (ví dụ: set flash, hoặc gán `req.session.user` khi login).

Nếu không có lần nào gọi setFlash hay login, visitor lần đầu (GET / hoặc GET /login) **không** nhận cookie. Cookie chỉ xuất hiện sau khi:

- Có redirect dùng **setFlash**, hoặc  
- Đăng nhập thành công (gán **req.session.user**).

---

## Tóm tắt

| Tình huống | Có tạo session / gửi cookie? |
|------------|------------------------------|
| Vào GET / hoặc GET /login lần đầu, không redirect với flash | Không (saveUninitialized: false) |
| Vào GET /dashboard khi chưa login → redirect /login + setFlash | Có (session chỉ có flashMessage) |
| POST /login sai mật khẩu → setFlash + redirect /login | Có (session chỉ có flashMessage) |
| POST /login thành công | Có (session có user) |

“Chưa login đã có session” = thường là do **đã từng có redirect dùng setFlash** (ví dụ thử vào dashboard hoặc login sai). Session đó chỉ phục vụ flash, không phải “đã đăng nhập”. Logic bảo vệ route vẫn dựa vào **req.session.user**, không dựa vào việc có hay không có cookie.
