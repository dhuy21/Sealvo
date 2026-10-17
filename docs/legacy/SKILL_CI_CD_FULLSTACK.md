# Kỹ năng Fullstack: GitHub Actions – CI/CD

Tài liệu **đầy đủ** để học (cơ bản → nâng cao) và **validate** kỹ năng CI/CD cho dev fullstack: từ khái niệm, cấu hình workflow, đến Railway CD và cách chứng minh trong portfolio/phỏng vấn.

---

# PHẦN 1. CƠ BẢN

## 1.1. CI và CD là gì?

| Khái niệm | Ý nghĩa | Ví dụ trong project |
|-----------|---------|----------------------|
| **CI (Continuous Integration)** | Mỗi lần push/merge code → **tự động chạy** kiểm tra (lint, test) trên server (GitHub). Nếu fail → biết ngay, không merge/deploy code lỗi. | Mỗi push/PR vào `main` → chạy ESLint, Prettier check, Jest (unit + integration). |
| **CD (Continuous Deployment / Delivery)** | Sau khi CI **pass** (và thường chỉ trên nhánh chính) → **tự động deploy** bản build lên môi trường chạy (staging/production). | Push `main` + CI xanh → Railway build và deploy lên www.sealvo.it.com. |

**Luồng:** `Code → Push → CI (lint, test) → Pass? → CD (deploy)`.

---

## 1.2. Workflow file: vị trí và cấu trúc

- **Vị trí:** Trong repo, thư mục **`.github/workflows/`**. File thường đặt tên `ci.yml`, `ci-cd.yml`, `test.yml` (đuôi `.yml` hoặc `.yaml`).
- **Trong project này:** Repo gốc là `src/` → file nằm ở **`src/.github/workflows/ci-cd.yml`**.

**Cấu trúc tối thiểu:**

- **`name`:** Tên hiển thị trên tab Actions (vd: "CI/CD").
- **`on`:** Khi nào workflow chạy — ví dụ `push`, `pull_request`, nhánh nào (`branches: [main, master]`).
- **`jobs`:** Một hoặc nhiều job. Mỗi job có:
  - **`runs-on`:** Máy chạy (vd: `ubuntu-latest`).
  - **`steps`:** Danh sách bước (checkout, setup Node, chạy lệnh `npm ci`, `npm run lint`, `npm test`, …).

Mỗi **step** có thể dùng **action** (vd `actions/checkout@v4`, `actions/setup-node@v4`) hoặc chạy lệnh shell (`run: npm test`). Step fail → job fail → workflow fail.

### 1.2.1. Cấu trúc ci-cd.yml từng phần (đọc hiểu)

| Phần trong file | Ý nghĩa (cơ bản) |
|-----------------|-------------------|
| `name: CI/CD` | Tên hiển thị trên tab Actions. |
| `on: push: branches: [main, master]` | Chạy khi có push lên các nhánh này. |
| `on: pull_request: branches: [...]` | Chạy khi có PR vào các nhánh này. |
| `concurrency: group: ... cancel-in-progress: true` | **(Nâng cao)** Hủy run cũ khi có push/PR mới trên cùng nhánh. |
| `jobs.lint-and-test.name` | Tên hiển thị của job (vd "Lint & Test"). |
| `jobs.lint-and-test.timeout-minutes` | **(Nâng cao)** Job bị hủy nếu chạy quá số phút. |
| `jobs.lint-and-test.env` | Biến môi trường cho toàn bộ job (vd `NODE_ENV: test`, `SESSION_SECRET` dummy). |
| `steps[].uses: actions/checkout@v4` | Clone repo vào runner. |
| `steps[].uses: actions/setup-node@v4` + `with: node-version, cache` | Cài Node và cache npm. |
| `steps[].run: npm ci` | Cài dependency đúng bản lockfile. |
| `steps[].run: npm run lint` / `format:check` / `npm test` | Chạy kiểm tra. |
| `jobs.deploy.needs: lint-and-test` | Deploy chỉ chạy sau khi job lint-and-test pass. |
| `jobs.deploy.if: github.event_name == 'push' && ...` | **(Nâng cao)** Deploy chỉ khi event là push (không chạy trên PR). |

---

## 1.3. Trigger: push và pull_request

- **`on: push: branches: [main, master]`** → workflow chạy khi có **push** lên các nhánh đó.
- **`on: pull_request: branches: [main, master]`** → workflow chạy khi có **PR** vào các nhánh đó.

Kết hợp cả hai: mỗi lần bạn push lên `main` hoặc mở PR vào `main`, CI chạy. Đây là cách chuẩn để mọi thay đổi đều được kiểm tra trước khi merge.

---

## 1.4. Job và step trong project

Trong **`ci-cd.yml`** của project:

- **Job `lint-and-test` (tên hiển thị "Lint & Test"):**  
  Chạy trên `ubuntu-latest`, timeout 10 phút, env `NODE_ENV=test` và `SESSION_SECRET` (dummy cho session trong test). Các bước: Checkout → Setup Node 20 (cache npm) → `npm ci` → Lint → Format check → Test → CI summary. Nếu một bước fail thì job fail.
- **Job `deploy` (tên hiển thị "Deploy (hook optional)"):**  
  Chạy **sau** `lint-and-test` (chỉ khi job đó pass), **chỉ** khi event là **push** vào `main`/`master` (không chạy trên PR). Trong project dùng Railway + Wait for CI nên job này có thể chỉ in "skip" nếu không set `DEPLOY_HOOK_URL`; CD thực tế do Railway trigger sau khi CI pass.

---

## 1.5. Xem kết quả CI

- Vào repo trên GitHub → tab **Actions**.
- Mỗi lần push/PR tạo một **run** (workflow run). Click vào run → xem từng **job** → click job để xem **log** từng step (thành công hay lỗi, log in ra).
- Trên commit: icon ✓ (xanh) hoặc ✗ (đỏ) tương ứng status check của workflow (vd "CI/CD"). Branch protection có thể yêu cầu check này pass mới merge.

---

# PHẦN 2. NÂNG CAO

## 2.1. Chiến lược pipeline: main CI không secret vs test “thật”

- **Pipeline chính (mỗi push/PR):** Chạy **lint + format check + unit test + integration test** với **mock** (không cần DB thật, không cần API key thật). **Không** set secret trong workflow (hoặc chỉ biến không nhạy cảm như `NODE_ENV=test`). Mục tiêu: bất kỳ ai clone repo, push hoặc mở PR đều chạy được CI; nhanh, ổn định, không phụ thuộc dịch vụ ngoài.
- **Test nhạy cảm (DB thật, API bên thứ ba thật):** Thường chạy **local** (có `.env`) hoặc trong **workflow riêng** (vd nightly, chạy tay, trên release) với **GitHub Secrets** (test DB, key sandbox). Không đưa vào pipeline chính để tránh phụ thuộc secret và dịch vụ ngoài trên mỗi commit.

Trong project: `ci-cd.yml` được thiết kế theo hướng “main CI không secret”; test trong `__tests__/` có thể load app nhưng không gọi TTS/DB thật nhờ lazy init và mock.

---

## 2.2. Concurrency (hủy run cũ)

- **`concurrency: group: ... cancel-in-progress: true`** → Khi có push/PR mới trên **cùng nhánh**, run cũ của workflow đó bị **hủy**. Chỉ run mới nhất chạy đến hết. Lợi ích: tiết kiệm thời gian và tài nguyên, tránh chờ kết quả của commit đã bị “ghi đè”.

---

## 2.3. Branch protection và Required status checks

- **Branch protection rules** (Settings → Branches): Có thể bật **“Require status checks to pass before merging”** cho nhánh `main`, chọn check tên **“CI/CD”** (hoặc tên job tương ứng). Kết quả: không merge được vào `main` nếu CI đỏ.
- Kết hợp với **Railway Wait for CI**: Merge chỉ khi CI xanh → deploy chỉ khi code đã qua kiểm tra. Đây là cách chuẩn để đảm bảo production luôn từ code đã được test.

---

## 2.4. Wait for CI (Railway) vs Deploy hook

- **Wait for CI:** Railway được cấu hình “chỉ deploy khi **status check** của GitHub (vd CI/CD) **pass**”. Railway không deploy ngay khi có push; nó chờ workflow chạy xong và xanh. Không cần secret deploy hook trong repo.
- **Deploy hook:** Một số nền tảng có URL “build hook” (POST request để trigger deploy). Nếu dùng, có thể thêm job trong workflow gọi `curl -X POST $DEPLOY_HOOK_URL` (secret) sau khi CI pass. Trong project dùng Railway + Wait for CI nên không bắt buộc deploy hook.

---

## 2.5. Pre-commit (Husky) vs CI

- **Pre-commit:** Chạy **trên máy dev** khi `git commit`. Thường chạy **lint + format** (lint-staged) trên file staged; có thể thêm test. Mục đích: phản hồi nhanh, tránh commit code lỗi format/lint.
- **CI:** Chạy **trên GitHub** khi push/PR. Chạy **lint + format check + test** trong môi trường sạch, cố định. Mục đích: cổng chính — branch protection và Railway tin vào **kết quả CI**, không tin vào việc dev có chạy pre-commit hay không. Pre-commit có thể bỏ qua (`--no-verify`); CI thì không.
- **Kết luận:** Cả hai bổ sung cho nhau. Pre-commit = nhanh, local. CI = chuẩn, dùng để merge và deploy.

---

## 2.6. Biến môi trường trong CI

- **CI không có file `.env`** (file này gitignore, không có trong repo). Khi test chạy `dotenv.config({ path: '.../.env' })`, file không tồn tại → dotenv không load gì (không crash).
- **Cách cung cấp env cho CI:** Trong workflow, dùng **`env:`** ở level job (hoặc workflow). Giá trị có thể là chuỗi cố định (vd `NODE_ENV: test`) hoặc **`${{ secrets.TEN_BIEN }}`** cho secret (đặt trong Settings → Secrets and variables → Actions). **Không** commit secret; chỉ dùng Secrets khi thật sự cần (vd test DB trong workflow riêng).
- **Lazy init:** Code không nên `JSON.parse(process.env.XXX)` ở top-level; nên đọc/parse **khi cần dùng** (vd trong hàm gọi lần đầu). Như vậy app vẫn load được trong CI khi biến chưa có; chỉ khi gọi tính năng cần biến đó mới throw rõ ràng.

---

## 2.7. Workflow “nâng cao”: nightly / integration với DB thật

- Có thể tạo **workflow thứ hai** (vd `nightly.yml` hoặc `integration-real.yml`) chạy **theo lịch** (`schedule: cron(...)`) hoặc **thủ công** (`workflow_dispatch`). Workflow này set **env từ Secrets** (test DB, key sandbox) và chạy test cần DB thật / API thật. Pipeline chính vẫn không secret; pipeline “thật” dùng khi cần độ tin cậy cao hơn (trước release, định kỳ). Chi tiết có thể tham khảo tài liệu GitHub Actions (schedule, workflow_dispatch, secrets).
- **Trong repo:** File **`src/.github/workflows/nightly.example.yml`** là workflow hợp lệ, chỉ kích hoạt **thủ công** (workflow_dispatch). Minh họa cách set `env` từ Secrets (TEST_SESSION_SECRET, TEST_DB_*, …). Chỉ chạy khi đã tạo secret tương ứng trong Settings → Actions; nếu chưa có secret thì run có thể fail (đúng với mục đích “test với DB thật”). Có thể copy/sửa để thêm `schedule` (cron) nếu cần chạy định kỳ.

---

# PHẦN 3. TRÌNH TỰ HOÀN THÀNH (STEP-BY-STEP)

Làm lần lượt để **hoàn tất** CI/CD và có thể validate kỹ năng.

## Bước 1: Workflow CI đã có

- File **`src/.github/workflows/ci-cd.yml`** đã có: trigger push/PR `main` (và `master`), job `lint-and-test` (Node 20, npm ci, lint, format:check, test), job `deploy` (tùy chọn). Concurrency bật. **Không cần** thêm secret cho pipeline chính nếu test đã dùng mock / lazy init.

## Bước 2: Cấu hình Railway (CD)

- **Connect repo:** Railway → New Project / Service → Connect GitHub repo → chọn repo (vd `dhuy21/Sealvo`), nhánh **`main`**.
- **Root Directory:** Nếu code app (package.json, app.js) nằm trong thư mục `src/` của repo → đặt **Root Directory** = `src` (hoặc đường dẫn tương ứng). Nếu repo root đã là app thì để trống.
- **Wait for CI:** Bật **“Trigger deployments after all GitHub actions have completed successfully”** (hoặc tương đương). Đảm bảo tên status check khớp (vd "CI/CD").
- **Build / Start:** Để mặc định (npm install/ci, npm start) hoặc ghi rõ nếu cần.
- **Healthcheck Path:** Đặt **`/health`** nếu app có route GET `/health` trả 200.
- **Variables:** Thêm đủ biến production: `NODE_ENV=production`, `PORT`, `SESSION_SECRET`, `MYSQLHOST`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQLPORT`, và các key/API khác app cần. **Không** dùng file .env trên Railway; dùng Variables trên dashboard.

## Bước 3: Branch protection (khuyến nghị)

- GitHub repo → **Settings** → **Branches** → **Add rule** (hoặc sửa rule) cho nhánh `main`.
- Bật **“Require status checks to pass before merging”**, chọn check **“CI/CD”** (hoặc tên job tương ứng). (Tùy chọn) Bật **“Require branches to be up to date before merging”**. Lưu.

## Bước 4: Kiểm tra end-to-end

- **CI chạy:** Push một thay đổi nhỏ lên `main` (hoặc mở PR) → Vào **Actions** → Run “CI/CD” phải chạy và **pass** (lint-and-test thành công).
- **CI fail → không deploy:** Tạm làm fail CI (vd thêm lỗi lint hoặc test fail) → Push → CI đỏ → Vào Railway **Deployments**: không có deploy mới (hoặc trạng thái chờ/skip). Rồi revert để CI xanh lại.
- **CI pass → deploy:** Push thay đổi hợp lệ → CI xanh → Railway tạo deployment mới → Mở URL production (vd www.sealvo.it.com) và `/health` để xác nhận app sống.

Khi làm xong bốn bước trên, bạn đã **hoàn tất** thiết lập CI/CD thực tế và có thể dùng làm bằng chứng kỹ năng.

---

# PHẦN 4. VALIDATE KỸ NĂNG (PORTFOLIO / PHỎNG VẤN)

## 4.1. Checklist “bằng chứng” kỹ năng

| Bằng chứng | Cách thể hiện |
|------------|----------------|
| CI chạy trên mỗi push/PR | Link tab **Actions** của repo (vd `https://github.com/dhuy21/Sealvo/actions`) hoặc ảnh chụp run “CI/CD” Success. |
| CD chỉ deploy khi CI pass | Mô tả ngắn: “Railway bật Wait for CI; đã thử push code fail lint/test → không có deploy mới.” Có thể kèm ảnh Deployments trên Railway. |
| Production đang chạy | Link **www.sealvo.it.com** và **www.sealvo.it.com/health** (trả 200). |
| Workflow as code | Link file **.github/workflows/ci-cd.yml** trên GitHub (có lint, format check, test, concurrency, env, timeout, job deploy tùy chọn). |
| Pre-commit (bonus) | Mô tả: “Pre-commit (Husky + lint-staged) chạy lint + format trên file staged; CI vẫn chạy đầy đủ để làm cổng merge/deploy.” |

### 4.1.1. Phân loại kỹ năng: cơ bản vs nâng cao (trong workflow)

| Mức | Nội dung trong ci-cd.yml / thiết lập |
|-----|-----------------------------------|
| **Cơ bản** | `name`, `on` (push/PR, branches), `jobs`, `runs-on`, `steps` (checkout, setup-node, npm ci, lint, test), `env` (NODE_ENV), job `deploy` với `needs`. |
| **Nâng cao** | `concurrency` (cancel-in-progress), `timeout-minutes`, `if: github.event_name == 'push'` (chạy deploy chỉ trên push), `env` cho test (SESSION_SECRET dummy), chiến lược “main CI không secret” vs workflow nightly/Secrets, branch protection + Wait for CI. |

## 4.2. Câu hỏi phỏng vấn thường gặp và gợi ý trả lời

- **“CI và CD khác nhau thế nào?”**  
  CI là tự động kiểm tra (lint, test) mỗi khi push/PR; CD là tự động deploy lên môi trường chạy sau khi CI pass. Trong project em dùng GitHub Actions cho CI và Railway (Wait for CI) cho CD.

- **“Trong CI có dùng file .env không?”**  
  Không. File .env gitignore, không có trên runner. Em thiết kế test không cần secret (mock, lazy init); nếu cần biến thì set trong workflow `env:` hoặc GitHub Secrets.

- **“Tại sao vừa có pre-commit vừa chạy lint/test trong CI?”**  
  Pre-commit chạy local, phản hồi nhanh; có thể bỏ qua bằng --no-verify. CI là cổng chính: branch protection và Railway dựa vào status check của CI, không dựa vào việc dev có chạy pre-commit hay không.

- **“Test nhạy cảm (DB, API thật) em đặt ở đâu?”**  
  Test cần DB/API thật em chạy local (có .env) hoặc trong workflow riêng (nightly/release) với Secrets. Pipeline chính chỉ chạy unit + integration với mock để không cần secret và ổn định.

---

## 4.3. Tài liệu liên quan trong repo

- **Chi tiết CI/CD + Railway + Validate:** [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md)
- **CI (workflow từng bước):** [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)
- **CD (các cách deploy):** [CD_DEPLOY.md](./CD_DEPLOY.md)
- **Env và CI (không .env, lazy init):** [ENV_AND_CI.md](./ENV_AND_CI.md)
- **Pre-commit (Husky + lint-staged):** [PRE_COMMIT.md](./PRE_COMMIT.md)
- **ESLint + Prettier (lint/format):** [ESLINT_PRETTIER.md](./ESLINT_PRETTIER.md)

---

Khi bạn nắm **Phần 1 (cơ bản)**, vận dụng **Phần 2 (nâng cao)** trong thiết kế pipeline và cấu hình, hoàn thành **Phần 3 (trình tự)** và có **Phần 4 (bằng chứng + trả lời phỏng vấn)** là bạn đã **hoàn tất và validate** kỹ năng GitHub Actions – CI/CD cho dev fullstack.
