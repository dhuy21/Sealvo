# Git + GitHub cho project (repo trong `src/`)

## Cấu trúc hiện tại

- **Thư mục chứa repo Git:** `Web_vocab_v0/src/`  
  → Mọi lệnh Git phải chạy từ đây: `cd Web_vocab_v0/src` (hoặc `cd src` nếu đã ở trong `Web_vocab_v0`).

- **Nội dung được version:** Mọi thứ trong `src/` (app/, app.js, package.json, public/, README.md, .gitignore, …).

- **Nằm ngoài repo:** Các thư mục/file ở **ngoài** `src/` (ví dụ: `ANALYSE_PROJET.md`, `docs/`, `scripts/`) **không** được Git theo dõi. Nếu muốn đưa vào repo, cần chuyển chúng vào trong `src/` hoặc đổi lại gốc repo (xem bên dưới).

- **Remote hiện có:** `origin` → `https://github.com/dhuy21/Web_vocab_v0.git` (GitHub).

---

## Quy trình làm việc hàng ngày (từ máy bạn)

1. **Mở terminal, vào đúng thư mục repo:**
   ```bash
   cd /home/dhuy21/Documents/dev/Projet/Web_vocab_v0/src
   ```

2. **Xem trạng thái:**  
   `git status`

3. **Thêm file, commit, đẩy lên GitHub:**
   - Thêm: `git add .` hoặc `git add <tên file>`
   - Commit: `git commit -m "mô tả ngắn thay đổi"`
   - Đẩy: `git push origin main`

4. **Lấy thay đổi mới từ GitHub (nếu làm trên máy khác hoặc với người khác):**  
   `git pull origin main`

---

## Thêm GitLab (nếu dùng song song với GitHub)

1. Tạo repo trống trên GitLab (không khởi tạo README).
2. Trong `src/` chạy:
   - Thêm remote:  
     `git remote add gitlab https://gitlab.com/<username>/<repo>.git`
   - Đẩy nhánh:  
     `git push gitlab main`
3. Sau này: đẩy lên cả hai với `git push origin main` và `git push gitlab main`, hoặc dùng `git push --all` nếu cấu hình push mặc định.

---

## Muốn version cả `docs/`, `scripts/`, `ANALYSE_PROJET.md`?

Hai hướng:

- **Cách 1 – Giữ repo trong `src/`:**  
  Copy hoặc move `docs/`, `scripts/`, `ANALYSE_PROJET.md` vào trong `src/` rồi `git add` + `git commit` + `git push`. Như vậy cấu trúc thư mục project (app, public, …) vẫn trong `src/`, chỉ thêm các thư mục/file này vào cùng chỗ.

- **Cách 2 – Đưa toàn bộ `Web_vocab_v0` thành một repo:**  
  Chuyển repo lên thư mục cha (gốc project), để toàn bộ `Web_vocab_v0` (gồm cả `src/`, `docs/`, `scripts/`) là một repo. Cần di chuyển thư mục `.git` từ `src/` lên `Web_vocab_v0/` và chỉnh lại đường dẫn (có thể phức tạp hơn nếu đã có lịch sử commit).

Khuyến nghị cho sinh viên / một mình làm: **Cách 1** (đưa `docs/`, `scripts/`, file phân tích vào trong `src/`) là đơn giản và vẫn đúng với lưu ý “git nằm ở src, toàn bộ project trong src”.

---

## Trạng thái hiện tại (khi tạo file này)

- Nhánh: `main`, đã đồng bộ với `origin/main`.
- Có nhiều file đã sửa (auth, flash, routes, views, …) và 2 file mới (`app/middleware/auth.js`, `app/middleware/flash.js`) chưa commit.
- Khi sẵn sàng, vào `src/` rồi: `git add .` → `git commit -m "..."` → `git push origin main`.
