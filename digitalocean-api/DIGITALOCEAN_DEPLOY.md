# Инструкция по деплою на Digital Ocean

## Быстрый старт

### 1. Подготовка файлов

Все файлы уже подготовлены в папке `digitalocean-api/`:
- ✅ `app.py` - FastAPI приложение
- ✅ `requirements.txt` - зависимости
- ✅ `Procfile` - конфигурация для Digital Ocean
- ✅ `scripts/` - Python скрипты
- ✅ `.env.example` - пример переменных окружения

### 2. Деплой через Digital Ocean App Platform

#### Шаг 1: Создание App

1. Перейдите в [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Нажмите **"Create App"**
3. Выберите **"GitHub"** как источник
4. Выберите ваш репозиторий
5. Выберите ветку (обычно `main`)

#### Шаг 2: Настройка Build Settings

1. **Root Directory**: `digitalocean-api` (важно!)
2. **Build Command**: `pip install -r requirements.txt`
3. **Run Command**: `uvicorn app:app --host 0.0.0.0 --port ${PORT:-5000} --workers 4`
   
   **Примечание**: `${PORT:-5000}` означает, что если переменная `PORT` не установлена, будет использован порт 5000 по умолчанию.
4. **Environment**: Python 3.11 или выше

#### Шаг 3: Переменные окружения

Добавьте все переменные из `.env.example`:

**Обязательные:**
- `HF_API_KEY` - ваш Hugging Face API ключ
- `HF_ENDPOINT_URL` - URL вашего Inference Endpoint
- `SHEET_ID` - ID Google таблицы
- `GOOGLE_CREDENTIALS` - весь JSON из credentials.json (в одну строку!)

**Опциональные:**
- `TELEGRAM_BOT_TOKEN` - токен бота
- `TELEGRAM_CHAT_ID` - chat ID
- `PORT` - порт (обычно устанавливается автоматически)

#### Шаг 4: Деплой

1. Нажмите **"Create Resources"**
2. Дождитесь завершения деплоя
3. Получите URL вашего API (например: `https://your-app.ondigitalocean.app`)

### 3. Проверка работы

После деплоя проверьте:

```bash
# Health check
curl https://your-app.ondigitalocean.app/health

# Должен вернуть:
# {"status":"ok","service":"tajwid-api"}
```

### 4. Обновление Next.js для использования API

После получения URL вашего API, обновите Next.js API routes:

1. Добавьте в `.env` Next.js проекта:
   ```
   PYTHON_API_URL=https://your-app.ondigitalocean.app
   ```

2. Обновите `app/api/analyze-tajwid/route.ts` и `app/api/submit-lead/route.ts`
   чтобы они вызывали Digital Ocean API вместо локальных Python скриптов.

## Альтернатива: Деплой на Droplet (VPS)

Если хотите использовать Droplet вместо App Platform:

### 1. Создайте Droplet

- Ubuntu 22.04 LTS
- Минимум 1GB RAM (рекомендуется 2GB+)

### 2. Подключитесь к серверу

```bash
ssh root@your-droplet-ip
```

### 3. Установите зависимости

```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx git -y
```

### 4. Клонируйте репозиторий

```bash
git clone <your-repo-url>
cd digitalocean-api
```

### 5. Создайте виртуальное окружение

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 6. Настройте .env

```bash
cp .env.example .env
nano .env  # Заполните переменные
```

### 7. Запустите с Uvicorn

```bash
# В фоновом режиме
nohup uvicorn app:app --host 0.0.0.0 --port 5000 --workers 4 > app.log 2>&1 &
```

### 8. Настройте Nginx (опционально)

```bash
sudo nano /etc/nginx/sites-available/tajwid-api
```

Добавьте:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/tajwid-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Ошибка импорта модулей
Убедитесь, что все файлы из `scripts/` скопированы в `digitalocean-api/scripts/`

### Ошибка с quran_ayahs.json
Убедитесь, что файл находится в `digitalocean-api/scripts/files/quran_ayahs.json`

### Ошибка с Google Credentials
Проверьте, что `GOOGLE_CREDENTIALS` в одну строку без переносов

### API не отвечает
Проверьте логи в Digital Ocean Dashboard → Runtime Logs

