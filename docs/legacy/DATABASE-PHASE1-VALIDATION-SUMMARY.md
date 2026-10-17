# Phase 1 — Validation Summary: Database Management & Operations

Tổng hợp toàn bộ những gì đã làm, đã triển khai, đã thống nhất và thảo luận, cùng các câu hỏi đã giải quyết cho **Phase 1** của kỹ năng **Database Management & Operations** (yêu cầu cho fullstack dev). Dùng làm tài liệu valider Phase 1 và tham chiếu sau này.

---

## Trạng thái: **PHASE 1 VALIDATED**

- User đã thực hiện đầy đủ các bước test theo [docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md) và **xác nhận thành công**.
- Checklist validation đã pass → Phase 1 hoàn tất, có thể chuyển sang Phase 2 (Backup & Restore).

---

## 1. Kỹ năng và phạm vi Phase 1

### 1.1. Kỹ năng: Database Management & Operations

- **Mục đích:** Quản lý schema có phiên bản (migrations), làm việc hàng ngày với DB (DB client), sau này mở rộng backup/restore và runbook (Phase 2–4).
- **Đã gộp (Cách 1):** “Migration tool + DB client” được coi là **một phần** của kỹ năng này, không tách thành kỹ năng riêng. Phase 1 bao gồm cả migration tool và DB client.

### 1.2. Phase 1: Schema versioning, migrations & DB client

| Thành phần | Nội dung |
|------------|----------|
| **Schema versioning & migrations** | Thư mục `migrations/` với file SQL đánh số (001, 002, …), bảng `schema_migrations` để tracking, script/runner chạy migration theo env. |
| **DB client** | Tài liệu và thực hành: chọn client (GUI/CLI), kết nối local và staging/prod, xem data và kiểm tra sau migration. |

**Trình tự logic đã thống nhất:** Migration trước (nền tảng thay đổi schema) → DB client (làm việc hàng ngày với DB). Phase 2 = Backup, Phase 3 = Restore, Phase 4 = Runbook.

---

## 2. Đã triển khai (file và thay đổi)

### 2.1. File mới

| File | Mục đích |
|------|----------|
| **`src/migrations/001_initial.sql`** | Migration đầu tiên: tạo bảng `schema_migrations` + toàn bộ bảng app (users, packages, words, word_details, learning, game_scores, email_verification, reset_password). Không có DROP/CREATE DATABASE; có `USE web_db`. Runner tự ghi bản ghi “đã apply” sau khi chạy. |
| **`src/scripts/run-migrations.js`** | Migration runner: đọc `.env` từ `src/`, kết nối MySQL theo MYSQL_*, liệt kê file trong `migrations/` (sort), chạy lần lượt file chưa có trong `schema_migrations`, sau mỗi file thành công ghi tên file vào `schema_migrations`. Hỗ trợ DB chưa có bảng `schema_migrations` (chạy tất cả từ 001). |
| **`docs/DATABASE.md`** | Tài liệu chính: migrations (chạy, thêm mới, Docker init, staging/prod), DB client (kết nối local/Railway, workflow). |
| **`docs/DATABASE-PHASE1-TEST.md`** | Hướng dẫn test Phase 1: Docker init → runner idempotency → migration mới (002) → DB client → app dùng schema; có checklist. |
| **`docs/DATABASE-RAILWAY-MIGRATIONS.md`** | Bổ sung: MySQL trên Railway là service riêng, CI chỉ deploy app; cách migration áp dụng lên DB (Pre-deploy vs startup vs CI); khuyến nghị. |
| **`docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md`** | File này — tổng hợp Phase 1 để valider. |

### 2.2. File sửa đổi

| File | Thay đổi |
|------|----------|
| **`src/docker-compose.yml`** | Mount init: **`./migrations/001_initial.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro`**. Docker init dùng đúng file migration 001 làm nguồn schema duy nhất. |
| **`src/package.json`** | Thêm script: **`"migrate": "node scripts/run-migrations.js"`**. |
| **`src/Dockerfile`** | **CMD** đổi thành **migrations at startup:** `["sh", "-c", "node scripts/run-migrations.js && exec node app.js"]`. Mỗi lần container start chạy migration (idempotent) rồi mới start app; dùng `exec` để Node nhận tín hiệu tắt đúng. |
| **`docs/DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md`** | Cập nhật: init dùng **`migrations/001_initial.sql`**, dẫn link `docs/DATABASE.md`. |
| **`src/README.md`** | Cập nhật mục Database: dẫn tới `docs/DATABASE.md`, lệnh `npm run migrate`. |

**Lưu ý:** `app/core/intialize.sql` **không phải** schema — nó chứa **INSERT** (dữ liệu mẫu cho dev). Schema chuẩn là `migrations/001_initial.sql` (CREATE TABLE). Hai file phục vụ mục đích khác nhau; Phase 3 (Seeding) sẽ chuẩn hóa dữ liệu mẫu.

---

## 3. Đã thống nhất và thảo luận

### 3.1. Cách 1: Gộp “Migration tool + DB client” vào một kỹ năng

- **Migration tool** = Phase 1 (migrations + runner).
- **DB client** = Phase 1 (tài liệu + thực hành kết nối, xem data, workflow).
- Một kỹ năng duy nhất “Database Management & Operations”, không tách hai kỹ năng riêng.

### 3.2. Một nguồn sự thật cho schema ban đầu

- **Nguồn chuẩn:** `migrations/001_initial.sql` (Docker init và migration runner đều dùng).
- **`app/core/database.sql`:** Giữ với ghi chú deprecated; không dùng cho init hay runner. Có thể xóa hoặc thu nhỏ thành file tham chiếu nếu muốn tránh trùng lặp.

### 3.3. Staging/Production: MySQL riêng, migrations khi nào chạy

- **GitHub Actions** chỉ build và deploy **image app**; **MySQL** là service riêng trên Railway (tạo một lần).
- **Migration** không do MySQL “tự chạy” — một **process** (app hoặc bước deploy) kết nối tới MySQL và chạy `node scripts/run-migrations.js` với env của từng môi trường.
- **Đã chọn Cách B:** Chạy migration **khi app start** (trong Dockerfile CMD). Không dùng Pre-deploy command trên Railway. Mỗi lần container start: migrate (idempotent) rồi `node app.js`.

---

## 4. Câu hỏi đã giải quyết (Q&A)

### Q1. Đã có `database.sql` trong core, cần gì file trong `migrations/` nữa?

- **Trả lời:** `database.sql` = một file “tạo hết từ đầu” một lần; **migrations/** = **chuỗi versioned** (001, 002, …) + tracking (`schema_migrations`) để biết đã apply gì, đồng bộ local/staging/prod. Thay đổi schema sau này = thêm file migration mới, không sửa file cũ. Chuyên nghiệp dùng **một nguồn** = `migrations/001_initial.sql`; `database.sql` deprecated hoặc xóa.

### Q2. Khi GitHub Actions chạy cho staging/production thì chỉ build và deploy image app, còn MySQL thì tự tạo trên Railway? Trên thực tế có đúng vậy không?

- **Trả lời:** Đúng. CI chỉ build/deploy **app**. MySQL là service riêng, tạo một lần trên Railway. Đây là cách triển khai phổ biến, chuyên nghiệp (DB managed tách khỏi app).

### Q3. Migrations làm sao được service MySQL “sử dụng”?

- **Trả lời:** MySQL không tự chạy migration. **App** (hoặc bước deploy) chạy `node scripts/run-migrations.js` với env trỏ tới MySQL → kết nối và thực thi SQL. Code migration nằm trong **image app**; credentials từ **Variables** (Railway). Project đã chọn **Cách B (migrations at startup):** CMD trong Dockerfile chạy migrate rồi app → mỗi lần container start (kể cả trên Railway) migration tự chạy rồi app mới lên.

### Q4. Đã có file SQL trong core (`intialize.sql` / `database.sql`) thì cần gì thêm `migrations/`?

- **Trả lời:** File trong **core** (`app/core/intialize.sql`) chứa **INSERT** — dữ liệu mẫu (seed), không phải schema. **Migrations** (`migrations/001_initial.sql`) chứa **CREATE TABLE** — định nghĩa cấu trúc DB. Hai thứ phục vụ mục đích khác nhau. Migration cho phép **versioned schema** (001, 002, …) + tracking qua `schema_migrations` → thay đổi schema theo thời gian mà không mất data; file init SQL một lần không làm được điều đó.

### Q5. GitHub Actions chỉ deploy app, MySQL tự build trên Railway — migrations dùng thế nào?

- **Trả lời:** Đúng: CI chỉ build/deploy **image app**; MySQL là managed service riêng trên Railway. Migrations **không** do MySQL “tự chạy”. Khi container app start, CMD chạy `node scripts/run-migrations.js` → script kết nối tới MySQL Railway (qua env) → thực thi các file SQL pending. MySQL chỉ nhận lệnh từ app; không cần “biết” migration.

### Q6. Cách nào phổ biến và tối ưu nhất để chạy migration (pre-deploy vs startup)?

- **Trả lời:** **Cách 1 — migration khi app startup** là phổ biến và tối ưu nhất: đơn giản, bảo mật (credentials chỉ trong app env), nhất quán local/staging/prod. Rails, Django, Laravel, NestJS, Prisma đều dùng hướng tương tự. SealVo đang dùng đúng cách này (CMD: migrate rồi `exec node app.js`).

---

## 5. Test và validation Phase 1

### 5.1. Hướng dẫn test chi tiết

- **File:** [docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md).
- **Trình tự:** (1) Docker init từ `001_initial.sql` → kiểm tra bảng; (2) Migration runner từ host, idempotency; (3) Thêm migration 002 (ví dụ `002_phase1_test.sql`), chạy migrate, kiểm tra; (4) DB client kết nối và xem data; (5) App (Docker) chạy bình thường với schema.

### 5.2. Checklist validation Phase 1

- [ ] **Docker init:** `down -v` → `up -d db` → DB healthy → `SHOW TABLES` có `schema_migrations` và các bảng app.
- [ ] **Runner:** `.env` trỏ host (127.0.0.1, MYSQLHOST_PORT) → `npm run migrate` chạy 001 (hoặc skip nếu đã có) → chạy lại → “No pending migrations”.
- [ ] **Migration mới:** Tạo 002_xxx.sql → `npm run migrate` → bảng mới tồn tại, `schema_migrations` có thêm dòng → chạy lại migrate → vẫn “No pending migrations”.
- [ ] **DB client:** CLI hoặc GUI kết nối được (host, port, user, password, database), xem được bảng và `schema_migrations`.
- [ ] **App:** `MYSQLHOST=db`, `docker compose up -d` → app chạy, không lỗi DB; hoặc deploy lên Railway → container start chạy migrate rồi app.

Khi tất cả mục trên pass → **Phase 1 đã được validate**, có thể chuyển sang Phase 2 (Backup).

---

## 6. Tài liệu tham chiếu (theo chủ đề)

| Chủ đề | File |
|--------|------|
| Migrations & DB client (tổng quan) | [docs/DATABASE.md](DATABASE.md) |
| Test Phase 1 (từng bước) | [docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md) |
| Migrations trên Railway (staging/prod) | [docs/DATABASE-RAILWAY-MIGRATIONS.md](DATABASE-RAILWAY-MIGRATIONS.md) |
| Validation & tổng hợp Phase 1 | [docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md](DATABASE-PHASE1-VALIDATION-SUMMARY.md) (file này) |
| Docker init MySQL | [docs/DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md](DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md) |

---

## 7. Tóm tắt một trang

| Hạng mục | Nội dung |
|----------|----------|
| **Phase 1 gồm** | Schema versioning (migrations/001, 002, …), bảng schema_migrations, runner `scripts/run-migrations.js`, npm script `migrate`, Docker init từ 001, tài liệu DB client. |
| **Chạy migration local** | `cd src && npm run migrate` (cần .env với MYSQL_*; từ host với Docker: MYSQLHOST=127.0.0.1, MYSQLPORT=MYSQLHOST_PORT). |
| **Thêm migration** | Tạo `NNN_mô_tả.sql` trong `src/migrations/`, chạy `npm run migrate`, commit cùng code. Không sửa migration đã apply. |
| **Staging/Production** | MySQL = service riêng (Railway). Migrations chạy **khi app start** (CMD trong Dockerfile: migrate rồi app). |
| **DB client** | Kết nối theo host/port/user/password/database từ .env (local) hoặc Railway Variables (staging/prod); dùng để xem bảng, kiểm tra sau migration. |

Phase 1 đã triển khai đủ và có tài liệu + test; khi checklist validation pass thì Phase 1 hoàn tất và có thể bước sang Phase 2.

---

## 8. Đánh giá: Đủ điều kiện valider & mức độ kỹ thuật

### 8.1. Phase 1 đã đủ điều kiện để valider chuyên nghiệp, logic, hợp lý thực tế chưa?

**Kết luận: Có.** Phase 1 đáp ứng đủ để coi là đã validate theo chuẩn chuyên nghiệp, logic và sát thực tế cho fullstack dev.

| Tiêu chí | Đánh giá | Ghi chú |
|----------|----------|---------|
| **Chuyên nghiệp** | Đạt | Schema versioned (001, 002…), bảng tracking, runner idempotent, một nguồn schema (001), tích hợp Docker + deploy (startup). |
| **Logic** | Đạt | Trình tự: migration → DB client; init = 001; runner chỉ chạy pending; tài liệu và test guide rõ ràng. |
| **Hợp lý thực tế** | Đạt | Giống cách nhiều team làm: file SQL có thứ tự + tracking table; migrations at startup hoặc pre-deploy; DB client doc để làm việc hàng ngày. |
| **Đủ để valider** | Đạt | Có checklist test, có tổng hợp validation, có Q&A và thống nhất; không còn thiếu bước bắt buộc cho Phase 1. |

**Không bắt buộc thêm cho Phase 1 (có thể làm ở phase sau hoặc khi cần):**

- **Rollback migration:** Phase 1 là forward-only (chỉ apply, không rollback). Nhiều dự án chuyên nghiệp cũng chỉ dùng forward migrations; rollback là nâng cao (Phase sau hoặc khi yêu cầu).
- **Dry-run / kiểm tra trước khi apply:** Tiện nhưng không bắt buộc để valider Phase 1.
- **Timestamp trong tên file (001_20240101_...):** Một số team dùng; `NNN_description.sql` đủ và phổ biến.

**Điều chỉnh gợi ý (tùy chọn, không chặn validation):**

- Ghi rõ trong doc: “Phase 1 dùng migrations **chỉ tiến** (forward-only), không có rollback tự động.” Để ai đọc hiểu đúng phạm vi.
- Nếu muốn “sạch” hơn: xóa hoặc thu nhỏ `app/core/database.sql` thành file chỉ tham chiếu (đã có ghi chú deprecated).

### 8.2. Mức độ / level của Phase 1 so với kỹ năng Database Management & Operations

| Level | Kỳ vọng kỹ năng | Phase 1 tương ứng |
|-------|------------------|--------------------|
| **Junior** | Biết migration là gì; chạy lệnh migrate; kết nối DB client. | Đạt và vượt: có thêm thiết kế (versioned files, tracking), tích hợp Docker/deploy. |
| **Mid-level** | Thiết kế chiến lược migration (file versioned, bảng tracking); runner hoặc dùng tool; tích hợp Docker và deploy (startup hoặc pre-deploy); doc rõ. | **Đạt đầy đủ:** Phase 1 nằm ở mức này. |
| **Senior** | Rollback, zero-downtime migration, phối hợp nhiều replica, theo dõi thời gian chạy migration. | Chưa có trong Phase 1 (dành cho phase nâng cao hoặc khi cần). |

**Kết luận mức độ:** Phase 1 tương ứng **Mid-level** cho kỹ năng Database Management & Operations: đủ để thiết kế và vận hành migration versioned, tích hợp với Docker và staging/production, và dùng DB client có tài liệu. Chưa đòi hỏi rollback hay zero-downtime (senior).

---

## 9. Tổng hợp nhanh — đã làm & đã thống nhất (Phase 1)

| Hạng mục | Nội dung |
|----------|----------|
| **Đã triển khai** | Runner `run-migrations.js` (đọc migrations/, tracking `schema_migrations`, env MYSQL_*); migration `001_initial.sql` (8 bảng app + schema_migrations); npm `migrate`; Dockerfile CMD migrate → app; docker-compose init mount `001_initial.sql` vào MySQL initdb.d. |
| **Đã thống nhất** | Một kỹ năng “DB Management & Operations”; một nguồn schema = migrations/001; migrations chạy khi app start (Cách 1); core/intialize.sql = seed (INSERT), không phải schema. |
| **Đã thảo luận / Q&A** | 6 câu hỏi đã trả lời: database.sql vs migrations; CI chỉ deploy app + MySQL Railway; migrations “sử dụng” qua app startup; có file SQL trong core vẫn cần migrations; cách phổ biến nhất = startup. |
| **Đã test** | User chạy đủ bước theo DATABASE-PHASE1-TEST.md và xác nhận thành công. |
| **Bước tiếp theo** | Phase 2 — Backup & Restore (script restore, test backup→restore, docs). |

### 8.3. Thực tế triển khai phổ biến và chuyên nghiệp

- **Schema versioning:** Hầu hết team dùng file migration có thứ tự (số hoặc timestamp) + bảng hoặc file tracking “đã apply”. Rails, Laravel, Django, nhiều dự án Node đều theo hướng này. Phase 1 bám đúng.
- **Chạy migration khi nào:** Hai lựa chọn phổ biến: (1) **Pre-deploy / release phase** — chạy migrate trước khi bật bản mới; (2) **Startup** — mỗi lần container/replica start chạy migrate (idempotent) rồi mới start app. Project chọn (2); cả hai đều chuyên nghiệp.
- **DB tách khỏi app:** DB managed (Railway, RDS, Cloud SQL…) là service riêng; CI chỉ build/deploy app. Migrations nằm trong image app, chạy với env trỏ tới DB. Phase 1 đã làm và mô tả rõ.
- **DB client:** Doc hướng dẫn kết nối local + staging/prod, gợi ý tool, workflow (xem bảng sau migrate). Đủ cho fullstack dev.
