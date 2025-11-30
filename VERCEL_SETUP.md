# Настройка проекта в Vercel (УСТАРЕЛО)

⚠️ **ВНИМАНИЕ**: Этот файл описывает старую конфигурацию, когда Python скрипты запускались напрямую на Vercel.

**Текущая архитектура**: Python логика вынесена на Digital Ocean API. См. `VERCEL_DIGITALOCEAN_SETUP.md` для актуальных инструкций.

---

# Настройка проекта в Vercel (СТАРАЯ ВЕРСИЯ)

### Build and Output Settings:
- **Build Command**: `npm run build` (уже установлено по умолчанию)
- **Output Directory**: `Next.js default` (оставьте как есть)
- **Install Command**: `npm install` (уже установлено по умолчанию)
- **Root Directory**: `./` (корень проекта)

### ⚠️ ВАЖНО: Python скрипты на Vercel

**Проблема**: Vercel Serverless Functions не поддерживают выполнение Python скриптов через `spawn()` или `child_process`. 

**Build пройдет успешно**, но при выполнении API routes (`/api/analyze-tajwid`, `/api/submit-lead`) возникнут ошибки, так как Python не доступен в runtime.

**Решения:**

#### Вариант 1: Использовать Vercel Python Runtime (рекомендуется)
Создайте отдельные serverless functions для Python скриптов:
- Создайте `api/analyze-tajwid-python/index.py` 
- Создайте `api/submit-lead-python/index.py`
- Настройте в `vercel.json` Python runtime для этих функций

#### Вариант 2: Вынести Python логику в отдельный сервис
- Используйте Railway, Render, или другой сервис для Python API
- Вызывайте этот API из Next.js API routes

#### Вариант 3: Переписать на Node.js
- Переписать логику из Python скриптов на JavaScript/TypeScript
- Использовать Node.js библиотеки вместо Python

**Текущая реализация**: Проект использует `spawn()` для запуска Python скриптов, что **не будет работать на Vercel** без дополнительной настройки.

## 2. Переменные окружения (Settings → Environment Variables)

Добавьте следующие переменные окружения для всех окружений (Production, Preview, Development):

### Обязательные:

#### Hugging Face API
```
HF_API_KEY=ваш_api_ключ_от_huggingface
HF_ENDPOINT_URL=https://ваш-endpoint-id.region.inference.huggingface.cloud
```

#### Google Sheets
```
SHEET_ID=ваш_id_google_таблицы
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Важно для GOOGLE_CREDENTIALS:**
- Весь JSON должен быть в одну строку
- Без переносов строк
- Без лишних пробелов
- Можно использовать онлайн-инструмент для минификации JSON: https://jsonformatter.org/json-minify

### Опциональные:

#### Telegram Bot (если нужны уведомления)
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
TELEGRAM_CHAT_ID=ваш_chat_id
```

#### Python Executable (обычно не требуется)
```
PYTHON_EXECUTABLE=python3
```
Или оставьте пустым - Vercel сам определит.

## 3. Как добавить переменные окружения:

1. Перейдите в **Settings** → **Environment Variables**
2. Нажмите **Add New**
3. Введите **Name** (например, `HF_API_KEY`)
4. Введите **Value** (ваше значение)
5. Выберите окружения: ✅ Production, ✅ Preview, ✅ Development
6. Нажмите **Save**
7. Повторите для всех переменных

## 4. После добавления переменных:

1. Перейдите в **Deployments**
2. Найдите последний деплой
3. Нажмите **Redeploy** (чтобы применить новые переменные окружения)

## 5. Проверка после деплоя:

После успешного деплоя проверьте:
- ✅ Главная страница загружается
- ✅ Форма работает
- ✅ Анализ аудио работает (проверьте в консоли браузера)
- ✅ Сохранение в Google Sheets работает (проверьте логи в Vercel)
- ✅ Telegram уведомления работают (если настроены)

## 6. Логи и отладка:

Если что-то не работает:
1. Перейдите в **Deployments** → выберите деплой → **Functions** → выберите функцию
2. Проверьте логи на наличие ошибок
3. Убедитесь, что все переменные окружения установлены правильно

## 7. Важные замечания:

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Python скрипты

**Текущая реализация НЕ БУДЕТ РАБОТАТЬ на Vercel** без изменений!

Проблема: API routes используют `spawn()` для запуска Python скриптов, но Vercel Serverless Functions не имеют доступа к системному Python.

**Что произойдет:**
- ✅ Build пройдет успешно (Next.js соберется)
- ❌ API `/api/analyze-tajwid` не будет работать (ошибка при spawn Python)
- ❌ API `/api/submit-lead` не будет работать (ошибка при spawn Python)

**Решения:**

1. **Использовать Vercel Python Runtime** (создать отдельные Python functions)
2. **Вынести Python в отдельный сервис** (Railway, Render, etc.)
3. **Переписать на Node.js** (использовать JS библиотеки)

**Рекомендация**: Для production лучше вынести Python логику в отдельный сервис или переписать на Node.js.

### ⚠️ Google Credentials: 
Убедитесь, что Service Account email добавлен в Google таблицу с правами редактора.

### ⚠️ Файлы: 
Все статические файлы (например, `kaspi_qr.png`) должны быть в папке `public/` - это уже сделано.

