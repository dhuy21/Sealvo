# Báo cáo validate: Kỹ năng E2E (Playwright) + CI/CD cho dev fullstack

Đánh giá nghiêm túc xem project **Sealvo** đã đáp ứng và chứng minh được kỹ năng **Playwright (hoặc Cypress) – 1–2 kịch bản E2E** và **CI/CD logic, phù hợp thực tế** cho dev fullstack hay chưa.

---

## 1. Yêu cầu kỹ năng cần validate

| Kỹ năng | Yêu cầu tối thiểu (fullstack) |
|--------|-------------------------------|
| **E2E** | Playwright hoặc Cypress – **ít nhất 1–2 kịch bản** E2E (smoke, login, v.v.) |
| **CI/CD** | Pipeline rõ ràng: lint, test, deploy; E2E tích hợp hợp lý (sau deploy hoặc job riêng) |

---

## 2. Đánh giá E2E – Playwright

### 2.1. Số lượng kịch bản và test

| Tiêu chí | Yêu cầu | Trong repo | Đạt? |
|----------|---------|------------|------|
| Số kịch bản | 1–2 | **2** (smoke, login) | ✅ |
| Số test | Đủ để chứng minh | **7 tests** (3 smoke + 4 login) | ✅ |
| Công cụ | Playwright hoặc Cypress | **Playwright** (`@playwright/test`) | ✅ |

- **Kịch bản 1 – Smoke** (`e2e/smoke.spec.js`): homepage load, branding SEALVO, CTA Get Started/Login; click Get Started → /login; /login render form + link S'inscrire.
- **Kịch bản 2 – Login flow** (`e2e/login.spec.js`): form có đủ ô username/password/submit/liens; submit sai credential → còn ở /login + có .alert; link S'inscrire → /registre; link Mot de passe oublié → forgotPassword.

### 2.2. Chất lượng kịch bản

| Khía cạnh | Đánh giá |
|-----------|----------|
| **Locators** | Dùng `getByRole`, `locator('input[name="..."]')`, `.alert` — ổn định, tránh class CSS tùy ý. |
| **Assertions** | `toBeVisible()`, `toHaveTitle()`, `toHaveURL()`, `toHaveText()`, `not.toBeEmpty()` — đúng hành vi người dùng. |
| **Wrong credentials** | Dùng user giả `e2e_invalid_user_xyz_9999` → không cần mock DB; test hành vi thật (redirect + flash). |
| **Config** | `playwright.config.js`: baseURL từ env, timeout 30s, retries 1, screenshot/video/trace on failure, 1 project Chromium. |

**Kết luận E2E:** Đủ và đúng chuẩn **1–2 kịch bản E2E** cho fullstack; có thể dùng làm bằng chứng (portfolio / phỏng vấn).

### 2.3. Điểm chưa làm (không bắt buộc cho “1–2 kịch bản”)

- Page Object Model (POM).
- Test với auth đã login (storageState).
- Visual regression (toHaveScreenshot).
- Multi-browser (hiện chỉ Chromium).

---

## 3. Đánh giá CI/CD – logic và phù hợp thực tế

### 3.1. Pipeline chính (`ci-cd.yml`)

| Thành phần | Trong repo | Hợp lý? |
|------------|------------|--------|
| Trigger | push/PR trên main, master | ✅ |
| Concurrency | cancel-in-progress khi có push/PR mới | ✅ |
| Job 1 | Lint + format check + **unit + integration** (npm test) | ✅ Không dùng secret; mock DB. |
| Job 2 | **Deploy** (Railway CLI `railway up --ci`) chỉ trên push main/master | ✅ Deploy trong workflow, đồng bộ. |
| Job 3 | **E2E (production)** — `needs: deploy`, chỉ trên push main/master; chạy E2E against production ngay sau deploy | ✅ Đúng thực tế: E2E sau deploy trong cùng pipeline, verify production tự động. |

**Nhận xét:** E2E **không** chạy trên mỗi push/PR (giữ CI nhanh); E2E chạy **chỉ sau deploy** (push main) trong cùng pipeline → mỗi lần deploy đều được verify bằng E2E, không cần chạy tay.

### 3.2. Workflow E2E riêng (`e2e-production.yml`)

| Thành phần | Trong repo | Hợp lý? |
|------------|------------|--------|
| Trigger | **workflow_dispatch** (chạy tay); schedule (cron) tùy chọn, đang comment | ✅ |
| Job | Giống job E2E trong ci-cd.yml (Chromium, npm run test:e2e, BASE_URL production) | ✅ |
| Artifact | Upload playwright-report khi **failure**, retention 7 ngày | ✅ Đủ để debug. |

**Cách dùng thực tế:** Khi muốn smoke production **không** qua deploy (vd. kiểm tra sau sửa DB, hoặc smoke định kỳ): Actions → **E2E Production** → Run workflow. Hoặc bật schedule (vd. 6h UTC) để smoke hàng ngày.

### 3.3. Workflow “post-deploy” (deployment_status)

- **Trong tài liệu** (GITHUB_ACTIONS_CI_CD.md, CI_RAILWAY_DESYNC.md) có nhắc workflow **post-deploy.yml** trigger bởi `deployment_status` để chạy E2E sau khi Railway deploy xong.
- **Trong repo:** File **post-deploy.yml không tồn tại**. Với setup hiện tại (deploy **chỉ** qua workflow, Railway **Disconnect**), GitHub thường không nhận `deployment_status` từ Railway, nên workflow đó cũng khó tự chạy.
- **Khuyến nghị:** Coi E2E sau deploy là **chạy tay workflow “E2E Production”** (hoặc schedule). Đã cập nhật tài liệu để không nói “đã có post-deploy.yml” mà nói rõ: E2E sau deploy = Run workflow **E2E Production** (thủ công hoặc schedule).

---

## 4. Checklist validate kỹ năng (bằng chứng)

### E2E – Cơ bản (đã đạt)

- [x] Hiểu E2E khác unit/integration (doc + 2 spec rõ mục tiêu).
- [x] Viết **2 kịch bản** Playwright (smoke + login), **7 tests**.
- [x] Dùng `page.goto()`, `page.locator()`, `expect().toBeVisible()`, `expect().toHaveURL()`, `toHaveText()`, form fill + submit.
- [x] Chạy local: `npm run test:e2e`; against production mặc định (baseURL).
- [x] Biết khi nào chạy E2E: sau deploy hoặc khi sửa UI; chạy workflow **E2E Production** (Actions → Run workflow) khi cần.

### E2E – Trong CI/CD (đã đạt)

- [x] E2E **không** chạy trên mỗi push/PR (giữ CI nhanh).
- [x] E2E chạy **tự động sau deploy** trong cùng pipeline `ci-cd.yml` (job E2E (production) với `needs: deploy`).
- [x] Có workflow riêng **E2E Production** (manual + tùy chọn schedule) khi muốn smoke không qua deploy; có artifact khi fail.

### E2E – Nâng cao (tùy chọn, chưa làm)

- [ ] Page Object Model.
- [ ] E2E tự động trigger sau deploy (post-deploy bằng deployment_status) — không triển khai vì deploy qua CLI + Disconnect.
- [ ] Test với auth (storageState).
- [ ] Visual regression, multi-browser.

### CI/CD – Đã đạt

- [x] Pipeline rõ: lint → test (unit + integration) → deploy (Railway CLI) trên push main.
- [x] Deploy trong workflow (đồng bộ), không duplicate deployment (Disconnect trên Railway).
- [x] E2E có vị trí rõ: workflow **E2E Production** (thủ công/schedule), không làm chậm CI.

---

## 5. Kết luận: Đã validate chưa?

| Kỹ năng | Kết luận |
|---------|----------|
| **Playwright – 1–2 kịch bản E2E** | **Đã validate.** Có 2 kịch bản (smoke, login), 7 tests, config và doc rõ; chạy local + workflow E2E Production. |
| **CI/CD logic, phù hợp thực tế** | **Đã validate.** CI: lint + test + deploy; E2E tách riêng, chạy sau deploy (manual/schedule). |

**Bằng chứng có thể đưa ra (portfolio / phỏng vấn):**

1. Repo: 2 file spec `e2e/smoke.spec.js`, `e2e/login.spec.js` + `playwright.config.js`.
2. GitHub Actions: workflow **CI/CD** (lint, test, deploy) và workflow **E2E Production** (E2E against production).
3. Doc: `E2E_PLAYWRIGHT.md`, `GITHUB_ACTIONS_CI_CD.md`, và bản báo cáo này.

**Hành động đề xuất (tùy chọn):**

- Chạy **một lần** workflow **E2E Production** sau deploy và lưu ảnh/link run thành công.
- Nếu muốn smoke tự động mỗi ngày: bỏ comment khối `schedule` trong `e2e-production.yml`.

---

## 6. Tài liệu liên quan

- [E2E_PLAYWRIGHT.md](./E2E_PLAYWRIGHT.md) – Cấu trúc E2E, kịch bản, chạy local/production, workflow E2E Production.
- [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md) – CI/CD, deploy Railway, khi nào chạy E2E.
- [CI_RAILWAY_DESYNC.md](./CI_RAILWAY_DESYNC.md) – Bất đồng bộ workflow vs deploy, cách chạy E2E sau deploy.
