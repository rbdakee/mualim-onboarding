# Tajwid API для Digital Ocean

FastAPI для обработки запросов от Next.js приложения.

## Структура проекта

```
digitalocean-api/
├── app.py                 # Главное FastAPI приложение
├── requirements.txt       # Python зависимости
├── Procfile              # Конфигурация для Digital Ocean
├── .env.example          # Пример переменных окружения
├── scripts/              # Python скрипты
│   ├── main_ai.py        # Анализ таджвида
│   ├── save_to_sheets.py # Сохранение в Google Sheets
│   └── files/            # Данные (quran_ayahs.json)
└── README.md             # Этот файл
```

## Установка и запуск локально

### 1. Установка зависимостей

```bash
cd digitalocean-api
pip install -r requirements.txt
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Заполните переменные:
- `HF_API_KEY` - ваш Hugging Face API ключ
- `HF_ENDPOINT_URL` - URL вашего Inference Endpoint
- `SHEET_ID` - ID Google таблицы
- `GOOGLE_CREDENTIALS` - JSON credentials (в одну строку)
- `TELEGRAM_BOT_TOKEN` - токен бота (опционально)
- `TELEGRAM_CHAT_ID` - chat ID (опционально)

### 3. Запуск локально

```bash
python app.py
```

Или с Uvicorn напрямую:

```bash
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

API будет доступен на `http://localhost:5000`

## Деплой на Digital Ocean

### Вариант 1: App Platform (рекомендуется)

1. **Создайте App в Digital Ocean:**
   - Перейдите в [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
   - Нажмите "Create App"
   - Подключите ваш GitHub репозиторий
   - Выберите папку `digitalocean-api`

2. **Настройте Build Settings:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `uvicorn app:app --host 0.0.0.0 --port ${PORT:-5000} --workers 4`
     
     **Примечание**: Порт 5000 используется по умолчанию, если переменная `PORT` не установлена.
   - **Environment**: Python 3.11+

3. **Добавьте переменные окружения:**
   - В настройках App добавьте все переменные из `.env.example`
   - Особенно важно: `GOOGLE_CREDENTIALS` (весь JSON в одну строку)

4. **Деплой:**
   - Digital Ocean автоматически задеплоит приложение
   - Получите URL вашего API (например: `https://your-app.ondigitalocean.app`)

### Вариант 2: Droplet (VPS)

1. **Создайте Droplet:**
   - Ubuntu 22.04 LTS
   - Минимум 1GB RAM (рекомендуется 2GB+)

2. **Установите зависимости:**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv nginx
   ```

3. **Клонируйте репозиторий:**
   ```bash
   git clone <your-repo-url>
   cd digitalocean-api
   ```

4. **Создайте виртуальное окружение:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn
   ```

5. **Настройте .env:**
   ```bash
   cp .env.example .env
   nano .env  # Заполните переменные
   ```

6. **Запустите с Uvicorn:**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 5000 --workers 4
   ```
   
   Или в фоновом режиме:
   ```bash
   nohup uvicorn app:app --host 0.0.0.0 --port 5000 --workers 4 > app.log 2>&1 &
   ```

7. **Настройте Nginx (опционально):**
   ```bash
   sudo nano /etc/nginx/sites-available/tajwid-api
   ```
   
   Конфигурация:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## API Endpoints

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "service": "tajwid-api"
}
```

### POST /api/analyze-tajwid
Анализирует аудио файл на таджвид

**Request:**
- Content-Type: `multipart/form-data`
- `audio`: файл (webm, wav, mp3)
- `surah`: номер суры (опционально)
- `ayahNumber`: номер аята (опционально)

**Response:**
```json
{
  "score_percent": 95.5,
  "correct_ayahs": 6,
  "total_ayahs": 6,
  "message_type": "surah",
  "ayahs": [...]
}
```

### POST /api/submit-lead
Сохраняет данные лида в Google Sheets

**Request:**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "leadData": {
    "name": "Имя",
    "contact": "+1234567890"
  },
  "answers": {
    "q1_age": "18–25 лет",
    "q2_gender": "Мужчина",
    ...
  },
  "analysisResult": {
    "score_percent": 95.5,
    "correct_ayahs": 6,
    "total_ayahs": 6
  }
}
```

**Response:**
```json
{
  "success": true,
  "row": 2,
  "message": "Данные сохранены в строку 2"
}
```

## Обновление Next.js API routes

После деплоя на Digital Ocean, обновите Next.js API routes чтобы они вызывали ваш API вместо локальных Python скриптов.

Добавьте в `.env` Next.js проекта:
```
PYTHON_API_URL=https://your-app.ondigitalocean.app
```

## Проверка работы

После деплоя проверьте:

```bash
# Health check
curl https://your-app.ondigitalocean.app/health

# Должен вернуть:
# {"status":"ok","service":"tajwid-api"}
```

## Логи

В Digital Ocean App Platform логи доступны в разделе "Runtime Logs".

## Troubleshooting

### Ошибка импорта модулей
Убедитесь, что все файлы из `scripts/` скопированы в `digitalocean-api/scripts/`

### Ошибка с Google Credentials
Проверьте, что `GOOGLE_CREDENTIALS` в одну строку без переносов

### Ошибка с Hugging Face API
Проверьте, что `HF_API_KEY` и `HF_ENDPOINT_URL` установлены правильно

