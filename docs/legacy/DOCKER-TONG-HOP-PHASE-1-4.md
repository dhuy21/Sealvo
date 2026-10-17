# Tổng hợp Docker — Kỹ năng Fullstack: Chuẩn hóa môi trường chạy và deploy (Phase 1 → 4)

Tài liệu này tổng hợp **toàn bộ** những gì đã triển khai, thảo luận, thống nhất và xử lý từ Phase 1 đến Phase 4 cho kỹ năng **Docker** trong yêu cầu fullstack: chuẩn hóa môi trường chạy và deploy.

---

## Mục lục

1. [Bối cảnh và mục tiêu](#1-bối-cảnh-và-mục-tiêu)
2. [Tổng quan các Phase](#2-tổng-quan-các-phase)
3. [Phase 1 — Dockerfile + .dockerignore](#3-phase-1--dockerfile--dockerignore)
4. [Phase 2 — Docker Compose (app + MySQL)](#4-phase-2--docker-compose-app--mysql)
5. [Phase 3 — Tài liệu, CI và Mô hình B](#5-phase-3--tài-liệu-ci-và-mô-hình-b)
6. [Phase 4 — CI/CD nâng cao, Multi-environment, Branch Protection](#6-phase-4--cicd-nâng-cao-multi-environment-branch-protection)
7. [Phase 4 bổ sung — Cleanup, Tests, PR flow và sự cố](#7-phase-4-bổ-sung--cleanup-tests-pr-flow-và-sự-cố)
8. [Sự cố và cách xử lý](#8-sự-cố-và-cách-xử-lý)
9. [Các câu hỏi đã thảo luận](#9-các-câu-hỏi-đã-thảo-luận)
10. [Tóm tắt file và đường dẫn quan trọng](#10-tóm-tắt-file-và-đường-dẫn-quan-trọng)
11. [Kết luận](#11-kết-luận)

---

## 1. Bối cảnh và mục tiêu

- **Kỹ năng:** Docker — khi muốn chuẩn hóa môi trường chạy và deploy (mức **nâng cao** cho fullstack).
- **Dự án:** SealVo — ứng dụng Node/Express + MySQL, deploy trên Railway.
- **Mục tiêu:** Cùng một "hộp" (image) chạy giống nhau giữa local, CI và production; deploy bằng image; local dev có app + MySQL trong Docker Compose; pipeline CI/CD chuyên nghiệp với multi-environment.
- **Giới hạn:** Không dùng Kubernetes; DB production đã host sẵn (Railway MySQL).
- **Yêu cầu xuyên suốt:** Chuyên nghiệp, logic, thông minh, phù hợp với thực tế triển khai.

---

## 2. Tổng quan các Phase

| Phase | Nội dung chính | Level |
|-------|---------------|-------|
| **Phase 1** | Dockerfile (multi-stage) + .dockerignore | Junior → Mid |
| **Phase 2** | Docker Compose (app + MySQL, healthcheck, init DB) | Mid |
| **Phase 3** | CI/CD cơ bản (Mô hình B: CI → GHCR → Railway), documentation | Mid → Senior |
| **Phase 4** | CI/CD nâng cao: multi-environment, Trivy scan, image hardening, concurrency, GitHub Environments, Branch Rulesets | Senior → Staff |

---

## 3. Phase 1 — Dockerfile + .dockerignore

### Đã làm

- **Dockerfile** (trong `src/`): multi-stage build (2 stage: `deps` + `runner`), Node 20-alpine, user non-root (`appuser:appgroup`), HEALTHCHECK (route `/health`), `CMD ["node", "app.js"]`.
- **.dockerignore**: loại trừ `node_modules`, `.git`, `.env*`, `e2e`, `__tests__`, `docs`, `.github`, log, file tạm → build nhanh, image nhỏ, **không đưa secret vào image**.

### Kiểm tra Phase 1

```bash
cd src
docker build -t web-vocab:local .
docker run --rm -p 3000:3000 --env-file .env web-vocab:local
# Mở http://localhost:3000/health
```

### Kiến thức cốt lõi

- **Multi-stage build:** Stage 1 (`deps`) cài dependencies; Stage 2 (`runner`) chỉ copy `node_modules` production → image nhỏ, không có dev tools.
- **Non-root user:** Container chạy dưới user `appuser` (UID 1001) → giảm attack surface nếu bị khai thác.
- **HEALTHCHECK:** Cho platform (Docker/Railway) biết container có đang chạy đúng không.

---

## 4. Phase 2 — Docker Compose (app + MySQL)

### Đã làm

- **docker-compose.yml** (trong `src/`): hai service `app` (build từ Dockerfile) và `db` (MySQL 8).
- **Một file .env duy nhất:** `src/.env`; app load `dotenv.config({ path: '.env' })`.
- **env_file: .env** cho service app; không khai báo trùng trong bloc `environment`.
- **DB healthcheck:** `mysqladmin ping -h 127.0.0.1 -P 3306` (TCP), `start_period: 45s`, `retries: 15` → tránh app start khi MySQL chưa sẵn sàng (ECONNREFUSED).
- **Init DB:** `app/core/database.sql` mount vào `/docker-entrypoint-initdb.d/01-schema.sql`; chỉ chạy khi volume MySQL **trống** (lần đầu hoặc sau `docker compose down -v`).
- **Port mapping linh hoạt:** `${HOST_PORT}:${PORT}` — host port tùy chỉnh qua `.env`.

### Lệnh thường dùng

```bash
cd src
docker compose down -v    # DB mới hoàn toàn nếu cần
docker compose up --build # hoặc up -d --build
docker compose logs -f app
docker compose down
```

### Kiến thức cốt lõi

- **depends_on + condition: service_healthy:** App chỉ start khi MySQL TCP ping OK → không ECONNREFUSED.
- **Volume mount cho init script:** MySQL chỉ chạy `/docker-entrypoint-initdb.d/` khi volume trống.
- **Biến PORT trong .env:** Cần có `PORT=3000` trong `.env` để Compose không báo "variable not set".

---

## 5. Phase 3 — Tài liệu, CI và Mô hình B

### Đã làm

- **docs/DOCKER.md:** Hướng dẫn chạy local (Compose), build image, deploy Railway.
- **docs/DOCKER-MODEL-B.md:** Cấu hình CI build → push GHCR → Railway Connect Image.
- **CI/CD workflow** (`ci-cd.yml`): Job Lint & Test → Build & Push to GHCR → Deploy → E2E.
- **Railway:** Chuyển từ Connect Repo sang **Connect Image** (`ghcr.io/dhuy21/sealvo:latest`).
- **GHCR package** set public → Railway pull không cần auth.

### Mô hình B — Ý nghĩa

| | Mô hình A (cũ) | Mô hình B (hiện tại) |
|---|---|---|
| Build | CI build + Railway build lại | CI build **một lần** duy nhất |
| Image | Hai image khác nhau | **Một image** duy nhất |
| Deploy | Railway build từ source | Railway **kéo image** từ GHCR |
| Đảm bảo | Không chắc image giống nhau | Image đã test = image production |
| Rollback | Phải rebuild | Pull image tag cũ |

### Sự cố deploy Railway (Phase 3)

**Triệu chứng:** Deploy thành công nhưng truy cập `www.sealvo.it.com` báo "Application failed to respond".

**Nguyên nhân:** Railway tự inject biến `PORT`; app chỉ đọc `APP_PORT` → `appPort` = undefined → không listen đúng port.

**Giải pháp:** `const appPort = process.env.PORT || process.env.APP_PORT || 3000;` + listen `0.0.0.0`.

**Bài học:** Trên Railway (và Heroku, Render...), **luôn ưu tiên biến `PORT`** do platform gán; server **luôn listen `0.0.0.0`** trong container.

---

## 6. Phase 4 — CI/CD nâng cao, Multi-environment, Branch Protection

Phase 4 là phase mở rộng nâng cao, bao gồm nhiều thành phần chuyên nghiệp.

### 6.1. Chiến lược nhánh

```
feature/xxx  →  dev  →  staging  →  main
     │            │          │          │
     │         tích hợp   test cuối  production
     │         lint+test   deploy     deploy
     │         build       Staging    Production
     │         (no push)   + E2E      + E2E
```

| Nhánh | Vai trò | Deploy? | Image tag GHCR |
|-------|---------|---------|----------------|
| **feature/xxx** | Phát triển tính năng | Không | Không push |
| **dev** | Tích hợp, test tổng hợp | Không | Không push |
| **staging** | Pre-production | Service Staging (Railway) | `:staging`, `:sha-xxx` |
| **main** | Production | Service Production (Railway) | `:latest`, `:sha-xxx` |

**Quy tắc:**
- Không push trực tiếp vào `main` → luôn qua PR từ `staging`, có review.
- Không push trực tiếp vào `staging` → qua PR từ `dev`.
- `dev`: có thể push trực tiếp hoặc qua PR từ feature.

### 6.2. GitHub Environments

Tạo 2 environment trên GitHub: `production` (restrict nhánh `main`) và `staging` (restrict nhánh `staging`).

**Tính năng:**
- Hiển thị deployment history trên GitHub UI.
- Protection rules: required reviewers, wait timer.
- Environment secrets chỉ accessible trong job có khai báo `environment: xxx` → **Least Privilege**.

### 6.3. Kiến trúc Secrets — Đối xứng + Least Privilege

**Nguyên tắc thiết kế:**
1. **Đối xứng hoàn toàn:** Cả 2 environment dùng cùng tên secret → workflow code giống hệt nhau.
2. **GitHub tự resolve:** `${{ secrets.RAILWAY_TOKEN }}` trong job `environment: production` → lấy giá trị production; trong `environment: staging` → lấy giá trị staging.
3. **Service ID thay vì Service Name:** UUID cố định, không bao giờ đổi → pipeline ổn định.
4. **Least Privilege tuyệt đối:** Mỗi job chỉ đọc được secrets của environment mình.

| Nơi lưu | Key | Giá trị | Accessible từ |
|---------|-----|---------|---------------|
| Environment secret `production` | `RAILWAY_TOKEN` | Railway token scoped production | Chỉ `deploy-production` |
| Environment secret `production` | `RAILWAY_SERVICE_ID` | Service ID production (UUID) | Chỉ `deploy-production` |
| Environment secret `staging` | `RAILWAY_TOKEN` | Railway token scoped staging | Chỉ `deploy-staging` |
| Environment secret `staging` | `RAILWAY_SERVICE_ID` | Service ID staging (UUID) | Chỉ `deploy-staging` |
| Repository variable | `STAGING_URL` | URL public staging | Mọi job |

**Repository secrets: TRỐNG** — không có secret nào ở repo level.

**Tại sao thiết kế này được chọn?**
- Ban đầu `RAILWAY_TOKEN` production đặt ở Repository secrets, staging ở Environment secrets → **bất đối xứng**, dễ nhầm lẫn.
- Sau thảo luận: chuyển tất cả về Environment secrets → **đối xứng**, tách biệt hoàn toàn 2 môi trường, tối ưu bảo mật.

### 6.4. CI/CD Workflow nâng cao

**File:** `src/.github/workflows/ci-cd.yml`

**Cấu trúc pipeline:**

```
Lint & Test → Build, Scan & Push → Deploy (Production/Staging) → Health Check → E2E
```

| Sự kiện | Lint & Test | Build + Trivy | Push GHCR | Deploy | Health check | E2E |
|---------|-------------|---------------|-----------|--------|-------------|-----|
| Push **feature/xxx** | ✅ | ✅ (validate) | ❌ | ❌ | ❌ | ❌ |
| Push **dev** | ✅ | ✅ (validate) | ❌ | ❌ | ❌ | ❌ |
| Push **staging** | ✅ | ✅ | ✅ (`:staging`) | Staging | ✅ | Staging |
| Push **main** | ✅ | ✅ | ✅ (`:latest`) | Production | ✅ | Production |
| PR (bất kỳ) | ✅ | ✅ (validate) | ❌ | ❌ | ❌ | ❌ |

**Các yếu tố chuyên nghiệp trong pipeline:**

#### a) Concurrency — hai tầng

**Tầng 1 — Workflow level:**
- `cancel-in-progress: true` cho feature/dev/PR → tiết kiệm runner minutes.
- `cancel-in-progress: false` cho staging/main → KHÔNG interrupt deploy đang chạy.

**Tầng 2 — Job level (deploy jobs):**
- `group: deploy-production` / `deploy-staging` với `cancel-in-progress: false`.
- Không cho 2 deploy chạy đồng thời trên cùng environment; xếp hàng thay thế.

#### b) Trivy vulnerability scan (bảo mật)

- Chạy bằng `docker run aquasec/trivy:latest image ...` (Docker Hub).
- Chỉ khi image đã push vào GHCR (staging/main).
- Auth GHCR qua `TRIVY_USERNAME` / `TRIVY_PASSWORD`.
- `continue-on-error: true` → Trivy fail không block pipeline.
- Hiện tại `exit-code: 0` (cảnh báo); có thể đổi `exit-code: 1` để chặn deploy khi có CRITICAL.

**Tại sao dùng `docker run` thay vì `trivy-action`?**
- `aquasecurity/trivy-action` gặp lỗi `fatal: couldn't find remote ref refs/heads/main` khi fetch Git references.
- `docker run aquasec/trivy:latest` ổn định hơn, không phụ thuộc GitHub repo của Trivy.

#### c) Docker layer caching (tốc độ)

- `cache-from: type=gha`, `cache-to: type=gha,mode=max` → GitHub Actions cache.
- Build lần sau nhanh hơn đáng kể (2-3 phút → 30-60 giây nếu chỉ đổi code).

#### d) Health check sau deploy

- Đợi 30 giây → gọi `/health` (tối đa 5 lần, cách 15 giây).
- HTTP 200 → thành công, tiếp tục E2E.
- 5 lần fail → pipeline fail → biết ngay deploy có vấn đề.

#### e) Job Summary

- Mỗi job ghi summary vào `$GITHUB_STEP_SUMMARY` → dễ đọc trên GitHub Actions UI.
- Deploy summary dùng `if: always()` → luôn ghi kể cả khi health check fail.

### 6.5. Railway Staging Environment

**Cách tạo:** Duplicate từ production environment trên Railway.

**Lợi ích:**
- Copy toàn bộ cấu hình (services, variables, networking) trong một click.
- MySQL riêng được tạo tự động.
- Sync feature: khi production thêm service mới, staging auto nhận.

**Variables cần override sau khi duplicate:**

| Biến | Giá trị staging | Lý do |
|------|-----------------|-------|
| `NODE_ENV` | `staging` | Phân biệt behavior |
| `BASE_URL` | URL staging | Redirect, callback đúng |
| `SESSION_SECRET` | Random mới | Không share session với production |
| `STAGING_EMAIL_INTERCEPT` | Email cá nhân | Ngăn email gửi cho user thật |
| `GEMINI_API_KEY` | Key riêng (tùy chọn) | Tách quota, log |

### 6.6. Staging Email Interceptor

**Vấn đề:** Staging dùng cùng AWS SES → có thể gửi email thật cho user.

**Giải pháp:** Thêm `_resolveRecipient()` trong `mailersend.js`:
- Nếu `NODE_ENV === 'staging'` và có `STAGING_EMAIL_INTERCEPT` → redirect tất cả email về test inbox.
- Subject được prefix `[STAGING → original@email.com]` để dễ nhận biết.
- Log ghi rõ email đã bị intercept.

**Cách này được chọn thay vì tạo AWS SES riêng:**
- SES yêu cầu verify domain/email lại từ đầu.
- Code-level interceptor đơn giản, kiểm soát được, không tốn resource.

### 6.7. Third-party API cho Staging

| API | Cách xử lý | Lý do |
|-----|------------|-------|
| **Google OAuth** | Cùng OAuth Client, thêm staging redirect URI | Google cho phép nhiều redirect URIs |
| **Google Cloud TTS** | Cùng key | TTS không có side-effect, quota đủ dùng |
| **Gemini AI** | Key riêng (khuyến nghị) | Tách quota, log, billing |
| **AWS SES** | Cùng key + email interceptor | Interceptor chặn email thật ở code level |

### 6.8. Image Hardening — Loại bỏ npm/yarn/corepack

**Vấn đề:** Trivy báo 11 HIGH vulnerabilities từ `/usr/local/lib/node_modules/npm/` (package managers bundled trong Node.js base image).

**Phân tích:** npm, npx, yarn, corepack không cần thiết trong production runtime — chỉ dùng khi cài dependencies (đã xong ở stage `deps`).

**Giải pháp:** Thêm `RUN rm -rf` trong `runner` stage để loại bỏ:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
           /usr/local/lib/node_modules/corepack /usr/local/bin/corepack
```

**Kết quả:** 11 HIGH → **0 HIGH** từ system packages. Image nhỏ hơn, attack surface giảm.

### 6.9. Dependency Patching — minimatch

**Vấn đề:** Sau khi fix system packages, Trivy vẫn báo 2 HIGH từ `minimatch@10.2.2` (CVE-2026-27903, CVE-2026-27904 — ReDoS).

**Phân tích:** `minimatch` là transitive dependency qua `express-handlebars` → `glob` → `minimatch`. Nằm trong production image.

**Giải pháp:** `npm audit fix` → update lên `minimatch@10.2.3`.

**Kết quả cuối cùng:**
- **0 CRITICAL, 0 HIGH** (sau fix)
- **18 LOW** (fast-xml-parser trong @aws-sdk chain — LOW severity, transitive dep, chờ AWS SDK update)

**Cách xử lý chuyên nghiệp:**
- HIGH/CRITICAL → fix ngay.
- LOW trong transitive deps của SDK lớn → chấp nhận tạm, theo dõi, update khi có fix tương thích.
- Không dùng `npm audit fix --force` (có thể gây breaking changes).

### 6.10. Branch Rulesets

Sử dụng **Branch Rulesets** (cơ chế mới 2023+ của GitHub) thay vì classic branch protection.

**Tại sao Rulesets thay vì Classic?**
- Modern standard: GitHub tập trung phát triển Rulesets, classic không nhận feature mới.
- Explicit bypass list: chọn chính xác ai được bypass.
- Evaluate mode: dry-run trước khi enforce.
- Stackable: nhiều rulesets chồng nhau.
- Organization level: kế thừa từ org → repo.

**Ruleset `production-protection` (nhánh `main`):**

| Rule | Giá trị |
|------|---------|
| Restrict deletions | ✅ |
| Require PR before merging | ✅ |
| Require status checks | ✅ — `Lint & Test` + `Build, Scan & Push` |
| Require up to date | ✅ |
| Block force pushes | ✅ |

**Ruleset `staging-protection` (nhánh `staging`):**

| Rule | Giá trị |
|------|---------|
| Restrict deletions | ✅ |
| Require PR before merging | ✅ (0 approvals) |
| Require status checks | ✅ — `Lint & Test` |
| Require up to date | ✅ |
| Block force pushes | ✅ |

**Logic:** `main` strict hơn (yêu cầu cả build pass) vì merge = deploy production ngay. `staging` nhẹ hơn để dev nhanh.

---

## 7. Phase 4 bổ sung — Cleanup, Tests, PR flow và sự cố

Sau khi Phase 4 ổn định, đã thực hiện thêm: rà soát toàn project, rút gọn code, chuẩn hóa comment tiếng Anh, mở rộng test suite, và xử lý các sự cố liên quan PR / CI / E2E.

### 7.1. Rà soát và tối ưu code (cleanup)

**Mục tiêu:** Code gọn, comment tiếng Anh, xóa thừa, không phức tạp hóa.

| Khu vực | Thay đổi chính |
|--------|-----------------|
| **`.github/workflows/ci-cd.yml`** | Comment tiếng Anh; cú pháp gọn (inline `uses`, `case` thay `if/elif`); gộp bước health check; summary ngắn. |
| **`.github/workflows/e2e-production.yml`** | Tương tự; bỏ comment dài. |
| **`Dockerfile`** | Xóa dòng phân cách dài; giữ 1 comment quan trọng (loại bỏ package managers). |
| **`docker-compose.yml`** | `build: .`; xóa comment tiếng Pháp. |
| **`app/config/env.js`** | Đổi tên thành **`environment.js`** (tránh nhầm với `.env`, tránh bot scan); xóa comment tiếng Việt. |
| **`app/middleware/session.js`** | Comment tiếng Anh; logic gọn. |
| **`app/middleware/index.js`** | Xóa console.log và comment bước; code tự mô tả. |
| **`app/controllers/UserController.js`** | Xóa ~40 comment tiếng Pháp; thêm **import `isProductionLike`** từ `../config/environment` (đã thiếu trước đó). |
| **`public/js/learnVocabs.js`** | Xóa ~80 comment tiếng Pháp; comment tiếng Anh; gọn `speakText`, filter, CSS; sửa 2 empty catch (lint). |
| **`playwright.config.js`** | Comment ngắn; BASE_URL rõ ràng. |
| **`e2e/*.spec.js`** | Comment tiếng Anh; mô tả test ngắn. |

**Bug đã sửa:** `UserController.js` dùng `isProductionLike()` nhưng chưa `require('../config/env')` → thêm import (sau đổi thành `environment`).

### 7.2. app/config/environment.js — Gitignore và đổi tên

- **Sự cố:** File `app/config/env.js` bị liệt trong `.gitignore` → chưa bao giờ commit → CI chạy `npm test` báo `Cannot find module '../config/env'`.
- **Xử lý:** Xóa dòng `/app/config/env.js` khỏi `.gitignore` (đây là source code, không phải secret); commit và push file.
- **Đổi tên:** Theo yêu cầu tránh bot/rủi ro, đổi `env.js` → **`environment.js`**; cập nhật `require` trong `session.js`, `index.js`, `UserController.js`. File chỉ chứa logic (đọc `process.env`), không chứa secret.

### 7.3. Push bị chặn — PR flow

- **Hiện tượng:** Push trực tiếp lên `staging` báo "Can't push refs to remote" hoặc "Repository rule violations: Changes must be made through a pull request".
- **Nguyên nhân:** Branch Rulesets của `staging` (và `main`) bắt buộc thay đổi qua **Pull Request**.
- **Cách làm đúng:**
  1. Tạo nhánh từ `staging`: `git checkout -b cleanup/optimize-code` (hoặc tên khác, tránh trùng `feature` nếu đã có nhánh `feature`).
  2. Commit, push nhánh đó: `git push -u origin cleanup/optimize-code`.
  3. Trên GitHub: **Pull requests** → **New** → base `staging`, compare `cleanup/optimize-code` → **Create pull request**.
  4. Chờ CI (Lint & Test, Build...) pass → **Merge pull request** → **Confirm merge**.
  5. Local: `git checkout staging` → `git pull origin staging`.

**PR là gì:** Pull Request = đề nghị merge code từ nhánh A vào nhánh B; qua đó có review và CI chạy trên code sẽ được merge. **Khi nào chạy job nào:** Workflow trigger bởi `on: push` và `on: pull_request`; từng job có `if:` (ví dụ `github.event_name == 'push' && github.ref == 'refs/heads/staging'`) → chỉ job thỏa điều kiện mới chạy. PR vào `staging` → chạy Lint & Test + Build (không deploy); push trực tiếp lên `staging` sau khi merge → chạy đủ tới Deploy Staging + E2E.

### 7.4. Merge staging → main — Review required

- **Hiện tượng:** PR merge `staging` vào `main` có "All checks have passed" nhưng nút **Merge pull request** bị disabled, "Merging is blocked — At least 1 approving review is required".
- **Nguyên nhân:** Ruleset `production-protection` cho nhánh `main` yêu cầu **ít nhất 1 approving review** từ người có quyền write.
- **Thêm Copilot làm reviewer:** Không thỏa rule — GitHub chỉ tính review từ **user** (người), không tính bot/AI.
- **Cách xử lý:**
  - **Có người khác:** Thêm người có write vào Reviewers → họ Approve → merge được.
  - **Chỉ một mình (admin):** Vào **Settings** → **Rules** → rule của nhánh `main` → sửa "Required pull request reviews": đặt **Required approvals = 0** hoặc bật **Allow specified actors to bypass** và thêm chính mình.

### 7.5. Mở rộng test suite (unit, integration, E2E)

Để align với môi trường staging/production đầy đủ, đã bổ sung test chuyên nghiệp:

| Loại | File mới | Nội dung |
|------|----------|----------|
| **Unit** | `__tests__/unit/environment.test.js` | `isProduction`, `isStaging`, `isDevelopment`, `isProductionLike`, `getBaseUrl` theo NODE_ENV/BASE_URL; dùng `jest.resetModules()` vì module đọc env lúc load. |
| **Unit** | `__tests__/unit/wordController.test.js` | `deleteWord` (404/403/200/500), `editWordPost` (redirect/404/403/thiếu field/success), `deleteAllWords` (redirect/200/500); mock `wordModel`, `learningModel`, `geminiService`. |
| **Unit** | `__tests__/unit/emailVerification.test.js` | `verifyEmail`: token hợp lệ → redirect /login; token invalid → flash error + redirect; DB error → flash error + redirect. |
| **Unit** | `__tests__/unit/resetPassword.test.js` | `forgotPasswordPost`: email không tồn tại / thành công / email gửi fail; `resetPasswordPost`: password không khớp / token không tồn tại / đã dùng / hết hạn / thành công. |
| **Integration** | `__tests__/auth-flow.integration.test.js` | POST /login/forgotPassword (400 khi email không có); GET /login/resetPassword; POST /login/resetPassword (400 mismatch, 400 token invalid); GET /auth/verify/:token (302 /login khi token invalid). |
| **E2E** | `e2e/auth-pages.spec.js` | Forgot password (form + link về login); reset password (form khi có token); login extended (link "Mot de passe oublié?", empty submit); registre extended (avatar selector hiển thị). |

**Kết quả:** Số test tăng từ **73 → 119** (+46). Tất cả comment trong test đều tiếng Anh.

### 7.6. E2E — Avatar selector test fail

- **Lỗi CI:** Test "avatar selector is present" trong `e2e/auth-pages.spec.js` fail: `expect(avatarInputs.first()).toBeVisible()` — "Received: hidden".
- **Nguyên nhân:** Trang registre dùng `<input type="radio" name="avatar">` bị ẩn bằng CSS (chỉ label/hình hiển thị); Playwright coi phần tử là hidden.
- **Cách sửa:** Không assert input visible; assert **container hiển thị** giống `registre.spec.js`: `page.locator('.avatar-selection, .avatars-container').first()` → `toBeVisible()`.

---

## 8. Sự cố và cách xử lý

### 8.1. Railway deploy thành công nhưng app không accessible (Phase 3)

- **Nguyên nhân:** App chỉ đọc `APP_PORT`, không đọc `PORT` (Railway inject).
- **Fix:** `const appPort = process.env.PORT || process.env.APP_PORT || 3000;` + listen `0.0.0.0`.

### 8.2. Trivy-action fail: "couldn't find remote ref" (Phase 4)

- **Nguyên nhân:** `aquasecurity/trivy-action` cố fetch Git refs, fail trong CI environment.
- **Fix:** Thay bằng `docker run aquasec/trivy:latest image ...` với `continue-on-error: true`.

### 8.3. wget Trivy binary 404 (Phase 4)

- **Nguyên nhân:** Dùng wget download Trivy binary từ GitHub Releases → 404.
- **Fix:** Bỏ wget, dùng Docker image thay thế (ổn định hơn).

### 8.4. IMAGE_NAME linter warning (Phase 4)

- **Nguyên nhân:** Dùng `$GITHUB_ENV` để set `IMAGE_NAME` gây linter false-positive.
- **Fix:** Chuyển sang step output (`echo "name=..." >> $GITHUB_OUTPUT`).

### 8.5. Deploy summary không chạy khi health check fail (Phase 4)

- **Nguyên nhân:** Summary step chỉ chạy khi job success.
- **Fix:** Thêm `if: always()` cho summary steps.

### 8.6. deploy-staging environment thiếu URL (Phase 4)

- **Nguyên nhân:** `environment:` block trong `deploy-staging` không có `url`.
- **Fix:** Thêm `url: ${{ vars.STAGING_URL }}`.

### 8.7. 11 HIGH vulnerabilities từ npm system packages (Phase 4)

- **Nguyên nhân:** npm, yarn, corepack bundled trong Node.js base image chứa CVEs.
- **Fix:** `RUN rm -rf` trong Dockerfile runner stage → 0 HIGH.

### 8.8. 2 HIGH từ minimatch (Phase 4)

- **Nguyên nhân:** `minimatch@10.2.2` (transitive dep) có ReDoS vulnerabilities.
- **Fix:** `npm audit fix` → update lên 10.2.3.

### 8.9. Secrets bất đối xứng (Phase 4)

- **Nguyên nhân:** Ban đầu `RAILWAY_TOKEN` production ở Repository secrets, staging ở Environment secrets → bất đối xứng, không Least Privilege.
- **Fix:** Chuyển tất cả về Environment secrets → đối xứng hoàn toàn, repo secrets trống.

### 8.10. CI: Cannot find module '../config/env' (Phase 4 bổ sung)

- **Nguyên nhân:** File `app/config/env.js` bị liệt trong `.gitignore` → chưa commit → CI không có file.
- **Fix:** Xóa `/app/config/env.js` khỏi `.gitignore`; commit và push file. Sau đó đổi tên thành `environment.js` và cập nhật mọi `require`.

### 8.11. E2E: avatar selector toBeVisible() failed (Phase 4 bổ sung)

- **Nguyên nhân:** Input radio avatar bị ẩn bằng CSS; Playwright coi là hidden.
- **Fix:** Assert container hiển thị: `.avatar-selection, .avatars-container` thay vì `input[name="avatar"]`.

---

## 9. Các câu hỏi đã thảo luận

### Phase 1–3

#### GHCR package visibility Public có nguy hiểm không?
- **Public** = mọi người có thể pull; không thể push/xóa.
- An toàn nếu image không chứa secret (đã dùng `.dockerignore` loại `.env`).

#### GHCR có free không?
- Public package: miễn phí storage và bandwidth.
- Private package: có giới hạn (xem GitHub Pricing).

#### Push code thường xuyên → deploy liên tục có hợp lý?
- **Hợp lý:** Deploy nhiều lần/ngày là bình thường trong CI/CD.
- **Thực tế:** Push thường xuyên ở dev/staging; production chỉ deploy khi merge vào `main` qua review.

#### Tab Packages trên GitHub ở đâu?
- Trên **trang profile/user**: `github.com/USERNAME` → tab **Packages** (không phải trên trang repo).

#### Railway internal networking
- Private hostname: `mysql.railway.internal` — chỉ cùng project/environment resolve được.
- DB không cần public; traffic nội bộ bảo mật và ổn định.

### Phase 4

#### Mô hình deploy nào chuyên nghiệp hơn?
- **Mô hình B** (CI build → GHCR → Railway pull image): một image duy nhất, đã test = đã deploy. Đây là chuẩn professional.

#### Railway "Sync" environment có ổn không?
- **Ổn:** Duplicate production → staging là approach đúng. Sync chỉ sync **cấu trúc service** (thêm/xóa service), không ghi đè variables.
- **Lưu ý:** Sau duplicate, phải override variables riêng cho staging (NODE_ENV, SESSION_SECRET, BASE_URL...).

#### Third-party API key cho staging?
- Không cần tạo lại tất cả key mới — tùy từng service.
- Google OAuth: thêm redirect URI → dùng cùng client.
- AWS SES: email interceptor ở code level.
- Gemini: key riêng nếu muốn tách quota.

#### Service ID hay Service Name cho Railway CLI?
- **Service ID (UUID):** Ổn định, không bao giờ đổi, nằm trong secret (ẩn).
- **Service Name:** Có thể bị rename nhầm → pipeline fail.
- **Quyết định:** Dùng Service ID.

#### Branch protection: Classic hay Rulesets?
- **Rulesets:** Modern standard (2023+), GitHub khuyến nghị, explicit bypass, evaluate mode, stackable, future-proof.
- **Classic:** Legacy, không nhận feature mới.
- **Quyết định:** Dùng Rulesets.

---

## 10. Tóm tắt file và đường dẫn quan trọng

| File / Đường dẫn | Vai trò |
|------------------|--------|
| **src/Dockerfile** | Multi-stage, non-root, HEALTHCHECK, loại bỏ npm/yarn/corepack |
| **src/.dockerignore** | Loại .env, node_modules, test...; không đưa secret vào image |
| **src/docker-compose.yml** | App + MySQL; env_file: .env; healthcheck DB; init database.sql |
| **src/.github/workflows/ci-cd.yml** | Pipeline đầy đủ: Lint & Test → Build, Scan & Push → Deploy → Health Check → E2E (cho cả production + staging) |
| **src/app.js** | Port: `process.env.PORT \|\| process.env.APP_PORT \|\| 3000`; listen `0.0.0.0` |
| **src/app/config/environment.js** | Helpers: isProduction, isStaging, isProductionLike, getBaseUrl (dùng cho session, cookie, baseUrl view) |
| **src/app/services/mailersend.js** | Staging email interceptor (`_resolveRecipient`) |
| **src/.env**, **src/.env.example** | Biến môi trường; `.env.example` có `STAGING_EMAIL_INTERCEPT` |
| **docs/DOCKER.md** | Hướng dẫn local, build image, deploy Railway |
| **docs/DOCKER-MODEL-B.md** | Mô hình B: GHCR, Railway Connect Image, secrets, staging setup |
| **docs/BRANCHING-STRATEGY.md** | Chiến lược nhánh, luồng merge, branch rulesets, rollback, concurrency |
| **src/__tests__/unit/environment.test.js** | Unit test cho app/config/environment.js |
| **src/__tests__/unit/wordController.test.js** | Unit test WordController (deleteWord, editWordPost, deleteAllWords) |
| **src/__tests__/auth-flow.integration.test.js** | Integration: forgot password, reset password, email verify routes |
| **src/e2e/auth-pages.spec.js** | E2E: forgot password, reset password, login/registre extended |
| **docs/DOCKER-TONG-HOP-PHASE-1-2-3.md** | Tổng hợp Phase 1–3 |
| **docs/DOCKER-PHASE2-TEST.md** | Checklist test Phase 2 |
| **docs/DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md** | Init DB, healthcheck, lỗi ECONNREFUSED |

---

## 11. Kết luận

### Đến hết Phase 4, project đã có:

**Infrastructure:**
- Docker Compose cho local dev (app + MySQL, init DB, healthcheck).
- Dockerfile multi-stage, non-root, image hardened (0 HIGH/CRITICAL vulnerabilities).
- `.dockerignore` chặt chẽ, không secret trong image.

**CI/CD Pipeline:**
- Lint, Test, Format Check trên mọi nhánh.
- Docker image build với GHA layer caching.
- Trivy vulnerability scan (CRITICAL + HIGH) trên image pushed.
- Push GHCR với tags thông minh (`:latest`, `:staging`, `:sha-xxx`).
- Deploy tự động qua Railway CLI (production + staging).
- Post-deploy health check (5 retries, 15s interval).
- E2E tests (Playwright) sau deploy thành công.
- Two-tier concurrency control (workflow + job level).
- Job summary trên GitHub Actions UI.

**Multi-environment:**
- 4 nhánh: `feature/xxx` → `dev` → `staging` → `main`.
- GitHub Environments (`production` + `staging`) với secrets đối xứng.
- Railway staging (duplicate từ production) với variables override.
- Email interceptor cho staging.
- Third-party APIs cấu hình phù hợp.

**Security:**
- Secrets Least Privilege: repo secrets trống, mọi secret scoped vào environment.
- Image hardening: loại bỏ npm/yarn/corepack.
- Dependency patching: npm audit fix cho minimatch.
- Branch Rulesets: bảo vệ `main` và `staging`.
- GHCR package visibility quản lý đúng.

**Documentation:**
- Tài liệu đầy đủ cho mọi phase, mọi quyết định, mọi sự cố và cách xử lý.

**Phase 4 bổ sung (sau khi pipeline ổn định):**
- Cleanup toàn project: comment tiếng Anh, code gọn, xóa thừa; đổi `env.js` → `environment.js`; sửa bug thiếu import trong UserController.
- Quy trình PR: không push thẳng staging/main; tạo nhánh → push → PR → CI pass → Merge; giải thích khi nào workflow chạy job nào.
- Merge staging → main: rule "Required review" → cần 1 người approve (Copilot không tính); một mình thì sửa rule (0 approval hoặc bypass).
- Test suite: 119 tests (unit: environment, WordController, EmailVerification, ResetPassword; integration: auth-flow; E2E: auth-pages); sửa E2E avatar selector (assert container visible thay vì input ẩn).

### Đánh giá level

| Phase | Level tương ứng |
|-------|----------------|
| Phase 1 (Dockerfile) | Junior → Mid |
| Phase 2 (Compose) | Mid |
| Phase 3 (CI/CD cơ bản + Model B) | Mid → Senior |
| **Phase 4 (CI/CD nâng cao + Multi-env)** | **Senior → Staff** |

Toàn bộ đáp ứng yêu cầu **chuẩn hóa môi trường chạy và deploy** cho kỹ năng Docker fullstack ở mức **nâng cao chuyên nghiệp**, phù hợp với thực tế triển khai tại các công ty.
