# Những gì đã xử lý trong repo – CI/CD và deploy (chi tiết)

Tài liệu này giải thích **từng thay đổi** đã thực hiện trong repo để: (1) chỉ giữ deploy bằng workflow, tránh hai deployment; (2) đồng bộ Node version và giảm cảnh báo trong log deploy; (3) cập nhật tài liệu cho người dùng và người đọc sau này.

---

## 1. Tổng quan theo file

| File | Nội dung đã xử lý |
|------|--------------------|
| **`src/package.json`** | Thêm `engines.node`, xóa dependency `crypto`, sửa script `prepare` (husky). Sau đó: nâng nodemailer 8, đổi @aws-sdk/client-ses → client-sesv2, xlsx → bản CDN SheetJS 0.20.3 (xem [NPM_AUDIT_VULNERABILITIES.md](./NPM_AUDIT_VULNERABILITIES.md)). |
| **`src/app/services/mailersend.js`** | Đổi transport SES: từ `@aws-sdk/client-ses` (SESClient, SendRawEmailCommand) sang `@aws-sdk/client-sesv2` (SESv2Client, SendEmailCommand) để tương thích nodemailer 8. |
| **`docs/GITHUB_ACTIONS_CI_CD.md`** | Thêm §7a (chỉ deploy bằng workflow + Disconnect), §8a (log deploy), cập nhật §9 (checklist). |
| **`docs/CI_RAILWAY_DESYNC.md`** | Bổ sung trong §4.3: nhắc Disconnect trên Railway và link sang §7a. |
| **`docs/NPM_AUDIT_VULNERABILITIES.md`** | Tài liệu mới: tóm tắt xử lý 29 vulnerabilities (npm audit fix, nodemailer 8 + SESv2, xlsx CDN), không thay đổi logic. |

*Workflow `ci-cd.yml` không đổi trong đợt xử lý này; logic deploy bằng Railway CLI đã có sẵn.*

---

## 2. Chi tiết từng file

### 2.1. `src/package.json`

#### 2.1.1. Thêm `engines.node`

- **Thay đổi:** Thêm trường `"engines": { "node": ">=20" }` (ngay sau `"main": "app.js"`).
- **Lý do:**  
  - Trên **GitHub Actions** workflow dùng Node **20** (trong `ci-cd.yml`: `node-version: '20'`).  
  - Trên **Railway**, Nixpacks mặc định dùng Node **18**. Khi build, nhiều package (eslint, express-handlebars, glob, …) khai báo `engines.node` là `>=20` hoặc `^20.x` → npm in cảnh báo **EBADENGINE** và về lâu dài có thể gây lệch hành vi giữa CI và production.  
  - Nixpacks (và nhiều nền tảng) đọc `package.json` → `engines.node` để chọn phiên bản Node. Đặt `>=20` khiến Railway dùng Node 20, **trùng với CI**.
- **Kết quả:** Build trên Railway dùng Node 20, hết hàng loạt cảnh báo EBADENGINE trong log.

#### 2.1.2. Xóa dependency `crypto`

- **Thay đổi:** Xóa dòng `"crypto": "^1.0.1"` trong `dependencies`.
- **Lý do:**  
  - Package npm tên `crypto` đã **deprecated**; Node.js có sẵn module built-in `crypto` (không cần cài).  
  - Trong repo, mọi chỗ dùng crypto đều là `require('crypto')` (session, reset password, email verification, security, …) → đó là **built-in**, không phải package vừa xóa.  
  - Giữ dependency `crypto` vừa gây cảnh báo deprecated vừa không cần thiết.
- **Kết quả:** Bớt một cảnh báo deprecated trong `npm ci` (cả trên Actions và trên Railway build).

#### 2.1.3. Sửa script `prepare` (husky)

- **Trước:** `"prepare": "husky"`  
  → Mỗi lần chạy `npm ci` / `npm install`, npm gọi `prepare` → chạy `husky`. Husky cần thư mục `.git` để cài git hooks (pre-commit, …).
- **Vấn đề:** Trên **Railway** (và nhiều môi trường deploy), bản build **không có** thư mục `.git` (chỉ có source đã upload). Khi Nixpacks chạy `npm ci`, `prepare` vẫn chạy → husky báo **“.git can't be found”** trong log. Không làm build fail nhưng gây nhiễu log.
- **Sau:**  
  `"prepare": "node -e \"require('fs').existsSync('.git')&&require('child_process').execSync('npx husky',{stdio:'inherit'})\""`  
  → Chỉ chạy `npx husky` khi **tồn tại** thư mục `.git`. Trên máy dev / trên GitHub Actions (có checkout) thì có `.git` → husky vẫn chạy bình thường. Trên Railway (không có `.git`) → bỏ qua husky, không in lỗi.
- **Kết quả:** Log build Railway không còn dòng “.git can't be found” từ husky.

---

### 2.2. `docs/GITHUB_ACTIONS_CI_CD.md`

#### 2.2.1. Thêm §7a – Chỉ deploy bằng workflow, tránh hai deployment

- **Vị trí:** Sau mục 7 (Deploy trong workflow – Railway CLI), trước §7b (Deploy hook).
- **Nội dung:**  
  - **Mục tiêu:** Chỉ có **một** nguồn deploy là job Deploy trong workflow (Railway CLI). Tránh tình trạng mỗi push tạo **hai** deployment trên Railway (một “via GitHub” vì Railway còn kết nối repo, một “via CLI” vì workflow chạy `railway up --ci`).  
  - **Cách làm:** Trên Railway → Project → Service → **Settings** → phần **Source** (kết nối GitHub) → bấm **Disconnect**.  
  - **Kết quả:** Railway không còn tự deploy khi có push; mỗi push `main` chỉ tạo một deployment từ workflow.  
  - **Lưu ý:** Sau khi Disconnect, deploy chỉ qua GitHub Actions (với `RAILWAY_TOKEN`), Railway Dashboard (Command Palette → “Deploy Latest Commit”), hoặc Railway CLI local.  
  - Có link tới tài liệu Railway: Disable automatic deployments → Disconnect.
- **Lý do:** Người dùng (và người đọc sau) cần biết **bước bắt buộc trên Railway** để đạt đúng mô hình “chỉ deploy bằng workflow”, tránh nhầm lẫn khi thấy hai deployment.

#### 2.2.2. Thêm §8a – Log deploy, đọc log và lưu ý

- **Vị trí:** Sau §8 (Bất đồng bộ workflow vs Railway), trước §9 (Tóm tắt checklist).
- **Nội dung:** Bảng giải thích từng hiện tượng thường gặp trong log deploy và cách xử lý:  
  - **Node version mismatch** → thêm `engines.node` trong `package.json`.  
  - **npm deprecated** (crypto, glob, …) → gợi ý bỏ `crypto` (npm), cập nhật dần dependency.  
  - **29 vulnerabilities** → chạy `npm audit` / `npm audit fix`.  
  - **.git can't be found** (husky) → đã xử lý bằng script `prepare` có điều kiện.  
  - **Successfully Built! / Deploy complete** → deploy ổn.
- **Lý do:** Giúp ai xem log Actions / Railway hiểu nhanh các dòng cảnh báo và biết đã xử lý những gì trong repo (engines, crypto, prepare).

#### 2.2.3. Cập nhật §9 – Checklist

- **Thay đổi:**  
  - Dòng về Railway: thêm ý **hoặc** nếu **chỉ deploy bằng workflow** thì Railway → Service Settings → Source → **Disconnect** (tránh hai deployment), và tham chiếu §7a.  
  - Dòng về Wait for CI: nêu rõ **bật** nếu Railway tự deploy; **tắt / Disconnect** nếu chỉ dùng deploy trong workflow (Railway CLI).
- **Lý do:** Checklist phản ánh đúng hai cách dùng (Railway tự deploy vs deploy chỉ từ workflow) và bước Disconnect khi chọn cách thứ hai.

---

### 2.3. `docs/CI_RAILWAY_DESYNC.md`

#### 2.3.1. Bổ sung trong §4.3 (Deploy từ GitHub Actions bằng Railway CLI)

- **Thay đổi:**  
  - Đầu mục 4.3: thêm câu nhắc **trên Railway cần Disconnect** repo trong Service Settings (Source) để tắt auto-deploy từ GitHub; nếu không, mỗi push sẽ có **hai** deployment (một “via GitHub”, một “via CLI”).  
  - Cuối mục 4.3: thêm dòng **Chi tiết bước Disconnect và checklist** với link tới [GITHUB_ACTIONS_CI_CD.md §7a](./GITHUB_ACTIONS_CI_CD.md#7a-chỉ-deploy-bằng-workflow--tránh-hai-deployment-via-github--via-cli).
- **Lý do:** File này giải thích “bất đồng bộ” và giải pháp “deploy trong workflow”; cần nhắc rõ bước Disconnect và dẫn sang nơi có hướng dẫn từng bước (§7a).

---

## 3. Việc làm trên Railway (không nằm trong repo)

Để **chỉ còn một deployment** mỗi push, bạn cần **tự thao tác** trên Railway một lần:

1. Railway Dashboard → Project → Service (vd. **web_vocab_v0**).  
2. **Settings** của service.  
3. Phần **Source** (kết nối GitHub) → bấm **Disconnect**.

Sau đó mỗi lần push `main`, chỉ job Deploy trong workflow (với `RAILWAY_TOKEN`) tạo deployment; Railway không còn tạo deployment từ kết nối GitHub.

---

## 4. Tóm tắt theo mục đích

| Mục đích | Đã xử lý trong repo |
|----------|----------------------|
| **Chỉ deploy bằng workflow, tránh hai deployment** | Doc §7a + cập nhật §9 trong GITHUB_ACTIONS_CI_CD.md; bổ sung §4.3 trong CI_RAILWAY_DESYNC.md. Bước thực hiện (Disconnect) làm trên Railway. |
| **Đồng bộ Node version CI vs Railway** | `package.json`: thêm `engines.node` >= 20. |
| **Giảm cảnh báo trong log deploy** | `package.json`: xóa dependency `crypto`; sửa `prepare` để husky chỉ chạy khi có `.git`. |
| **Giúp đọc log và biết đã xử lý gì** | Doc §8a trong GITHUB_ACTIONS_CI_CD.md (bảng log deploy). |

---

## 5. Tài liệu liên quan

- [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md) – CI/CD với Railway, §7a (Disconnect), §7 (Railway CLI), §8a (log deploy), §9 (checklist).
- [CI_RAILWAY_DESYNC.md](./CI_RAILWAY_DESYNC.md) – Bất đồng bộ workflow vs Railway, §4.3 (deploy bằng CLI + Disconnect).
- [NPM_AUDIT_VULNERABILITIES.md](./NPM_AUDIT_VULNERABILITIES.md) – Xử lý npm audit (29 → 0 vulnerabilities), nodemailer 8 + SESv2, xlsx CDN; không thay đổi logic.
