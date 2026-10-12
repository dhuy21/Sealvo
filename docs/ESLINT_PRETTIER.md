# ESLint + Prettier

Chuẩn code và dễ review: lint và format được cấu hình trong **`src/`**.

## Lệnh (chạy từ `src/`)

| Lệnh | Mô tả |
|------|--------|
| `npm run lint` | Kiểm tra lint (ESLint) |
| `npm run lint:fix` | Tự sửa một số lỗi lint |
| `npm run format` | Format toàn bộ code theo Prettier |
| `npm run format:check` | Kiểm tra format (dùng trong CI) |

## Cấu hình

- **ESLint**: `src/eslint.config.js` (flat config), áp dụng cho server (Node) và client (`public/**/*.js`).
- **Prettier**: `src/.prettierrc.json`, `src/.prettierignore` (bỏ qua `node_modules`, `*.min.js`, `*.hbs`, …).

## Gợi ý workflow

- **Pre-commit (đã cấu hình):** Mỗi lần `git commit`, Husky chạy **lint-staged** — chỉ trên file bạn vừa stage: ESLint `--fix` + Prettier `--write`. Lỗi không sửa được → commit bị chặn.
- Trước khi commit (nếu cần): chạy `npm run lint` và `npm run format` trong `src/`.
- Bật **format on save** trong editor để giữ chuẩn khi code.

---

## Tại sao hay bị lỗi khi push (CI fail)?

1. **Format check fail (Prettier)**  
   Một hoặc vài file **chưa được format** theo Prettier (dấu cách, xuống dòng, dấu phẩy…). CI chạy `npm run format:check` → phát hiện khác với chuẩn → **exit code 1** → workflow fail.

   **Nguyên nhân thường gặp:**  
   - Sửa code nhưng không chạy Prettier (hoặc editor không format on save).  
   - Copy-paste từ nơi khác, style không giống `.prettierrc.json`.  
   - Nhiều người sửa, mỗi người một style.

2. **Lint warnings (ESLint)**  
   Hiện tại CI chỉ chạy `npm run lint`; **warning không làm fail** job (chỉ **error** mới fail).  
   Warning thường gặp: **biến/hàm khai báo nhưng không dùng** (`no-unused-vars`), **gán giá trị rồi không dùng** (`no-useless-assignment`).  
   Nếu sau này bật quy tắc “warning = fail” thì những chỗ này sẽ làm CI đỏ.

---

## Làm sao để lần sau không lặp lại?

### 1. Pre-commit hook (đã triển khai – chuẩn thực tế)

Repo **`src/`** đã cấu hình **Husky** + **lint-staged**:

- **Khi nào chạy:** Mỗi lần bạn chạy `git commit` (trong thư mục `src/`).
- **Chạy gì:** Trên **đúng các file đã stage** (không phải toàn bộ repo):
  - **`*.js`** → `eslint --fix` rồi `prettier --write`.
  - **`*.json`, `*.md`, `*.css`** → `prettier --write`.
- **Kết quả:** Nếu ESLint báo **error** (không sửa được bằng `--fix`) → commit **bị chặn**, terminal in lỗi; bạn sửa code rồi `git add` và commit lại. Format và lỗi lint tự sửa được thì được áp dụng vào file (có thể cần `git add` lại nếu muốn stage thay đổi do Prettier/ESLint).

**Cấu hình:** `.husky/pre-commit` → `npx lint-staged`; `src/package.json` → key `"lint-staged"`; script `"prepare": "husky"` (sau `npm install` hook được gắn vào `.git/hooks`). **Clone repo mới:** Vào `src/` và chạy `npm install` để hook có hiệu lực.

### 2. Trước mỗi lần commit (bổ sung)

Nếu muốn chắc giống CI (gồm test): trong **`src/`** chạy `npm run format`, `npm run lint`, `npm run format:check`, `npm test`. Pre-commit **không** chạy test (để commit nhanh); test do **CI** chạy khi push.

### 3. Bật Format on Save trong editor (Cursor / VS Code)

Settings (JSON): `"editor.formatOnSave": true`, `"editor.defaultFormatter": "esbenp.prettier-vscode"`. Mỗi lần Save → format theo Prettier.

### 4. Dọn dần lint warnings

- Chạy `npm run lint` → xem danh sách **warning**.  
- Sửa từng chỗ: xóa biến/hàm không dùng, hoặc dùng prefix `_` cho tham số cố ý không dùng (vd `_e`) nếu rule cho phép.  
- Làm dần để sau này nếu bật “warnings as errors” thì CI vẫn xanh.
