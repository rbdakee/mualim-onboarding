import { NextRequest, NextResponse } from 'next/server'

// URL API на Digital Ocean
const DIGITAL_OCEAN_API_URL = process.env.DIGITAL_OCEAN_API_URL || 'http://localhost:5000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const surah = formData.get('surah') as string | null
    const ayahNumber = formData.get('ayahNumber') as string | null
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Аудио файл не найден' }, { status: 400 })
    }

    // Создаем FormData для отправки на Digital Ocean API
    const apiFormData = new FormData()
    apiFormData.append('audio', audioFile)
    if (surah) apiFormData.append('surah', surah)
    if (ayahNumber) apiFormData.append('ayahNumber', ayahNumber)

    // Отправляем запрос на Digital Ocean API
    const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/analyze-tajwid`, {
      method: 'POST',
      body: apiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Ошибка при анализе аудио на Digital Ocean API' }))
      console.error('Digital Ocean API error:', errorData)
      return NextResponse.json(
        { error: errorData.detail || errorData.message || 'Ошибка при анализе аудио на Digital Ocean' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Ошибка при отправке запроса на Digital Ocean API:', error)
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}
