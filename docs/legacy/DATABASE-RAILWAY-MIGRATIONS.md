# Migrations trên Railway (staging / production)

Tài liệu bổ sung: MySQL là service riêng, CI chỉ deploy app; cách migration được áp dụng lên DB trên Railway.

---

## 1. Đúng: MySQL là service riêng, không do CI “build”

- **GitHub Actions** chỉ: lint/test → build **image app** → push GHCR → gọi Railway redeploy (kéo image mới). **Không** build hay deploy MySQL.
- **MySQL trên Railway** bạn **tạo một lần** (New → MySQL, hoặc template). Service MySQL chạy độc lập; app service kết nối tới nó qua **Variables** (MYSQLHOST, MYSQLUSER, MYSQL_ROOT_PASSWORD, MYSQL_DATABASE, MYSQLPORT). Có thể dùng reference: `MYSQLHOST=${{MySQL.MYSQLHOST}}`, …
- Trên thực tế **nâng cao và chuyên nghiệp** cũng vậy: database (managed MySQL/Postgres) là **tài nguyên riêng**, provision một lần; CI/CD chỉ build và deploy **ứng dụng**.

---

## 2. Migration “được MySQL sử dụng” nghĩa là gì?

- MySQL **không tự** chạy file migration. **Migration** = đoạn SQL (trong repo) do **một process** kết nối tới MySQL và thực thi.
- Process đó phải: (1) có **code migration** (file trong image app), (2) có **credentials** tới MySQL (biến môi trường trên Railway). Thường là **chính app** (hoặc một bước trong quá trình deploy) chạy `node scripts/run-migrations.js` với env của môi trường staging/production.

---

## 3. Cách triển khai phổ biến, chuyên nghiệp

### 3.1. Pre-deploy command (chạy migration trước khi deploy bản mới)

- **Ý tưởng:** Giữa bước “build/pull image” và “bật app mới”, chạy **một lần** migration. Chạy xong (exit 0) mới deploy; lỗi thì dừng deploy.
- **Trên Railway:** Dùng **Pre-deploy command**. Command chạy trong môi trường có **đủ biến của service app** (gồm MYSQLHOST, MYSQLUSER, … từ MySQL service). Image dùng để chạy command là **image app** (đã có `migrations/`, `scripts/run-migrations.js`). Vì image production có thể không có `npm`, nên dùng trực tiếp: **`node scripts/run-migrations.js`**.
- **Cấu hình:** Trong Railway Dashboard → Service app → Settings → **Pre-deploy Command** = `node scripts/run-migrations.js`. Hoặc dùng file cấu hình (nếu dùng Nixpacks/build từ repo): `railway.toml` với `preDeployCommand = "node scripts/run-migrations.js"`.  
  **Lưu ý:** Repo hiện deploy bằng **image từ GHCR** (Dockerfile), không build từ source trên Railway; khi đó Pre-deploy command vẫn dùng image đó, chỉ cần bật Pre-deploy trong Settings và nhập lệnh trên.

### 3.2. Chạy migration khi app start (startup)

- **Ý tưởng:** Mỗi lần container app khởi động, chạy `node scripts/run-migrations.js` rồi mới `node app.js`. Migration **idempotent** (đã apply thì skip) nên chạy mỗi lần start vẫn an toàn.
- **Cách làm:** Đổi CMD trong Dockerfile (hoặc Start Command trên Railway) thành: `sh -c "node scripts/run-migrations.js && node app.js"`. Image cần có `scripts/run-migrations.js` và `migrations/` (đã có).

### 3.3. Chạy migration từ CI (job riêng)

- **Ý tưởng:** Trong GitHub Actions, thêm job (sau build, trước hoặc sau deploy) chạy migration bằng cách: checkout repo, cài dependency, chạy `npm run migrate` với **biến môi trường staging/prod** (lấy từ GitHub Secrets). Để CI kết nối được MySQL trên Railway thường cần MySQL **public** (TCP Proxy) hoặc tunnel; phức tạp và dễ lộ endpoint nên ít dùng hơn so với pre-deploy hoặc startup.

---

## 4. Khuyến nghị cho project này

- **Pre-deploy:** Cấu hình trên Railway Pre-deploy command = `node scripts/run-migrations.js`. Mỗi lần redeploy (khi CI push image mới), Railway chạy migration trước, rồi mới chuyển traffic sang bản mới. MySQL (service riêng) nhận kết nối từ chính process chạy migration (dùng env của app service).
- **Staging và production:** Mỗi environment có MySQL riêng (hoặc DB riêng); biến MYSQL_* của từng environment trỏ đúng DB đó. Cùng một image app, cùng Pre-deploy command; chỉ khác env → migration áp dụng đúng DB từng môi trường.

---

## 5. Tóm tắt

| Câu hỏi | Trả lời ngắn |
|--------|---------------|
| CI có build/deploy MySQL không? | Không. CI chỉ build và deploy **image app**. MySQL là service riêng, bạn tạo trên Railway một lần. |
| Migration áp dụng lên MySQL Railway bằng cách nào? | Một process **có code migration + credentials** chạy migration (vd. `node scripts/run-migrations.js`). Process đó = Pre-deploy command hoặc bước startup của app. |
| Có đúng thực tế chuyên nghiệp không? | Có. DB managed tách khỏi app; migration chạy trong bước deploy (pre-deploy) hoặc khi app start là cách phổ biến, nâng cao. |
