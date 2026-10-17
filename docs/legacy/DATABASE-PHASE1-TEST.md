# Hướng dẫn test Phase 1 — Schema versioning, migrations & DB client

Kiểm tra đầy đủ Phase 1 (Database Management & Operations) theo trình tự logic, đúng cách team chuyên nghiệp validate hệ thống migration và DB client.

---

## Nguyên tắc test (theo thực tế triển khai)

1. **Init từ Docker** → schema có sẵn khi container DB khởi tạo lần đầu (volume trống).
2. **Runner idempotent** → chạy `npm run migrate` nhiều lần không apply trùng, không lỗi.
3. **Migration mới** → thêm file 002, chạy runner, kiểm tra bảng mới + bản ghi trong `schema_migrations`.
4. **DB client** → kết nối được, xem được bảng và data (CLI hoặc GUI).

---

## Điều kiện trước khi test

- **Docker** và **Docker Compose** đã cài.
- **Thư mục làm việc:** `src/` (nơi có `docker-compose.yml`, `package.json`, `migrations/`).

```bash
cd /chemin/vers/Web_vocab_v0/src
```

- File **`.env`** trong `src/` với ít nhất:
  - `PORT`, `HOST_PORT` (vd. 3000) — cho app.
  - `MYSQLHOST`, `MYSQLPORT`, `MYSQL_DATABASE`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `MYSQLHOST_PORT` (vd. 3307).

Nếu chưa có `.env`: `cp .env.example .env` rồi điền giá trị.

---

## Bước 1: Dọn volume cũ và khởi tạo DB từ migration (Docker init)

**Mục tiêu:** Xác nhận khi volume MySQL trống, Docker init chạy `migrations/001_initial.sql` và tạo đủ bảng (gồm `schema_migrations`).

1.1. Dừng container và **xóa volume** để lần sau `up` MySQL chạy lại init:

```bash
docker compose down -v
```

1.2. Chỉ start service **db** (đủ để test init và migration runner):

```bash
docker compose up -d db
```

1.3. Đợi DB healthy (khoảng 30–60 giây). Kiểm tra:

```bash
docker compose ps
```

Kỳ vọng: service `db` trạng thái **Up (healthy)**.

1.4. Kiểm tra schema đã được tạo từ init (file trong `docker-entrypoint-initdb.d`):

```bash
docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "USE web_db; SHOW TABLES;"
```

Thay `"${MYSQL_ROOT_PASSWORD}"` bằng giá trị thật trong `.env` (hoặc export `MYSQL_ROOT_PASSWORD` trước).

**Kỳ vọng:** Có ít nhất: `schema_migrations`, `users`, `packages`, `words`, `word_details`, `learning`, `game_scores`, `email_verification`, `reset_password`.

1.5. Kiểm tra bảng tracking (sau Docker init, bảng tồn tại nhưng **chưa có dòng** — vì init chỉ chạy SQL, không chạy runner):

```bash
docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "SELECT * FROM schema_migrations;"
```

**Kỳ vọng:** Empty set (0 rows). Điều này đúng: init không ghi vào `schema_migrations`; runner sẽ ghi khi chạy `npm run migrate`.

---

## Bước 2: Migration runner — kết nối từ host và idempotency

**Mục tiêu:** Runner kết nối được tới DB (từ host), ghi `001_initial.sql` vào `schema_migrations` (vì init chưa ghi), sau đó chạy lại thì skip (idempotent).

2.1. Để runner chạy **từ máy host** tới MySQL trong Docker, app phải kết nối qua **localhost** và **port exposed**. Tạm chỉnh `.env` cho phiên migrate:

- `MYSQLHOST=127.0.0.1`
- `MYSQLPORT=3307` (hoặc đúng giá trị `MYSQLHOST_PORT` của bạn)

(Giữ nguyên các biến khác. Sau khi test xong có thể đổi lại `MYSQLHOST=db` nếu bạn chạy app trong Docker.)

2.2. Chạy migration (từ `src/`):

```bash
npm run migrate
```

**Kỳ vọng lần 1:** Sau Docker init, bảng `schema_migrations` đã tồn tại nhưng **chưa có dòng** → runner coi `001_initial.sql` là chưa apply và chạy (CREATE TABLE IF NOT EXISTS = no-op), rồi ghi vào `schema_migrations`:

```
[migrate] Connecting to database...
[migrate] Running: 001_initial.sql
[migrate] Applied 1 migration(s).
```

(Trường hợp DB hoàn toàn trống, chưa có bảng nào: runner in "[migrate] schema_migrations not found; will run all migrations..." rồi chạy 001.)

2.3. Chạy lại **lần 2** (không đổi gì):

```bash
npm run migrate
```

**Kỳ vọng:** Không chạy lại 001, không lỗi.

```
[migrate] Connecting to database...
[migrate] Skip (already applied): 001_initial.sql
[migrate] No pending migrations.
```

2.4. Kiểm tra bảng tracking đã có bản ghi:

```bash
docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "SELECT * FROM schema_migrations;"
```

**Kỳ vọng:** Một dòng, `name = 001_initial.sql`, `applied_at` có giá trị.

---

## Bước 3: Migration mới (002) — full flow

**Mục tiêu:** Thêm một migration mới, chạy runner, xác nhận bảng mới tồn tại và `schema_migrations` có thêm một dòng.

3.1. Tạo file migration thử nghiệm:

**File:** `src/migrations/002_phase1_test.sql`

**Nội dung:**

```sql
-- Migration test Phase 1 — bảng kiểm tra runner apply migration mới
CREATE TABLE IF NOT EXISTS phase1_verification (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

3.2. Chạy migrate:

```bash
npm run migrate
```

**Kỳ vọng:**

```
[migrate] Running: 002_phase1_test.sql
[migrate] Applied 1 migration(s).
```

3.3. Kiểm tra bảng mới tồn tại:

```bash
docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "SHOW CREATE TABLE phase1_verification\G"
```

**Kỳ vọng:** In ra định nghĩa bảng `phase1_verification`.

3.4. Kiểm tra `schema_migrations` có 2 dòng:

```bash
docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "SELECT * FROM schema_migrations ORDER BY name;"
```

**Kỳ vọng:** Hai dòng: `001_initial.sql`, `002_phase1_test.sql`.

3.5. Chạy lại migrate (idempotency):

```bash
npm run migrate
```

**Kỳ vọng:** Skip cả hai, "No pending migrations."

---

## Bước 4: DB client — kết nối và xem data

**Mục tiêu:** Dùng DB client (CLI hoặc GUI) kết nối tới MySQL, xem bảng và dữ liệu (đúng cách vận hành thực tế).

**4A. CLI (mysql)**

Từ host (port exposed):

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p"${MYSQL_ROOT_PASSWORD}" web_db
```

Trong prompt MySQL:

```sql
SHOW TABLES;
SELECT * FROM schema_migrations ORDER BY name;
SELECT * FROM phase1_verification;
-- Thoát: exit
```

**4B. Qua container**

```bash
docker exec -it web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db
```

Rồi chạy cùng các lệnh SQL trên.

**4C. GUI (DBeaver / TablePlus / MySQL Workbench)**

- Host: `127.0.0.1`
- Port: `3307` (hoặc `MYSQLHOST_PORT`)
- User: `root`
- Password: giá trị `MYSQL_ROOT_PASSWORD`
- Database: `web_db`

Kết nối, mở danh sách bảng, xem `schema_migrations` và `phase1_verification`.

---

## Bước 5: App dùng schema (tùy chọn nhưng nên làm)

**Mục tiêu:** App (trong Docker) kết nối DB và chạy bình thường với schema từ migrations.

5.1. Trong `.env` đặt lại cho Docker (nếu đã đổi ở bước 2):

- `MYSQLHOST=db`
- `MYSQLPORT=3306`

5.2. Start app:

```bash
docker compose up -d
```

5.3. Kiểm tra app và DB:

- Mở http://localhost:3000 (hoặc port `HOST_PORT` trong `.env`).
- Thao tác đăng ký / đăng nhập (hoặc bất kỳ flow dùng DB nào) — không lỗi kết nối hoặc "table doesn't exist".

---

## Dọn dẹp sau test (tùy chọn)

Nếu bạn muốn **không giữ** migration test 002 và bảng `phase1_verification`:

1. Xóa bản ghi (chỉ để runner không coi 002 là đã apply trên DB khác):

   ```bash
   docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "DELETE FROM schema_migrations WHERE name = '002_phase1_test.sql';"
   ```

2. Xóa bảng test:

   ```bash
   docker exec web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db -e "DROP TABLE IF EXISTS phase1_verification;"
   ```

3. Xóa file `src/migrations/002_phase1_test.sql`.

**Lưu ý:** Trong thực tế, migration đã apply **không** xóa hay sửa; bước dọn trên chỉ để repo “sạch” sau test. Nếu bạn giữ `002_phase1_test.sql` và bảng `phase1_verification` cũng không ảnh hưởng.

---

## Checklist tổng hợp

- [ ] **Bước 1:** `down -v` → `up -d db` → DB healthy → `SHOW TABLES` có `schema_migrations` và các bảng app.
- [ ] **Bước 2:** `.env` trỏ host (127.0.0.1, port 3307) → `npm run migrate` chạy 001 (hoặc skip nếu đã có) → chạy lại migrate → "No pending migrations".
- [ ] **Bước 3:** Tạo `002_phase1_test.sql` → `npm run migrate` → bảng `phase1_verification` tồn tại, `schema_migrations` có 2 dòng → chạy lại migrate → vẫn "No pending migrations".
- [ ] **Bước 4:** DB client (CLI hoặc GUI) kết nối được, xem được bảng và `schema_migrations`.
- [ ] **Bước 5 (tùy chọn):** `MYSQLHOST=db`, `docker compose up -d` → app chạy, không lỗi DB.

Khi tất cả mục trên pass → Phase 1 đã được validate đúng chuẩn chuyên nghiệp, có thể chuyển sang Phase 2 (Backup).
