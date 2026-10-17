# Google Cloud Text-to-Speech – Credentials

L’app utilise l’API **Cloud Text-to-Speech**. Les credentials sont fournis **uniquement par variables d’environnement** (GOOGLE*TTS*\*), en séparant chaque champ du fichier JSON du Service Account.

---

## Pourquoi Service Account (et pas une API key) ?

Cloud Text-to-Speech exige une authentification **OAuth 2.0** (identité + token Bearer). Une simple API key ne suffit pas. Il faut un **Service Account** : vous téléchargez un fichier JSON depuis Google Cloud, puis vous en extrayez les champs pour les mettre dans les variables d’environnement (voir ci‑dessous).

---

## 1. Obtenir le fichier JSON (Google Cloud)

1. [Console Google Cloud](https://console.cloud.google.com) → projet → **APIs & Services** → **Library** → activer **Cloud Text-to-Speech API**.
2. **IAM & Admin** → **Service Accounts** → **Create Service Account** (ex. `tts-app`) → rôle **Cloud Text-to-Speech User** → **Done**.
3. Cliquer sur le compte → **Keys** → **Add Key** → **Create new key** → **JSON** → télécharger.  
   Conserver ce fichier en lieu sûr ; ne pas le committer. Vous allez en extraire les valeurs pour les variables d’environnement.

---

## 2. Configurer les variables d’environnement (seule méthode)

On utilise **trois variables obligatoires**, dont les valeurs viennent du fichier JSON téléchargé :

| Variable                  | Champ JSON     | Obligatoire |
| ------------------------- | -------------- | ----------- |
| `GOOGLE_TTS_PROJECT_ID`   | `project_id`   | Oui         |
| `GOOGLE_TTS_CLIENT_EMAIL` | `client_email` | Oui         |
| `GOOGLE_TTS_PRIVATE_KEY`  | `private_key`  | Oui         |

**Important pour `GOOGLE_TTS_PRIVATE_KEY` :** dans le JSON, la clé privée contient des retours à la ligne. Dans la variable d’environnement, il faut les remplacer par les **deux caractères** `\` et `n` (backslash + n). Le code les convertira en vrais retours à la ligne.

**Exemple dans `.env` :**

```env
GOOGLE_TTS_PROJECT_ID=my-project-123
GOOGLE_TTS_CLIENT_EMAIL=tts-app@my-project-123.iam.gserviceaccount.com
GOOGLE_TTS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...(contenu)...\n-----END PRIVATE KEY-----\n"
```

**Variables optionnelles** (valeurs par défaut dans le code, à ne définir que pour surcharger) :  
`GOOGLE_TTS_TYPE`, `GOOGLE_TTS_PRIVATE_KEY_ID`, `GOOGLE_TTS_CLIENT_ID`, `GOOGLE_TTS_AUTH_URI`, `GOOGLE_TTS_TOKEN_URI`, `GOOGLE_TTS_AUTH_PROVIDER_X509_CERT_URL`, `GOOGLE_TTS_CLIENT_X509_CERT_URL`, `GOOGLE_TTS_UNIVERSE_DOMAIN`.

**Passer du fichier JSON aux variables :** ouvrir le JSON, copier `project_id` → `GOOGLE_TTS_PROJECT_ID`, `client_email` → `GOOGLE_TTS_CLIENT_EMAIL`, `private_key` → remplacer chaque retour à la ligne par `\n` puis mettre le tout dans `GOOGLE_TTS_PRIVATE_KEY` (une seule ligne dans le fichier .env).

---

## 3. Évaluation de cette approche (une seule méthode : variables séparées)

| Critère                | Évaluation                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thực tế (Pratique)** | **Rất phù hợp.** Cách này được dùng rộng rãi trên Heroku, Railway, Vercel, Docker/Kubernetes : mỗi secret là một biến env, dễ inject từ secret manager / CI, không cần mount file hay chuỗi JSON dài. Một dòng một biến → dễ đọc, dễ sửa, ít lỗi copy/paste so với JSON một dòng.       |
| **Bảo mật**            | **Tương đương** các cách khác khi secret nằm trong env : private key vẫn chỉ có trong bộ nhớ process, không lưu file trên disk (giảm surface). Có thể gán từng biến từ vault (HashiCorp Vault, AWS Secrets Manager, etc.). Cần bảo vệ env như mọi credential (không log, không commit). |
| **Logic / Hợp lý**     | **Rõ ràng và thống nhất.** Một cách duy nhất → không phải chọn giữa file / JSON / biến. Chuẩn 12‑factor (config qua env). Thiếu biến nào thì lỗi rõ (tên biến cụ thể), dễ debug.                                                                                                        |

**Kết luận :** Giữ **chỉ** phương án “tách thành biến nhỏ” là hợp lý, bảo mật đủ và phù hợp thực tế triển khai (local, Docker, PaaS). Không cần hỗ trợ thêm file JSON hay JSON một dòng trong code.
