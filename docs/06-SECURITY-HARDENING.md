# 6. Security Hardening (Nâng cao)

> Kỹ năng cần thiết cho Fullstack Developer
> Trạng thái: **Phase 1, 2, 3 — VALIDATED** | Phase 4, 5 → chuyển sang Skill 8

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kế hoạch 5 Phase](#2-kế-hoạch-5-phase)
3. [Phase 1 — Security Baseline Assessment](#3-phase-1--security-baseline-assessment)
4. [Phase 2 — CSRF Protection](#4-phase-2--csrf-protection)
5. [Phase 3 — Permissions-Policy & CSP Hardening](#5-phase-3--permissions-policy--csp-hardening)
6. [Phase 4 & 5 — Chuyển sang Skill 8](#6-phase-4--5--chuyển-sang-skill-8)
7. [Tests automatisés](#7-tests-automatisés)
8. [Tests manuels](#8-tests-manuels)
9. [Brainstorming & Q&A](#9-brainstorming--qa)
10. [Matrice de sécurité — 25 endpoints](#10-matrice-de-sécurité--25-endpoints)

---

## 1. Tổng quan

### Mục tiêu

Hardening (gia cố) toàn bộ lớp bảo mật của ứng dụng web SealVo — từ input validation, secret management, CSRF protection, đến HTTP security headers — theo chuẩn chuyên nghiệp và phù hợp với môi trường production (Railway) lẫn local development.

### Nguyên tắc

- **Defense-in-depth**: Nhiều lớp bảo mật, không phụ thuộc một lớp duy nhất.
- **Fail-fast**: Crash sớm nếu cấu hình bảo mật thiếu/sai (production).
- **Graceful degradation**: Khi Redis down, rate limiting tạm thời tắt thay vì crash app.
- **Least privilege**: CSP, Permissions-Policy chỉ cho phép đúng những gì cần thiết.
- **Stateless verification**: CSRF dùng Double-Submit Cookie (không cần server state).

### Các file đã tạo/sửa

| File                                    | Hành động                                       | Phase |
| --------------------------------------- | ----------------------------------------------- | ----- |
| `app/config/secrets.js`                 | **MỚI** — Fail-fast secret validation           | 1     |
| `app/middleware/inputSanitization.js`   | SỬA — Thêm editWord route, sửa addWord path     | 1     |
| `app/middleware/auth.js`                | SỬA — Thêm `requireCronSecret`                  | 1     |
| `app/routes/health.js`                  | SỬA — Thêm `requireCronSecret` trên `/deps`     | 1     |
| `app/routes/user/dashboard.js`          | SỬA — Thêm `emailLimiter` trên `changePassword` | 1     |
| `.github/workflows/ci-cd.yml`           | SỬA — Thêm `npm audit` trong CI                 | 1     |
| `app.js`                                | SỬA — Gọi `validateSecrets()` khi boot          | 1     |
| `app/middleware/csrf.js`                | **MỚI** — Double-Submit Cookie CSRF             | 2     |
| `public/js/csrf.js`                     | **MỚI** — Fetch interceptor frontend            | 2     |
| `app/middleware/index.js`               | SỬA — Tích hợp CSRF middleware                  | 2     |
| `app/views/layouts/main.hbs`            | SỬA — Thêm meta csrf-token + script csrf.js     | 2     |
| `app/views/login.hbs`                   | SỬA — Thêm hidden `_csrf` field                 | 2     |
| `app/views/registre.hbs`                | SỬA — Thêm hidden `_csrf` field                 | 2     |
| `app/views/forgotPassword.hbs`          | SỬA — Thêm hidden `_csrf` field                 | 2     |
| `app/views/resetPassword.hbs`           | SỬA — Thêm hidden `_csrf` field                 | 2     |
| `app/views/feedback.hbs`                | SỬA — Thêm hidden `_csrf` field                 | 2     |
| `app/views/addWord.hbs`                 | SỬA — Thêm hidden `_csrf` field (2 forms)       | 2     |
| `package.json`                          | SỬA — `NODE_ENV=test` explicit trong scripts    | 2     |
| `app/middleware/security.js`            | SỬA — Thêm Permissions-Policy, harden CSP       | 3     |
| `__tests__/unit/secrets.test.js`        | **MỚI** — 5 tests                               | Test  |
| `__tests__/middleware/csrf.test.js`     | **MỚI** — 18 tests                              | Test  |
| `__tests__/middleware/security.test.js` | **MỚI** — 20 tests                              | Test  |

---

## 2. Kế hoạch 5 Phase

| Phase | Tên                                    |  Trạng thái   |
| ----- | -------------------------------------- | :-----------: |
| 1     | Security Baseline Assessment           | **VALIDATED** |
| 2     | CSRF Protection (Double-Submit Cookie) | **VALIDATED** |
| 3     | Permissions-Policy & CSP Hardening     | **VALIDATED** |
| 4     | Security Monitoring / Logging          |   → Skill 8   |
| 5     | Documentation                          |   → Skill 8   |

**Quyết định**: Phase 4 (Security Monitoring) và Phase 5 (Documentation) được chuyển sang Skill "8. Structured Logging & Error Handling & Monitoring" vì:

- Security monitoring cần một hạ tầng logging chưa có (hiện tại chỉ dùng `console.*`).
- Xây monitoring trên nền `console.log` là anti-pattern — cần xây logging infrastructure trước.
- Documentation là quá trình liên tục, không cần phase riêng.

---

## 3. Phase 1 — Security Baseline Assessment

### 3.1 Input Sanitization (Sửa lỗi)

**Vấn đề phát hiện**: Route addWord trỏ sai path (`/addWord` thay vì `/monVocabs/add`), thiếu route editWord.

**Giải pháp** (`app/middleware/inputSanitization.js`):

```javascript
const sanitizationRoutes = {
  registration: { path: '/registre', fields: { username: 'username', email: 'email' } },
  googleAuth: { path: '/auth/google/callback', fields: { username: 'username', email: 'email' } },
  addWord: { path: '/monVocabs/add', fields: WORD_FIELDS },
  editWord: { path: '/monVocabs/edit', fields: WORD_FIELDS }, // MỚI
};
```

- `WORD_FIELDS` được chia sẻ giữa addWord và editWord (DRY).
- `generalSanitizationMiddleware` là catch-all cho mọi POST body.
- Sanitization dùng DOMPurify (strip ALL tags), `html-entities` (encode), `validator` (email).

### 3.2 Fail-Fast Secret Validation

**Nguyên tắc**: App PHẢI crash ngay khi boot nếu secrets thiếu/yếu trong production.

**File mới** (`app/config/secrets.js`):

```javascript
const RULES = [
  { key: 'SESSION_SECRET', minLength: 32, reason: '...' },
  { key: 'CRON_SECRET', minLength: 16, reason: '...' },
];

function validateSecrets() {
  // Thu thập tất cả lỗi vào một banner duy nhất
  // Production → process.exit(1)
  // Development → console.warn (chỉ warning)
}
```

Gọi trong `app.js` TRƯỚC mọi kết nối DB/Redis:

```javascript
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { validateSecrets } = require('./app/config/secrets');
validateSecrets(); // Fail-fast: crash trước khi app chạy
```

### 3.3 SCA (Software Composition Analysis) trong CI

Thêm bước `npm audit` vào CI/CD pipeline (`.github/workflows/ci-cd.yml`):

```yaml
- name: NPM audit (production deps)
  run: npm audit --audit-level=critical --omit=dev
```

Chạy sau `npm ci`, trước `lint` và `test`. Chỉ block trên vulnerabilities **critical** (high/moderate chỉ warning).

Sau khi test manual, phát hiện 3 vulns fixable → đã chạy `npm audit fix`:

- `dompurify` (moderate XSS) → đã fix
- `express-rate-limit` (high IPv6 bypass) → đã fix
- `multer` (high DoS) → đã fix

### 3.4 Rate Limiting trên các endpoints nhạy cảm

**Thêm `emailLimiter` trên `POST /dashboard/changePassword`** — endpoint trước đó thiếu rate limit riêng.

Kiến trúc rate limiting (KHÔNG trùng lặp):

- `express-rate-limit` = thư viện logic (đếm, quyết định, block)
- `rate-limit-redis` (RedisStore) = backend lưu trữ (đếm trong Redis, chia sẻ giữa các instances)
- Fallback MemoryStore nếu Redis down
- `safeLimiter()` = graceful degradation (Redis error → cho qua thay vì crash)

7 limiters, 2 tầng:

| Tầng        | Limiter                        | Nơi áp dụng                                 | Bảo vệ              |
| ----------- | ------------------------------ | ------------------------------------------- | ------------------- |
| App-level   | `globalLimiter` (100/min)      | Tất cả routes                               | DDoS                |
| Route-level | `loginLimiter` (10/15min)      | POST /login                                 | Brute-force         |
| Route-level | `registerLimiter` (5/15min)    | POST /registre                              | Spam tài khoản      |
| Route-level | `forgotPasswordLimiter` (3/1h) | POST /forgotPassword                        | Spam email reset    |
| Route-level | `emailLimiter` (3/1h)          | POST /reminder, /testEmail, /changePassword | Lạm dụng email      |
| Route-level | `ttsLimiter` (30/min)          | POST /api/tts/generate                      | Lạm dụng Google TTS |
| Route-level | `feedbackLimiter` (5/1h)       | POST /feedback                              | Spam feedback       |

### 3.5 Secret Protection (CRON_SECRET)

**Thêm `requireCronSecret`** middleware cho:

- `GET /health/deps` — thông tin nhạy cảm về infrastructure
- `POST /api/reminder` — trigger email hàng loạt

Sử dụng `crypto.timingSafeEqual` để chống timing attack:

```javascript
const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: 'Service not configured.' });

  const providedSecret = req.headers['x-cron-secret'] || '';
  if (
    providedSecret.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(secret))
  ) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  next();
};
```

### 3.6 Query Parameter Validation

Tất cả routes đều có `validate(schema)` middleware với `express-validator`. Schemas kiểm tra `query()`, `param()`, `body()` tùy endpoint.

### Bugs phát hiện và sửa trong Phase 1

| Bug                                | Nguồn gốc                                                | Fix                                                         |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Tests `/health/deps` fail HTTP 503 | Thêm `requireCronSecret` nhưng tests không gửi header    | Thêm `CRON_SECRET` env + `X-Cron-Secret` header trong tests |
| Test `addWord.path` fail           | Path cũ `/addWord` không match path mới `/monVocabs/add` | Cập nhật assertion + thêm test cho editWord                 |

---

## 4. Phase 2 — CSRF Protection

### 4.1 Pattern: Double-Submit Cookie

**Tại sao chọn pattern này?**

- Stateless (không cần lưu token trong session/DB)
- Tương thích với mọi loại form (URL-encoded, JSON, multipart)
- Đơn giản, ít code, ít overhead

**Cách hoạt động**:

```
1. Server tạo token random → set cookie __csrf (httpOnly: false)
2. Server render token vào <meta name="csrf-token"> trong HTML
3. Frontend JS đọc meta tag → inject header X-CSRF-Token trên mỗi fetch()
4. Server kiểm tra: cookie token === header/body token → match → cho qua
```

### 4.2 Server-side (`app/middleware/csrf.js`)

```javascript
// Constants
const CSRF_COOKIE = '__csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_BODY_FIELD = '_csrf';
const TOKEN_BYTES = 32; // 64 hex chars

// Excluded paths (server-to-server, protected by other means)
const EXCLUDED_PREFIXES = ['/health', '/api/reminder'];

// Token generation middleware
function csrfTokenMiddleware(req, res, next) {
  let token = parseCookieValue(req.headers.cookie, CSRF_COOKIE);
  if (!token) {
    token = generateToken(); // crypto.randomBytes(32).toString('hex')
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // JS frontend DOIT lire ce cookie
      secure: isProductionLike(),
      sameSite: 'lax',
      path: '/',
    });
  }
  res.locals.csrfToken = token; // Accessible dans Handlebars via {{csrfToken}}
  next();
}

// Verification middleware
function csrfVerifyMiddleware(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next(); // Safe methods
  if (isExcluded(req.path)) return next(); // Server-to-server paths
  if (process.env.NODE_ENV === 'test') return next(); // Test bypass

  const cookieToken = parseCookieValue(req.headers.cookie, CSRF_COOKIE);
  const submittedToken = req.headers[CSRF_HEADER] || req.body?.[CSRF_BODY_FIELD];

  if (!cookieToken || !submittedToken || !safeEqual(cookieToken, submittedToken)) {
    return res.status(403).json({ success: false, message: 'CSRF token invalide.' });
  }
  next();
}
```

Points importants:

- `parseCookieValue` a un `try-catch` pour `decodeURIComponent` — évite crash sur cookies malformés.
- `safeEqual` utilise `crypto.timingSafeEqual` avec length check préalable.
- Le token est réutilisé si le cookie existe déjà → safe multi-tab.
- Cookie sans `maxAge` → session cookie (détruit à la fermeture du navigateur) → plus sécurisé que le session cookie (3h).

### 4.3 Frontend Fetch Interceptor (`public/js/csrf.js`)

```javascript
(function () {
  var HEADER = 'X-CSRF-Token';

  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  var _fetch = window.fetch;

  window.fetch = function (url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      // Gère les deux cas: Headers instance et plain object
      if (options.headers instanceof Headers) {
        if (!options.headers.has(HEADER)) options.headers.set(HEADER, getCsrfToken());
      } else {
        options.headers = options.headers || {};
        if (!options.headers[HEADER]) options.headers[HEADER] = getCsrfToken();
      }
    }
    return _fetch.call(this, url, options);
  };

  window.getCsrfToken = getCsrfToken;
})();
```

Chargé dans `main.hbs` AVANT tous les scripts applicatifs:

```html
<meta name="csrf-token" content="{{csrfToken}}" />
<!-- ... -->
<script src="/js/csrf.js" nonce="{{nonce}}"></script>
<!-- Puis les scripts app -->
```

### 4.4 Fallback no-JS (hidden fields)

7 formulaires natifs ont reçu un champ caché `_csrf`:

```html
<form action="/login" method="POST">
  <input type="hidden" name="_csrf" value="{{csrfToken}}" />
  <!-- ... -->
</form>
```

Fichiers: `login.hbs`, `registre.hbs`, `forgotPassword.hbs`, `resetPassword.hbs`, `feedback.hbs`, `addWord.hbs` (2 forms).

En pratique, TOUS les formulaires utilisent JavaScript (`e.preventDefault()` + `fetch()`), donc le token passe par le header `X-CSRF-Token` (via l'interceptor). Les champs `_csrf` sont un fallback de sécurité.

### 4.5 `NODE_ENV=test` explicit

```json
"test": "NODE_ENV=test jest",
"test:watch": "NODE_ENV=test jest --watch"
```

Jest définit implicitement `NODE_ENV=test`, mais l'expliciter dans `package.json` est une pratique professionnelle (robustesse, documentation).

### Bugs phát hiện và sửa trong Phase 2

| Bug                                                  | Nguồn gốc                             | Fix                                              |
| ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| `parseCookieValue` crash sur cookie malformé (`%ZZ`) | `decodeURIComponent` lance `URIError` | Ajout `try-catch` → retourne `null` → 403 propre |
| Jest NODE_ENV implicit non garanti                   | CSRF bypass dépend de `NODE_ENV=test` | Rendu explicite dans `package.json`              |

---

## 5. Phase 3 — Permissions-Policy & CSP Hardening

### 5.1 Permissions-Policy

Restrict browser APIs que l'app n'utilise PAS:

```javascript
const PERMISSIONS_POLICY = [
  'camera=()', // Bloqué
  'geolocation=()', // Bloqué
  'payment=()', // Bloqué
  'usb=()', // Bloqué
  'interest-cohort=()', // Bloqué (FLoC tracking)
  'browsing-topics=()', // Bloqué (Topics API tracking)
  'microphone=(self)', // Autorisé (testPronun.js)
  'autoplay=(self)', // Autorisé (TTS audio playback)
].join(', ');
```

Implémenté via middleware custom AVANT Helmet:

```javascript
const initializeSecurity = (app) => {
  app.use(nonceMiddleware);
  app.use(permissionsPolicyMiddleware); // Avant Helmet
  app.use(helmet(cspConfig));
};
```

### 5.2 CSP Hardening

Directives auditées et resserrées:

| Directive       | Avant                              | Après                | Raison                                                |
| --------------- | ---------------------------------- | -------------------- | ----------------------------------------------------- |
| `imgSrc`        | `'self' data: https: blob:`        | `'self' data: blob:` | `https:` trop permissif                               |
| `styleSrc`      | `... https://fonts.googleapis.com` | `... (retiré)`       | Google Fonts uniquement dans emails (hors navigateur) |
| `fontSrc`       | `... https://fonts.gstatic.com`    | `... (retiré)`       | Idem                                                  |
| `connectSrc`    | `... https://cdn.jsdelivr.net`     | `... (retiré)`       | CDN chargé via `<script>`, pas `fetch()`              |
| `scriptSrcElem` | Directive dédiée                   | **Supprimée**        | Redondant avec `scriptSrc` + `'strict-dynamic'`       |

CSP final:

```
default-src 'self';
script-src 'self' 'strict-dynamic' 'nonce-xxx' https://accounts.google.com https://apis.google.com;
style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
font-src 'self' https://cdnjs.cloudflare.com;
img-src 'self' data: blob:;
connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com;
frame-src 'self' https://accounts.google.com;
object-src 'none';
media-src 'self' blob:;
form-action 'self';
frame-ancestors 'none';
base-uri 'self';
worker-src 'self' blob:;
upgrade-insecure-requests;
script-src-attr 'none';  (ajouté automatiquement par Helmet)
```

### 5.3 Autres headers Helmet

| Header                         | Valeur                                         | Rôle                                       |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------ |
| `Strict-Transport-Security`    | `max-age=31536000; includeSubDomains; preload` | Force HTTPS pendant 1 an                   |
| `X-Frame-Options`              | `DENY`                                         | Empêche l'iframe (clickjacking)            |
| `X-Content-Type-Options`       | `nosniff`                                      | Empêche le MIME sniffing                   |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`              | Limite les infos Referer                   |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                  | Isole le browsing context                  |
| `Cross-Origin-Resource-Policy` | `cross-origin`                                 | Autorise les ressources cross-origin (CDN) |
| `X-DNS-Prefetch-Control`       | `off`                                          | Empêche la résolution DNS préventive       |
| `X-Download-Options`           | `noopen`                                       | IE: empêche l'ouverture directe            |
| `X-Powered-By`                 | **SUPPRIMÉ**                                   | Ne pas révéler Express                     |

---

## 6. Phase 4 & 5 — Chuyển sang Skill 8

### Quyết định

Phase 4 (Security Monitoring/Logging) và Phase 5 (Documentation) được chuyển sang Skill **"8. Structured Logging & Error Handling & Monitoring"**.

### Lý do

1. Security monitoring cần hạ tầng logging — hiện tại app dùng `console.*` khắp nơi.
2. Xây monitoring trên `console.log` = anti-pattern professionnel.
3. Cần xây logging infrastructure (Winston/Pino, log levels, structured JSON) trước khi thêm security monitoring.
4. Documentation là quá trình liên tục, tích hợp tự nhiên vào Skill 8.

---

## 7. Tests automatisés

### 7.1 Fichiers de test créés

| Fichier                                 | Phase | Tests | Couvre                                                                       |
| --------------------------------------- | ----- | :---: | ---------------------------------------------------------------------------- |
| `__tests__/unit/secrets.test.js`        | 1     |   5   | Fail-fast en prod, warning en dev, banner agrégé                             |
| `__tests__/middleware/csrf.test.js`     | 2     |  18   | Token generation, verification, exclusions, bypass test, rejections, success |
| `__tests__/middleware/security.test.js` | 3     |  20   | Permissions-Policy, CSP directives, nonce uniqueness, Helmet defaults        |

### 7.2 Tests existants mis à jour (Phase 1)

| Fichier                                    | Modification                                  |
| ------------------------------------------ | --------------------------------------------- |
| `__tests__/unit/healthEndpoint.test.js`    | Ajout `CRON_SECRET` env + header + test 403   |
| `__tests__/unit/inputSanitization.test.js` | Correction path addWord + ajout test editWord |

### 7.3 Résultat final

```
Test Suites: 50 passed, 50 total
Tests:       518 passed, 518 total
Time:        ~20s
```

---

## 8. Tests manuels

### Scenario 1: Fail-Fast Secrets — **PASS**

- Dev: warning affiché, app continue.
- Production: `process.exit(1)`, "THIS SHOULD NOT APPEAR" absent.

### Scenario 2: Security Headers — **PASS**

Tous les headers CSP, Permissions-Policy, HSTS, X-Frame-Options, etc. présents et corrects dans `curl -sI`.

### Scenario 3: CSRF Protection — **PASS**

- Cookie `__csrf` (HttpOnly=false, SameSite=Lax) ✓
- Meta tag `<meta name="csrf-token">` match cookie ✓
- Header `X-CSRF-Token` injecté automatiquement par fetch interceptor ✓
- curl sans token → 403 "CSRF token invalide." ✓
- curl tokens différents → 403 ✓
- curl token valide → passe CSRF, erreur validation login (pas CSRF) ✓

### Scenario 4: CSRF Excluded Paths — **PASS**

- `/api/reminder` avec faux secret → 403 (requireCronSecret, pas CSRF) ✓
- `/api/reminder` avec vrai secret → succès ✓

### Scenario 5: Rate Limiting — **PASS** (vérifié via DevTools)

- curl sans CSRF → 403 (CSRF bloque avant rate limiter, c'est defense-in-depth)
- DevTools: `Ratelimit-Limit: 10`, `Ratelimit-Remaining: 9` → rate limiter actif ✓

### Scenario 6: CRON_SECRET — **PASS**

- Sans header → 403 ✓
- Mauvais secret → 403 ✓
- Bon secret → 200 healthy ✓

### Scenario 7: npm audit — **FIXED**

- `npm audit fix` → dompurify, express-rate-limit, multer corrigés.
- Reste: 6 low dans `@google-cloud/text-to-speech` (breaking change, laissé).

### Scenario 8: Nonce Uniqueness — **PASS**

- Deux requêtes → nonces différents ✓

---

## 9. Brainstorming & Q&A

### Q: Redis rate limiting vs express-rate-limit — c'est redondant ?

**Non.** Redis est le **backend de stockage** (où on sauvegarde les compteurs), pas le moteur de rate limiting. `express-rate-limit` est la **logique** (compter, décider, bloquer). Redis résout 3 problèmes:

1. **Persistance** — compteurs survivent aux redémarrages
2. **Multi-instance** — compteurs partagés entre toutes les instances Node.js
3. **Performance** — Redis est optimisé pour les opérations clé-valeur rapides

Architecture:

```
Requête → globalLimiter (app-level, 100/min, anti-DDoS)
       → CSRF verification
       → loginLimiter (route-level, 10/15min, anti-brute-force)
       → validation → controller
```

### Q: Pourquoi NODE_ENV=test bypass le CSRF ?

Jest définit implicitement `NODE_ENV=test`. Les tests d'intégration (Supertest) ne gèrent pas les cookies CSRF → le bypass évite de devoir injecter des tokens CSRF dans chaque test. Rendu explicite dans `package.json` pour la robustesse.

### Q: Multipart/form-data et CSRF ?

Les formulaires multipart (`addWord.hbs` import) utilisent JavaScript pour soumettre via `fetch()` → le fetch interceptor injecte `X-CSRF-Token` en header. `express.urlencoded()` ne parse pas multipart, donc `req.body._csrf` n'est pas disponible pour les soumissions natives multipart — mais ce cas n'arrive jamais car les formulaires nécessitent JavaScript.

### Q: Cookie \_\_csrf sans maxAge — c'est un problème ?

Non, c'est **plus sécurisé**. Sans `maxAge`, c'est un session cookie → détruit à la fermeture du navigateur. Le session cookie `__sid` a `maxAge: 3h` → persiste. Quand l'utilisateur rouvre le navigateur:

1. `__sid` encore valide → session restaurée
2. `__csrf` absent → nouveau token généré → cohérence maintenue

---

## 10. Matrice de sécurité — 25 endpoints

| #   | Endpoint                       |        Auth        |      Rate Limit       |      Validation      | CSRF  |
| --- | ------------------------------ | :----------------: | :-------------------: | :------------------: | :---: |
| 1   | POST /login                    |         —          |     loginLimiter      |     loginSchema      |   ✓   |
| 2   | POST /login/forgotPassword     |         —          | forgotPasswordLimiter | forgotPasswordSchema |   ✓   |
| 3   | POST /login/resetPassword      |         —          |     loginLimiter      | resetPasswordSchema  |   ✓   |
| 4   | POST /registre                 |         —          |    registerLimiter    |    registreSchema    |   ✓   |
| 5   | POST /monVocabs/add            |  isAuthenticated   |     globalLimiter     |    addWordSchema     |   ✓   |
| 6   | POST /monVocabs/add/import     |  isAuthenticated   |     globalLimiter     |    addWordSchema     |   ✓   |
| 7   | POST /monVocabs/deleteAll      |  isAuthenticated   |     globalLimiter     | deleteAllWordsSchema |   ✓   |
| 8   | POST /monVocabs/delete/:id     |  isAuthenticated   |     globalLimiter     |   deleteWordSchema   |   ✓   |
| 9   | POST /monVocabs/edit/:id       |  isAuthenticated   |     globalLimiter     |    editWordSchema    |   ✓   |
| 10  | POST /dashboard/edit           |  isAuthenticated   |     globalLimiter     | dashboardEditSchema  |   ✓   |
| 11  | POST /dashboard/changePassword |  isAuthenticated   |     emailLimiter      |      Controller      |   ✓   |
| 12  | POST /dashboard/resetPassword  |  isAuthenticated   |     globalLimiter     | resetPasswordSchema  |   ✓   |
| 13  | POST /feedback                 |         —          |    feedbackLimiter    |    feedbackSchema    |   ✓   |
| 14  | POST /myPackages               | isAuthenticatedAPI |     globalLimiter     | createPackageSchema  |   ✓   |
| 15  | POST /myPackages/delete/:id    | isAuthenticatedAPI |     globalLimiter     |    packageIdParam    |   ✓   |
| 16  | PUT /myPackages/edit/:id       | isAuthenticatedAPI |     globalLimiter     |  editPackageSchema   |   ✓   |
| 17  | PUT /myPackages/toggle/:id     | isAuthenticatedAPI |     globalLimiter     |    packageIdParam    |   ✓   |
| 18  | POST /myPackages/copy/:id      | isAuthenticatedAPI |     globalLimiter     |    packageIdParam    |   ✓   |
| 19  | POST /api/reminder             | requireCronSecret  |     emailLimiter      |          —           | Exclu |
| 20  | POST /api/testEmail            | isAuthenticatedAPI |     emailLimiter      |          —           |   ✓   |
| 21  | POST /api/tts/generate         | isAuthenticatedAPI |      ttsLimiter       |  ttsGenerateSchema   |   ✓   |
| 22  | POST /games/score              | isAuthenticatedAPI |     globalLimiter     |   saveScoreSchema    |   ✓   |
| 23  | POST /level-progress/track     | isAuthenticatedAPI |     globalLimiter     |   trackGameSchema    |   ✓   |
| 24  | POST /level-progress/reset     | isAuthenticatedAPI |     globalLimiter     |   resetLevelSchema   |   ✓   |
| 25  | POST /update-streak            | isAuthenticatedAPI |     globalLimiter     |     — (no body)      |   ✓   |

**25/25 endpoints couverts. 0 faille. 0 contradiction.**
