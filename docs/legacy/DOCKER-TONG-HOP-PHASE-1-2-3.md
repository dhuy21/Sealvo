# Tổng hợp Docker — Kỹ năng Fullstack: Chuẩn hóa môi trường chạy và deploy (Phase 1 → 3)

Tài liệu này tổng hợp **toàn bộ** những gì đã triển khai, thảo luận và xử lý từ Phase 1 đến Phase 3 cho kỹ năng **Docker** trong yêu cầu fullstack: chuẩn hóa môi trường chạy và deploy.

---

## Mục lục

1. [Bối cảnh và mục tiêu](#1-bối-cảnh-và-mục-tiêu)
2. [Phase 1 — Dockerfile + .dockerignore](#2-phase-1--dockerfile--dockerignore)
3. [Phase 2 — Docker Compose (app + MySQL)](#3-phase-2--docker-compose-app--mysql)
4. [Phase 3 — Tài liệu, CI và Mô hình B](#4-phase-3--tài-liệu-ci-và-mô-hình-b)
5. [Mô hình B — CI build → GHCR → Railway kéo image](#5-mô-hình-b--ci-build--ghcr--railway-kéo-image)
6. [Sự cố deploy Railway và cách xử lý](#6-sự-cố-deploy-railway-và-cách-xử-lý)
7. [Các câu hỏi đã thảo luận](#7-các-câu-hỏi-đã-thảo-luận)
8. [Railway internal networking](#8-railway-internal-networking)
9. [Local: docker-compose và biến PORT](#9-local-docker-compose-và-biến-port)
10. [Tóm tắt file và đường dẫn quan trọng](#10-tóm-tắt-file-và-đường-dẫn-quan-trọng)

---

## 1. Bối cảnh và mục tiêu

- **Kỹ năng:** Docker — khi muốn chuẩn hóa môi trường chạy và deploy (mức **nâng cao** cho fullstack).
- **Mục tiêu:** Cùng một “hộp” (image) chạy giống nhau giữa local, CI và production; deploy bằng image hoặc Dockerfile; local dev có app + MySQL trong Docker Compose.
- **Giới hạn:** Không dùng Kubernetes; không đưa toàn bộ E2E vào Docker trong phase này; DB production đã host sẵn (Railway MySQL hoặc ngoài), app trên Railway đã kết nối DB thành công.

---

## 2. Phase 1 — Dockerfile + .dockerignore

### Đã làm

- **Dockerfile** (trong `src/`): multi-stage, Node 20-alpine, user không root, HEALTHCHECK (route `/health`), `CMD ["node", "app.js"]`.
- **.dockerignore**: loại trừ `node_modules`, `.git`, `.env*`, `e2e`, `__tests__`, `docs`, `.github`, log, file tạm… → build nhanh, image nhỏ, **không đưa secret vào image**.

### Kiểm tra Phase 1

```bash
cd src
docker build -t web-vocab:local .
docker run --rm -p 3000:3000 --env-file .env web-vocab:local
# Mở http://localhost:3000/health
```

---

## 3. Phase 2 — Docker Compose (app + MySQL)

### Đã làm

- **docker-compose.yml** (trong `src/`): hai service `app` (build từ Dockerfile) và `db` (MySQL 8).
- **Một file .env duy nhất:** `src/.env`; app load `dotenv.config({ path: '.env' })`; **không** còn `app/config/.env`.
- **env_file: .env** cho service app; không khai báo trùng trong bloc `environment`.
- **DB healthcheck:** `mysqladmin ping -h 127.0.0.1 -P 3306` (TCP), `start_period: 45s`, `retries: 15` → tránh app start khi MySQL chưa sẵn sàng (ECONNREFUSED).
- **Init DB:** `app/core/database.sql` mount vào `/docker-entrypoint-initdb.d/01-schema.sql`; chỉ chạy khi volume MySQL **trống** (lần đầu hoặc sau `docker compose down -v`).

### Lệnh thường dùng

```bash
cd src
docker compose down -v    # DB mới hoàn toàn nếu cần
docker compose up --build # hoặc up -d --build
docker compose logs -f app
docker compose down
```

---

## 4. Phase 3 — Tài liệu, CI và Mô hình B

### Đã làm

- **docs/DOCKER.md:** Hướng dẫn chạy local (Compose), build image, deploy Railway (Dockerfile hoặc image); link sang Mô hình B.
- **docs/DOCKER-MODEL-B.md:** Cấu hình từng bước: CI build → push GHCR → Railway Connect Image, secrets, quyền GHCR.
- **docs/Resume skill Docker.md:** Cập nhật phần “État actuel après Phase 1, 2 et 3” (một .env, TTS qua GOOGLE_TTS_*, init DB, healthcheck, CI).
- **src/README.md:** Thêm mục Docker với link tới `docs/DOCKER.md` và lệnh nhanh `docker compose up -d`.
- **CI/CD (Mô hình B):** Job **Build & Push to GHCR** (build image, push khi push main/master); job **Deploy** gọi `railway redeploy` để Railway kéo image mới; E2E chạy sau deploy.

---

## 5. Mô hình B — CI build → GHCR → Railway kéo image

### Ý nghĩa

- **Mô hình A (cũ):** Railway tự build từ repo/Dockerfile → image build **hai lần** (GHA validate + Railway build).
- **Mô hình B:** CI build **một lần** → push lên **GitHub Container Registry (GHCR)** → Railway **Connect Image** và kéo image đó → **cùng một image** đã test chạy trên production, deploy nhanh hơn, dễ rollback.

### Luồng

1. Push (hoặc PR) → GHA: Lint & Test → **Build & Push to GHCR** (chỉ push khi push `main`/`master`).
2. Image: `ghcr.io/OWNER/REPO:latest` và `:sha-xxx` (OWNER/REPO = tên repo GitHub, viết thường).
3. Job **Deploy:** `railway redeploy --yes` → Railway pull image `:latest` mới và deploy.
4. **E2E** chạy sau deploy để kiểm tra production.

### Cấu hình cần

- **GitHub Secrets:** `RAILWAY_TOKEN` (Project Token); `RAILWAY_SERVICE_ID` (nếu nhiều service).
- **Railway:** Service web chuyển từ Connect Repo sang **Connect Image**, URL: `ghcr.io/OWNER/REPO:latest`. Nếu image private: cấu hình auth GHCR trên Railway hoặc đặt package public.
- **Workflow:** Build context và file Dockerfile phải khớp cấu trúc repo (ví dụ repo “Sealvo” có Dockerfile ở root → `context: .`, `file: ./Dockerfile`).

Chi tiết: **docs/DOCKER-MODEL-B.md**.

---

## 6. Sự cố deploy Railway và cách xử lý

### Triệu chứng

- Deploy “thành công” trên Railway, nhưng truy cập **www.sealvo.it.com** báo **“Application failed to respond”**.
- Local (docker compose) chạy bình thường.

### Nguyên nhân

- **Port:** Trên Railway, platform **tự inject biến `PORT`** và proxy gửi request tới port đó. App chỉ đọc **`APP_PORT`**; khi **`PORT`** không được dùng (hoặc khi chỉ dùng `process.env.APP_PORT` mà biến này không có trong env container tại runtime), `appPort` có thể **undefined** → `app.listen(undefined, ...)` → app không lắng nghe đúng port Railway dùng → proxy không tới được app.
- **Bind address:** Trong container, server phải listen trên **`0.0.0.0`** (mọi interface), không chỉ `localhost`, thì proxy từ bên ngoài container mới kết nối được.

### Cách xử lý đã áp dụng

- **app.js:** Dùng port theo thứ tự ưu tiên platform:  
  `const appPort = process.env.PORT || process.env.APP_PORT || 3000;`  
  (Trên Railway chỉ cần `process.env.PORT` cũng đủ vì Railway luôn set `PORT`.)
- **Listen:** `app.listen(appPort, '0.0.0.0')` (đảm bảo bind ra ngoài container).
- **Kết quả test:** Chỉ dùng `process.env.APP_PORT` → fail; dùng `process.env.PORT` (hoặc `PORT || APP_PORT || 3000`) → hoạt động. Console log có thể in cùng số port; sự khác biệt là khi chỉ dùng APP_PORT thì giá trị tại runtime có thể undefined.

### Bài học

- Trên Railway (và Heroku, Render…), **luôn ưu tiên biến `PORT`** do platform gán; `APP_PORT` dùng cho local/docker hoặc fallback.
- Trong container, server **luôn** listen **`0.0.0.0`** để nhận kết nối từ proxy bên ngoài.

---

## 7. Các câu hỏi đã thảo luận

### 7.1. Package GHCR visibility Public có nguy hiểm không?

- **Public** = mọi người có thể **pull** image; không thể push/xóa/sửa settings trừ repo được cấp quyền.
- **Rủi ro:** Nếu image chứa secret (key, .env) thì bị lộ. Project đã dùng `.dockerignore` loại `.env` và cấu hình qua env → hợp lý để public nếu không có secret trong image.
- **Cấu hình an toàn:** Trong Package settings, “Manage Actions access” chỉ cấp cho repo cần push (vd. Sealvo); không thêm repo thừa. Muốn kín hơn thì chuyển package sang Private và cấu hình auth khi Railway pull.

### 7.2. GHCR có free không, có giới hạn không?

- **Public package:** Thường **miễn phí** (storage và bandwidth) theo chính sách GitHub.
- **Private package:** Free tier thường có giới hạn (vd. 500 MB storage); chi tiết xem **GitHub Pricing** và **Packages billing**.

### 7.3. Push code thường xuyên → build + deploy có gây quá tải / rủi ro không?

- **Không** quá tải nếu tần suất vừa phải (nhiều lần/ngày). Rủi ro chính là deploy nhầm bản lỗi → giảm bằng test trong CI, E2E sau deploy, rollback trên Railway.
- **Hợp lý chuyên nghiệp:** Deploy nhiều lần mỗi ngày là bình thường; workflow chỉ deploy khi push **main** (không deploy mỗi commit ở nhánh khác).

### 7.4. Dev push nhiều nhưng production không deploy liên tục?

- **Đúng:** Push thường xuyên thường ở **nhánh dev/staging**, không phải `main`. Workflow deploy chỉ chạy khi push/merge vào **main** (production).
- **Thực tế:** Dev thường **không** có quyền push/merge trực tiếp lên `main`; build và deploy production thường qua **review/approve** (admin, tech lead). Nên bật **branch protection** cho `main` (yêu cầu PR, review, status check).

### 7.5. Tab Packages trên GitHub ở đâu?

- Tab **Packages** **không** nằm trên trang repo (cạnh Code, Issues). Nó nằm trên **trang profile/user**: **github.com/USERNAME** → tab **Packages**. Package container (image) xuất hiện sau khi CI push image lên GHCR thành công.

### 7.6. Truy cập ghcr.io/... trên trình duyệt ra 404?

- GHCR **không** phải website xem bằng browser; URL `ghcr.io/owner/image` dùng cho **Docker** (pull). Để kiểm tra image: GitHub → profile → **Packages**, hoặc `docker pull ghcr.io/owner/repo:latest`.

---

## 8. Railway internal networking

- Railway cung cấp **private hostname** cho mỗi service, ví dụ `mysql.railway.internal`, `webvocabv0.railway.internal`. Chỉ các service **cùng project/environment** mới resolve được.
- **Lợi ích:** DB không cần public; traffic giữa Web và MySQL đi trên **mạng nội bộ** Railway, bảo mật và ổn định.
- **Cấu hình:** Trên service Server Web, set **MYSQLHOST=mysql.railway.internal** (và MYSQLPORT, MYSQLUSER, …). App kết nối MySQL qua hostname nội bộ.
- **“Network traffic” trên dashboard:** Railway vẽ đường nối giữa Server Web và MySQL để thể hiện hai service có kết nối / traffic với nhau; traffic thực tế (nếu có) cũng đi trên private network.

---

## 9. Local: docker-compose và biến PORT

- Khi chạy **docker compose down -v** (hoặc up), nếu trong **docker-compose.yml** có dùng **${PORT}** (vd. port mapping hoặc env) mà **.env** không khai báo **PORT**, Compose sẽ báo: **“The 'PORT' variable is not set. Defaulting to a blank string.”** và có thể gây lỗi **“invalid proto:”** (giá trị rỗng dùng cho port/URL).
- **Cách xử lý:** Thêm **PORT=3000** (hoặc giá trị phù hợp) vào **.env** trong thư mục chứa docker-compose. Railway không cần việc này (Railway tự set PORT cho service).

---

## 10. Tóm tắt file và đường dẫn quan trọng

| File / Đường dẫn | Vai trò |
|------------------|--------|
| **src/.env**, **src/.env.example** | Một file env duy nhất; TTS qua GOOGLE_TTS_*; local cần PORT nếu compose dùng ${PORT}. |
| **src/Dockerfile** | Multi-stage, user non-root, HEALTHCHECK, CMD node app.js. |
| **src/.dockerignore** | Loại .env, node_modules, test…; không đưa secret vào image. |
| **src/docker-compose.yml** | App + MySQL; env_file: .env; healthcheck DB; init database.sql. |
| **src/app.js** | Port: `process.env.PORT \|\| process.env.APP_PORT \|\| 3000`; listen `0.0.0.0`. |
| **src/.github/workflows/ci-cd.yml** | Lint & Test → Build & Push to GHCR (khi push main) → Deploy (railway redeploy) → E2E. |
| **docs/DOCKER.md** | Hướng dẫn local, build image, deploy Railway (Dockerfile + Mô hình B). |
| **docs/DOCKER-MODEL-B.md** | Cấu hình Mô hình B: GHCR, Railway Connect Image, secrets. |
| **docs/DOCKER-PHASE2-TEST.md** | Checklist test Phase 2. |
| **docs/DOCKER-MYSQL-INIT-AND-HEALTHCHECK.md** | Init DB, healthcheck, lỗi ECONNREFUSED. |
| **docs/Resume skill Docker.md** | Kế hoạch + trạng thái sau Phase 1–3. |
| **app/config/README-TTS-CREDENTIALS.md** | Biến TTS (GOOGLE_TTS_PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY). |

---

## Kết luận

Đến hết Phase 3, project đã có:

- **Local:** Docker Compose (app + MySQL), một .env, init DB, healthcheck.
- **Build:** Dockerfile multi-stage, .dockerignore, không secret trong image.
- **CI/CD:** Lint, test, build image, push GHCR (khi push main), deploy Railway bằng image (Mô hình B), E2E sau deploy.
- **Production:** Railway kéo image từ GHCR; app đọc **PORT** và listen **0.0.0.0**; DB qua internal networking (mysql.railway.internal).
- **Tài liệu:** DOCKER.md, DOCKER-MODEL-B.md, Resume skill Docker, README mục Docker; các doc Phase 2 và MySQL init/healthcheck.

Toàn bộ đáp ứng yêu cầu **chuẩn hóa môi trường chạy và deploy** cho kỹ năng Docker fullstack (mức nâng cao) đã đề ra.
