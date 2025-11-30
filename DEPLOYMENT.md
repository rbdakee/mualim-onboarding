# Инструкция по деплою в Vercel

## Подготовка к деплою

### 1. Установка зависимостей

Убедитесь, что все зависимости установлены:

```bash
npm install
```

### 2. Переменные окружения в Vercel

После деплоя в Vercel, добавьте следующие переменные окружения в настройках проекта:

#### Hugging Face API
- `HF_API_KEY` - ваш API ключ от Hugging Face
- `HF_ENDPOINT_URL` - URL вашего Inference Endpoint

#### Google Sheets
- `SHEET_ID` - ID вашей Google таблицы
- `GOOGLE_CREDENTIALS` - содержимое файла `credentials.json` (весь JSON в одну строку)

#### Telegram Bot (опционально)
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
- `TELEGRAM_CHAT_ID` - ваш chat ID для уведомлений

#### Python Executable (для Vercel)
- `PYTHON_EXECUTABLE` - путь к Python (обычно `python3` или оставьте пустым)

### 3. Google Credentials для Vercel

В Vercel нельзя загрузить файл `credentials.json` напрямую. Вместо этого:

1. Откройте ваш `credentials.json`
2. Скопируйте весь его содержимый (весь JSON)
3. В настройках Vercel добавьте переменную окружения `GOOGLE_CREDENTIALS` со значением всего JSON (в одну строку)
4. **Важно**: Убедитесь, что JSON в одну строку без переносов строк. Можно использовать онлайн-инструмент для минификации JSON.

**Пример:**
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### 4. Деплой

1. Подключите ваш репозиторий к Vercel
2. Выберите проект Next.js
3. Добавьте все переменные окружения
4. Нажмите Deploy

### 5. Проверка после деплоя

После деплоя проверьте:
- ✅ Главная страница загружается
- ✅ Форма работает
- ✅ Анализ аудио работает (проверьте API `/api/analyze-tajwid`)
- ✅ Сохранение в Google Sheets работает (проверьте API `/api/submit-lead`)
- ✅ Telegram уведомления работают (если настроены)

## Важные замечания

1. **Python скрипты**: Vercel поддерживает Python через serverless functions, но для работы с Python скриптами может потребоваться дополнительная настройка или использование альтернативных решений (например, вынесение Python логики в отдельный сервис).

2. **Google Credentials**: В production используйте переменную окружения `GOOGLE_CREDENTIALS` вместо файла.

3. **Файлы**: Убедитесь, что все необходимые файлы (например, `kaspi_qr.png`) находятся в папке `public/`.

4. **Логи**: Проверяйте логи в Vercel Dashboard для отладки проблем.
