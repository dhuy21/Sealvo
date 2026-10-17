# Database — Migrations, DB client, Backup & Restore

Tài liệu cho kỹ năng **Database Management & Operations**: Phase 1 (schema versioning, migrations, DB client), Phase 2 (backup & restore).

---

## 1. Migrations (schema versioning)

### 1.1. Mục đích

- Mỗi thay đổi cấu trúc DB (thêm/sửa bảng, cột, index) = **một file migration** có thứ tự.
- Runner chạy chỉ những file **chưa apply**, ghi lại trong bảng `schema_migrations` → đồng bộ local / staging / prod.

### 1.2. Cấu trúc

- **Thư mục:** `src/migrations/`
- **Tên file:** `NNN_mô_tả_ngắn.sql` (số 3 chữ số, sort theo thứ tự), ví dụ:
  - `001_initial.sql` — schema ban đầu
  - `002_add_user_preferences.sql` — thêm bảng/cột sau này
- **Bảng tracking:** `schema_migrations` (name, applied_at) — do migration runner quản lý; **không** sửa tay.
- **Phạm vi Phase 1:** Migrations **chỉ tiến** (forward-only): chỉ apply file mới, không có rollback tự động. Đây là cách nhiều team dùng; rollback (nếu cần) xử lý thủ công hoặc phase nâng cao.

### 1.3. Chạy migrations

**Điều kiện:** MySQL đang chạy, file `.env` (trong `src/`) có đủ: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`.

- Nếu DB chạy trong **Docker Compose** và bạn chạy `npm run migrate` **từ máy host**: dùng `MYSQLHOST=127.0.0.1` và `MYSQLPORT=<MYSQLHOST_PORT>` (vd. `3307`) trong `.env` cho phiên chạy migrate, vì tên service `db` chỉ resolve bên trong Docker.

**Lệnh (chạy từ thư mục `src/`):**

```bash
cd src
npm run migrate
```

- Kết nối DB theo biến môi trường, đọc danh sách file trong `migrations/`, chạy lần lượt các file **chưa** có trong `schema_migrations`, sau mỗi file thành công ghi tên file vào `schema_migrations`.
- Lần đầu (DB mới, chưa có bảng `schema_migrations`): runner sẽ chạy tất cả file từ `001_initial.sql`.

**Ví dụ output:**

```
[migrate] Connecting to database...
[migrate] Skip (already applied): 001_initial.sql
[migrate] No pending migrations.
```

hoặc (có migration mới):

```
[migrate] Running: 002_add_user_preferences.sql
[migrate] Applied 1 migration(s).
```

### 1.4. Thêm migration mới

1. Tạo file mới trong `src/migrations/` với số tiếp theo, ví dụ: `002_tên_mô_tả.sql`.
2. Viết SQL thuần (CREATE TABLE, ALTER TABLE, CREATE INDEX, …). Ưu tiên **idempotent** khi có thể (vd. `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` có kiểm tra).
3. Chạy `npm run migrate` (từ `src/`) trên local để kiểm tra.
4. Commit file migration cùng với code dùng schema mới. **Không** sửa hoặc xóa file migration đã được apply.

### 1.5. Docker init

- Khi chạy `docker compose up` **lần đầu** (volume MySQL trống), MySQL tự chạy file trong `docker-entrypoint-initdb.d/`.
- Project mount **`migrations/001_initial.sql`** vào `01-schema.sql` → schema ban đầu được tạo khi container DB khởi tạo.
- Sau khi container đã chạy, nếu cần chạy migration tiếp (002, 003, …) thì chạy `npm run migrate` **trong môi trường có kết nối tới DB đó** (vd. từ host với `.env` trỏ tới `localhost:MYSQLHOST_PORT`, hoặc trong container app nếu cấu hình đủ).

### 1.6. Migrations trên staging / production (Railway)

- **MySQL trên Railway** là **một service riêng**: bạn tạo một lần (New → MySQL hoặc template), không do GitHub Actions “build”. CI chỉ **build và deploy image service app**; service MySQL đã chạy sẵn trên Railway, app kết nối qua biến môi trường (MYSQLHOST, MYSQLUSER, …).
- **Cách migration được áp dụng lên MySQL của Railway:** Cần **chạy migration runner** với credentials trỏ tới MySQL đó. Hai cách phổ biến:
  1. **Pre-deploy command (khuyến nghị):** Trên Railway, cấu hình **Pre-deploy command** = `node scripts/run-migrations.js`. Sau khi build/pull image, Railway chạy lệnh này trong môi trường có sẵn biến DB (cùng project) rồi mới deploy app. Migration chạy **một lần mỗi deploy**, trước khi traffic tới bản mới.
  2. **Startup:** Đổi CMD trong Docker thành chạy `node scripts/run-migrations.js` rồi `node app.js`. Mỗi lần container start sẽ chạy migrate (idempotent) rồi mới start app.
- Image app đã chứa `migrations/` và `scripts/run-migrations.js`; không cần npm (dùng `node scripts/run-migrations.js`). Chi tiết: **docs/DATABASE-RAILWAY-MIGRATIONS.md**.

---

## 2. DB client (kết nối, xem data, chạy query)

### 2.1. Mục đích

- Kết nối vào MySQL để xem bảng, kiểm tra data, chạy query ad-hoc, debug sau migration.

### 2.2. Công cụ gợi ý

- **GUI:** DBeaver, TablePlus, MySQL Workbench (free).
- **CLI:** `mysql` (cài MySQL client trên máy hoặc dùng trong container).

Chọn một công cụ bạn quen; không bắt buộc tool cụ thể.

### 2.3. Kết nối local (Docker Compose)

- **Host:** `127.0.0.1` (hoặc `localhost`)
- **Port:** giá trị `MYSQLHOST_PORT` trong `.env` (vd. `3307`), vì Compose map port MySQL ra host.
- **User:** `MYSQLUSER` (vd. `root`)
- **Password:** `MYSQL_ROOT_PASSWORD` trong `.env`
- **Database:** `MYSQL_DATABASE` (vd. `web_db`)

**Ví dụ CLI (từ host, khi đã có `.env` trong `src/`):**

```bash
cd src
# Nếu có MYSQLHOST_PORT=3307
mysql -h 127.0.0.1 -P 3307 -u root -p"$MYSQL_ROOT_PASSWORD" web_db
```

**Ví dụ qua container:**

```bash
docker exec -it web_vocab_db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" web_db
```

### 2.4. Kết nối staging / production (Railway)

- Lấy **connection info** từ dashboard Railway (MySQL service): host, port, user, password, database.
- **Bảo mật:** không commit credentials; dùng biến môi trường hoặc profile local của DB client.
- Nếu Railway cung cấp **private network** (vd. `mysql.railway.internal`), kết nối từ máy dev thường cần **tunnel** (Railway CLI hoặc tính năng tunnel trên dashboard). Kết nối trực tiếp từ app trên Railway dùng host nội bộ đã cấu hình trong Variables.

### 2.5. Workflow gợi ý

1. Sau khi chạy migration: mở DB client, kiểm tra bảng mới / cột mới, vài dòng data mẫu.
2. Khi debug lỗi liên quan data: dùng client để xem nội dung bảng, điều kiện query.
3. **Không** dùng client để sửa schema “tay” thay cho migration — mọi thay đổi schema nên qua file migration và `npm run migrate`.

---

## 3. Backup & Restore (Phase 2)

### 3.1. Mục đích

- **Backup:** Tạo bản dump MySQL (schema + data) để phục hồi khi sự cố hoặc clone môi trường.
- **Restore:** Phục hồi DB từ file dump — khi sự cố, khi cần rollback data, hoặc khi clone môi trường.
- File dump **không** commit vào repo (đã gitignore, đã dockerignore).

### 3.2. Cách chạy

**Điều kiện:** MySQL đang chạy; file `.env` trong `src/` có đủ `MYSQL_DATABASE`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`. Nếu dùng **kết nối trực tiếp** (không Docker): thêm `MYSQLHOST`, `MYSQLPORT`.

**Lệnh (từ thư mục `src/`):**

```bash
cd src
npm run backup:db
```

- **Nếu container `web_vocab_db` đang chạy:** script chạy `mysqldump` **bên trong** container (không cần cài MySQL client trên máy).
- **Nếu không dùng Docker:** script gọi `mysqldump` trên host (cần cài MySQL client); dùng `MYSQLHOST` và `MYSQLPORT` (vd. 127.0.0.1 và 3307 khi DB expose ra host).

**Output:** File trong `src/backups/` với tên dạng `<database>_YYYYMMDD_HHMMSS.sql` (vd. `web_db_20250115_143022.sql`). Thư mục `backups/` được tạo tự động; **retention**: giữ tối đa 7 bản gần nhất, xóa bản cũ hơn.

### 3.3. Khi nào chạy backup

- **Trước migration lớn** (ALTER TABLE, thêm/xóa bảng quan trọng).
- **Định kỳ** (vd. hàng ngày hoặc hàng tuần), có thể dùng cron hoặc job.
- **Trước deploy** phiên bản có thay đổi schema hoặc data quan trọng.

### 3.4. Nơi lưu và bảo mật

- File lưu tại **`src/backups/`** (đã thêm vào `.gitignore`). **Không** commit file dump — chứa dữ liệu nhạy cảm.
- Nếu cần lưu lâu dài hoặc off-site: copy file sang nơi an toàn (ổ cứng ngoài, bucket S3, …); xem thêm Phase 4 (runbook) khi triển khai.

### 3.5. Backup verification (tự động)

Sau mỗi lần tạo dump, script tự kiểm tra file có chứa `CREATE TABLE` statements. Nếu file dump rỗng hoặc không có schema → script báo lỗi và dừng (không tạo backup lỗi âm thầm).

### 3.6. Backup staging / production (Railway)

- MySQL trên Railway nằm trong **private network**. Để backup từ máy dev: dùng **Railway CLI** (tunnel) hoặc **TCP Proxy** (bật trên MySQL service) rồi chạy `npm run backup:db` với `.env` trỏ tới host/port của tunnel. Hoặc dùng tính năng **Backups** của Railway (nếu có) cho MySQL.
- Chạy backup **định kỳ** trên production: có thể dùng cron trên server có tunnel, hoặc job trên platform; chi tiết ghi trong runbook (Phase sau).

---

## 4. Restore (Phase 2)

### 4.1. Mục đích

Phục hồi DB từ file dump `.sql`. Dùng khi:

- **Disaster recovery:** DB bị hỏng, mất data → restore từ backup gần nhất.
- **Rollback data:** migration hoặc deploy gây lỗi data → restore backup trước đó.
- **Clone môi trường:** tạo bản sao DB production cho debug trên local.
- **Validate backup:** restore vào DB scratch để chứng minh backup dùng được.

### 4.2. Cách chạy

**Lệnh (từ thư mục `src/`):**

```bash
cd src
npm run restore:db -- backups/web_db_20260302_191406.sql --confirm
```

**Mặc định là dry-run:** không có `--confirm` → chỉ hiển thị thông tin file (size, tables, INSERTs), không thay đổi gì. Phải thêm `--confirm` để thực sự restore.

**Các flag:**

| Flag | Bắt buộc | Mô tả |
|------|----------|-------|
| `<dump.sql>` | Có | Đường dẫn tới file dump |
| `--confirm` | Có (để chạy) | Xác nhận thực hiện restore |
| `--target <db>` | Không | Restore vào database khác (tạo nếu chưa có) |

### 4.3. Ví dụ

**Dry-run (xem thông tin, không restore):**

```bash
npm run restore:db -- backups/web_db_20260302_191406.sql
```

Output hiển thị: file name, size, tables in dump, INSERTs, target DB, mode (Docker/direct). Không thay đổi DB.

**Restore vào DB chính:**

```bash
npm run restore:db -- backups/web_db_20260302_191406.sql --confirm
```

**Restore vào DB scratch (validate backup):**

```bash
npm run restore:db -- backups/web_db_20260302_191406.sql --confirm --target web_db_scratch
```

Script tự tạo `web_db_scratch` nếu chưa có, restore dump vào đó, verify table count. DB chính không bị ảnh hưởng.

### 4.4. Safety features

- **Dry-run mặc định:** không `--confirm` = không chạy.
- **Cảnh báo production:** nếu `NODE_ENV=production` và target = DB chính → cảnh báo rõ.
- **Post-restore verification:** sau restore, script tự connect và đếm tables, so sánh với dump.
- **Docker auto-detect:** nếu container `web_vocab_db` đang chạy → dùng Docker mode; không → dùng direct mode.

### 4.5. Restore staging / production

- Tương tự backup: kết nối qua Railway tunnel hoặc TCP Proxy.
- **Cẩn thận:** restore vào production = **ghi đè toàn bộ data**. Chỉ làm khi đã xác nhận đúng file, đúng target.

---

## 5. Migration an toàn (backup trước khi migrate)

### 5.1. Mục đích

Trước khi chạy migration (đặc biệt ALTER TABLE, DROP), tạo backup tự động làm safety net. Nếu migration gây lỗi → có thể restore.

### 5.2. Cách chạy

```bash
cd src
npm run migrate:safe
```

Tương đương: `npm run backup:db && npm run migrate`. Backup chạy trước; nếu backup thất bại → migration **không chạy**.

### 5.3. Khi nào dùng

- **`npm run migrate`**: migration thông thường (thêm bảng mới, thêm cột) — rủi ro thấp.
- **`npm run migrate:safe`**: migration có thay đổi lớn (ALTER TABLE, DROP COLUMN, đổi kiểu dữ liệu) — cần safety net.

---

## 6. Tóm tắt

| Việc | Cách làm |
|------|----------|
| Chạy migrations | `cd src && npm run migrate` |
| Migrate có backup trước | `cd src && npm run migrate:safe` |
| Thêm migration | Tạo `NNN_mô_tả.sql` trong `src/migrations/`, rồi chạy `npm run migrate` |
| Kết nối local | Host `127.0.0.1`, port `MYSQLHOST_PORT`, user/password/database từ `.env` |
| Docker init | Dùng `migrations/001_initial.sql` (đã cấu hình trong `docker-compose.yml`) |
| **Backup** | `cd src && npm run backup:db` → file trong `backups/<db>_YYYYMMDD_HHMMSS.sql`, retention 7 bản, auto-verify |
| **Restore** | `cd src && npm run restore:db -- <file.sql> --confirm` (dry-run mặc định) |
| **Restore scratch** | `npm run restore:db -- <file.sql> --confirm --target web_db_scratch` |

**Hướng dẫn test Phase 1:** [docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md).
**Hướng dẫn test Phase 2 (Backup & Restore):** [docs/DATABASE-PHASE2-TEST.md](DATABASE-PHASE2-TEST.md).
**Tổng hợp validation Phase 1:** [docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md](DATABASE-PHASE1-VALIDATION-SUMMARY.md).
