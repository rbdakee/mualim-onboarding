# Tajwid Onboarding - Интеграция с Python для анализа таджвида

Этот проект представляет собой Next.js приложение для онбординга в обучение таджвиду с интеграцией Python скрипта для анализа чтения Аль-Фатихи.

## Архитектура решения

Вместо поднятия отдельного Python сервера, используется **Next.js API Routes** как промежуточный слой:

1. **Фронтенд** записывает аудио через Web Audio API
2. **Next.js API Route** (`/api/analyze-tajwid`) принимает аудио файл
3. **Python скрипт** (`scripts/analyze_tajwid.py`) анализирует аудио
4. **Результат** возвращается на фронтенд для отображения

## Установка и запуск

### 1. Установка Node.js зависимостей

```bash
npm install
# или
pnpm install
```

### 2. Установка Python зависимостей

```bash
pip install -r requirements.txt
```

### 3. Настройка переменных окружения

#### Для локальной разработки:

Создайте файл `.env.local` в корне проекта (скопируйте из `.env.example`):

```env
# Digital Ocean API URL
# Для локальной разработки используйте: http://localhost:5000
# Для production на Vercel: https://your-app-name.ondigitalocean.app
DIGITAL_OCEAN_API_URL=http://localhost:5000
```

#### Для Digital Ocean API (в папке digitalocean-api):

Создайте файл `.env` в папке `digitalocean-api/`:

```env
# Hugging Face Inference API Configuration
HF_API_KEY=your_huggingface_api_token_here
HF_ENDPOINT_URL=https://your-endpoint-id.region.inference.huggingface.cloud

# Google Sheets Configuration
SHEET_ID=your_google_sheet_id_here

# Telegram Bot Configuration (опционально)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Google Credentials (JSON в одну строку)
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

**Примечание:** См. `VERCEL_DIGITALOCEAN_SETUP.md` для полной инструкции по настройке Vercel и Digital Ocean.
```

### 4. Настройка Google Sheets

1. **Создайте Google Service Account:**
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
   - Создайте новый проект или выберите существующий
   - Включите Google Sheets API и Google Drive API
   - Создайте Service Account
   - Скачайте JSON ключ и сохраните как `credentials.json` в корне проекта

2. **Настройте доступ к таблице:**
   - Откройте вашу Google таблицу
   - Нажмите "Поделиться" (Share)
   - Добавьте email из `credentials.json` (поле `client_email`) с правами редактора
   - Скопируйте Sheet ID из URL таблицы (часть между `/d/` и `/edit`) в переменную `SHEET_ID`
   - Например, из URL `https://docs.google.com/spreadsheets/d/1sdg8uRzMhAH3iGkjnQf3LZE_kK_4HFReWLz_MbcaSz4/edit`
   - ID будет: `1sdg8uRzMhAH3iGkjnQf3LZE_kK_4HFReWLz_MbcaSz4`

### 5. Настройка Telegram бота (опционально)

Если вы хотите получать уведомления о новых лидах в Telegram:

1. **Создайте бота:**
   - Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
   - Отправьте команду `/newbot`
   - Следуйте инструкциям и получите токен бота

2. **Получите chat_id:**
   - Найдите бота [@userinfobot](https://t.me/userinfobot) в Telegram
   - Отправьте ему любое сообщение
   - Скопируйте ваш `Id` из ответа

3. **Добавьте в `.env`:**
   ```env
   TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
   TELEGRAM_CHAT_ID=ваш_id_от_userinfobot
   ```

   **Примечание:** Если Telegram не настроен, уведомления просто не будут отправляться, но сохранение в Google Sheets будет работать нормально.

**Как получить API ключ:**
1. Зарегистрируйтесь на [Hugging Face](https://huggingface.co)
2. Перейдите в [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Создайте новый токен с правами чтения

**Как создать Inference Endpoint:**
1. Перейдите в [Inference Endpoints](https://huggingface.co/inference-endpoints)
2. Создайте новый endpoint с моделью `tarteel-ai/whisper-base-ar-quran`
3. Скопируйте URL endpoint в переменную `HF_ENDPOINT_URL`

### 4. Запуск проекта

```bash
npm run dev
# или
pnpm dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Структура файлов

```
├── app/
│   ├── api/
│   │   └── analyze-tajwid/
│   │       └── route.ts          # API endpoint для анализа аудио
│   ├── page.tsx                  # Основной компонент с логикой записи
│   └── layout.tsx
├── scripts/
│   └── main_ai.py                # Python скрипт для анализа таджвида (использует Hugging Face API)
├── requirements.txt              # Python зависимости
└── package.json
```

## Как это работает

### 1. Запись аудио
- Пользователь нажимает кнопку микрофона
- Браузер запрашивает доступ к микрофону
- Начинается запись аудио в формате WebM

### 2. Отправка на анализ
- При нажатии "Завершить запись" аудио отправляется на `/api/analyze-tajwid`
- API route сохраняет аудио во временный файл
- Запускается Python скрипт для анализа

### 3. Анализ таджвида
Python скрипт использует **Hugging Face Inference API** для:
- Транскрибации арабской речи через модель Whisper
- Сравнения с эталонным текстом Корана
- Анализа правильности чтения по словам
- Генерации детальной обратной связи по каждому аяту

### 4. Отображение результатов
- Результат возвращается в JSON формате
- Фронтенд отображает оценку и рекомендации
- Автоматический переход к следующему экрану

## Архитектура с Hugging Face API

Проект использует **Hugging Face Inference API** вместо локальной модели, что дает:
- ✅ Не нужно устанавливать тяжелые ML библиотеки (torch, transformers)
- ✅ Не требуется GPU для работы
- ✅ Быстрое развертывание без настройки окружения
- ✅ Автоматическое масштабирование через Hugging Face

### Настройка Python окружения

### Альтернативные способы запуска Python

Если у вас проблемы с запуском Python скрипта, можно использовать:

1. **Виртуальное окружение:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

2. **Docker (опционально):**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY scripts/ ./scripts/
```

3. **Использование конкретной версии Python:**
В `app/api/analyze-tajwid/route.ts` измените:
```typescript
const pythonProcess = spawn('python3', [pythonScript, tempFilePath])
// или
const pythonProcess = spawn('py', [pythonScript, tempFilePath])  // Windows
```

## Возможные улучшения

1. **Более сложный анализ таджвида:**
   - Интеграция с ML моделями для распознавания арабской речи
   - Анализ конкретных правил таджвида
   - Сравнение с эталонным чтением

2. **Улучшение UX:**
   - Визуализация волновой формы аудио
   - Возможность повторного прослушивания записи
   - Детальные рекомендации по улучшению

3. **Производительность:**
   - Кэширование результатов анализа
   - Асинхронная обработка длинных аудио
   - Оптимизация размера аудио файлов

4. **Безопасность:**
   - Валидация аудио файлов
   - Ограничение размера файлов
   - Очистка временных файлов

## Устранение неполадок

### Python не найден
```bash
# Проверьте установку Python
python --version
# или
python3 --version

# Установите Python если нужно
# Windows: скачайте с python.org
# Linux: sudo apt install python3 python3-pip
# Mac: brew install python3
```

### Ошибки с Hugging Face API
```bash
# Проверьте переменные окружения
echo $HF_API_KEY
echo $HF_ENDPOINT_URL

# Убедитесь, что файл .env создан и содержит правильные значения
# Проверьте, что endpoint активен на Hugging Face
```

### Проблемы с микрофоном
- Убедитесь, что браузер имеет разрешение на доступ к микрофону
- Проверьте настройки приватности браузера
- Попробуйте другой браузер (Chrome, Firefox, Safari)

## Тестирование

### Запуск тестов для save_to_sheets.py

```bash
# Запуск всех тестов
python scripts/test_save_to_sheets.py

# Или через unittest
python -m unittest scripts.test_save_to_sheets -v
```

Тесты проверяют:
- Извлечение ID таблицы из различных форматов URL
- Сохранение данных в Google Sheets (с моками)
- Обработку результатов басмалы и Аль-Фатихи
- Обработку ошибок

## Лицензия

Этот проект создан для демонстрации интеграции Next.js с Python для анализа аудио в контексте обучения таджвиду.
