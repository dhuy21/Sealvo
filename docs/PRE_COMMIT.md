# Pre-commit (Husky + lint-staged)

Pre-commit được cấu hình trong **`src/`** (root của git repo). Mỗi lần `git commit`, chỉ **các file đã stage** được kiểm tra và tự sửa (lint/format); nếu có lỗi không sửa được thì commit bị chặn.

## Cấu hình hiện tại

| Thành phần | Vị trí | Nội dung |
|------------|--------|----------|
| **Husky** | `src/.husky/` | Thư mục hook; `pre-commit` chạy `npx lint-staged`. |
| **lint-staged** | `src/package.json` → `"lint-staged"` | `*.js` → `eslint --fix`, `prettier --write`; `*.json`, `*.md`, `*.css`, `*.yml`, `*.yaml` → `prettier --write`. |
| **prepare** | `src/package.json` → `"scripts"."prepare"` | `"husky"` — sau `npm install` sẽ gắn hook vào `.git/hooks`. |

**Lưu ý:** Thư mục `src/.husky/` và file `src/.husky/pre-commit` nên được **commit** vào repo để mọi người clone đều có cùng hook; sau khi clone chỉ cần `npm install` trong `src/` là hook có hiệu lực.

## Luồng khi commit

1. Bạn chạy `git add ...` rồi `git commit -m "..."` **trong thư mục `src/`**.
2. Husky chạy `.husky/pre-commit` → `npx lint-staged`.
3. **lint-staged** với từng file đã stage:
   - File `.js`: chạy `eslint --fix` rồi `prettier --write`. Nếu ESLint trả về **error** (không sửa được) → **exit code khác 0** → commit **bị hủy**, terminal in lỗi.
   - File `.json`, `.md`, `.css`, `.yml`, `.yaml`: chạy `prettier --write` (bao gồm workflow GitHub Actions).
4. Nếu mọi bước thành công → commit được tạo. Các thay đổi do Prettier/ESLint ghi vào file có thể chưa nằm trong commit đó (tùy bạn có `git add` lại hay không); lần commit sau sẽ bao gồm chúng nếu bạn add.

## Clone repo / máy mới

Sau khi clone (hoặc pull khi lần đầu thêm Husky), **bắt buộc** chạy trong **`src/`**:

```bash
cd src
npm install
```

Script `prepare` sẽ chạy và gắn hook vào `.git/hooks/pre-commit`. Không chạy `npm install` thì pre-commit sẽ không chạy.

## Bỏ qua pre-commit (chỉ khi cần)

Nếu cần commit tạm mà không chạy hook (ví dụ WIP, debug):

```bash
git commit -m "..." --no-verify
```

Không nên dùng thường xuyên; CI vẫn chạy lint/format khi push và có thể fail.

## Tài liệu liên quan

- **ESLint + Prettier (lint-staged, format on save):** [ESLINT_PRETTIER.md](./ESLINT_PRETTIER.md)
- **CI/CD:** [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md)
