# Docker Mô hình B — CI build image → GHCR → Railway kéo image

Pipeline: **một image** được build trong GitHub Actions, push lên GitHub Container Registry (GHCR), Railway **kéo image đó** để chạy (không build lại trên Railway).

---

## 1. Luồng CI/CD

1. **Push** (hoặc PR) → GHA chạy: Lint & Test → **Build & Push to GHCR**.
2. **Chỉ khi push lên `main`/`master`**: image được **push** lên `ghcr.io/OWNER/REPO:latest` (và `:sha-xxx`).
3. Job **Deploy** chạy: gọi `railway redeploy` → Railway pull image `:latest` mới và deploy.
4. **E2E** chạy sau deploy để kiểm tra production.

Trên **PR**: vẫn build image (validate Dockerfile), nhưng **không push** và không deploy.

---

## 2. Cấu hình GitHub

### 2.1. Quyền workflow

Workflow đã khai báo `permissions: contents: read, packages: write` cho job build-push. `GITHUB_TOKEN` có quyền push package (GHCR) trong repo.

### 2.2. Secrets / Variables (phân cấp đúng)

**Railway Project Token được scope theo environment** — đây là cơ chế bảo mật Railway. Token production chỉ deploy được production, token staging chỉ deploy được staging.

### Kiến trúc đối xứng — cùng tên secret, khác giá trị

| Nơi lưu | Key | Giá trị | Mô tả |
|---------|-----|---------|--------|
| **Environment secret** `production` | `RAILWAY_TOKEN` | Railway token scoped production | Chỉ `deploy-production` job đọc được |
| **Environment secret** `production` | `RAILWAY_SERVICE_ID` | Service ID production (UUID) | Ổn định — UUID không bao giờ đổi |
| **Environment secret** `staging` | `RAILWAY_TOKEN` | Railway token scoped staging | Chỉ `deploy-staging` job đọc được |
| **Environment secret** `staging` | `RAILWAY_SERVICE_ID` | Service ID staging (UUID) | Ổn định — UUID không bao giờ đổi |
| **Repository variable** | `STAGING_URL` | URL public staging | Không nhạy cảm, dùng cho health check + E2E |

**Repository secrets: TRỐNG** — không có secret nào ở repo level.

### Tại sao thiết kế này tối ưu?

1. **Đối xứng hoàn toàn:** Cả 2 environment dùng cùng tên secret → workflow code giống hệt nhau cho cả 2 deploy job.
2. **GitHub tự resolve:** `${{ secrets.RAILWAY_TOKEN }}` trong job có `environment: production` → lấy giá trị production. Trong job có `environment: staging` → lấy giá trị staging. Không cần tên khác nhau.
3. **Service ID thay vì Service Name:** UUID cố định, không bao giờ đổi — service name có thể bị rename nhầm → pipeline fail.
4. **Least Privilege tuyệt đối:** Mỗi job chỉ đọc được secrets của environment mình. Job staging không thể đọc token production và ngược lại.

### Cách tạo Railway tokens

- Production: Railway → Project Settings → Tokens → `GITHUB_ACTIONS_PRODUCTION` → Environment: `production`
- Staging: Railway → Project Settings → Tokens → `GITHUB_ACTIONS_STAGING` → Environment: `staging`

---

## 3. Cấu hình Railway — chuyển sang "Connect Image"

Service hiện đang **Connect Repo** (build từ Dockerfile trên Railway). Cần đổi sang **Connect Image** để Railway chỉ kéo image từ GHCR.

### 3.1. Lấy URL image GHCR

Sau lần push `main` đầu tiên, image sẽ có dạng:

```text
ghcr.io/OWNER/REPO:latest
```

- **OWNER**: tên user hoặc org GitHub (ví dụ `dhuy21`).
- **REPO**: tên repo (lowercase), ví dụ `web_vocab_v0`.

Ví dụ: `ghcr.io/dhuy21/web_vocab_v0:latest`

### 3.2. Trên Railway Dashboard

1. Vào **Project** → Service web (vd. webvocabv0) → **Settings**.
2. Phần **Source**:
   - **Ngắt kết nối repo** hiện tại (Connect Repo) nếu đang dùng.
   - Chọn **Connect Image**.
   - **Image URL**: `ghcr.io/OWNER/REPO:latest` (thay đúng OWNER và REPO).
3. **Registry auth** (nếu image **private**):
   - GHCR private cần đăng nhập. Railway → Settings của service → **Variables** hoặc mục **Registry** (nếu có): thêm thông tin đăng nhập GHCR.
   - Cách đơn giản: trên GitHub → **Package** (Container registry) của image → **Package settings** → **Change visibility** → **Public** (khi đó Railway pull không cần auth).

### 3.3. Variables (env)

Giữ nguyên toàn bộ **Variables** trên Railway (DB, TTS, session, …). Container chạy từ image vẫn nhận env từ Railway.

### 3.4. Các mục khác

- **Port / Healthcheck**: giữ như cũ (vd. port 3000, healthcheck `/health`).
- **Root Directory**: không dùng khi deploy bằng image (image đã là artifact hoàn chỉnh).

---

## 4. Quyền GHCR (khi image private)

Nếu package GHCR ở chế độ **private**:

- **Railway** cần kéo image: dùng **Personal Access Token (PAT)** GitHub có scope `read:packages`.
- Trên Railway: thêm biến hoặc mục Registry (tùy giao diện) với user = GitHub username, password = PAT.

Hoặc đặt package **public** (Package settings → Change visibility → Public) thì Railway pull không cần auth.

---

## 5. Cấu trúc repo và build context

Workflow hiện dùng **context: src** và **file: src/Dockerfile** (repo root có thư mục `src` chứa Dockerfile).

- Nếu **repo root chính là thư mục app** (Dockerfile ngay tại root): trong workflow cần đổi thành `context: .` và `file: ./Dockerfile`.

---

## 6. Checklist triển khai (Production)

- [ ] Đã push workflow mới lên `main` ít nhất một lần → tạo image `ghcr.io/OWNER/REPO:latest`.
- [ ] Railway: đã chuyển service Production sang **Connect Image** với URL `ghcr.io/OWNER/REPO:latest`.
- [ ] Nếu image private: đã cấu hình auth GHCR trên Railway hoặc đã bật public cho package.
- [ ] GitHub **Environment secret** `production`: `RAILWAY_TOKEN` + `RAILWAY_SERVICE_ID`.
- [ ] GitHub **Repository variable**: `STAGING_URL`.
- [ ] Repository secrets: **TRỐNG** (không có Railway token/ID ở repo level).
- [ ] Tắt "Wait for CI" / auto-deploy từ repo trên Railway (nếu vẫn bật) để tránh deploy hai kiểu.

Sau đó mỗi lần push `main`: GHA build → push image `:latest` → redeploy Production → Railway pull image mới.

---

## 7. Service Staging (Phase 4)

### 7.1. Tạo service Staging trên Railway

1. Trong **cùng project** Railway (hoặc project mới): click **+ New Service** → chọn **Docker Image**.
2. **Image URL**: `ghcr.io/OWNER/REPO:staging` (tag `:staging` thay vì `:latest`).
3. **Variables**: copy env từ service Production, nhưng thay đổi:
   - `NODE_ENV=staging`
   - `BASE_URL` = URL staging (vd. `https://staging-sealvo.up.railway.app` hoặc custom domain `staging.sealvo.it.com`)
   - `MYSQLHOST` = DB staging (nếu dùng DB riêng cho staging) hoặc giữ DB production (cẩn thận, staging ghi DB thật).
4. **Domain**: gán domain (Generate Domain hoặc Custom Domain) cho service Staging → ghi lại URL.
5. **Port / Healthcheck**: giống Production (port 3000, healthcheck `/health`).

### 7.2. Cấu hình GitHub Secrets / Variables cho Staging

**Kiến trúc đối xứng** — cùng tên secret cho cả 2 environment, GitHub tự resolve đúng giá trị:

| Nơi lưu | Key | Giá trị |
|---------|-----|---------|
| **Environment secret** `production` | `RAILWAY_TOKEN` | Railway token scoped production |
| **Environment secret** `production` | `RAILWAY_SERVICE_ID` | Service ID production (UUID) |
| **Environment secret** `staging` | `RAILWAY_TOKEN` | Railway token scoped staging |
| **Environment secret** `staging` | `RAILWAY_SERVICE_ID` | Service ID staging (UUID) |
| **Repository variable** | `STAGING_URL` | URL public staging (không nhạy cảm) |

**Repository secrets: TRỐNG** — không có secret nào ở repo level.

### 7.3. Checklist triển khai (Staging)

- [ ] Railway: staging environment đã tạo (duplicate từ production ✅).
- [ ] Railway: service trong staging environment → Source → Connect Image → `ghcr.io/OWNER/REPO:staging`.
- [ ] Railway: cấu hình Variables (NODE_ENV=staging, BASE_URL, SESSION_SECRET mới, STAGING_EMAIL_INTERCEPT).
- [ ] Railway: gán domain cho staging service, ghi lại URL.
- [ ] Railway: tạo token `GITHUB_ACTIONS_STAGING` scoped `staging` ✅.
- [ ] GitHub Environment `staging`: secret `RAILWAY_TOKEN` = staging token, `RAILWAY_SERVICE_ID` = staging service ID.
- [ ] GitHub Repository variable: `STAGING_URL` = URL staging.
- [ ] Push code vào nhánh `staging` → CI build `:staging` → push GHCR → deploy Staging → E2E staging.

### 7.4. Luồng CI/CD mở rộng (Phase 4)

| Nhánh | Image tag | Deploy | E2E |
|-------|-----------|--------|-----|
| **feature/xxx** | Không push | Không | Không |
| **dev** | Không push | Không | Không |
| **staging** | `:staging` | Service **Staging** | E2E Staging (`STAGING_URL`) |
| **main** | `:latest` | Service **Production** | E2E Production (`www.sealvo.it.com`) |

Xem chi tiết chiến lược nhánh: **docs/BRANCHING-STRATEGY.md**.




