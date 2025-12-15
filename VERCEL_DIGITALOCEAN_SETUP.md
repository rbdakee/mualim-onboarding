# Настройка Vercel + внешний бэкенд

Этот документ описывает настройку, где:
- **Vercel** хостит Next.js фронтенд
- **Бэкенд (FastAPI)** хостится отдельно (где угодно) и принимает запросы на:
  - `POST /api/analyze`
  - `POST /api/submit-lead`

## Почему так

Фронт использует server-side прокси (Next.js route handlers), чтобы:
- не светить `X-API-TOKEN` в браузере;
- держать стабильные фронтовые эндпоинты (`/api/*`) независимо от хостинга бэкенда.

## 1) Переменные окружения на Vercel

В **Settings → Environment Variables** добавьте:

```
IP=<ip_или_домен_бэкенда>
PORT=<порт_бэкенда>
X-API-TOKEN=<токен_бэкенда>
```

## 2) Проверка после деплоя

В браузере:
- `POST /api/analyze-tajwid` должен проксироваться на `<BACKEND>/api/analyze`
- `POST /api/submit-lead` должен проксироваться на `<BACKEND>/api/submit-lead`

Если видите `500`, смотрите:
- логи Vercel (функции Next.js),
- логи бэкенда (ошибки интеграций типа Google Sheets).

