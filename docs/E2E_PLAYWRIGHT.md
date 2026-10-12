# E2E – Playwright

## 1. E2E là gì và khác gì Unit / Integration?

```
          E2E (Playwright)        ← ít nhất, chậm nhất – test từ góc nhìn người dùng
        Integration (Supertest)   ← trung bình – test HTTP, không cần browser
      Unit (Jest)                 ← nhiều nhất, nhanh nhất – test logic thuần
```

| | Unit | Integration | E2E |
|---|---|---|---|
| Công cụ | Jest (mock) | Jest + Supertest | Playwright (browser thật) |
| Chạy ở đâu | Node.js | Node.js | Chromium/Firefox/WebKit |
| Thấy được | Return value | HTTP response | **Giao diện người dùng thực** |
| Cần server? | Không | Không | **Có** (URL running) |
| Detect thêm | — | — | CSS/JS lỗi, HTML5 validation, redirect URL |

**Khi nào dùng E2E?**  
Khi muốn test những gì người dùng thật sự thấy và làm — navigation, form, messages d'erreur, redirect. Không thể detect bằng unit/integration test.

---

## 2. Playwright vs Cypress

| | Playwright | Cypress |
|---|---|---|
| Tác giả | Microsoft | Cypress.io |
| Browsers | Chromium, Firefox, WebKit | Chromium (+ Firefox depuis v13) |
| Tốc độ | Nhanh hơn | DX tốt hơn khi debug |
| CI | Nhẹ, headless dễ | Cần xfvb hoặc electron |
| API | `async/await` native | callback style + `.then()` |
| Phổ biến (2024-2026) | ✅ trend tăng mạnh | ✅ vẫn phổ biến |

**Chọn Playwright** cho project này vì: nhẹ hơn, modern, hỗ trợ multi-browser, dễ tích hợp CI.

---

## 3. Cấu trúc

```
src/
├── e2e/
│   ├── smoke.spec.js       ← Kịch bản 1: public pages smoke test
│   └── login.spec.js       ← Kịch bản 2: login flow E2E
└── playwright.config.js    ← Config: baseURL, timeout, reporter, browser
```

---

## 4. Kịch bản đã triển khai

### Kịch bản 1 – Smoke test: public pages (`e2e/smoke.spec.js`)

**Mục tiêu:** Vérifier que les pages publiques se chargent correctement et que la navigation fonctionne.

| Test | Hành động | Kết quả mong đợi |
|---|---|---|
| Homepage loads | `goto('/')` | Title chứa "SealVo", `span.glow-text` = "SEALVO" |
| "Get Started" navigates | Click "Get Started" | URL = `/login`, form hiện ra |
| /login renders correctly | `goto('/login')` | Title "SealVo", form + link "S'inscrire" |

**Tại sao không cần DB:** Tất cả đều là public pages không cần auth.

### Kịch bản 2 – Login flow (`e2e/login.spec.js`)

**Mục tiêu:** Vérifier le comportement du formulaire de connexion depuis le navigateur.

| Test | Hành động | Kết quả mong đợi |
|---|---|---|
| Form elements | Kiểm tra locators | username, password, submit, links tồn tại |
| Wrong credentials | Fill sai + submit | Redirect về `/login`, `.alert` hiển thị |
| "S'inscrire" link | Click | URL = `/registre` |
| "Mot de passe oublié?" | Click | URL chứa `forgotPassword` |

**Test "wrong credentials" chạy against production:** Không cần mock — dùng username giả rõ ràng (`e2e_invalid_user_xyz_9999`), server trả redirect + flash error thật.

---

## 5. Chạy E2E

### Chạy against production (mặc định)

```bash
# Từ thư mục src/
npm run test:e2e
```

App đang chạy tại `https://www.sealvo.it.com` → tests chạy ngay, không cần setup.

### Chạy against staging

```bash
# Thay bằng URL staging thực tế (Railway hoặc STAGING_URL trong GitHub vars)
BASE_URL=https://staging-xxx.up.railway.app npm run test:e2e
```

### Chạy against local

```bash
# Terminal 1: start server
npm run dev

# Terminal 2: run E2E (trong src/)
# App mặc định chạy port 3000 (app.js: PORT || 3000). Nếu .env có PORT=8080 thì đổi thành 8080.
BASE_URL=http://localhost:3000 npm run test:e2e
```

### Trong CI (GitHub Actions)

- **Push main** → job E2E (Production) dùng `BASE_URL=https://www.sealvo.it.com`.
- **Push staging** → job E2E (Staging) dùng `BASE_URL=${{ vars.STAGING_URL }}`.
- Không cần set tay: workflow đã set đúng theo nhánh.

### Các scripts có sẵn

```bash
npm run test:e2e          # Chạy E2E (headless)
npm run test:e2e:ui       # Mở Playwright UI mode (debug visual)
npm run test:e2e:report   # Mở HTML report của lần chạy trước
```

---

## 6. Playwright config (`playwright.config.js`)

```js
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,          // 30s per test
  retries: 1,              // 1 retry khi fail (flaky network)
  use: {
    baseURL: process.env.BASE_URL || 'https://www.sealvo.it.com',
    headless: true,
    screenshot: 'only-on-failure',  // Chụp màn hình khi fail
    video: 'retain-on-failure',     // Record video khi fail
    trace: 'retain-on-failure',     // Trace để debug
  },
});
```

**`retries: 1`**: Retry 1 lần khi fail để tránh flaky do network chậm. Đây là best practice cho E2E test against remote URL.

---

## 7. Khi nào chạy E2E? (logic fullstack)

| Thời điểm | Cách chạy | Tự động / tay |
|-----------|-----------|----------------|
| **Mỗi push/PR** | Lint + unit + integration (không E2E) | Tự động |
| **Sau deploy lên production** | **Trong cùng pipeline** `ci-cd.yml`: job **E2E (production)** chạy ngay sau job Deploy (chỉ trên push main/master) | **Tự động** |
| **Sửa UI / form / login** | Local: `npm run test:e2e` | **Tay** (khi cần) |
| **Smoke production không deploy** | Workflow **E2E Production** (Run workflow) hoặc schedule | **Tay** hoặc **tự động** (cron) |

**Tại sao E2E sau deploy trong cùng pipeline?** Thực tế dự án thường chạy E2E/smoke **ngay sau** deploy để verify môi trường vừa deploy; một pipeline duy nhất (lint → test → deploy → E2E) cho phản hồi rõ: nếu E2E đỏ thì biết production có thể lỗi. E2E không chạy trên mỗi push/PR để giữ CI nhanh; chỉ chạy khi vừa deploy (push main).

---

## 8. E2E trong CI/CD – Trong pipeline chính + workflow riêng

### Job E2E trong pipeline chính (`ci-cd.yml`)

- **Vị trí:** Job **E2E (production)** trong `ci-cd.yml`, chạy sau job **Deploy** (`needs: deploy`).
- **Kích hoạt:** Chỉ khi **push** vào `main` hoặc `master` (cùng điều kiện với deploy). Mỗi lần deploy xong → E2E chạy tự động against `https://www.sealvo.it.com`.
- **Lợi ích:** Không cần nhớ chạy E2E tay; run xanh = lint + test + deploy + E2E đều pass.
- **Khi E2E fail:** Cả run đỏ; artifact `playwright-report` được upload để tải về và debug.

### Workflow riêng: "E2E Production" (`e2e-production.yml`)

- **File:** `src/.github/workflows/e2e-production.yml`
- **Kích hoạt:** **Thủ công** (Actions → E2E Production → Run workflow). Dùng khi muốn smoke test production **không** qua deploy (vd. kiểm tra sau sửa DB, hoặc smoke định kỳ).
- **Tùy chọn:** Bật smoke hàng ngày bằng cách bỏ comment khối `schedule` trong file (vd. 6h UTC).
- **Job:** Giống job E2E trong ci-cd.yml (Chromium, `npm run test:e2e`, BASE_URL production, artifact on failure).

### Tóm tắt chiến lược

| Approach | Trong project này |
|----------|-------------------|
| CI (mỗi push/PR) | Lint + unit + integration. **Không** E2E (giữ nhanh). |
| CD (push main) | Lint → Test → **Deploy** → **E2E** (cùng pipeline, tự động). |
| E2E local | `npm run test:e2e` khi sửa UI. |
| E2E không qua deploy | Workflow **E2E Production** (manual hoặc schedule). |

---

## 9. Lệnh debug hữu ích

```bash
# Xem trace khi test fail
npx playwright show-trace test-results/<tên-test>/trace.zip

# Chạy 1 test cụ thể
npx playwright test e2e/login.spec.js

# Chạy test với headed mode (thấy browser)
npx playwright test --headed

# Chạy test với slow motion để quan sát
npx playwright test --headed --slow-mo=500
```

---

## 10. Kỹ năng E2E cho dev fullstack

### Cơ bản (junior/mid – cần biết) – trong repo này đã đạt

- [x] Biết E2E là gì, khác gì unit/integration (doc §1 + 2 kịch bản)
- [x] Viết được 1–2 kịch bản Playwright (smoke + login, 7 tests)
- [x] Dùng `page.goto()`, `page.locator()`, `expect().toBeVisible()`, `expect().toHaveURL()`, form fill/submit
- [x] Chạy `npm run test:e2e` (local hoặc against production) và đọc output
- [x] Biết khi nào chạy E2E: sau deploy hoặc khi sửa UI — chạy workflow **E2E Production** (Actions → Run workflow) khi cần

### Nâng cao (senior – tùy chọn)

- [ ] Page Object Model (POM) – tách locators vào class riêng
- [x] E2E trong CI/CD: job **E2E (production)** chạy tự động sau deploy trong pipeline chính; workflow **E2E Production** để chạy tay hoặc schedule
- [ ] Test với auth: `storageState` để lưu session
- [ ] Visual regression (`toHaveScreenshot()`)
- [ ] Parallel multi-browser (chromium + firefox + mobile)

**Báo cáo validate đầy đủ:** [VALIDATION_E2E_FULLSTACK.md](./VALIDATION_E2E_FULLSTACK.md) — đánh giá 2 kịch bản E2E + CI/CD, checklist bằng chứng, kết luận đã validate kỹ năng.

---

## Tài liệu liên quan

- [VALIDATION_E2E_FULLSTACK.md](./VALIDATION_E2E_FULLSTACK.md) – Báo cáo validate E2E + CI/CD cho fullstack
- [TESTS.md](./TESTS.md) – Tổng quan unit + integration tests
- [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md) – CI/CD pipeline
- [SKILL_CI_CD_FULLSTACK.md](./SKILL_CI_CD_FULLSTACK.md) – Fullstack CI/CD skills
