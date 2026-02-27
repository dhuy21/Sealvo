# E2E tests và tác động lên database (DB)

## 1. Các test E2E hiện tại có đụng DB không?

### Phân tích từng luồng

| Test / Luồng                                                           | Request gửi lên server                                                    | Backend làm gì                                                                                                                             | Tác động DB                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Smoke** (home, /login, /aboutme, /feedback, /registre, /health, 404) | Chỉ **GET** (xem trang, health, 404)                                      | Render HTML hoặc trả JSON. Không gọi model users/feedback.                                                                                 | **Không** đọc/ghi DB                                        |
| **Login – wrong credentials**                                          | POST /login với `e2e_invalid_user_xyz_9999` / mật khẩu sai                | `userModel.findByUsername(username)` → không tìm thấy (hoặc tìm thấy rồi so mật khẩu, sai) → trả 400. **Không tạo session**, không ghi gì. | **Chỉ đọc** (SELECT user). Không ghi (INSERT/UPDATE/DELETE) |
| **Registre**                                                           | Không gửi request (nút submit bị chặn bởi HTML5 validation vì form trống) | —                                                                                                                                          | **Không** đụng DB                                           |
| **Feedback – submit trống**                                            | POST /feedback với body thiếu type/subject/content                        | Validation `!type \|\| !subject \|\| !content` → trả **400** ngay, không gọi Mailersend, không lưu feedback vào DB.                        | **Không** đọc/ghi DB                                        |

**Kết luận cho bộ test hiện tại:**

- **Ghi DB:** **Không có** test nào tạo/sửa/xóa dữ liệu (không đăng ký thành công, không gửi feedback thành công, không login thành công).
- **Đọc DB:** Chỉ test **“submitting wrong credentials”** (login) là có **một vài lần đọc** (ví dụ `findByUsername`). Các test còn lại không đọc DB.

---

## 2. Trong thực tế, người ta có chạy E2E trong CI/CD và có tác động DB không?

Có. E2E trong CI/CD rất phổ biến, nhưng **cách tổ chức** quyết định có đụng DB và đụng DB nào.

### Ba mô hình thường gặp

#### A. E2E chạy **chống production** (như project của bạn)

- **Cách làm:** CI sau khi deploy, chạy Playwright với `BASE_URL = https://www.sealvo.it.com` (production).
- **DB:** Ứng dụng production đang dùng **DB production**. Mỗi request từ E2E (ví dụ login sai) đi qua app production → app đọc **DB production**.
- **Tác động:** Chỉ **đọc** (read), không ghi. Vẫn có rủi ro: nếu sau này thêm test ghi dữ liệu (đăng ký thật, tạo vocab thật) mà vẫn chạy contre production thì sẽ **làm bẩn/ghi đè dữ liệu thật**.
- **Thực tế:** Nhiều team dùng mô hình này cho **smoke test production** (chỉ GET + vài flow read-only như login sai). Họ **cố ý không** thêm test ghi dữ liệu lên production.

#### B. E2E chạy **chống staging / môi trường test** (best practice)

- **Cách làm:** Có một môi trường riêng (staging), URL ví dụ `https://staging.sealvo.it.com`. Staging dùng **DB test/staging** (bản copy hoặc DB riêng).
- **DB:** E2E chỉ đụng **DB staging**, không đụng DB production.
- **Tác động:** Có thể thoải mái **đọc và ghi** (tạo user test, tạo dữ liệu, xóa sau test) vì không ảnh hưởng user thật.
- **Thực tế:** Đây là cách nhiều công ty dùng: CI deploy lên staging (hoặc đã có sẵn staging), rồi chạy full E2E (kể cả đăng ký, login, CRUD) trên staging.

#### C. E2E chạy **trong CI với app + DB khởi động trong pipeline** (container / service)

- **Cách làm:** Trong GitHub Actions (hoặc GitLab CI, Jenkins…), khởi động app (và có thể DB trong Docker, hoặc DB test trên cloud). E2E chạy với `BASE_URL=http://localhost:3000` (hoặc URL service trong CI).
- **DB:** App trong CI nối tới **DB test** (trong container hoặc instance riêng). Có thể seed data trước khi chạy E2E.
- **Tác động:** Đọc/ghi đều trên **DB test**, không liên quan production.
- **Thực tế:** Phổ biến khi muốn E2E “đầy đủ” (kể cả flow cần auth, tạo dữ liệu) mà không cần môi trường staging thường trực.

---

## 3. Tóm tắt ngắn gọn

- **E2E có tác động DB không?**
  - Có thể **chỉ đọc**, hoặc **đọc + ghi**, tùy test và tùy **môi trường** (production vs staging vs CI).

- **Test hiện tại của bạn:**
  - **Ghi DB:** không.
  - **Đọc DB:** chỉ test login sai (vài query đọc user).
  - Khi chạy contre production trong CI/CD → đang đọc **DB production** (chỉ read, rủi ro thấp).

- **Trong thực tế người ta có chạy E2E trong CI/CD và đụng DB không?**
  - **Có.** Nhưng thường:
    - **Production:** chỉ smoke / read-only (ít hoặc không ghi).
    - **Staging / CI:** full E2E, đọc + ghi trên **DB test**, không ghi lên production.

---

## 4. Khuyến nghị cho project này

1. **Giữ nguyên** cách hiện tại (E2E contre production, chỉ smoke + login sai + feedback/registre không ghi) là **an toàn với DB** (chỉ có read khi login sai).
2. **Không thêm** test E2E nào **ghi dữ liệu thật** (đăng ký user mới, gửi feedback thành công, tạo vocab…) khi vẫn chạy contre **production**.
3. **Nếu sau này** muốn E2E đầy đủ (đăng ký → login → dùng app):
   - Tạo **staging** (hoặc môi trường test) dùng **DB test**.
   - Chạy E2E contre staging trong CI (hoặc chạy app + DB test trong pipeline).
   - Có thể dùng seed/fixture để có user test cố định, hoặc tạo user trong test rồi dọn dẹp (teardown).

Như vậy: **các test hiện tại gần như không tác động DB (không ghi; chỉ một chút đọc khi test login sai)**. Trong CI/CD người ta vẫn chạy E2E và có đụng DB, nhưng thường tách rõ: production = read-only/smoke, còn đọc+ghi = staging/DB test.
