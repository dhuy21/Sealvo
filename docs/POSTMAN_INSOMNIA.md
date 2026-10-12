# Hướng dẫn test API và session/auth bằng Postman / Insomnia (từ đầu)

Dùng Postman hoặc Insomnia để gửi request thủ công, kiểm tra login, session (cookie) và các route cần đăng nhập.

**Nếu bạn dùng Postman phiên bản 1.19.1** (thường là extension trong Cursor/VS Code): import file **`Web_vocab_API_v1.postman_collection.json`** (format v1). Nếu vẫn không import được, hãy dùng **Postman desktop** (tải tại postman.com) hoặc **Insomnia** — hai công cụ này hỗ trợ collection tốt hơn.

---

## Bước 0: Chuẩn bị

1. **Code và server**
   - Mở project, vào thư mục `src`:
     ```bash
     cd src
     npm start
     ```
   - Server chạy tại: **http://localhost:3000** (hoặc port trong `.env`).

2. **Tài khoản test**
   - Cần ít nhất một user đã có trong database (để test login và route cần auth).
   - Nếu chưa có: đăng ký qua trình duyệt tại `http://localhost:3000/registre`, hoặc tạo user trực tiếp trong DB.

3. **File cần dùng**
   - Collection (format v2, dùng cho Postman desktop mới / Insomnia): `docs/postman/Web_vocab_API.postman_collection.json`
   - Collection (format v1, thử khi dùng Postman extension 1.x / Cursor): `docs/postman/Web_vocab_API_v1.postman_collection.json`
   - Environment (Postman): `docs/postman/Web_vocab_local.postman_environment.json`

---

## Phần 1: Postman (từ đầu)

### Bước 1.1 – Import collection

1. Mở **Postman** (desktop hoặc extension trong Cursor/VS Code).
2. Vào **File** → **Import** (hoặc nút **Import**).
3. Chọn **Upload Files** (hoặc kéo thả file).
4. Chọn file collection:
   - **Postman desktop** (bản mới) hoặc **Insomnia**: dùng **`Web_vocab_API.postman_collection.json`** (format v2).
   - **Postman extension 1.x** (ví dụ 1.19.1 trong Cursor): thử **`Web_vocab_API_v1.postman_collection.json`** (format v1) trước. Nếu vẫn báo lỗi import, nên dùng **Postman desktop** (tải postman.com) hoặc **Insomnia** để test API.
5. Bấm **Import**.

→ Bên trái xuất hiện collection **Web Vocab API** với 4 folder: **Auth**, **Protected pages**, **API need auth**, **Site public**.

### Bước 1.2 – Import environment

1. Vẫn **File** → **Import**.
2. Chọn file: **`Web_vocab_local.postman_environment.json`**.
3. Bấm **Import**.
4. Ở **góc phải trên** Postman, mở dropdown môi trường (có thể đang là "No Environment") và chọn **Web Vocab - Local**.

### Bước 1.3 – Cấu hình environment (baseUrl, username, password)

1. Bấm vào **icon bánh răng** (Settings) cạnh dropdown environment, hoặc mở **Environments** trong sidebar.
2. Chọn **Web Vocab - Local**.
3. Trong bảng variables:
   - **baseUrl**: để `http://localhost:3000` (hoặc đúng port của bạn). Cột **Initial value** và **Current value** đều có thể điền giống nhau.
   - **username**: điền **tên đăng nhập** của user test (trong **Current value** là đủ).
   - **password**: điền **mật khẩu** của user test (trong **Current value**).
4. Bấm **Save**.

*(Initial value = giá trị mặc định khi chia sẻ env; Current value = giá trị đang dùng khi gửi request. Nếu Current value trống thì Postman dùng Initial value.)*

### Bước 1.4 – Gửi request đầu tiên (không cần đăng nhập)

1. Trong collection, mở folder **Site (public)**.
2. Chọn request **GET Home**.
3. Bấm **Send**.
4. Kiểm tra: Status **200**, body là HTML trang chủ.

→ Nếu được: server đang chạy đúng và `baseUrl` đúng.

### Bước 1.5 – Đăng nhập để lấy session (cookie)

1. Mở folder **Auth**.
2. Chọn request **POST Login (obtenir session)**.
3. Trong tab **Body** phải là **raw** + **JSON**, với nội dung dùng `{{username}}` và `{{password}}` (đã cấu hình trong environment).
4. Bấm **Send**.
5. Kiểm tra:
   - Status **200**.
   - Body JSON có dạng: `{ "redirect": "/dashboard" }`.
   - Tab **Headers** của **Response** có **Set-Cookie** (cookie tên `connect.sid`).

→ Postman tự lưu cookie cho domain `localhost`; các request tiếp theo trong cùng collection sẽ gửi kèm cookie này.

### Bước 1.6 – Test route cần đăng nhập (có session)

1. Mở folder **Protected (pages)**.
2. Chọn **GET Dashboard**, bấm **Send**.
3. Kiểm tra: Status **200**, body là HTML trang dashboard (không bị redirect về login).

4. Thử **GET My Packages**, **GET Games** → cũng phải **200** (vì đã có cookie).

5. Mở folder **API (need auth)**:
   - **POST Update streak** → Send → thường **200** (hoặc 4xx tùy logic app).
   - **GET Level progress status** → Send → **200** (hoặc body rỗng tùy API).

→ Nếu đều 200 (hoặc 2xx) thì session/auth đang hoạt động đúng.

### Bước 1.7 – Kiểm tra khi không có session (sau logout)

1. **Tắt "Follow Redirect" cho request GET Logout** (trong Postman: Settings của request hoặc tab Settings → bỏ chọn "Automatically follow redirects" cho request này). Như vậy bạn sẽ thấy response **302** và header **Set-Cookie** xóa cookie; Postman sẽ cập nhật cookie jar đúng.
2. Trong **Auth**, gửi **GET Logout**. Kiểm tra: Status **302**, trong response **Cookies** hoặc **Headers** có Set-Cookie xóa `connect.sid`.
3. Sau đó gửi **GET Dashboard** (trong Protected (pages)).
4. Kiểm tra: Status **302**, header **Location** = `/login` (redirect về trang login).

5. Gửi **POST Update streak** (trong API (need auth)).
6. Kiểm tra: Status **401**, body JSON có `success: false` và message yêu cầu đăng nhập.

→ Nếu GET Logout vẫn để "Follow redirect" bật: Postman sẽ theo 302 sang GET `/`, server trả 200 + Set-Cookie **mới** (session rỗng), nên bạn vẫn thấy 1 cookie (session mới). Khi đó GET Dashboard có thể vẫn 200 nếu cookie cũ chưa bị xóa. Tắt follow redirect để cookie cũ được xóa đúng.

**Cookie tự xuất hiện lại sau khi bạn xóa thủ công:** Khi bạn gửi bất kỳ request nào (kể cả GET /dashboard) **không kèm cookie**, server (express-session) có thể tạo session mới và gửi **Set-Cookie** trong response. Postman nhận và lưu lại nên bạn thấy cookie xuất hiện lại. Cookie đó là **session mới (rỗng)**, không phải session cũ đã logout. Điều quan trọng là: nếu bạn gửi GET /dashboard **lần đầu sau khi xóa cookie** (hoặc sau logout), response phải là **302** về `/login`. Sau đó response 302 có thể kèm Set-Cookie (session mới) nên cookie lại có trong Postman — hành vi này là bình thường. Để test "không gửi cookie" mà không bị cookie mới ghi đè: trong Postman, với request **GET Dashboard**, vào **Request → Cookies** (hoặc link "Cookies" dưới nút Send), bỏ chọn / xóa cookie cho domain `localhost` rồi **Send ngay** (không gửi request khác trước); và tắt **Follow redirect** để chỉ xem response 302, không theo redirect (tránh request tiếp theo tạo cookie mới).

### Tóm tắt thứ tự dùng Postman

1. Import collection + environment → chọn env **Web Vocab - Local**.
2. Điền **username** / **password** trong environment → Save.
3. (Tùy chọn) **GET Home** để kiểm tra server.
4. **POST Login** → kiểm tra 200 + Set-Cookie.
5. **GET Dashboard**, **GET My Packages**, **POST Update streak** → kiểm tra 200/2xx.
6. **GET Logout** → rồi gửi lại Dashboard / Update streak → kiểm tra 302 và 401.

---

## Phần 2: Insomnia (từ đầu)

### Bước 2.1 – Import collection

1. Mở **Insomnia**.
2. Vào **Application** → **Import/Export** → **Import Data** → **From File** (hoặc tương đương trong phiên bản bạn dùng).
3. Chọn file **`Web_vocab_API.postman_collection.json`**.
4. Import xong sẽ thấy collection **Web Vocab API** với các folder giống Postman.

### Bước 2.2 – Tạo environment và biến

1. Tạo environment (ví dụ tên **Local**): thường qua dropdown environment hoặc Manage Environments.
2. Thêm biến:
   - **baseUrl** = `http://localhost:3000`
   - **username** = tên đăng nhập user test
   - **password** = mật khẩu user test
3. Chọn environment **Local** làm active.

### Bước 2.3 – Test giống Postman

1. Đảm bảo server đang chạy (`cd src && npm start`).
2. **POST Login** (trong Auth) → Send → kiểm tra 200, cookie được lưu.
3. **GET Dashboard**, **GET My Packages**, **POST Update streak** → kiểm tra 200/2xx.
4. **GET Logout** → sau đó gửi lại Dashboard / Update streak → kiểm tra 302 và 401.

Insomnia cũng tự lưu cookie theo domain; không cần cấu hình thêm cho session.

---

## Bảng nhanh: Các folder trong collection

| Folder | Mục đích |
|--------|----------|
| **Auth** | GET/POST Login, GET/POST Registre, GET Logout, GET/POST Forgot Password, GET Reset Password. |
| **Protected (pages)** | GET Dashboard, Mon Vocabulaire, My Packages, Games — **cần đăng nhập** (200 nếu có cookie, 302 nếu không). |
| **API (need auth)** | POST update-streak, POST create package, GET level-progress/status, POST level-progress/track — **cần đăng nhập** (2xx nếu có cookie, 401 nếu không). |
| **Site (public)** | GET Home, About me, GET/POST Feedback — **không cần đăng nhập**. |

Session = cookie **connect.sid** do server gửi sau **POST Login** thành công. Postman/Insomnia gửi lại cookie này cho mọi request tiếp theo tới cùng domain cho đến khi bạn **GET Logout** hoặc xóa cookie.
