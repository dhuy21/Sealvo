# Tổng hợp: Kỹ năng Data Management & Operations (Phase 1 + Phase 2)

Tài liệu tổng hợp toàn bộ những gì đã triển khai, thống nhất, thảo luận và đã giải quyết cho kỹ năng **Database Management & Operations** (yêu cầu cho fullstack dev) — từ Phase 1 đến hết **Phase 2**. Dùng làm tài liệu tham chiếu và validation.

---

## Mục lục

1. [Kỹ năng và phạm vi](#1-kỹ-năng-và-phạm-vi)
2. [Phase 1 — Tóm tắt](#2-phase-1--tóm-tắt)
3. [Phase 2 — Backup & Restore + Cron trên Railway](#3-phase-2--backup--restore--cron-trên-railway)
4. [Các quyết định và thống nhất](#4-các-quyết-định-và-thống-nhất)
5. [Câu hỏi đã giải quyết (Q&A)](#5-câu-hỏi-đã-giải-quyết-qa)
6. [Các file dự án (Phase 1 + 2)](#6-các-file-dự-án-phase-1--2)
7. [Test và validation](#7-test-và-validation)
8. [Thực tế triển khai chuyên nghiệp](#8-thực-tế-triển-khai-chuyên-nghiệp)
9. [Tài liệu tham chiếu](#9-tài-liệu-tham-chiếu)

---

## 1. Kỹ năng và phạm vi

### 1.1. Tên kỹ năng

**Data Management & Operations** (trong ngữ cảnh project: **Database Management & Operations**).

- **Mục đích:** Quản lý schema có phiên bản (migrations), làm việc với DB (client), backup/restore, và vận hành trên staging/production (Railway).

### 1.2. Các phase đã thực hiện

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| **Phase 1** | Schema versioning (migrations), DB client, migrations trên Railway | ✅ Đã triển khai và validate |
| **Phase 2** | Backup & Restore (script local + cron service Railway + object storage) | ✅ Đã triển khai và chạy thành công |

---

## 2. Phase 1 — Tóm tắt

Phase 1 gồm: **migrations** (schema versioned), **migration runner**, **DB client** (tài liệu + kết nối), và **migrations trên Railway**.

### 2.1. Đã triển khai (Phase 1)

- **`src/migrations/001_initial.sql`** — Schema ban đầu: bảng `schema_migrations` + các bảng app (users, packages, words, word_details, learning, game_scores, email_verification, reset_password, …). Không có `USE` trong file; runner kết nối theo env.
- **`src/scripts/run-migrations.js`** — Runner: đọc `.env`, kết nối MySQL, liệt kê file trong `migrations/` (sort), chạy lần lượt file chưa có trong `schema_migrations`, ghi tên file sau mỗi lần apply. Hỗ trợ DB chưa có bảng `schema_migrations` (tạo và chạy từ 001).
- **Docker:** `docker-compose.yml` mount `migrations/001_initial.sql` vào `docker-entrypoint-initdb.d/01-schema.sql`; Dockerfile CMD = `node scripts/run-migrations.js && exec node app.js` (migrations at startup).
- **npm:** `npm run migrate` → `node scripts/run-migrations.js`.
- **Tài liệu:** DATABASE.md (migrations, DB client), DATABASE-RAILWAY-MIGRATIONS.md (Pre-deploy vs startup), DATABASE-PHASE1-TEST.md, DATABASE-PHASE1-VALIDATION-SUMMARY.md.

### 2.2. Đã thống nhất (Phase 1)

- Một kỹ năng “DB Management & Operations”; Phase 1 = migrations + DB client.
- Một nguồn schema = `migrations/001_initial.sql` (Docker init và runner dùng chung).
- Migrations chạy **khi app start** (CMD trong Dockerfile). MySQL trên Railway là service riêng; CI chỉ build/deploy image app.
- `app/core/intialize.sql` = seed (INSERT), không phải schema.

Chi tiết đầy đủ Phase 1: **[docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md](DATABASE-PHASE1-VALIDATION-SUMMARY.md)**.

---

## 3. Phase 2 — Backup & Restore + Cron trên Railway

### 3.1. Mục tiêu Phase 2

- **Backup:** Tạo dump MySQL (schema + data), tự verify, retention (local + optionnel bucket).
- **Restore:** Phục hồi DB từ file dump (dry-run mặc định, `--confirm` để thực thi, `--target` để restore vào DB khác).
- **Staging/Production:** Backup **định kỳ** trên Railway qua một **service cron** riêng; dump upload lên **Railway Storage Bucket** (S3-compatible), rétention 7 bản.

### 3.2. Kiến trúc đã triển khai

```
Railway Project (staging)
├── Server Web (sealvo)     → image GHCR, CI/CD deploy
├── MySQL (mysql:9)         → service riêng, private network
├── Storage Bucket          → assembled-stashbox (S3-compatible)
└── Cron Service            → cùng repo GitHub, Dockerfile.backup
     ├── Root Directory: src
     ├── Dockerfile: Dockerfile.backup
     ├── Region: Singapore (cùng MySQL)
     ├── Variables: MySQL (reference) + Bucket (Add to Service, AWS SDK Generic)
     ├── Cron Schedule (UI): 0 2 * * *   (02:00 UTC)
     └── Watch Paths: chỉ rebuild khi backup-related files thay đổi
```

### 3.3. Script backup (`scripts/backup-db.js`)

- **Hai chế độ kết nối MySQL:**
  - **Docker:** Nếu container `web_vocab_db` đang chạy → gọi `mysqldump` bên trong container (dùng cho local).
  - **Direct:** Gọi `mysqldump` trên host với `MYSQLHOST`, `MYSQLPORT` (dùng cho Railway, CI).
- **Dump flags:** `--single-transaction`, `--routines`, `--triggers`. Flag `--set-gtid-purged=OFF` **chỉ thêm nếu** `mysqldump --help` có chứa chuỗi `set-gtid-purged` (tránh lỗi với client MariaDB trên Debian: `unknown variable 'set-gtid-purged=OFF'`).
- **Détection Docker:** Gọi `docker ps` với `stdio: ['ignore', 'pipe', 'ignore']` để không in "docker: not found" ra log khi chạy trên Railway (không có Docker).
- **Sau dump:** Verify (file chứa `CREATE TABLE`), retention local (7 file), nếu có biến bucket thì upload S3 + retention trong bucket (7 object).
- **Biến bucket:** Hỗ trợ hai bộ tên — Railway "AWS SDK Generic" (`AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT_URL`, …) và tên thô (`BUCKET`, `ENDPOINT`, …).

### 3.4. Script restore (`scripts/restore-db.js`)

- **Usage:** `node scripts/restore-db.js <file.sql> [--confirm] [--target <db>]`.
- **Mặc định dry-run:** Không có `--confirm` thì chỉ in thông tin file (size, tables, INSERTs), không thay đổi DB.
- **`--target <db>`:** Restore vào database khác (tạo DB nếu chưa có).
- Hỗ trợ cả mode Docker (container `web_vocab_db`) và direct (host/port từ env).

### 3.5. Image Cron Service (`Dockerfile.backup`)

- Base: `node:20-bookworm-slim` (Debian, không Alpine) để cài `default-mysql-client` (cung cấp `mysqldump`). Trên Debian, `default-mysql-client` là MariaDB client — vì vậy script phải bỏ qua `--set-gtid-purged` khi client không hỗ trợ.
- Chỉ copy `package.json`, `node_modules` (từ stage deps), và `scripts/backup-db.js`. CMD: `node scripts/backup-db.js`.
- User non-root (`appuser`).

### 3.6. Cấu hình Railway (Cron Service)

| Mục | Giá trị / Ghi chú |
|-----|-------------------|
| **Tên service** | `Cron Service` (có thể đặt tên khác; tên generic vì sau này có thể thêm task khác) |
| **Source** | GitHub Repo, branch `staging`, Root Directory = `src` |
| **Build** | Dockerfile path = `Dockerfile.backup` |
| **Watch Paths** | `/src/scripts/backup-db.js`, `/src/Dockerfile.backup`, `/src/package.json`, `/src/package-lock.json` — chỉ rebuild khi các file này thay đổi |
| **Region** | Southeast Asia (Singapore) — cùng region với MySQL để dump qua private network |
| **Variables** | MySQL: reference `${{MySQL.MYSQLHOST}}`, …; Bucket: "Add to Service" → style "AWS SDK (Generic)" |
| **Cron Schedule** | `0 2 * * *` (02:00 UTC). **Bắt buộc cấu hình qua Dashboard UI**, không dùng `railway.json` (bug: cron chạy mỗi deploy nếu dùng config-as-code) |

### 3.7. Chiến lược backup: Hybrid

- **Provider backup:** Bật backup managed của MySQL trên Railway (nếu có).
- **Logical backup:** Cron Service chạy `backup-db.js` mỗi ngày → dump → upload bucket → retention. Object storage dùng **Railway Storage Bucket** (không cần S3 bên ngoài).

### 3.8. Backup không nằm trong CI/CD GitHub Actions

- **Server Web:** Build image trong GitHub Actions → push GHCR → Railway redeploy (đúng như hiện tại).
- **Cron Service:** **Không** build image trong GitHub Actions. Railway build trực tiếp từ repo; **Watch Paths** tránh rebuild khi chỉ code app thay đổi. Cron chỉ chạy đúng giờ (không chạy khi deploy) — đây là cách triển khai phổ biến trên Railway cho service cron.

---

## 4. Các quyết định và thống nhất

| Chủ đề | Quyết định |
|--------|------------|
| **Tên service Railway** | "Cron Service" (hoặc tùy chọn) — service có thể mở rộng thêm task khác sau này. |
| **Backup có trong CI/CD không?** | Không. Cron Service build từ repo trên Railway; dùng Watch Paths để tránh rebuild không cần thiết. |
| **Cron có chạy khi deploy không?** | Không. Cron cấu hình qua Dashboard UI chỉ chạy đúng schedule (Railway xác nhận). |
| **Object storage** | Dùng Railway Storage Bucket (S3-compatible), không Volume, không S3 external — giảm độ phức tạp. |
| **Client mysqldump trên Railway** | Debian `default-mysql-client` = MariaDB → script tự detect và bỏ flag `--set-gtid-purged` nếu client không hỗ trợ. |
| **Log "docker: not found"** | Suppress stderr khi gọi `docker ps` trong `containerRunning()` để log sạch trên Railway. |
| **Rétention** | 7 dumps (local + bucket). Có thể override bằng biến `BACKUP_RETENTION`. |

---

## 5. Câu hỏi đã giải quyết (Q&A)

### Phase 2 — Backup & Restore

**Q. Khi GitHub Actions chạy cho staging thì chỉ build/deploy image app, MySQL tự tạo trên Railway; vậy backup có nằm trong CI/CD không?**  
R. Backup **không** nằm trong CI/CD. Service Cron Service trên Railway build từ repo; mỗi push rebuild service đó (trừ khi dùng Watch Paths). Cron không chạy lúc deploy, chỉ chạy theo schedule.

**Q. Nếu tạo service backup từ repo GitHub với Dockerfile.backup thì mỗi push sẽ redeploy — có vấn đề không?**  
R. Redeploy = rebuild image, không kích hoạt chạy cron. Để tránh rebuild không cần thiết, dùng **Watch Paths** (chỉ rebuild khi `backup-db.js`, `Dockerfile.backup`, `package.json` thay đổi).

**Q. Có nên dùng branch riêng (vd. `backup`) để chỉ khi push lên branch đó mới deploy backup?**  
R. Không cần. Watch Paths đơn giản hơn và đúng chuẩn (monorepo, path-based trigger). Branch riêng gây phức tạp và dễ quên merge.

**Q. Lỗi `mysqldump: unknown variable 'set-gtid-purged=OFF'`?**  
R. Trên Debian, `default-mysql-client` cài MariaDB client, không hỗ trợ flag này. Script đã sửa: gọi `getDumpFlags()` — chỉ thêm `--set-gtid-purged=OFF` nếu `mysqldump --help` có chứa chuỗi tương ứng.

**Q. Log xuất hiện "docker: not found"?**  
R. Script kiểm tra Docker để chọn mode; trên Railway không có Docker nên shell in lỗi. Đã sửa: `execSync(..., { stdio: ['ignore', 'pipe', 'ignore'] })` để không in stderr.

**Q. Output backup thành công gồm những gì?**  
R. Ví dụ: `[backup] Starting...` → `Dump flags: ...` → `Using direct connection (mysql.railway.internal:3306)` → `Written: ...` → `Verified: N table(s)` → `Bucket detected ... uploading...` → `Uploaded to bucket: ...` → `Bucket retention: keeping X/Y dumps` → `Done.`

---

## 6. Các file dự án (Phase 1 + 2)

### Phase 1 (đã có từ trước)

| File | Vai trò |
|---------|------|
| `src/migrations/001_initial.sql` | Schema versioned, bảng app + schema_migrations |
| `src/scripts/run-migrations.js` | Migration runner |
| `src/package.json` | Script `migrate` |
| `src/docker-compose.yml` | Mount 001 vào initdb.d |
| `src/Dockerfile` | CMD: migrate puis app |

### Phase 2 — Mới hoặc đã sửa

| File | Vai trò |
|---------|------|
| `src/scripts/backup-db.js` | Dump, verify, retention local, upload S3 + retention bucket; `getDumpFlags()`, `containerRunning()` stderr supprimé |
| `src/scripts/restore-db.js` | Restore từ dump (dry-run, --confirm, --target) |
| `src/Dockerfile.backup` | Image Cron Service: Node 20 + default-mysql-client, CMD backup-db.js |
| `src/.dockerignore` | Exclut `backups/`; **không** exclut `scripts/backup-db.js` (để build image Cron Service) |
| `src/package.json` | Scripts `backup:db`, `restore:db`; dependency `@aws-sdk/client-s3` |
| `docs/DATABASE.md` | Phần Backup & Restore (3.x, 4.x) |
| `docs/DATABASE-PHASE2-TEST.md` | Hướng dẫn test backup/restore local (Docker + direct) |
| `docs/DATABASE-PHASE2-RAILWAY-BACKUP-SERVICE.md` | Hướng dẫn đầy đủ: Cron Service, Watch Paths, variables, cron UI, restore từ bucket |
| `docs/DATABASE-PHASE1-PHASE2-SUMMARY.md` | File này — tổng hợp Phase 1 + Phase 2 |

---

## 7. Test và validation

### Phase 1

- Theo **[docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md)** và **[docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md](DATABASE-PHASE1-VALIDATION-SUMMARY.md)**. User đã xác nhận pass.

### Phase 2

- **Local:** Theo **[docs/DATABASE-PHASE2-TEST.md](DATABASE-PHASE2-TEST.md)** — backup (Docker + direct), verify, retention, restore (dry-run + --confirm), bảo mật (gitignore, dockerignore, MYSQL_PWD).
- **Railway:** Theo **[docs/DATABASE-PHASE2-RAILWAY-BACKUP-SERVICE.md](DATABASE-PHASE2-RAILWAY-BACKUP-SERVICE.md)** — tạo Cron Service, Root Directory, Dockerfile path, region Singapore, variables MySQL + Bucket, Cron Schedule (UI), Watch Paths; chạy cron (Run Cron Job hoặc đợi schedule); kiểm tra logs và bucket.

### Checklist nhanh Phase 2 (Railway)

- [ ] Cron Service build thành công (Dockerfile.backup).
- [ ] Variables: MySQL (reference) + Bucket (Add to Service, AWS SDK Generic).
- [ ] Region = Singapore; Cron Schedule = `0 2 * * *` (cấu hình qua UI).
- [ ] Watch Paths đã thêm (4 pattern).
- [ ] Sau khi chạy cron: logs có "Done.", bucket có file `.sql` trong `backups/`.

---

## 8. Thực tế triển khai chuyên nghiệp

### Migrations (Phase 1)

- Schema versioned (fichiers numérotés + table tracking), runner idempotent, một nguồn schema. Migrations at startup hoặc pre-deploy; DB managed tách khỏi app; CI chỉ deploy app. Phase 1 bám đúng cách làm phổ biến.

### Backup (Phase 2)

- **Hybrid:** Backup managed (provider) + backup logique (script cron) → dump upload object storage (S3/bucket), rétention. Project dùng Railway Bucket (S3-compatible), không Volume, không S3 externe.
- **Service cron dédié:** Tách khỏi app; chạy theo schedule; script thoát sau khi xong (Railway cron không chạy khi deploy nếu cấu hình qua UI).
- **Watch Paths / path-based trigger:** Monorepo, một repo nhiều service — chỉ rebuild service khi file liên quan thay đổi. Railway Watch Paths = cách chuẩn cho Cron Service.
- **Rétention:** 7 daily là mức phổ biến; có thể mở rộng 7d + 4w + 12m nếu cần.
- **Verify:** Kiểm tra dump có CREATE TABLE (và có thể thêm checksum / restore test định kỳ ở mức nâng cao).

---

## 9. Tài liệu tham chiếu

| Chủ đề | Fichier |
|--------|---------|
| Tổng quan migrations, DB client, backup/restore | [docs/DATABASE.md](DATABASE.md) |
| Phase 1 — Validation & tổng hợp | [docs/DATABASE-PHASE1-VALIDATION-SUMMARY.md](DATABASE-PHASE1-VALIDATION-SUMMARY.md) |
| Phase 1 — Test từng bước | [docs/DATABASE-PHASE1-TEST.md](DATABASE-PHASE1-TEST.md) |
| Migrations trên Railway | [docs/DATABASE-RAILWAY-MIGRATIONS.md](DATABASE-RAILWAY-MIGRATIONS.md) |
| Phase 2 — Test backup/restore local | [docs/DATABASE-PHASE2-TEST.md](DATABASE-PHASE2-TEST.md) |
| Phase 2 — Cron Service trên Railway (chi tiết) | [docs/DATABASE-PHASE2-RAILWAY-BACKUP-SERVICE.md](DATABASE-PHASE2-RAILWAY-BACKUP-SERVICE.md) |
| **Tổng hợp Phase 1 + Phase 2** | [docs/DATABASE-PHASE1-PHASE2-SUMMARY.md](DATABASE-PHASE1-PHASE2-SUMMARY.md) (file này) |

---

## Tóm tắt một trang (Phase 1 + Phase 2)

| Hạng mục | Nội dung |
|----------|----------|
| **Phase 1** | Migrations (`migrations/001_initial.sql`, `schema_migrations`), runner `run-migrations.js`, `npm run migrate`, Docker init + CMD migrate→app, DB client (doc). MySQL Railway = service riêng; migrations chạy khi app start. |
| **Phase 2 local** | `npm run backup:db` → dump + verify + retention (7); `npm run restore:db -- <file> [--confirm] [--target db]`. Mode Docker nếu container `web_vocab_db` chạy, else direct. |
| **Phase 2 Railway** | Cron Service: repo GitHub, Root `src`, Dockerfile.backup, region Singapore, variables MySQL + Bucket (AWS SDK Generic), Cron `0 2 * * *` (UI), Watch Paths. Dump → bucket, retention 7. |
| **Quyết định** | Backup không trong CI/CD; Watch Paths tránh rebuild thừa; cron chỉ qua UI; bucket Railway; script tương thích MariaDB client (getDumpFlags); ẩn log "docker: not found". |

Khi đã hoàn thành test Phase 1 và Phase 2 (local + Railway) theo các doc trên, kỹ năng **Data Management & Operations** cho fullstack dev đạt **Phase 1 + Phase 2** đầy đủ.
