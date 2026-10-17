# Test: Auth middleware tập trung (lỗi 3.4)

## 1. Kiểm tra nhanh (code)

Từ thư mục gốc project:

```bash
bash scripts/check-auth-middleware.sh
```

Kỳ vọng: 3 dòng OK (có `middleware/auth.js`, không còn auth trùng trong routes, đủ 13 file dùng middleware/auth).

**Hoặc kiểm tra tay:**

- Không còn logic auth trong routes:  
  `grep -r "if (req.session" src/app/routes/ --include="*.js"` → không có kết quả.
- Các route bảo vệ dùng middleware:  
  `grep -rl "require.*middleware/auth" src/app/routes/ --include="*.js"` → khoảng 13 file.

---

## 2. Kiểm tra runtime (server chạy)

| Trạng thái   | Thao tác                          | Kỳ vọng |
|-------------|------------------------------------|--------|
| Chưa login  | Mở `/dashboard`, `/monVocabs`, `/games` | Redirect về `/login` (URL sạch, không `?error=`). Trang login hiển thị message flash. |
| Chưa login  | Fetch POST `/update-streak` hoặc GET `/level-progress/status` | 401 + JSON. |
| Đã login    | Mở các trang trên, gọi API trên   | 200, không redirect, không 401. |

**curl nhanh (chưa login):**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard   # 302
curl -s -w "\n%{http_code}\n" http://localhost:3000/level-progress/status # 401
```

---

## Checklist

- [ ] Script `check-auth-middleware.sh` báo 3 OK.
- [ ] Chưa login → redirect `/login`, message hiện trên trang (flash), không có `?error=` trên URL.
- [ ] Chưa login → API trả 401 JSON.
- [ ] Đã login → trang và API hoạt động bình thường.
