import { NextRequest, NextResponse } from 'next/server'

function getBackendBaseUrl(requestUrl: string): string {
  const ipRaw = (process.env.IP || process.env.BACKEND_IP || 'localhost').trim()

  // В dev окружении Next может выставлять/использовать `PORT` для своего сервера (обычно 3000),
  // поэтому для бэкенда поддерживаем отдельную переменную `BACKEND_PORT`.
  const backendPortRaw = (process.env.BACKEND_PORT || process.env.API_PORT || '').trim()
  const portRaw = (backendPortRaw || process.env.PORT || '5000').trim()

  // IP может быть как "1.2.3.4", так и "http://1.2.3.4"
  const withProto = /^https?:\/\//i.test(ipRaw) ? ipRaw : `http://${ipRaw}`
  const url = new URL(withProto)
  if (!url.port && portRaw) url.port = portRaw

  // Защита от рекурсии: если по env мы случайно нацелились на сам Next (тот же порт),
  // то почти наверняка `PORT` относится к фронту, а не к бэкенду.
  // В таком случае используем BACKEND_PORT (если есть) или дефолт 5000.
  const req = new URL(requestUrl)
  const reqPort = req.port || (req.protocol === 'https:' ? '443' : '80')
  const chosenPort = url.port || (url.protocol === 'https:' ? '443' : '80')
  if (!backendPortRaw && chosenPort === reqPort) {
    url.port = '5000'
  }

  return url.origin
}

function getApiToken(): string {
  // Важно: env-ключ с дефисом (`X-API-TOKEN`) иногда не подхватывается некоторыми окружениями.
  // Поэтому читаем несколько вариантов.
  return (
    (process.env['X-API-TOKEN'] as string | undefined) ||
    process.env.X_API_TOKEN ||
    process.env.API_TOKEN ||
    ''
  ).trim()
}

function buildApiFormData(input: FormData): FormData {
  const audioFile = input.get('audio') as File | null
  const surah = input.get('surah') as string | null
  const ayahNumber = input.get('ayahNumber') as string | null

  const apiFormData = new FormData()
  if (audioFile) apiFormData.append('audio', audioFile)

  // Маппим параметры фронта в формат, ожидаемый бэкендом.
  // Фронт отправляет: `surah`, `ayahNumber`
  // Бэкенд ожидает: `surah_raw`, `ayah_number_raw`
  if (surah) {
    apiFormData.append('surah_raw', surah)
  }
  if (ayahNumber) {
    apiFormData.append('ayah_number_raw', ayahNumber)
  }

  return apiFormData
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'Аудио файл не найден' }, { status: 400 })
    }

    const baseUrl = getBackendBaseUrl(request.url)
    const token = getApiToken()

    const headers: HeadersInit = token ? { 'X-API-TOKEN': token } : {}

    // Вызываем бэкенд `/api/analyze` (FastAPI).
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers,
      body: buildApiFormData(formData),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Ошибка при анализе аудио на backend API' }))

      return NextResponse.json(
        { error: errorData.detail || errorData.message || 'Ошибка при анализе аудио' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка в /api/analyze-tajwid proxy route:', error)
    return NextResponse.json({ error: 'Ошибка при обработке запроса' }, { status: 500 })
  }
}
