# CD (Continuous Deployment / Delivery) – Triển khai tự động

## CD là gì?

- **CI (Continuous Integration):** Mỗi push → chạy lint + test trên GitHub (đã có trong `.github/workflows/ci-cd.yml`).
- **CD (Continuous Deployment / Delivery):** Sau khi CI pass (và thường chỉ trên nhánh `main`) → **tự động deploy** app lên môi trường chạy (staging/production).

Luồng: **push → CI (lint, test) → nếu pass → CD (deploy)**.

---

## Cách triển khai CD cho project này

Project là **Node/Express**, cần chạy `npm install` + `node app.js` và kết nối DB. Hai hướng thường dùng:

---

### Cách 1: Dùng hosting có sẵn “GitHub deploy” (không cần workflow CD)

Nhiều nền tảng **tự deploy khi push** nếu bạn kết nối repo GitHub:

| Nền tảng | Cách làm |
|----------|----------|
| **Railway** | Tạo project → Connect repo GitHub → chọn repo + nhánh `main`. Mỗi push lên `main` → Railway tự build và deploy. Thêm biến môi trường (DB, SESSION_SECRET, …) trong dashboard. |
| **Render** | New → Web Service → Connect GitHub repo → Root directory: `src` (nếu repo là cả project) hoặc để trống nếu repo root đã là `src`. Build: `npm ci`, Start: `node app.js`. Thêm env vars. |
| **Fly.io** | Cần `Dockerfile` hoặc `fly.toml`. Trong GitHub Actions có thể thêm job gọi `fly deploy` (cần `FLY_API_TOKEN` secret). |

**Ưu điểm:** Không cần viết workflow CD; chỉ cần cấu hình trên dashboard. CD thực chất là “push → hosting tự build & deploy”.

---

### Cách 2: CD bằng GitHub Actions (workflow gọi deploy)

Khi bạn muốn **chỉ deploy khi CI pass** hoặc dùng CLI/API của hosting trong Actions:

1. **CI pass** (lint + test xanh).
2. Job **deploy** chạy (chỉ trên `main`, sau job lint-and-test).
3. Deploy bằng một trong các cách:
   - Gọi **deploy hook** (Render, một số host có URL “Build hook”).
   - Chạy **CLI** (Railway CLI, Fly.io, Heroku) với token đặt trong **Secrets** của repo.
   - `rsync`/`ssh` lên VPS rồi `git pull` + `pm2 restart` (nếu bạn deploy lên server riêng).

**Đã có sẵn trong repo:** job **deploy** trong `src/.github/workflows/ci-cd.yml`:

- Chạy **sau** job `lint-and-test` (chỉ khi lint + test pass).
- Chỉ chạy khi **push** vào `main` hoặc `master` (không chạy trên pull_request).
- Gọi **deploy hook** qua secret: nếu bạn đặt secret **`DEPLOY_HOOK_URL`** (URL POST từ Render/Railway/…) thì bước sẽ gọi URL đó; nếu không đặt thì bước in "skip deploy" và vẫn pass.

**Bật CD:** Repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → tên `DEPLOY_HOOK_URL`, value = URL deploy hook (ví dụ Render: Dashboard → Service → Build & deploy → Build hook URL).

---

## Gợi ý cho project Web_vocab_v0

- **Nhanh, ít cấu hình:** Dùng **Railway** hoặc **Render**, connect GitHub repo (root = `src/`), cấu hình build/start và env (DB, session, …). Mỗi push `main` = deploy. Đó đã là CD.
- **Muốn “chỉ deploy khi CI pass”:** Giữ workflow CI hiện tại, thêm job **deploy** (như ví dụ trên) và dùng secret cho deploy hook hoặc token CLI. Có thể thêm file workflow `cd.yml` hoặc gộp job deploy vào `ci-cd.yml`.

---

## Deploy trên Railway (project này)

Project đã được deploy trên **Railway**. Ghi chú nhanh:

- **Repo:** Root repo = `src/` → trên Railway chọn **Root Directory** = `.` (hoặc để trống nếu bạn push nguyên thư mục `src` lên nhánh chính).
- **Build / Start:** Build: `npm install` (hoặc `npm ci`), Start: `npm start` (tức `node app.js`). Railway thường tự nhận với Node.
- **Biến môi trường** (Railway → Service → Variables):
  - `NODE_ENV=production`
  - `PORT` — Railway gán sẵn, app dùng `process.env.PORT || 3000`
  - `SESSION_SECRET` — bắt buộc trong production (session + cookie secure)
  - DB: `MYSQLHOST`, `MYSQLUSER`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQLPORT` (hoặc dùng MySQL add-on của Railway và map biến tương ứng)
  - Các biến khác nếu app dùng (email, API keys, …)
- **Trust proxy:** Ở production app đã bật `app.set('trust proxy', 1)` khi `NODE_ENV === 'production'` (trong `session.js`) để cookie/session hoạt động đúng sau HTTPS (Railway).
- **CD:** Railway connect GitHub → mỗi push lên nhánh đã chọn (vd `main`) sẽ trigger build + deploy. **Khuyến nghị:** Bật **Wait for CI** trên Railway để deploy chỉ khi GitHub Actions (lint + test) pass; khi đó không cần `DEPLOY_HOOK_URL`. Chi tiết: [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md).
