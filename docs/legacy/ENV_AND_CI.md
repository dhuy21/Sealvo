# Biến môi trường và CI (tests sans .env)

## Nguyên tắc

- File **`.env`** chứa secret (DB, Google credentials, …) và **không** được commit (đã có trong `.gitignore`).
- Trong **CI** (GitHub Actions) không có file `.env` → nhiều biến môi trường sẽ **undefined**.

## Cách tránh crash khi load app trong CI

- **Không** gọi `JSON.parse(process.env.XXX)` hoặc đọc secret **ở top-level** của một file (ngay khi `require()`).
- Nếu làm vậy, mọi test nào load app (integration tests) sẽ crash ngay khi require module đó vì `process.env.XXX` là `undefined` trong CI.
- **Đúng cách:** Đọc/parse credentials **chỉ khi cần dùng** (lazy init), ví dụ trong một hàm `getClient()` được gọi lần đầu khi xử lý request TTS. Khi đó:
  - App và các test không gọi TTS vẫn load bình thường trong CI.
  - Chỉ khi có request thật tới TTS mới cần `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`; nếu thiếu thì throw error rõ ràng tại chỗ gọi.

## Ví dụ trong project

- **`app/services/google_cloud_tts.js`** : client Google TTS được tạo trong `getClient()` (lazy), không parse env au top-level. CI chạy tests không cần set biến này.

## Nếu sau này cần test gọi TTS trong CI

- **Option 1:** Mock service TTS trong test (không gọi API Google thật).
- **Option 2:** Trong GitHub Actions set biến **fake** (JSON hợp lệ nhưng không phải key thật) qua **Secrets** hoặc `env:` trong workflow, chỉ để tránh crash; test vẫn nên mock. **Không** commit file `.env` hay key thật.
