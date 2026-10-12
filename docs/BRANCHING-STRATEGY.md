# Chiến lược nhánh — feature / dev / staging / main

Tài liệu mô tả cách sử dụng các nhánh và luồng merge cho dự án, phù hợp với pipeline CI/CD (Docker + GHCR + Railway).

---

## 1. Bốn nhánh chính

| Nhánh | Vai trò | Deploy? | Image tag GHCR |
|-------|---------|---------|----------------|
| **feature/xxx** | Phát triển tính năng mới hoặc fix bug; mỗi task một nhánh. | Không deploy | Không push image |
| **dev** | Tích hợp: merge nhiều feature vào đây để test tổng hợp. | Không deploy (chỉ CI: lint + test + validate Dockerfile) | Không push image |
| **staging** | Pre-production: test cuối cùng trước khi lên production; gần giống production. | Deploy lên **service Staging** (Railway) | `:staging`, `:sha-xxx` |
| **main** | Production: code ổn định, đã qua staging. | Deploy lên **service Production** (Railway) | `:latest`, `:sha-xxx` |

---

## 2. Luồng merge

```
feature/xxx  →  dev  →  staging  →  main
     │            │          │          │
     │         tích hợp   test cuối  production
     │         lint+test   deploy     deploy
     │         build       Staging    Production
     │         (no push)   + E2E      + E2E
```

### Chi tiết

1. **feature/xxx → dev** (PR hoặc merge)
   - Dev tạo nhánh `feature/xxx` từ `dev`.
   - Khi xong, mở PR vào `dev` (hoặc merge trực tiếp nếu cá nhân).
   - CI chạy: lint + test.

2. **dev → staging** (PR, nên có review)
   - Khi các feature trên `dev` đã ổn, mở PR `dev → staging`.
   - CI chạy: lint + test + build image.
   - Sau khi merge: CI build image tag `:staging` → push GHCR → deploy service Staging → E2E staging.

3. **staging → main** (PR, bắt buộc review + approve)
   - Khi staging đã test xong (E2E xanh, demo ổn), mở PR `staging → main`.
   - CI chạy: lint + test + build image.
   - Sau khi merge: CI build image tag `:latest` → push GHCR → deploy service Production → E2E production.

---

## 3. Quy tắc

- **Không push trực tiếp vào `main`**: luôn qua PR từ `staging`, có review.
- **Không push trực tiếp vào `staging`** (khuyến nghị): qua PR từ `dev`.
- **`dev`**: có thể push trực tiếp hoặc qua PR từ feature (tùy team).
- **`feature/xxx`**: tên rõ ràng (vd. `feature/add-dark-mode`, `fix/login-redirect`).

---

## 4. Branch protection (Rulesets)

Sử dụng **Branch Rulesets** (cơ chế mới của GitHub, thay thế classic branch protection) — future-proof, linh hoạt hơn, explicit bypass control.

### Ruleset `production-protection` (nhánh `main`)

| Rule | Giá trị |
|------|---------|
| Enforcement | **Active** |
| Target | `main` |
| Restrict deletions | ✅ |
| Require a pull request before merging | ✅ (1 approval nếu team > 1) |
| Require status checks to pass | ✅ — **`Lint & Test`** + **`Build, Scan & Push`** |
| Require branches to be up to date | ✅ |
| Block force pushes | ✅ |

### Ruleset `staging-protection` (nhánh `staging`)

| Rule | Giá trị |
|------|---------|
| Enforcement | **Active** |
| Target | `staging` |
| Restrict deletions | ✅ |
| Require a pull request before merging | ✅ (0 approvals — staging nhẹ hơn) |
| Require status checks to pass | ✅ — **`Lint & Test`** |
| Require branches to be up to date | ✅ |
| Block force pushes | ✅ |

### Cách cấu hình

GitHub → Repo → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**.

### Tại sao Rulesets thay vì Classic?

- **Modern standard** (2023+): GitHub tập trung phát triển Rulesets, classic không nhận feature mới.
- **Explicit bypass list**: chọn chính xác ai được bypass (classic thì admin bypass mặc định).
- **Evaluate mode**: dry-run trước khi enforce — hữu ích khi thay đổi rules.
- **Stackable**: nhiều rulesets chồng nhau cho cùng nhánh.
- **Organization level**: kế thừa từ org → repo khi team mở rộng.

---

## 5. Rollback

### Khi deploy production hoặc staging bị lỗi

1. Vào **Railway** → Project → Service (Production hoặc Staging).
2. Tab **Deployments** → tìm **deployment trước** (bản ổn định cuối).
3. Click **⋮** (menu) → **Redeploy** (hoặc **Rollback** nếu Railway hỗ trợ).
4. Service sẽ chạy lại bản cũ; kiểm tra lại URL.

### Nếu cần rollback code

- **Revert PR** trên GitHub (PR đã merge gây lỗi) → merge revert → CI tự build + deploy bản mới (không có lỗi).
- Hoặc `git revert <commit>` → push lên nhánh tương ứng.

---

## 6. Tóm tắt CI/CD theo nhánh

| Sự kiện | Lint & Test | Build + Trivy scan | Push GHCR | Deploy | Health check | E2E |
|---------|-------------|-------------------|-----------|--------|-------------|-----|
| Push **feature/xxx** | ✅ | ✅ (validate + scan) | ❌ | ❌ | ❌ | ❌ |
| Push **dev** | ✅ | ✅ (validate + scan) | ❌ | ❌ | ❌ | ❌ |
| Push **staging** | ✅ | ✅ | ✅ (`:staging`) | Staging | ✅ | Staging |
| Push **main** | ✅ | ✅ | ✅ (`:latest`) | Production | ✅ | Production |
| PR (bất kỳ) | ✅ | ✅ (validate + scan) | ❌ | ❌ | ❌ | ❌ |

---

## 7. Yếu tố chuyên nghiệp trong pipeline

### 7.1. GitHub Environments

Deploy jobs dùng **GitHub Environments** (`production`, `staging`):
- Hiển thị deployment history trên GitHub (tab Deployments trong repo).
- Có thể cấu hình **protection rules**: required reviewers, wait timer.
- URL environment hiển thị trên GitHub UI.
- **Environment secrets** chỉ accessible trong job có khai báo `environment: xxx` → Least Privilege.

**Cách cấu hình:** GitHub → Repo → **Settings** → **Environments** → **New environment**:
- Tạo `production`: restrict branches = `main`; thêm required reviewers (nếu team > 1); thêm **Environment secret** `RAILWAY_SERVICE_ID`.
- Tạo `staging`: restrict branches = `staging`; thêm **Environment secret** `RAILWAY_STAGING_SERVICE_ID`.

**Phân cấp Secrets / Variables — Least Privilege + đối xứng hoàn toàn:**

| Nơi lưu | Key | Accessible từ | Giải thích |
|---------|-----|---------------|-----------|
| Environment secret `production` | `RAILWAY_TOKEN` | Chỉ `deploy-production` | Railway token scoped production |
| Environment secret `production` | `RAILWAY_SERVICE_ID` | Chỉ `deploy-production` | Service ID production (UUID, không bao giờ đổi) |
| Environment secret `staging` | `RAILWAY_TOKEN` | Chỉ `deploy-staging` | Railway token scoped staging |
| Environment secret `staging` | `RAILWAY_SERVICE_ID` | Chỉ `deploy-staging` | Service ID staging (UUID, không bao giờ đổi) |
| Repository variable | `STAGING_URL` | Mọi job | URL public staging, không nhạy cảm |

**Repository secrets: TRỐNG.** Không có secret nào ở repo level.

**Tại sao Service ID thay vì Service Name?** UUID cố định — service name có thể bị rename nhầm → pipeline fail. Service ID nằm trong secret (ẩn) nên không cần readable.

**Cùng tên secret cho cả 2 environment:** `secrets.RAILWAY_TOKEN` và `secrets.RAILWAY_SERVICE_ID` → GitHub tự resolve đúng giá trị dựa vào `environment:` mà job khai báo. Workflow code giống hệt nhau cho cả 2 deploy job.

### 7.2. Trivy image scan (bảo mật)

Trivy chỉ chạy khi image đã được **push vào GHCR** (staging hoặc main):
- Lý do: khi `push=false` (feature/dev/PR), image không có trong GHCR → Trivy không thể pull để scan.
- Auth GHCR được truyền qua `TRIVY_USERNAME` / `TRIVY_PASSWORD` → hoạt động với cả package private.
- Hiện tại: `exit-code: 0` (chỉ cảnh báo, không fail pipeline). Khi quen, có thể đổi sang `exit-code: 1` để **chặn** push image nếu có lỗ hổng critical.
- Kết quả hiển thị trong log của job.

### 7.3. Docker layer caching (tốc độ)

Build dùng **GitHub Actions cache** (`cache-from: type=gha`, `cache-to: type=gha,mode=max`):
- Lần build đầu: cache trống, build đầy đủ.
- Lần sau: Docker reuse layers đã cache → build **nhanh hơn đáng kể** (vd. từ 2-3 phút xuống 30-60 giây nếu chỉ thay đổi code, không đổi dependencies).

### 7.4. Health check sau deploy

Sau khi trigger redeploy, pipeline **đợi 30 giây** rồi gọi `/health` (tối đa 5 lần, mỗi lần cách 15 giây):
- HTTP 200 → deploy thành công, tiếp tục E2E.
- Sau 5 lần vẫn không 200 → pipeline **fail** → biết ngay deploy có vấn đề.

### 7.5. Concurrency — hai tầng

**Tầng 1 — Workflow level:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' && github.ref != 'refs/heads/master' && github.ref != 'refs/heads/staging' }}
```
- feature/dev/PR: cancel run cũ khi có push mới → tiết kiệm runner minutes.
- staging/main: KHÔNG cancel (tránh interrupt deploy job đang chạy).

**Tầng 2 — Job level (deploy jobs):**
```yaml
concurrency:
  group: deploy-production   # hoặc deploy-staging
  cancel-in-progress: false
```
- Không cho 2 deploy chạy đồng thời trên cùng environment.
- Không hủy deploy đang chạy (xếp hàng thay thế).

### 7.6. Job Summary (GitHub Step Summary)

Mỗi job ghi **summary** vào `$GITHUB_STEP_SUMMARY`: image tag, URL, kết quả health check, E2E result → dễ đọc trên GitHub Actions UI mà không cần mở log. Summary steps dùng `if: always()` để luôn chạy kể cả khi job fail.

### 7.7. Workflows bổ sung (optional)

| Workflow | Trigger | Mục đích |
|----------|---------|----------|
| **E2E Production** | `workflow_dispatch` (và có thể bật `schedule`) | Smoke test production on-demand hoặc theo lịch (vd 6h UTC). Khác với E2E trong CI/CD (chạy sau mỗi deploy main). |
| **Nightly / Integration** | Không có trong repo | Nếu cần chạy integration test với DB (dùng secrets TEST_MYSQL_*, v.v.), tạo workflow mới với `workflow_dispatch` và inject secrets trong job env. Tham khảo cách trong ci-cd.yml (lint-and-test) + thêm env từ secrets. |

### 7.8. App code align với staging / production

Để staging và production hoạt động đúng, app dùng:

- **`app/config/env.js`** — helper `isProductionLike()` (production + staging): cookie secure, trust proxy, session secret rotation. Helper `getBaseUrl()` cho BASE_URL.
- **Session & cookie** — `secure: true` và `trust proxy` khi `NODE_ENV === 'staging'` hoặc `production` (Railway staging cũng chạy HTTPS).
- **Frontend** — không hardcode domain. `res.locals.baseUrl` (từ middleware) → view inject `window.APP_BASE_URL` → script (vd. learnVocabs.js) dùng cho copy URL, link, badge (staging hiển thị host staging).
- **E2E** — `BASE_URL` set trong CI theo nhánh (production URL hoặc `vars.STAGING_URL`). Xem `playwright.config.js` và docs/E2E_PLAYWRIGHT.md.
