# MySQL trong Docker: Khởi tạo data & Giải thích lỗi ECONNREFUSED

Tài liệu trả lời hai câu hỏi:
1. **Data trong container MySQL được khởi tạo như thế nào?** (và tại sao không thấy file init DB?)
2. **Lỗi ECONNREFUSED khi app kết nối DB — nguyên nhân và cách sửa chi tiết.**

---

## 1. Data trong service MySQL container được khởi tạo thế nào?

### 1.1. Những gì Docker Compose đang làm (không có file init)

Trong `docker-compose.yml` với service `db`:

```yaml
db:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    MYSQL_DATABASE: ${MYSQL_DATABASE}   # ví dụ web_db
  volumes:
    - db_data:/var/lib/mysql
```

- **Image chính thức MySQL** (`mysql:8.0`) khi chạy **lần đầu** (volume `db_data` còn trống) sẽ:
  - Khởi tạo thư mục data trong `/var/lib/mysql`;
  - Tạo **một database rỗng** tên `MYSQL_DATABASE` (vd. `web_db`);
  - Set mật khẩu root theo `MYSQL_ROOT_PASSWORD`.
- **Không có file SQL nào** được mount vào container → **chỉ có database rỗng, không có bảng** (users, packages, words, …). App cần các bảng đó nên nếu chưa chạy schema thì sẽ lỗi khi dùng DB.

Tóm lại: hiện tại **không có** file init DB cho container; container chỉ tạo **database rỗng** nhờ biến env của image.

### 1.2. Cách “init” schema (bảng) trong Docker

Hai hướng thường dùng:

**Cách A — Chạy tay một lần sau khi MySQL đã chạy**

- MySQL đã tạo sẵn database `web_db` (rỗng).
- Bạn chạy file `app/core/database.sql` **một lần** để tạo bảng (trên host hoặc trong container):

```bash
# Từ host (port MySQL map ra MYSQLHOST_PORT, ví dụ 3307)
mysql -h 127.0.0.1 -P 3307 -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db < src/app/core/database.sql
```

Hoặc vào trong container:

```bash
docker exec -i web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db < src/app/core/database.sql
```

(Lưu ý: `database.sql` có `DROP DATABASE` / `CREATE DATABASE` — với Docker thì database đã có sẵn, nên có thể cần bỏ hai dòng đó hoặc dùng file chỉ có phần CREATE TABLE; xem Cách B.)

**Cách B — Init tự động lần đầu (đã áp dụng trong project)**

Image MySQL: khi **lần đầu** khởi tạo (volume trống), nó chạy mọi file trong **`/docker-entrypoint-initdb.d/`**. Project dùng file migration **`migrations/001_initial.sql`** làm schema khởi tạo:

- Trong **`docker-compose.yml`**, service `db` mount file đó vào container:
  ```yaml
  - ./migrations/001_initial.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
  ```
- `001_initial.sql` chứa USE web_db + CREATE TABLE (schema_migrations, users, packages, …); lần đầu chạy một lần, các bảng được tạo. Chi tiết migrations và DB client: **docs/DATABASE.md**.

Khi bạn chạy `docker compose up` **lần đầu** (hoặc sau `docker compose down -v`), MySQL chạy `01-schema.sql` (nội dung từ `database.sql`) → các bảng được tạo. Các lần `up` sau (volume cũ) thì **không** chạy lại.

### 1.3. Tóm tắt

| Câu hỏi | Trả lời ngắn |
|--------|---------------|
| Data trong MySQL container khởi tạo thế nào? | Image MySQL tự tạo **database rỗng** tên `MYSQL_DATABASE` khi volume lần đầu tạo; **không** có file init DB trong compose nên **không có bảng** trừ khi bạn chạy `database.sql` tay hoặc mount script vào `docker-entrypoint-initdb.d/`. |
| Tại sao không thấy file init DB? | Vì trong compose hiện tại **chưa** mount file SQL vào `/docker-entrypoint-initdb.d/`; nếu muốn init tự động, cần thêm volume mount như trên (và file schema không DROP/CREATE DATABASE). |

---

## 2. Lỗi ECONNREFUSED và cách sửa — giải thích chi tiết, dễ hiểu

### 2.1. Triệu chứng

- App (container `web_vocab_app`) in: `Erreur de connexion à la base de données : connect ECONNREFUSED 172.18.0.2:3306`.
- App thoát (exit code 1); MySQL container vẫn chạy và vài giây sau in "ready for connections ... port: 3306".

### 2.2. Timeline (thứ tự thật khi chạy)

Khi bạn chạy `docker compose up` **lần đầu** (volume DB mới), thứ tự thực tế gần như sau:

1. **T+0s** — Container `web_vocab_db` start. Image MySQL bắt đầu **khởi tạo lần đầu** (tạo file data, tạo user, tạo database `web_db`).
2. **Trong lúc init** — MySQL chạy một **“temporary server”** nội bộ (phục vụ việc tạo DB, user, …). Temporary server này **không** lắng nghe trên port **3306** (hoặc chỉ socket / port khác tùy bản).
3. **Healthcheck của Docker** chạy định kỳ trong container DB. Healthcheck cũ là: `mysqladmin ping -h localhost -uroot -p...`. Với `localhost`, client MySQL thường dùng **socket** (file) để kết nối. Temporary server **có** socket → **ping thành công** → Docker đánh dấu container DB là **healthy**.
4. **Compose thấy DB healthy** → khởi động container **app**. App đọc `MYSQLHOST=db`, `MYSQLPORT=3306` → mở kết nối TCP tới `db:3306`.
5. **Đúng lúc đó** — Trong container DB, temporary server **vừa tắt** (init xong), MySQL **chính thức** đang chuẩn bị start và **chưa** bind port 3306. Không có process nào đang listen 3306 → app nhận **ECONNREFUSED**.
6. **Vài giây sau** — MySQL server thật start xong, in "ready for connections ... port: 3306". Nhưng app đã crash rồi.

Nói ngắn gọn: **App được phép start vì healthcheck đã “pass” nhầm lúc (khi temporary server còn chạy), trong khi kết nối của app lại đi qua TCP port 3306 — lúc đó chưa có server thật listen 3306.**

### 2.3. Nguyên nhân kỹ thuật

- **Healthcheck cũ:** `mysqladmin ping -h localhost` → có thể dùng **socket** → pass khi **temporary server** đang chạy.
- **App:** Kết nối qua **TCP** tới `db:3306` → cần process **thật** listen trên 3306.
- **Khoảng trống:** Có một cửa sổ thời gian (vài giây) mà container đã “healthy” nhưng **chưa có** server thật trên 3306 → ECONNREFUSED.

### 2.4. Cách sửa đã áp dụng

Đảm bảo healthcheck **chỉ pass** khi **server MySQL thật** đã lắng nghe trên **TCP port 3306**:

- **Đổi lệnh healthcheck** từ  
  `mysqladmin ping -h localhost -uroot -p...`  
  sang  
  `mysqladmin ping -h 127.0.0.1 -P 3306 -uroot -p...`
  - `-h 127.0.0.1` + `-P 3306`: bắt buộc dùng **TCP**, không dùng socket.
  - Temporary server không listen 3306 → ping **fail** trong giai đoạn init.
  - Chỉ khi MySQL thật start và listen 3306 → ping **pass** → Docker mới đánh dấu healthy → Compose mới start app → app kết nối 3306 đúng lúc.

Đồng thời tăng **start_period** (vd. 45s) và **retries** để cho MySQL đủ thời gian init lần đầu và tránh đánh dấu unhealthy quá sớm.

### 2.5. Tóm tắt sửa lỗi

| Trước | Sau |
|--------|-----|
| `mysqladmin ping -h localhost` (có thể qua socket) | `mysqladmin ping -h 127.0.0.1 -P 3306` (bắt buộc TCP 3306) |
| Healthcheck có thể pass khi temporary server còn chạy | Healthcheck chỉ pass khi server thật đã listen 3306 |
| App start sớm → kết nối 3306 lúc chưa có server → ECONNREFUSED | App chỉ start sau khi DB thật sẵn sàng → kết nối thành công |

File đã sửa: `src/docker-compose.yml` (phần `healthcheck` của service `db`).
