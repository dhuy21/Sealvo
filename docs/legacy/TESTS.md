# Tests – Cấu trúc và phạm vi

Tổng quan test trong project: **unit** (middleware, sanitization) và **integration** (routes với Supertest, mock DB). Tất cả chạy trong CI **không cần** file `.env` hay secret.

## Cấu trúc

| File | Loại | Nội dung |
|------|------|----------|
| `__tests__/middleware/auth.test.js` | Unit | `isAuthenticated`, `isAuthenticatedAPI` — redirect/401 khi không có session. |
| `__tests__/middleware/flash.test.js` | Unit | `setFlash`, `getFlash`, `flashToLocalsMiddleware`. |
| `__tests__/unit/sanitization.test.js` | Unit | `sanitizeUsername`, `sanitizeEmail`, `sanitizeHtml`, `escapeHelper`, `sanitizeText`, `sanitizeObject`, middleware `sanitizeInput`. |
| `__tests__/unit/inputSanitization.test.js` | Unit | `generalSanitizationMiddleware` (GET/POST + next), cấu trúc `sanitizationRoutes`. |
| `__tests__/unit/siteController.test.js` | Unit | `SiteController` index, aboutme, feedback — `res.render` với đúng view/title. |
| `__tests__/unit/ttsController.test.js` | Unit | `TTSController.generateAudio` — 400 khi thiếu text/language, 400 khi không có voice, 200 + buffer khi TTS thành công (mock `google_cloud_tts`). |
| `__tests__/unit/levelProgressController.test.js` | Unit | `LevelProgressController.trackGameCompletion` — 401 khi chưa auth, 400 khi thiếu params hoặc game_type không hợp lệ. |
| `__tests__/unit/learningController.test.js` | Unit | `LearningController.checkAndUpdateStreak` — cập nhật streak khi chưa update hôm nay, trả updated: false khi đã update, 500 khi model throw (mock `userModel`). |
| `__tests__/auth.integration.test.js` | Integration | GET/POST `/login`, `/registre`, `/login/forgotPassword`, GET `/logout` — validation (400), mock DB. |
| `__tests__/site.integration.test.js` | Integration | GET `/`, `/aboutme`, `/feedback`; POST `/feedback` (400 khi thiếu field); GET route không tồn tại → 404. |
| `__tests__/protected-routes.integration.test.js` | Integration | GET `/dashboard`, `/monVocabs`, `/myPackages`, `/games` → 302 redirect `/login`; POST `/update-streak` → 401. |
| `__tests__/api.integration.test.js` | Integration | GET `/health` → 200 + `{ ok: true }`; POST `/api/tts/generate` → 400 khi thiếu text/language; POST/GET `/level-progress/*` → 401 khi chưa auth. |

## Chạy test

- **Local:** `npm test` (từ thư mục `src/`). Có thể dùng `.env`; integration test mock DB nên không bắt buộc.
- **CI:** Workflow `ci-cd.yml` chạy `npm test` với `NODE_ENV=test` và `SESSION_SECRET` dummy; không có `.env`.

## Nguyên tắc

- **Unit:** Test logic thuần (middleware, utils), mock req/res/next hoặc dependency.
- **Integration:** Test HTTP (Supertest) với `getApp()`, mock `global.dbConnection`; không gọi DB/API thật. TTS dùng lazy init nên không crash khi thiếu credentials.

---

## Phạm vi: đã cover vs chưa cover

### Đã cover (đủ cho CI và kỹ năng fullstack)

- **Auth:** Login/registre/logout/forgotPassword — GET 200, POST validation (400), redirect/401 khi cần.
- **Site:** Home, aboutme, feedback (GET + POST validation), 404.
- **Protected:** Redirect khi chưa login (dashboard, monVocabs, myPackages, games); API update-streak, level-progress → 401.
- **API:** Health 200, TTS validation 400.
- **Unit:** Middleware auth/flash, toàn bộ sanitization (utils + middleware).

### Chưa cover (trong thực tế thường không bắt buộc)

- **Khi đã đăng nhập:** GET /dashboard, /myPackages, /monVocabs, /games trả 200 (cần mock session + DB). Có thể thêm 1–2 test dạng này nếu muốn chứng minh “route hoạt động khi auth”.
- **Package/Word CRUD:** POST create, delete, edit, copy, toggle — nhiều nhánh, mock DB phức tạp; thường test thủ công hoặc E2E.
- **Game API:** GET /games/.../cards, /words, /phrases — cần session + mock DB trả list; tùy chọn.
- **Reset password:** GET/POST resetPassword, changePassword — flow dài, có token/email; thường test local hoặc bỏ qua trong CI.
- **OAuth / email verification:** Google callback, verify email — phụ thuộc bên ngoài; thường không test trong CI.
- **API reminder/testEmail:** Gửi email thật hoặc mock Mailersend; có thể test nhưng cần mock service.
- **Models / services:** Không unit test trực tiếp; logic phức tạp có thể test qua integration hoặc mock.

---

## Có cần thêm test để “bao phủ toàn bộ”?

**Không bắt buộc.** Trong thực tế rất ít project đạt 100% coverage; mục tiêu thường là:

- Luồng quan trọng: auth, validation, route bảo vệ, API contract (health, 400, 401).
- Unit cho middleware và utils dùng chung (sanitization, auth).

Phạm vi hiện tại **đã đủ** cho CI ổn định và thể hiện kỹ năng test (unit + integration). Nếu muốn **mở rộng** (tùy chọn):

1. **Integration “khi đã auth”:** Mock `req.session.user` + DB trả dữ liệu giả → test GET /dashboard (hoặc /myPackages) trả 200.
2. **Validation thêm:** Một vài POST quan trọng khác (vd resetPassword thiếu field → 400) nếu bạn muốn an toàn hơn.

Không cần thêm test cho từng route con (từng game, từng package CRUD) trừ khi bạn muốn đầu tư thời gian cho coverage cao.
