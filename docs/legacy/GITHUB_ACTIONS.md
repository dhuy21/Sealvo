# GitHub Actions – CI (lint + test)

Workflow chạy mỗi khi **push** hoặc **pull request** lên nhánh `main` hoặc `master`.

## Vị trí

- **File workflow:** `src/.github/workflows/ci-cd.yml` (nằm trong repo, root repo là `src/`).

## Các bước chạy

1. Checkout code
2. Setup Node.js 20, cache npm
3. `npm ci` (cài đúng bản theo package-lock.json)
4. **Lint:** `npm run lint`
5. **Format check:** `npm run format:check`
6. **Test:** `npm test`
7. CI summary

**Môi trường CI:** Job chạy với `NODE_ENV=test` và `SESSION_SECRET` (dummy cho session trong integration test). Không có file `.env` trên runner; biến set trong workflow `env:`.

Nếu một bước fail thì toàn bộ job fail (ví dụ push bị “đỏ” trên GitHub).

## Xem kết quả

- Trên GitHub: repo → tab **Actions** → chọn run (theo commit / branch).
- Push code lên `main` hoặc `master` (hoặc mở PR) để workflow tự chạy.

## Chỉnh sửa

- Đổi nhánh: sửa `branches: [main, master]` trong `on.push` và `on.pull_request`.
- Bỏ format check: xóa step **Format check** trong `ci-cd.yml`.
- Thêm bước khác: thêm step mới trong `jobs.lint-and-test.steps`.

## CI/CD đầy đủ (Railway, Wait for CI, healthcheck)

Hướng dẫn đầy đủ để kết nối CI với CD (deploy chỉ khi CI pass), cấu hình Railway (Wait for CI, Root Directory, healthcheck): [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md).
