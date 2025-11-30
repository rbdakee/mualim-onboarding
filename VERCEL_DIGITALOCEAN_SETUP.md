# Настройка Vercel + Digital Ocean

Этот документ описывает настройку проекта, где:
- **Vercel** - хостинг для Next.js фронтенда
- **Digital Ocean** - хостинг для Python FastAPI бэкенда

## Архитектура

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Browser   │ ──────> │  Vercel (Next.js)│ ──────> │ Digital Ocean   │
│             │         │                  │         │   (FastAPI)     │
└─────────────┘         └──────────────────┘         └─────────────────┘
                              │                              │
                              │                              │
                              v                              v
                        ┌──────────┐                  ┌──────────────┐
                        │  Static  │                  │ Google Sheets│
                        │  Files   │                  │  Telegram    │
                        └──────────┘                  └──────────────┘
```

## 1. Настройка Digital Ocean API

### 1.1 Деплой API на Digital Ocean

Следуйте инструкциям в `digitalocean-api/DIGITALOCEAN_DEPLOY.md`

После деплоя у вас будет URL вида: `https://your-app-name.ondigitalocean.app`

### 1.2 Переменные окружения на Digital Ocean

В настройках приложения на Digital Ocean добавьте:

```
HF_ENDPOINT_URL=https://api-inference.huggingface.co/models/openai/whisper-large-v3
HF_API_KEY=ваш_huggingface_api_ключ
SHEET_ID=ваш_google_sheet_id
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token
TELEGRAM_CHAT_ID=ваш_telegram_chat_id
GOOGLE_CREDENTIALS={"type":"service_account",...}  # JSON в одну строку
```

## 2. Настройка Vercel

### 2.1 Переменные окружения на Vercel

В **Settings** → **Environment Variables** добавьте:

#### Обязательные:

```
DIGITAL_OCEAN_API_URL=https://your-app-name.ondigitalocean.app
```

**Важно:** 
- Замените `https://your-app-name.ondigitalocean.app` на реальный URL вашего Digital Ocean приложения
- Добавьте эту переменную для всех окружений: ✅ Production, ✅ Preview, ✅ Development

#### Для локальной разработки:

Создайте файл `.env.local` в корне проекта (он уже в `.gitignore`):

```env
DIGITAL_OCEAN_API_URL=http://localhost:5000
```

**Примечание:** 
- Файл `.env.example` содержит пример конфигурации
- Для локальной разработки используйте `.env.local` (не коммитится в git)
- В Production на Vercel всегда должен быть URL Digital Ocean

### 2.2 Настройки проекта (Settings → General)

- **Build Command**: `npm run build` (по умолчанию)
- **Output Directory**: `Next.js default` (по умолчанию)
- **Install Command**: `npm install` (по умолчанию)
- **Root Directory**: `./` (корень проекта)

### 2.3 Деплой

1. Подключите репозиторий к Vercel
2. Vercel автоматически определит Next.js
3. После деплоя проверьте, что переменная `DIGITAL_OCEAN_API_URL` установлена

## 3. Проверка работы

### 3.1 Проверка Digital Ocean API

```bash
# Health check
curl https://your-app-name.ondigitalocean.app/health

# Должен вернуть:
# {"status":"ok","service":"tajwid-api"}
```

### 3.2 Проверка Vercel

1. Откройте ваш сайт на Vercel
2. Откройте DevTools → Network
3. Попробуйте записать аудио и проанализировать
4. Проверьте, что запросы идут на `DIGITAL_OCEAN_API_URL`

### 3.3 Проверка CORS

Digital Ocean API настроен на разрешение всех источников (`allow_origins=["*"]`), поэтому CORS не должен быть проблемой.

Если возникнут проблемы с CORS, обновите `digitalocean-api/app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 4. Локальная разработка

### 4.1 Запуск Digital Ocean API локально

```bash
cd digitalocean-api
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

### 4.2 Запуск Next.js локально

```bash
# В корне проекта
npm install
npm run dev
```

### 4.3 Настройка .env для локальной разработки

Создайте `.env.local` в корне проекта (скопируйте из `.env.example` и измените):

```env
DIGITAL_OCEAN_API_URL=http://localhost:5000
```

**Или** используйте команду:
```bash
cp .env.example .env.local
# Затем отредактируйте .env.local и измените URL на http://localhost:5000
```

## 5. Устранение неполадок

### Проблема: "Failed to fetch" при анализе аудио

**Причина:** Vercel не может достучаться до Digital Ocean API

**Решение:**
1. Проверьте, что `DIGITAL_OCEAN_API_URL` установлен в Vercel
2. Проверьте, что Digital Ocean приложение запущено и доступно
3. Проверьте логи в Digital Ocean на наличие ошибок

### Проблема: CORS ошибки

**Причина:** Digital Ocean API блокирует запросы с Vercel

**Решение:**
1. Обновите `allow_origins` в `digitalocean-api/app.py`
2. Перезапустите приложение на Digital Ocean

### Проблема: "Internal Server Error" на Digital Ocean

**Причина:** Отсутствуют переменные окружения или неправильная конфигурация

**Решение:**
1. Проверьте все переменные окружения на Digital Ocean
2. Проверьте логи приложения на Digital Ocean
3. Убедитесь, что `quran_ayahs.json` находится в `scripts/files/`

## 6. Структура проекта

```
tajwid-onboarding/
├── app/                    # Next.js приложение
│   ├── api/
│   │   ├── analyze-tajwid/  # → вызывает Digital Ocean API
│   │   └── submit-lead/     # → вызывает Digital Ocean API
│   └── page.tsx
├── digitalocean-api/        # FastAPI приложение
│   ├── app.py              # Главный файл API
│   ├── scripts/
│   │   ├── main_ai.py      # Логика анализа таджвида
│   │   ├── save_to_sheets.py
│   │   └── files/
│   │       └── quran_ayahs.json
│   └── requirements.txt
└── public/                 # Статические файлы для Vercel
```

## 7. Важные замечания

### ✅ Что работает:

- Next.js приложение на Vercel
- API вызовы к Digital Ocean
- Анализ таджвида через Hugging Face API
- Сохранение в Google Sheets
- Telegram уведомления

### ⚠️ Что нужно помнить:

1. **DIGITAL_OCEAN_API_URL** должен быть установлен в Vercel
2. Все переменные окружения должны быть установлены на Digital Ocean
3. Digital Ocean приложение должно быть запущено и доступно
4. CORS настроен на разрешение всех источников (можно ограничить для production)

## 8. Мониторинг

### Digital Ocean

- Логи доступны в панели управления Digital Ocean
- Health check: `https://your-app.ondigitalocean.app/health`
- Swagger UI: `https://your-app.ondigitalocean.app/docs`

### Vercel

- Логи доступны в панели Vercel → Deployments → Functions
- Проверьте Network tab в браузере для отладки запросов

