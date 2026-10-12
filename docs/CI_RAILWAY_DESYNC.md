# Tại sao job "Deploy" trong workflow không đồng bộ với deploy trên Railway?

Tài liệu này giải thích **nguyên nhân kỹ thuật** của sự bất đồng bộ giữa GitHub Actions và Railway deploy, và **các giải pháp** hợp lý.

---

## 1. Hiện tượng

- **GitHub Actions:** Workflow "CI/CD" báo **Success** (job "Lint & Test" ✓, job "Deploy (hook optional)" ✓).
- **Railway:** Vẫn đang **Building** hoặc **Deploying** — chưa xong.
- **Cảm giác:** "CI/CD đã xong nhưng production chưa sẵn sàng" → **bất đồng bộ**.

---

## 2. Nguyên nhân gốc (đào sâu)

### 2.1. Job "Deploy" trong `ci-cd.yml` **không phải** là Railway deploy

Trong `ci-cd.yml`:

```yaml
deploy:
  name: Deploy (hook optional)
  needs: lint-and-test
  steps:
    - run: |
        if [ -n "${{ secrets.DEPLOY_HOOK_URL }}" ]; then
          curl -X POST "${{ secrets.DEPLOY_HOOK_URL }}"
        else
          echo "DEPLOY_HOOK_URL not set — skip (Railway Wait for CI vẫn deploy khi CI pass)."
        fi
```

- **Khi dùng Railway + "Wait for CI":** `DEPLOY_HOOK_URL` thường **không** set → job chỉ in một dòng và **kết thúc trong vài giây**.
- Job này **không gọi API Railway**, **không đợi** Railway làm gì. Nó chỉ dành cho nền tảng dùng **deploy hook** (vd: Render).
- **Kết luận:** Job "Deploy" trong workflow = **bước tùy chọn (hook)** cho dịch vụ khác, **không phải** lệnh "deploy lên Railway" hay "đợi Railway xong".

### 2.2. Railway deploy được kích hoạt **bởi ai, khi nào?**

Khi bật **Wait for CI** trên Railway:

1. Railway kết nối repo qua **GitHub App / integration**.
2. Railway **không** deploy ngay khi có push. Nó **chờ** **status check** của nhánh đó (vd: workflow "CI/CD") **thành công**.
3. **Status check thành công** = toàn bộ **workflow run** (tất cả jobs) **hoàn thành thành công**. Tức là khi job "Deploy (hook optional)" vừa chạy xong (vài giây) → workflow run kết thúc → GitHub đánh dấu check "CI/CD" = **success**.
4. **Ngay lúc đó** Railway nhận tín hiệu "check pass" → Railway **bắt đầu** build + deploy (clone repo, `npm ci`, build, start container, healthcheck). Railway **chưa** deploy xong — nó **vừa mới bắt đầu**.

**Trình tự thời gian:**

```
t=0s    Push lên main
t=0s    GitHub Actions bắt đầu (lint-and-test)
t=~1min lint-and-test xong ✓
t=~1min Job "deploy" chạy (hook optional) → vài giây → xong ✓
t=~1min Workflow run kết thúc → GitHub đánh dấu "CI/CD" = success
        ─────────────────────────────────────────────────────
        Railway thấy "CI/CD" success → Railway BẮT ĐẦU build/deploy
        ─────────────────────────────────────────────────────
t=~1min Bạn thấy Actions "xanh" ← workflow đã xong
t=1–5min Railway đang build, rồi deploy, rồi healthcheck
t=~5min Railway deploy xong → app mới live
```

Vì vậy **đồng bộ** theo thiết kế hiện tại **không thể** xảy ra trong **cùng một workflow run**: workflow kết thúc **trước** khi Railway bắt đầu build; Railway chỉ **bắt đầu** sau khi workflow đã xong.

### 2.3. Tóm tắt nguyên nhân

| Thành phần | Ai điều khiển? | Khi nào "xong"? |
|------------|-----------------|------------------|
| Workflow "CI/CD" | GitHub Actions | Khi job `lint-and-test` + job `deploy` chạy xong (job deploy chỉ là hook/no-op). |
| Deploy thật lên Railway | Railway backend | Khi Railway thấy CI pass → build → deploy → healthcheck (vài phút sau khi workflow đã xanh). |

Hai quá trình **độc lập**: workflow **không** chứa bước "đợi Railway build xong". Nên workflow "xong" luôn **trước** khi Railway deploy xong → **bất đồng bộ là đúng với thiết kế hiện tại**.

---

## 3. Deploy hook URL (DEPLOY_HOOK_URL) có đồng bộ được không?

**Câu trả lời ngắn: Không.** Có deploy hook URL **không** làm workflow “đợi” đến khi deploy thật sự xong; vẫn bất đồng bộ.

### 3.1. Deploy hook hoạt động thế nào?

**Deploy hook URL** (Render, một số nền tảng khác) là URL bạn gọi (GET hoặc POST) để **kích hoạt** một deploy mới.

- Bạn gọi: `curl -X POST "https://api.render.com/deploy/srv-xxx?key=yyy"` (hoặc tương tự).
- Server trả lời **ngay**: thường là **200 OK** (hoặc 202 Accepted) với nghĩa “đã nhận yêu cầu và **đã bắt đầu** deploy”.
- Deploy thật (build, start container, healthcheck) chạy **ở phía server**, **bất đồng bộ**. Có thể mất vài phút.
- Request HTTP của bạn **đã kết thúc** trong 1–2 giây; server **không** giữ kết nối đến khi deploy xong.

**Hệ quả:** Job “Deploy” trong workflow chỉ “gọi hook → nhận 200 → xong”. Nó **không** đợi build/deploy trên Railway hay Render hoàn tất.

### 3.2. Railway có “deploy hook URL” không?

- **Wait for CI:** Railway **không** dùng deploy hook từ phía bạn. Railway lắng nghe GitHub; khi status check “CI/CD” success thì Railway **tự** bắt đầu deploy. Không cần (và không dùng) `DEPLOY_HOOK_URL` trong workflow.
- **Trigger deploy bằng API:** Railway có **GraphQL API** (vd. mutation `serviceInstanceRedeploy`) để bạn **kích hoạt** một lần deploy. API trả về khi deploy **được đưa vào hàng / bắt đầu**, **không** chờ đến khi deploy **hoàn thành**. Nên dù bạn gọi API từ workflow, bước đó vẫn kết thúc sớm, deploy vẫn chạy nền → vẫn **không** đồng bộ.

### 3.3. Kết luận

| Cách kích hoạt deploy | Workflow có “đợi” deploy xong không? | Đồng bộ? |
|------------------------|--------------------------------------|----------|
| Railway “Wait for CI” (không hook) | Không — workflow xong trước, Railway mới bắt đầu. | Không |
| Deploy hook URL (Render, v.v.) | Không — hook trả 200 ngay khi deploy **bắt đầu**. | Không |
| Railway API trigger (GraphQL) | Không — API return khi deploy **được trigger**, không chờ xong. | Không |

**Có `DEPLOY_HOOK_URL`** chỉ giúp workflow **gửi tín hiệu “bắt đầu deploy”** (thay vì để platform tự lắng nghe GitHub). Nó **không** thay đổi việc “deploy chạy nền” và “workflow kết thúc trước khi deploy xong” → **vẫn không đồng bộ**.

Để **thật sự đồng bộ** (workflow chỉ xanh khi deploy đã xong), cần một trong các hướng đã nêu: workflow **post-deploy** (trigger bởi `deployment_status`), **polling** (đợi deployment success hoặc health), hoặc **CLI có chế độ block** (vd. Railway CLI `--ci`).

---

## 3.4. Tại sao Azure lại “đồng bộ” được?

Khi host trên **Azure (App Service)** với GitHub Actions, workflow thường **đồng bộ** với deploy: job Deploy chạy lâu (vài phút), workflow chỉ xanh khi bước deploy thật sự xong. Điều này **không kỳ lạ** — khác biệt nằm ở **kiến trúc**: ai làm deploy và làm **ở đâu**.

### Azure: deploy **trong** workflow (đồng bộ)

- Workflow có bước dùng **`azure/webapps-deploy`** (hoặc tương tự): build xong → **action đẩy** package/artifact lên Azure (upload qua API/Kudu).
- Action **block**: nó gọi API Azure, đẩy dữ liệu, và **chỉ thoát** khi Azure nhận xong (và thường khi deployment được chấp nhận / kích hoạt). Có thể mất vài phút.
- Workflow run **chưa kết thúc** cho đến khi bước deploy đó xong → bạn thấy “đồng bộ”: workflow xanh = deploy đã được đẩy lên Azure (và thường app đã nhận bản mới).

**Tóm lại:** Deploy **do workflow thực hiện** (action trong job). Job chỉ xong khi action xong → **đồng bộ**.

### Railway (Wait for CI): deploy **ngoài** workflow (bất đồng bộ)

- Workflow **không** chạy bước nào đẩy code lên Railway. Workflow chỉ: lint, test, (và có thể gọi deploy hook cho nền tảng khác).
- Railway **lắng nghe** GitHub: khi status check “CI/CD” **success** → Railway **tự** bắt đầu build + deploy trên hạ tầng của Railway.
- Workflow đã kết thúc **trước** lúc Railway bắt đầu → **bất đồng bộ**.

**Tóm lại:** Deploy **do Railway thực hiện**, **sau** khi workflow xong → **không** đồng bộ trong cùng một run.

### So sánh nhanh

| | Azure (webapps-deploy) | Railway (Wait for CI) |
|---|------------------------|------------------------|
| **Ai deploy?** | Workflow (action trong job) | Railway (sau khi workflow xong) |
| **Deploy chạy ở đâu?** | Trong bước của workflow (job đang chạy) | Ngoài workflow (Railway backend) |
| **Workflow “xong” khi nào?** | Sau khi bước deploy (upload + API) xong | Sau khi lint + test + job deploy (no-op) xong |
| **Cảm nhận** | Đồng bộ (job deploy block vài phút) | Bất đồng bộ (workflow xanh trước, Railway vẫn đang build) |

Vì vậy **Azure “đồng bộ”** vì deploy **nằm trong** workflow và action **block** đến khi xong; **Railway “bất đồng bộ”** vì deploy **không nằm trong** workflow mà do Railway kích hoạt sau khi workflow đã success. Không phải lỗi của Railway hay Azure — chỉ là **hai mô hình** khác nhau: **deploy-from-workflow** (Azure) vs **deploy-after-workflow** (Railway Wait for CI).

---

## 4. Giải pháp

### 4.1. Chấp nhận mô hình "hai giai đoạn" (khuyến nghị)

- **Giai đoạn 1 – Workflow CI/CD:** Đảm bảo **code hợp lệ** (lint, test). Workflow xanh = "code đủ điều kiện deploy".
- **Giai đoạn 2 – Railway:** Build và deploy thật, trạng thái xem trên **Railway Dashboard**. "Deploy xong" = khi Railway báo Success.

**Cách làm:** Xem trạng thái deploy thật trên Railway (Deployments). Không coi workflow "Deploy" = "Railway đã xong".

### 4.2. Workflow "chạy sau khi Railway deploy xong" (post-deploy)

Railway (khi dùng integration GitHub) **gửi sự kiện** lên GitHub khi deployment đổi trạng thái. GitHub gọi đó là **`deployment_status`**.

- Khi Railway deploy **thành công**, GitHub nhận `deployment_status` với `state: success`.
- Ta có thể tạo workflow **riêng** (`post-deploy.yml`) trigger bởi `deployment_status` → chỉ chạy **sau khi** Railway thực sự deploy xong.

**Lợi ích:** Có bước tự động (vd: chạy E2E, gửi thông báo) **đúng lúc** production đã sẵn sàng, không phụ thuộc vào thời điểm workflow CI kết thúc.

**Trong repo này:** Workflow post-deploy (trigger `deployment_status`) **không được triển khai** — deploy qua Railway CLI + Disconnect nên GitHub thường không nhận deployment_status. E2E sau deploy: chạy workflow **E2E Production** thủ công (Actions → Run workflow) hoặc schedule; xem [E2E_PLAYWRIGHT.md §8](./E2E_PLAYWRIGHT.md#8-e2e-trong-cicd--workflow-e2e-production).

### 4.3. Deploy từ GitHub Actions bằng Railway CLI (đồng bộ trong một run)

Nếu muốn **một workflow run** vừa lint/test vừa **đợi đến khi Railway deploy xong**:

- Trên Railway: **Disconnect** repo trong Service Settings (Source) để **tắt** auto-deploy từ GitHub. Nếu không, mỗi push sẽ có **hai** deployment (một "via GitHub", một "via CLI").
- Trong workflow: sau lint/test, gọi **Railway CLI** (vd: `railway up --ci`). Flag `--ci` khiến CLI **chờ** đến khi deployment success/fail rồi mới thoát.
- Khi bước đó xong, workflow mới kết thúc → "Deploy" trong workflow và deploy Railway **đồng bộ** trong cùng một run.

**Đổi đổi:** Cần cấu hình **Railway token** trong GitHub Secrets, và deploy do **Actions** kích hoạt thay vì Railway tự trigger khi CI pass. Đây là kiến trúc khác, phù hợp khi bạn muốn mọi thứ trong một pipeline duy nhất.

**Chi tiết bước Disconnect và checklist:** [GITHUB_ACTIONS_CI_CD.md §7a](./GITHUB_ACTIONS_CI_CD.md#7a-chỉ-deploy-bằng-workflow--tránh-hai-deployment-via-github--via-cli).

---

## 5. Trong repo này đã làm gì?

- **Giữ** `ci-cd.yml`: job Deploy dùng Railway CLI (`railway up --ci`), đồng bộ trong cùng run.
- **E2E sau deploy:** Không dùng workflow post-deploy (`deployment_status`) — với deploy qua CLI + Disconnect, thay vào đó chạy workflow **E2E Production** thủ công hoặc theo schedule (xem E2E_PLAYWRIGHT.md).
- **Tài liệu:** File này giải thích bất đồng bộ và các lựa chọn (post-deploy, E2E Production workflow).

---

## 6. Tài liệu liên quan

- [GITHUB_ACTIONS_CI_CD.md](./GITHUB_ACTIONS_CI_CD.md) — CI/CD với Railway, Wait for CI, healthcheck.
- [E2E_PLAYWRIGHT.md](./E2E_PLAYWRIGHT.md) — E2E; workflow "E2E Production" (chạy tay hoặc schedule sau deploy).
