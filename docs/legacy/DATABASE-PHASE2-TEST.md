# Test Phase 2 — Backup & Restore

Test toàn bộ Phase 2 (bao gồm cả fixes từ audit Phase 1 + Phase 2).

---

## Điều kiện trước khi test

Từ thư mục `src/`:

```bash
cd /home/dhuy21/Documents/dev/Projet/Web_vocab_v0/src
```

1. Start service `db`:

```bash
docker compose up -d db
```

2. Đợi healthy:

```bash
docker compose ps
```

Kỳ vọng: `web_vocab_db` → **Up (healthy)**.

3. **`.env` giữ nguyên** — KHÔNG cần đổi bất cứ giá trị nào:

```
MYSQLHOST=db
MYSQLPORT=3306
MYSQLHOST_PORT=3307
```

> Tất cả script tự detect Docker container và điều chỉnh kết nối. Đây là điểm khác biệt so với phiên bản trước audit.

---

## Bước 0 — Kiểm tra bảo mật (bắt buộc)

**Mục tiêu:** File backup không commit vào Git, không vào Docker image. Password không lộ trong process list.

### 0.1. gitignore

```bash
grep 'backups' .gitignore
```

Kỳ vọng: `backups/` (không có trailing space).

### 0.2. dockerignore

```bash
grep -E 'backups|backup-db|restore-db' .dockerignore
```

Kỳ vọng: có cả 3 dòng — `backups`, `scripts/backup-db.js`, `scripts/restore-db.js`. Prod image không chứa scripts ops.

### 0.3. Password ẩn trong Docker mode

Chạy backup rồi kiểm tra process:

```bash
npm run backup:db &
ps aux | grep mysqldump
```

Kỳ vọng: **không thấy password** trong command line. Password truyền qua `MYSQL_PWD` env var (ẩn trong `ps`).

---

## Bước 1 — Backup + auto-verify (bắt buộc)

**Mục tiêu:** Script tạo dump, tự verify integrity, giữ nguyên `.env`.

```bash
npm run backup:db
```

**Kỳ vọng output:**

```
[backup] Starting...
[backup] Using Docker container web_vocab_db
[backup] Written: .../backups/web_db_20260303_XXXXXX.sql (XX.X KB)
[backup] Verified: 9 table(s) (schema_migrations, users, email_verification, ...)
[backup] Done.
```

Kiểm tra file:

```bash
ls -lh backups/
```

Kiểm tra nội dung dump:

```bash
rg "CREATE TABLE" backups/web_db_*.sql --count
```

Kỳ vọng: >= 9 matches.

---

## Bước 2 — Migration auto-detect (bắt buộc — test audit fix)

**Mục tiêu:** `npm run migrate` hoạt động từ host **mà không cần đổi `.env`**. Script tự detect Docker container và dùng `127.0.0.1:3307`.

```bash
npm run migrate
```

**Kỳ vọng output:**

```
[migrate] Detected Docker container web_vocab_db — using 127.0.0.1:3307
[migrate] Connecting to database...
[migrate] Skip (already applied): 001_initial.sql
[migrate] No pending migrations.
```

**Điểm kiểm tra:**
- Dòng `Detected Docker container` chứng minh auto-detect hoạt động.
- Không lỗi DNS "getaddrinfo ENOTFOUND db" (lỗi cũ khi MYSQLHOST=db từ host).
- Không cần đổi `.env`.

---

## Bước 3 — migrate:safe (bắt buộc)

**Mục tiêu:** Backup trước, migrate sau. Nếu backup fail → migrate không chạy.

```bash
npm run migrate:safe
```

**Kỳ vọng output (2 phần):**

```
[backup] Starting...
[backup] Using Docker container web_vocab_db
[backup] Written: .../backups/web_db_20260303_XXXXXX.sql (XX.X KB)
[backup] Verified: 9 table(s) (...)
[backup] Done.
[migrate] Detected Docker container web_vocab_db — using 127.0.0.1:3307
[migrate] Connecting to database...
[migrate] Skip (already applied): 001_initial.sql
[migrate] No pending migrations.
```

Kiểm tra backup mới:

```bash
ls -t backups/*.sql | head -1
```

Kỳ vọng: file mới vừa tạo.

---

## Bước 4 — Restore dry-run (bắt buộc)

**Mục tiêu:** Không có `--confirm` → hiển thị info, **không** thay đổi DB.

Lấy file backup mới nhất:

```bash
DUMP=$(ls -t backups/*.sql | head -1) && echo $DUMP
```

Dry-run:

```bash
npm run restore:db -- $DUMP
```

**Kỳ vọng output:**

```
=== Database Restore ===

  File:     web_db_20260303_XXXXXX.sql (XX.X KB, 2026-03-03 XX:XX:XX)
  Tables:   9 (schema_migrations, users, ...)
  INSERTs:  X | DROP TABLE: 9
  Target:   web_db | Mode: Docker (web_vocab_db)

  DRY RUN — add --confirm to execute.
```

**Kiểm tra:** Chạy SHOW TABLES → DB vẫn nguyên (dry-run không thay đổi gì):

```bash
docker exec web_vocab_db mysql -uroot -pexample web_db -e "SHOW TABLES;"
```

---

## Bước 5 — Restore vào scratch DB (bắt buộc)

**Mục tiêu:** Chứng minh backup dùng được. Restore vào DB riêng, DB chính không bị ảnh hưởng.

```bash
npm run restore:db -- $DUMP --confirm --target web_db_scratch
```

**Kỳ vọng output:**

```
[restore] Starting...
[restore] Creating 'web_db_scratch' if not exists...
[restore] Mode: Docker (web_vocab_db)
[restore] SQL applied. Verifying...
[restore] 9 table(s) in 'web_db_scratch': schema_migrations, users, ...
[restore] OK — table count matches (9).
[restore] Done.
```

Kiểm tra thủ công:

```bash
docker exec web_vocab_db mysql -uroot -pexample -e "USE web_db_scratch; SHOW TABLES;"
```

Kỳ vọng: tất cả bảng giống DB chính.

Dọn scratch:

```bash
docker exec web_vocab_db mysql -uroot -pexample -e "DROP DATABASE IF EXISTS web_db_scratch;"
```

---

## Bước 6 — Disaster recovery: drop → restore → verify (nâng cao)

**Mục tiêu:** Giả lập mất bảng → restore → phục hồi thành công.

> Chỉ chạy trên **local Docker**. KHÔNG chạy trên staging/production.

6.1. Backup mới:

```bash
npm run backup:db
DUMP=$(ls -t backups/*.sql | head -1)
```

6.2. Drop bảng (giả lập sự cố):

```bash
docker exec web_vocab_db mysql -uroot -pexample web_db -e "DROP TABLE IF EXISTS game_scores;"
```

6.3. Xác nhận mất:

```bash
docker exec web_vocab_db mysql -uroot -pexample web_db -e "SHOW TABLES;"
```

Kỳ vọng: **không có** `game_scores`.

6.4. Restore:

```bash
npm run restore:db -- $DUMP --confirm
```

6.5. Xác nhận phục hồi:

```bash
docker exec web_vocab_db mysql -uroot -pexample web_db -e "SHOW TABLES;"
```

Kỳ vọng: `game_scores` **đã trở lại**.

---

## Bước 7 — Retention (tùy chọn)

**Mục tiêu:** Khi >7 file backup, script xóa bản cũ nhất.

```bash
for i in $(seq 1 3); do npm run backup:db; sleep 1; done
ls backups/ | wc -l
```

Kỳ vọng: tối đa 7 file. Log có `[backup] Removed old: ...`.

---

## Checklist

### Bắt buộc (phải pass để validate Phase 2)

- [ ] **Bước 0:** gitignore + dockerignore + password ẩn
- [ ] **Bước 1:** `npm run backup:db` → dump + auto-verify
- [ ] **Bước 2:** `npm run migrate` từ host → auto-detect Docker, không cần đổi `.env`
- [ ] **Bước 3:** `npm run migrate:safe` → backup rồi migrate
- [ ] **Bước 4:** Restore dry-run → info hiện, DB không đổi
- [ ] **Bước 5:** Restore vào scratch → table count matches

### Nâng cao

- [ ] **Bước 6:** Drop table → restore → phục hồi
- [ ] **Bước 7:** Retention giữ tối đa 7 file

Khi tất cả **bắt buộc** pass → **Phase 2 validated**.
