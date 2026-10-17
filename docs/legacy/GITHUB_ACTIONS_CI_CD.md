# GitHub Actions – CI/CD (kỹ năng Fullstack)

Hướng dẫn **logic, đầy đủ và tối ưu** để thiết lập CI/CD với GitHub Actions và deploy lên **Railway**, phù hợp với project **Sealvo** (repo `dhuy21/Sealvo`, domain `www.sealvo.it.com`).

**Học từ cơ bản đến nâng cao + validate kỹ năng:** [SKILL_CI_CD_FULLSTACK.md](./SKILL_CI_CD_FULLSTACK.md) — khái niệm CI/CD, cấu trúc workflow, pipeline strategy, env trong CI, pre-commit vs CI, trình tự hoàn thành và checklist bằng chứng (portfolio / phỏng vấn).

---

## 1. CI vs CD – Tổng quan

| Khái niệm | Ý nghĩa | Trong project này |
|-----------|---------|-------------------|
| **CI (Continuous Integration)** | Mỗi push/PR → chạy **lint + test** trên GitHub. Nếu fail → biết ngay, không merge/deploy code lỗi. | Workflow `ci-cd.yml`: job `lint-and-test` (checkout, Node 20, `npm ci`, lint, format check, test). |
| **CD (Continuous Deployment)** | Sau khi CI **pass** (và thường chỉ trên nhánh `main`) → **tự động deploy** lên môi trường chạy (Railway). | **Cách 1:** Deploy trong workflow (Railway CLI) — job Deploy chạy `railway up --ci`, đồng bộ. **Cách 2:** Railway bật **Wait for CI** → Railway tự deploy khi CI pass. |

**Luồng thực tế:**

```
Push/PR → GitHub Actions (lint + test) → Thành công
                                              ↓
         (chỉ trên push main) → Railway chờ CI xong → Build & Deploy → www.sealvo.it.com
```

---

## 2. Cấu hình phù hợp với giao diện Railway của bạn

Ánh xạ nhanh từ **Railway UI** sang cách dùng đúng:

| Mục trên Railway | Gợi ý / Giá trị hợp lý |
|------------------|-------------------------|
| **Source Repo** | `dhuy21/Sealvo` – đúng repo. |
| **Branch** | `main` – nhánh production. |
| **Wait for CI** | **Tắt** nếu dùng Deploy trong workflow (Railway CLI). **Bật** nếu muốn Railway tự deploy khi CI pass (không dùng CLI trong workflow). |
| **Root Directory** | Nếu toàn bộ code app (package.json, app.js) nằm ở **thư mục gốc** của repo → để trống. Nếu app nằm trong thư mục con (vd `src/`) → đặt **Root Directory** = `src` (hoặc đường dẫn tương ứng). |
| **Builder** | Nixpacks hoặc **Metal** (Railway khuyến nghị Metal). |
| **Build Command** | Để trống → Nixpacks/Node mặc định chạy `npm install` (hoặc `npm ci` nếu có lockfile). Có thể ghi rõ: `npm ci`. |
| **Start Command** | Để trống → thường chạy `npm start` (= `node app.js`). Đúng với `package.json` hiện tại. |
| **Healthcheck Path** | Nên đặt **`/health`** – app có route GET trả về 200 (xem mục 5). Nếu chưa có thì để trống hoặc dùng `/` tạm. |
| **Restart Policy** | On Failure, max retries 10 – hợp lý. |

---

## 3. Bật “Wait for CI” trên Railway (bước quan trọng)

1. Vào **Railway** → Project → Service **web_vocab_v0**.
2. Phần **Source** (hoặc **Deploy**), tìm mục **“Wait for CI”**.
3. **Bật** (Enable) **“Trigger deployments after all GitHub actions have completed successfully”**.

**Kết quả:**

- Railway **không** deploy ngay khi có push.
- Railway **chờ** đến khi **GitHub Actions** của repo (workflow `CI/CD`) chạy xong và **thành công**.
- Chỉ khi status check “CI/CD” (hoặc tên job tương ứng) **pass** → Railway mới build và deploy.

**Lợi ích:** Code chỉ lên production khi đã qua lint + test, tránh deploy bản broken.

---

## 4. Đảm bảo workflow và branch khớp với Railway

- **File workflow:** `src/.github/workflows/ci-cd.yml` (trong repo Sealvo; nếu repo root là `src/` thì file là `.github/workflows/ci-cd.yml`).
- **Tên workflow:** `name: CI/CD` → trên GitHub sẽ hiện check tên **“CI/CD”**.
- **Kích hoạt:** `on.push.branches: [main, master]` và `on.pull_request` cùng branches → mỗi push/PR vào `main` (hoặc `master`) đều chạy CI.

**Cần đảm bảo:**

1. **Branch production:** Railway đang connect nhánh **main** → workflow phải chạy trên **main** (đã đúng).
2. **Required status check (nên dùng):**  
   Repo GitHub → **Settings** → **Branches** → **Branch protection rules** cho `main`:
   - Bật **“Require status checks to pass before merging”**.
   - Chọn status check **“lint-and-test”** hoặc **“CI/CD”** (tùy tên GitHub hiển thị).
   - (Tùy chọn) Bật **“Require branches to be up to date before merging”**.

Như vậy: merge vào `main` chỉ khi CI xanh → Railway cũng chỉ deploy khi CI xanh (vì đã bật Wait for CI).

---

## 5. Healthcheck trên Railway (nên dùng)

Trong **Deploy** → **Healthcheck Path** trên Railway, nên điền **`/health`**.

App đã có route **GET /health** trả về `200` + `{ "ok": true }` (không cần auth), định nghĩa trong `appFactory.js`. Railway sẽ gọi endpoint này sau khi deploy để xác nhận instance mới sống; nếu fail, deploy có thể bị đánh dấu lỗi hoặc rollback tùy cấu hình.

---

## 6. Biến môi trường (Railway Variables)

Trên Railway → Service → **Variables**, đảm bảo có ít nhất:

- `NODE_ENV=production`
- `PORT` (Railway thường gán sẵn)
- `SESSION_SECRET` (bắt buộc, session + cookie secure)
- DB: `MYSQLHOST`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQLPORT`
- Các biến khác app cần (email, API keys, …)

App đã dùng `trust proxy` khi `NODE_ENV=production` để cookie/session hoạt động đúng qua HTTPS.

---

## 7. Deploy trong workflow (Railway CLI) – đồng bộ

Workflow hiện tại có thể deploy **trong** job Deploy bằng **Railway CLI**: job chỉ xong khi `railway up --ci` hoàn tất → **đồng bộ** với deploy thật.

**Bạn cần:**

1. **Tắt "Wait for CI"** trên Railway (Source) — nếu không, Railway sẽ deploy thêm lần nữa khi CI pass (trùng).
2. **Tạo Project Token:** Railway → Project → **Settings** → **Tokens** → **Generate Project Token**. Copy token.
3. **Thêm GitHub Secret:** Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - **Name:** `RAILWAY_TOKEN`
   - **Value:** token vừa copy (Project Token, không phải Account Token).
4. **(Tùy chọn)** Nếu project có **nhiều service**, thêm secret **`RAILWAY_SERVICE_ID`** = tên service (vd. `web_vocab_v0`). Nếu chỉ một service thì bỏ qua.

**Kết quả:** Mỗi push `main` → lint + test pass → job **Deploy (Railway CLI)** chạy → `railway up --ci` đẩy code lên Railway và **đợi** deploy xong → workflow mới báo Success. Đồng bộ hoàn toàn.

**Nếu không set `RAILWAY_TOKEN`:** Job deploy vẫn chạy nhưng bỏ qua bước deploy (exit 0), không lỗi.

---

## 7a. Chỉ deploy bằng workflow – tránh hai deployment (via GitHub + via CLI)

**Mục tiêu:** Chỉ giữ **một** nguồn deploy = job Deploy trong workflow (Railway CLI). Tránh tình trạng mỗi push tạo **hai** deployment trên Railway (một do Railway kết nối GitHub, một do `railway up --ci`).

**Cách làm trên Railway (bắt buộc):**

1. Vào **Railway Dashboard** → Project → Service (vd. **web_vocab_v0**).
2. Mở **Settings** của service.
3. Phần **Source** (hoặc **Git** / kết nối GitHub), tìm nút **Disconnect** (ngắt kết nối repo/branch với service).
4. Bấm **Disconnect**.

**Kết quả:**

- Railway **không còn** tự deploy khi có push hoặc khi CI pass.
- Mỗi push `main` chỉ tạo **một** deployment: do workflow chạy `railway up --ci` (job Deploy).
- Workflow CI/CD thể hiện đầy đủ kỹ năng: lint, test, **và** deploy trong cùng pipeline.

**Lưu ý:** Sau khi Disconnect, deploy chỉ có thể qua:
- **GitHub Actions** (job Deploy với `RAILWAY_TOKEN`), hoặc
- Railway Dashboard: Command Palette (**Cmd/Ctrl + K**) → **"Deploy Latest Commit"**, hoặc
- Railway CLI local: `railway up`.

*Nguồn: [Railway – Controlling GitHub Autodeploys](https://docs.railway.com/guides/github-autodeploys) (Disable automatic deployments → Disconnect).*

---

## 7b. Deploy hook (DEPLOY_HOOK_URL) – khi nào cần?

- **Đang dùng Deploy trong workflow (Railway CLI):** Không dùng deploy hook.
- **Đang dùng “Wait for CI” trên Railway:** **Không cần** `DEPLOY_HOOK_URL`. Railway tự deploy khi CI pass.
- **Dùng deploy hook (Render, v.v.):** Một số nền tảng dùng “Build hook URL”; thêm secret **`DEPLOY_HOOK_URL`** và job deploy gọi `curl -X POST "${{ secrets.DEPLOY_HOOK_URL }}"`.

---

## 8. Bất đồng bộ workflow "Deploy" vs Railway deploy – và giải pháp

**Hiện tượng:** Workflow "CI/CD" báo Success (job Deploy ✓) trong khi Railway vẫn đang Building/Deploying.

**Nguyên nhân:** Job "Deploy" trong `ci-cd.yml` chỉ là deploy hook (tùy chọn), **không** phải lệnh deploy Railway. Railway chỉ **bắt đầu** build/deploy **sau khi** workflow run đã kết thúc (CI pass). Nên workflow xong **trước**, Railway xong **sau** vài phút — bất đồng bộ là đúng với thiết kế.

**Giải pháp đã triển khai:**

1. **Chấp nhận hai giai đoạn:** Workflow = "code đủ điều kiện deploy"; trạng thái deploy thật xem trên **Railway Dashboard**.
2. **E2E sau deploy:** E2E chạy **trong cùng pipeline** `ci-cd.yml`: job **E2E (production)** với `needs: deploy`, chỉ trên push main/master. Mỗi lần deploy xong → E2E chạy tự động against production. Ngoài ra có workflow **E2E Production** (manual hoặc schedule) khi muốn smoke không qua deploy.

**Chi tiết kỹ thuật và cách dùng:** [CI_RAILWAY_DESYNC.md](./CI_RAILWAY_DESYNC.md).

---

## 8a. Log deploy – đọc log và lưu ý

Khi xem log job **Deploy** trong Actions (và build trên Railway), có thể gặp các điểm sau. Phần lớn **không chặn** deploy nếu cuối log có **Deploy complete** và healthcheck pass.

| Hiện tượng trong log | Ý nghĩa / Cần làm |
|----------------------|--------------------|
| **Node version mismatch** | CI dùng Node 20, Railway (Nixpacks) mặc định có thể dùng Node 18 → nhiều `EBADENGINE` (package yêu cầu Node ≥20). **Cách xử lý:** Thêm `"engines": { "node": ">=20" }` trong `package.json` để Nixpacks dùng Node 20. |
| **npm deprecated** (crypto, glob, inflight, …) | Một số dependency (hoặc transitive) đã deprecated. Nên dần thay/thêm bản mới; không chặn build. Gợi ý: bỏ dependency `crypto` (npm) nếu code dùng built-in `require('crypto')`. |
| **29 vulnerabilities** (npm audit) | Chạy `npm audit` rồi `npm audit fix` (hoặc fix thủ công với `--force` nếu có breaking change). Nên xử lý ít nhất mức critical/high. |
| **.git can't be found** (trong bước prepare/husky) | Build trên Railway không có thư mục `.git` → husky báo vậy. **Đã xử lý:** script `prepare` chỉ chạy husky khi tồn tại `.git` (môi trường deploy bỏ qua). |
| **Successfully Built! / Deploy complete** | Build và deploy thành công; healthcheck (vd. `/health`) pass → **ổn**. |

Sau khi chỉnh `engines.node` và bỏ `crypto` (npm), push lại để log build Railway sạch hơn (ít cảnh báo, đúng Node 20).

---

## 9. Tóm tắt checklist (Fullstack – CI/CD)

- [ ] Repo GitHub: `dhuy21/Sealvo`, branch production: `main`.
- [ ] Workflow CI: `.github/workflows/ci-cd.yml` — job **Lint & Test**; job **Deploy** (Railway CLI) chỉ trên push `main`/`master`; job **E2E (production)** chạy sau deploy (cùng điều kiện); concurrency và timeout đã bật.
- [ ] Railway: Connect repo, branch `main`, **Root Directory** đúng (trống hoặc `src`) — **hoặc** nếu **chỉ deploy bằng workflow:** Railway → Service Settings → Source → **Disconnect** (tránh hai deployment); xem §7a.
- [ ] Railway: **Wait for CI** bật nếu Railway tự deploy; **tắt / Disconnect** nếu chỉ dùng deploy trong workflow (Railway CLI).
- [ ] Railway: **Healthcheck Path** = `/health` (sau khi app có route này).
- [ ] Railway: **Variables** đủ (NODE_ENV, PORT, SESSION_SECRET, DB_*).
- [ ] (Khuyến nghị) Branch protection cho `main`: require status check “CI/CD” hoặc “lint-and-test” trước khi merge.
- [ ] (Nâng cao) Workflow mẫu `nightly.example.yml`: chạy tay với Secrets khi cần test DB/API thật; xem [SKILL_CI_CD_FULLSTACK.md](./SKILL_CI_CD_FULLSTACK.md) mục 2.7.

Khi đó luồng **push → CI (lint, test) → pass → Railway deploy** sẽ chạy ổn định và phù hợp thực tế cho kỹ năng Fullstack (GitHub Actions + CI/CD).

---

## 10. Tài liệu liên quan

- **Kỹ năng CI/CD (cơ bản → nâng cao + validate):** [SKILL_CI_CD_FULLSTACK.md](./SKILL_CI_CD_FULLSTACK.md)
- **CI (chi tiết workflow):** [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)
- **CD (các cách deploy, Railway, deploy hook):** [CD_DEPLOY.md](./CD_DEPLOY.md)
- **Bất đồng bộ workflow Deploy vs Railway + giải pháp Post-Deploy:** [CI_RAILWAY_DESYNC.md](./CI_RAILWAY_DESYNC.md)
- **Chi tiết những gì đã xử lý trong repo (package.json, docs):** [CI_CD_DA_XU_LY_TRONG_REPO.md](./CI_CD_DA_XU_LY_TRONG_REPO.md)

---

## 11. Kiểm tra / Validate – CI/CD hoạt động đúng (chứng minh kỹ năng Fullstack)

Làm lần lượt các bước dưới để **xác nhận** CI chạy đúng, CD chỉ deploy khi CI pass, và có “bằng chứng” cho kỹ năng Fullstack.

### 11.1. Kiểm tra CI chạy khi push/PR

1. **Push lên `main`** (hoặc mở PR vào `main`) với một thay đổi nhỏ (vd: sửa README, thêm comment).
2. Vào GitHub repo → tab **Actions**.
3. **Kỳ vọng:** Xuất hiện run workflow **“CI/CD”**, job **“lint-and-test”** chạy (Checkout → Setup Node → Install → Lint → Format check → Test). Sau vài phút trạng thái **Success** (dấu ✓).
4. **Chứng minh kỹ năng:** Commit trên `main` có dấu ✓ bên cạnh (status check “CI/CD” pass). Có thể chụp màn hình tab Actions hoặc commit để đưa vào portfolio.

### 11.2. Kiểm tra “CI fail → Railway không deploy” (Wait for CI đang bật)

Mục đích: Chứng minh **code lỗi không lên production** vì Railway chờ CI pass.

1. **Tạm làm cho CI fail:** Trong code, thêm một lỗi lint (vd: file `.js` bất kỳ thêm dòng `const x = ;` hoặc tắt rule tạm) hoặc làm cho **một test fail** (vd: trong file test, `expect(1).toBe(2)`).
2. **Commit + push lên `main`**.
3. Vào **Actions** → run mới của “CI/CD” → **Kỳ vọng:** job **lint-and-test** **Failed** (dấu ✗).
4. Vào **Railway** → Service → **Deployments**: **Kỳ vọng:** Không có deployment mới được trigger (hoặc deployment ở trạng thái “Skipped” / “Waiting for CI” tùy Railway). Nghĩa là **Wait for CI** đang hoạt động: CI đỏ → không deploy.
5. **Revert** thay đổi (sửa lại code, push) để CI xanh trở lại. Có thể dùng `git revert HEAD` rồi push.

### 11.3. Kiểm tra “CI pass → Railway deploy”

1. Đảm bảo code hiện tại **pass CI** (Actions → run gần nhất “CI/CD” ✓).
2. **Push một thay đổi nhỏ lên `main`** (vd: cập nhật comment trong code hoặc README).
3. **Kỳ vọng:**
   - **GitHub Actions:** Run “CI/CD” **Success** (lint-and-test ✓, deploy ✓ hoặc “skip” nếu không có DEPLOY_HOOK_URL).
   - **Railway:** Trong **Deployments** xuất hiện deployment mới, trạng thái **Success** (sau khi CI pass). Build log không lỗi.
4. **Kiểm tra production:** Mở `https://www.sealvo.it.com` (và nếu đã cấu hình) `https://www.sealvo.it.com/health` → **Kỳ vọng:** Trang load, `/health` trả về `{"ok":true}`. Như vậy CD đã đưa bản mới lên và app sống.

### 11.4. Checklist “bằng chứng” kỹ năng Fullstack (CI/CD)

| Bằng chứng | Cách lấy |
|------------|----------|
| CI chạy trên mỗi push/PR | Link tới tab **Actions** của repo (vd: `https://github.com/dhuy21/Sealvo/actions`) hoặc ảnh chụp run “CI/CD” Success. |
| CD chỉ deploy khi CI pass | Mô tả ngắn: “Railway bật Wait for CI; đã thử push code fail lint/test → không có deploy mới.” Có thể kèm ảnh Deployment trên Railway. |
| Production đang chạy | Link **www.sealvo.it.com** và (nếu có) **www.sealvo.it.com/health** trả về 200. |
| Workflow as code | Link file **.github/workflows/ci-cd.yml** trên GitHub (lint, test, concurrency, deploy hook tùy chọn). |

Khi hoàn thành 11.1–11.3 và có 11.4, bạn đã **validate** đúng yêu cầu CI/CD và có căn cứ để chứng minh kỹ năng Fullstack (GitHub Actions + Railway).
