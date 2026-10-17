# Docker — Chạy local, build image, deploy (Railway)

Tài liệu Phase 3: hướng dẫn chạy app bằng Docker (local với Compose), build image production, và sẵn sàng deploy bằng Dockerfile trên Railway.

---

## 1. Chạy local với Docker Compose

Môi trường: **một file `.env`** (tất cả biến), **app + MySQL** trong Compose.

### 1.1. Điều kiện

- Docker và Docker Compose cài trên máy.
- Làm việc trong thư mục có `Dockerfile` và `docker-compose.yml` (trong repo này là **`src/`**).

### 1.2. Cấu hình env

```bash
cd src
cp .env.example .env
# Chỉnh .env: PORT, APP_HOST_PORT, DB_*, GOOGLE_TTS_*, v.v. (xem .env.example)
```

### 1.3. Chạy lần đầu (tạo DB + bảng)

Để MySQL chạy init và thực thi `app/core/database.sql` (tạo bảng), volume phải trống:

```bash
docker compose down -v
docker compose up --build
```

- Sau khi DB healthy, app start. Log sẽ có "Base de données connectée", "App listening at http://localhost:3000".
- Truy cập: **http://localhost:PORT** (PORT = giá trị `APP_HOST_PORT` trong `.env`, ví dụ 3000).

### 1.4. Các lệnh thường dùng

| Lệnh | Mô tả |
|------|--------|
| `docker compose up -d --build` | Chạy nền (detached). |
| `docker compose logs -f app` | Xem log service app. |
| `docker compose down` | Dừng và xóa container (giữ volume DB). |
| `docker compose down -v` | Dừng và xóa cả volume (DB mới hoàn toàn lần sau khi `up`). |

Chi tiết test Phase 2: **docs/DOCKER-PHASE2-TEST.md**.

---

## 2. Build image production (không dùng Compose)

Khi chỉ cần chạy **container app** (DB đã có sẵn ở nơi khác: host, Railway MySQL, v.v.):

```bash
cd src
docker build -t web-vocab:latest .
docker run --rm -p 3000:3000 --env-file .env web-vocab:latest
```

- App lắng nghe `process.env.PORT` (mặc định 3000). Cần đảm bảo `.env` có đủ biến (MYSQLHOST trỏ tới DB thật, không dùng `db` nếu không chạy Compose).
- Hoặc truyền từng biến: `docker run -e PORT=3000 -e MYSQLHOST=... -e MYSQLUSER=... ... web-vocab:latest`.

---

## 3. Deploy trên Railway với Dockerfile

Project có thể deploy bằng **Dockerfile** thay vì Nixpacks để môi trường build giống local/CI.

### 3.1. Cấu hình trên Railway

1. **Project** → Service web → **Settings**.
2. **Build**: chọn **Dockerfile** (thay vì Nixpacks/Buildpacks).
3. **Root Directory**: nếu repo root là thư mục chứa Dockerfile (vd. `src`), đặt **Root Directory** = `src` hoặc `.` tùy cấu trúc repo. Nếu repo root chính là thư mục app (có Dockerfile, package.json), để trống.
4. **Variables**: khai báo toàn bộ biến môi trường trên dashboard (Railway **không** đọc file `.env` trên server). Cần ít nhất: `NODE_ENV`, `PORT` (Railway có thể gán sẵn), `MYSQLHOST`, `MYSQLPORT`, `MYSQL_DATABASE`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `GOOGLE_TTS_PROJECT_ID`, `GOOGLE_TTS_CLIENT_EMAIL`, `GOOGLE_TTS_PRIVATE_KEY`, và các biến khác app cần (session, Google Auth, AWS, Gemini, …).

### 3.2. Lưu ý

- DB production: dùng MySQL đã host (Railway add-on hoặc bên ngoài); `MYSQLHOST` trỏ tới URL/host đó.
- Không cần file `.env` trong image; mọi thứ qua **Variables** trên Railway.
- Nếu CI deploy bằng Railway CLI (`railway up`), Railway sẽ build từ Dockerfile khi đã bật Dockerfile trong Settings.

### 3.3. Mô hình B — Deploy bằng image từ GHCR (chuyên nghiệp)

CI build image → push lên **GitHub Container Registry (GHCR)** → Railway **Connect Image** và kéo image đó (không build lại). Một image, build một lần, chạy đúng bản đã test.

**Hướng dẫn chi tiết:** **docs/DOCKER-MODEL-B.md** (cấu hình Railway Connect Image, GHCR, secrets, checklist).

---

## 4. Tóm tắt

| Mục đích | Lệnh / Hành động |
|----------|-------------------|
| Dev local (app + MySQL) | `cd src` → `cp .env.example .env` → `docker compose down -v` → `docker compose up --build` |
| Build image production | `cd src` → `docker build -t web-vocab:latest .` |
| Chạy container app (DB ngoài) | `docker run --rm -p 3000:3000 --env-file .env web-vocab:latest` |
| Deploy Railway bằng Docker | Bật Dockerfile trong Settings, set Root Directory, khai báo Variables |
| Deploy Railway bằng image (Mô hình B) | CI push image lên GHCR, Railway Connect Image; xem **DOCKER-MODEL-B.md** |

---

## 5. Doc liên quan

- **DOCKER-TONG-HOP-PHASE-1-4.md** — Tổng hợp toàn bộ Phase 1–4: đã làm, thảo luận, thống nhất, sự cố và cách xử lý.
- **DOCKER-TONG-HOP-PHASE-1-2-3.md** — Tổng hợp Phase 1–3 (phiên bản cũ).
- **DOCKER-MODEL-B.md** — Mô hình B: CI build → GHCR → Railway kéo image; cấu hình Production + Staging (Phase 4).
- **BRANCHING-STRATEGY.md** — Chiến lược nhánh (feature/dev/staging/main), luồng merge, branch protection, rollback.
- **DOCKER-PHASE2-TEST.md** — Test Phase 2 (checklist, lỗi thường gặp).
- **DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md** — Init DB (database.sql), healthcheck, lỗi ECONNREFUSED.
- **app/config/README-TTS-CREDENTIALS.md** — Biến TTS (GOOGLE_TTS_*).
