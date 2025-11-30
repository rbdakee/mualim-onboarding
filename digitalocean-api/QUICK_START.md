# Быстрый старт - Деплой на Digital Ocean

## Что нужно сделать:

### 1. Скопируйте папку `digitalocean-api` на Digital Ocean

Вся структура уже готова:
```
digitalocean-api/
├── app.py              ✅ FastAPI приложение
├── requirements.txt     ✅ Зависимости
├── Procfile            ✅ Конфигурация для Digital Ocean
├── .env.example        ✅ Пример переменных
├── scripts/            ✅ Python скрипты
│   ├── main_ai.py
│   ├── save_to_sheets.py
│   └── files/
│       └── quran_ayahs.json
└── README.md           ✅ Документация
```

### 2. Создайте App в Digital Ocean App Platform

1. Перейдите: https://cloud.digitalocean.com/apps
2. **Create App** → **GitHub** → выберите репозиторий
3. **Root Directory**: `digitalocean-api` ⚠️ ВАЖНО!
4. **Build Command**: `pip install -r requirements.txt`
5. **Run Command**: `uvicorn app:app --host 0.0.0.0 --port ${PORT:-5000} --workers 4`
   
   **Примечание**: Порт 5000 используется по умолчанию.
6. **Environment**: Python 3.11+

### 3. Добавьте переменные окружения

В настройках App добавьте:

```
HF_API_KEY=ваш_ключ
HF_ENDPOINT_URL=https://ваш-endpoint.inference.huggingface.cloud
SHEET_ID=ваш_id_таблицы
GOOGLE_CREDENTIALS={"type":"service_account",...}  ← весь JSON в одну строку!
TELEGRAM_BOT_TOKEN=ваш_токен (опционально)
TELEGRAM_CHAT_ID=ваш_chat_id (опционально)
```

### 4. Деплой

Нажмите **Create Resources** и дождитесь деплоя.

### 5. Получите URL API

После деплоя вы получите URL вида:
```
https://your-app.ondigitalocean.app
```

### 6. Проверьте работу

```bash
curl https://your-app.ondigitalocean.app/health
```

Должен вернуть: `{"status":"ok","service":"tajwid-api"}`

### 7. Обновите Next.js

Добавьте в `.env` Next.js проекта:
```
PYTHON_API_URL=https://your-app.ondigitalocean.app
```

И обновите API routes чтобы они вызывали Digital Ocean API вместо локальных скриптов.

## Готово! 🎉

Теперь ваш API работает на Digital Ocean и готов принимать запросы от Next.js приложения.

