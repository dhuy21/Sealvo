# Hướng dẫn test Phase 2 — Docker Compose (app + MySQL)

Đảm bảo môi trường Phase 2 hoạt động đúng trước khi sang Phase 3.

---

## Điều kiện trước khi test

- Docker và Docker Compose đã cài (trên máy hoặc WSL).
- Thư mục làm việc: **gốc của phần app** (nơi có `Dockerfile`, `docker-compose.yml`, `package.json`). Trong repo này đó là **`src/`**.

```bash
cd /chemin/vers/Web_vocab_v0/src
```

---

## Bước 1: Kiểm tra file `.env`

- Phải có **một** file `.env` ngay trong `src/` (cùng cấp với `docker-compose.yml`).
- Nếu chưa có: `cp .env.example .env` rồi chỉnh các biến (ít nhất DB và PORT).

**Biến bắt buộc cho Compose:**

| Biến | Ví dụ | Ghi chú |
|------|--------|---------|
| `PORT` | `3000` | App trong container lắng nghe cổng này. |
| `APP_HOST_PORT` | `3000` | Cổng trên máy host (vd. truy cập http://localhost:3000). |
| `MYSQLHOST` | `db` | Tên service MySQL trong Compose. |
| `MYSQLPORT` | `3306` | Cổng MySQL trong mạng nội bộ. |
| `MYSQLHOST_PORT` | `3307` | Cổng MySQL trên host (tránh trùng 3306). |
| `MYSQL_DATABASE` | `web_db` | Tên database. |
| `MYSQLUSER` | `root` | User MySQL. |
| `MYSQL_ROOT_PASSWORD` | (mật khẩu của bạn) | Dùng cho app và cho `MYSQL_ROOT_PASSWORD` của container DB. |

Các biến khác (Google, AWS, Gemini, …) có thể để trống hoặc điền sau; app vẫn khởi động được, chỉ một số tính năng (TTS, email, …) sẽ báo lỗi khi gọi.

---

## Bước 2: Dọn container/volume cũ (nếu đã chạy lần trước)

```bash
docker compose down
```

**Lần đầu** sau khi thêm mount `database.sql` vào `docker-entrypoint-initdb.d/`, hoặc khi gặp lỗi **"Table 'web_db.users' doesn't exist"** : cần xóa volume để MySQL chạy lại init và thực thi `database.sql` (tạo bảng). Nếu không xóa volume, MySQL coi data đã có sẵn và **không** chạy script init.

```bash
docker compose down -v
```

**So sánh tổ hợp lệnh:**

| Tổ hợp | Ý nghĩa | Khác gì |
|--------|---------|--------|
| `down -v` rồi `up --build` | Xóa volume + build (dùng cache) + chạy **tiền cảnh** (xem log ngay trên terminal) | Nhanh, tiện khi test lần đầu để thấy log MySQL init và app. |
| `down -v` rồi `build --no-cache` rồi `up -d` | Xóa volume + build **không cache** (image app build lại từ đầu) + chạy **nền** (-d = detached) | Build lâu hơn nhưng image sạch; app + DB chạy nền, không chiếm terminal. Dùng khi muốn “chạy xong rồi tắt terminal” hoặc nghi ngờ cache build sai. |

---

## Bước 3: Build và chạy

```bash
docker compose up --build
```

- `--build`: build lại image app (sau khi sửa code hoặc Dockerfile).
- Không dùng `-d` để xem log trên terminal. Lần đầu MySQL cần vài chục giây để healthy.

**Kỳ vọng trong log:**

- Service `db`: `mysqladmin ping` thành công, service đạt trạng thái **healthy**.
- Service `app`: sau khi `db` healthy, app start; thấy dòng dạng `App listening at http://localhost:3000` (hoặc cổng trong `PORT`).
- Không có lỗi **ECONNREFUSED** hay **connect ETIMEDOUT** từ app tới DB.

Nếu ổn, nhấn `Ctrl+C` để dừng, hoặc mở terminal mới cho các bước sau.

---

## Bước 4: Kiểm tra app (khi đang chạy)

**4.1. Health check**

Trình duyệt hoặc curl:

```bash
curl -s http://localhost:3000/health
```

- **Kỳ vọng:** HTTP 200, body dạng `{"ok":true}` (hoặc tương tự).
- Cổng đúng là giá trị `APP_HOST_PORT` trong `.env` (vd. 3000).

**4.2. Trang chủ**

Mở trình duyệt: `http://localhost:APP_HOST_PORT/` (vd. `http://localhost:3000/`).

- **Kỳ vọng:** Trang chủ load, không lỗi 502/503.

**4.3. Kết nối DB (qua hành vi app)**

- Đăng ký / đăng nhập (nếu có): thao tác thành công nghĩa là app đã nói chuyện được với MySQL.
- Hoặc dùng route bất kỳ cần đọc/ghi DB để xác nhận.

---

## Bước 5: Kiểm tra MySQL (tùy chọn)

Kết nối vào MySQL trong container (từ host):

```bash
docker exec -it web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW DATABASES;"
```

Thay `"${MYSQL_ROOT_PASSWORD}"` bằng giá trị `MYSQL_ROOT_PASSWORD` trong `.env`. Phải thấy database tên giống `MYSQL_DATABASE` (vd. `web_db`).

---

## Bước 6: Chạy nền (detach) và dừng

Chạy nền:

```bash
docker compose up -d --build
```

Xem log app:

```bash
docker compose logs -f app
```

Dừng và xóa container (giữ volume DB):

```bash
docker compose down
```

---

## Checklist Phase 2

- [ ] Có đúng một file `.env` trong `src/`, có đủ biến `PORT`, `APP_HOST_PORT`, `DB_*`.
- [ ] `docker compose up --build` chạy không lỗi; DB healthy, app start sau DB.
- [ ] `GET /health` trả 200.
- [ ] Trang chủ (/) mở được.
- [ ] App dùng được DB (đăng nhập / thao tác cần DB).

Nếu tất cả đạt → Phase 2 ổn, có thể chuyển sang Phase 3.

---

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân có thể | Cách xử lý |
|-------------|--------------------|------------|
| `Cannot find module` khi start app | Thiếu dependency hoặc build sai | Trong `src/`: `docker compose build --no-cache` rồi `docker compose up`. |
| `ECONNREFUSED` tới DB | App chạy trước khi MySQL sẵn sàng (first-run MySQL có "temporary server" rồi mới server thật trên 3306) | Healthcheck DB phải ping qua **TCP 3306** (`-h 127.0.0.1 -P 3306`) và `start_period` đủ lớn (vd. 45s). Đã cấu hình trong `docker-compose.yml`. |
| Port 3000 (hoặc APP_HOST_PORT) already in use | Ứng dụng khác đang chiếm cổng | Đổi `APP_HOST_PORT` trong `.env` (vd. 3001) hoặc tắt app đang dùng cổng đó. |
| `.env: no such file` hoặc biến rỗng | Thiếu `.env` hoặc sai thư mục | Chạy `docker compose` **trong `src/`**, đảm bảo có file `.env` cùng cấp với `docker-compose.yml`. |
| TTS / Google / AWS lỗi khi gọi API | Thiếu hoặc sai biến env (GOOGLE_TTS_*, …) | Điền đúng biến trong `.env`; với TTS xem `app/config/README-TTS-CREDENTIALS.md`. |
