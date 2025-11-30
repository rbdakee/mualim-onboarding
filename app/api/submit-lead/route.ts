import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// URL API на Digital Ocean
const DIGITAL_OCEAN_API_URL = process.env.DIGITAL_OCEAN_API_URL || 'http://localhost:5000'

// Маппинг кодов ответов на текстовые значения
const ANSWER_LABELS: Record<string, string> = {
  // q1_age
  age_under18: "До 18 лет",
  age_18_25: "18–25 лет",
  age_26_35: "26–35 лет",
  age_36_45: "36–45 лет",
  age_over45: "Старше 45 лет",
  // q2_gender
  male: "Мужчина",
  female: "Женщина",
  // q4_level
  basics: "Только изучал(а) основы",
  forgot: "Проходил(а) курс, но многое забыл(а)",
  know_no_practice: "Уверенно знаю правила, но не практикую",
  practice_improve: "Практикую, но хочу улучшить произношение",
  // q5_frequency
  daily: "Ежедневно",
  few_times_week: "Несколько раз в неделю",
  sometimes: "Иногда",
  rarely: "Почти не читаю сейчас",
  // q6_where
  home: "Дома, самостоятельно",
  mosque: "В мечети",
  online_group: "В онлайн-группе / с наставником",
  not_regular: "Пока не читаю регулярно",
  // q7_learning_style
  self_paced: "Самостоятельно, в удобное время",
  with_mentor: "С наставником и обратной связью",
  in_group: "В группе / с другими участниками",
  short_videos: "Через короткие видео и тренировки",
  // q9_important
  spiritual: "Духовное ощущение близости к Аллаху",
  beauty: "Красота и правильность чтения",
  discipline: "Дисциплина и регулярность",
  meaning: "Осознание смысла аятов",
  // q10_inspiration
  after_prayer: "После молитвы",
  morning: "Утром",
  evening: "Вечером перед сном",
  friday_ramadan: "В пятницу / Рамадан",
  when_mood: "Когда есть настроение",
  // q11_why
  spiritual_connection: "Хочу укрепить духовную связь с Аллахом",
  family_example: "Хочу быть примером для семьи / детей",
  confident_reading: "Хочу читать уверенно и красиво",
  refresh_knowledge: "Хочу вспомнить и закрепить знания",
  // q13_duration
  "5_10_min": "5–10 минут в день",
  "15_20_min": "15–20 минут в день",
  one_long: "Один длинный урок в неделю",
  auto_remind: "Хочу, чтобы система сама напоминала",
  // q14_reminders
  "2_3_week": "Да, 2–3 раза в неделю",
  new_tasks: "Только при новых заданиях",
  no_self: "Нет, хочу сам контролировать",
  // q15_inspiration_source
  progress: "Прогресс и результаты",
  quran_hadith: "Слова из Корана и хадисы",
  others_examples: "Примеры других учеников",
  voice_beauty: "Голос и красота чтения",
}

function getAnswerLabel(answerCode: string | undefined): string {
  if (!answerCode) return ""
  return ANSWER_LABELS[answerCode] || answerCode
}

function convertAnswersToLabels(answers: Record<string, string> | undefined): Record<string, string> {
  if (!answers) return {}
  const converted: Record<string, string> = {}
  for (const [key, value] of Object.entries(answers)) {
    converted[key] = getAnswerLabel(value)
  }
  return converted
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadData, answers, analysisResult } = body

    // Валидация данных
    if (!leadData || !leadData.name || !leadData.contact) {
      return NextResponse.json(
        { error: 'Необходимо указать имя и контакт' },
        { status: 400 }
      )
    }

    // Преобразуем коды ответов в текстовые значения
    const answersWithLabels = convertAnswersToLabels(answers)
    
    // Формируем данные для сохранения
    const submissionData = {
      timestamp: new Date().toISOString(),
      leadData: {
        name: leadData.name,
        contact: leadData.contact,
      },
      answers: answersWithLabels, // Используем текстовые значения
      analysisResult: analysisResult ? {
        score_percent: analysisResult.score_percent,
        correct_ayahs: analysisResult.correct_ayahs,
        total_ayahs: analysisResult.total_ayahs,
      } : null,
    }

    // Отправляем запрос на Digital Ocean API
    try {
      const response = await fetch(`${DIGITAL_OCEAN_API_URL}/api/submit-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка при сохранении в Google Sheets' }))
        console.error('Digital Ocean API error:', errorData)
        
        // Сохраняем локально как резервный вариант
        try {
          const dataDir = join(process.cwd(), 'data', 'leads')
          if (!existsSync(dataDir)) {
            await mkdir(dataDir, { recursive: true })
          }
          const fileName = `lead_${Date.now()}_${leadData.name.replace(/\s+/g, '_')}.json`
          const filePath = join(dataDir, fileName)
          await writeFile(filePath, JSON.stringify(submissionData, null, 2), 'utf-8')
          console.log(`✅ Данные сохранены локально (резерв): ${filePath}`)
        } catch (localError) {
          console.error('Ошибка при локальном сохранении:', localError)
        }
        
        return NextResponse.json({
          success: false,
          message: 'Ошибка при сохранении в Google Sheets',
          error: errorData.detail || errorData.message || 'Неизвестная ошибка',
          savedLocally: true
        }, { status: response.status })
      }

      const result = await response.json()
      console.log('Digital Ocean API success:', result)
      return NextResponse.json(result)

    } catch (fetchError) {
      console.error('Ошибка при отправке запроса на Digital Ocean API:', fetchError)
      
      // Сохраняем локально как резервный вариант
      try {
        const dataDir = join(process.cwd(), 'data', 'leads')
        if (!existsSync(dataDir)) {
          await mkdir(dataDir, { recursive: true })
        }
        const fileName = `lead_${Date.now()}_${leadData.name.replace(/\s+/g, '_')}.json`
        const filePath = join(dataDir, fileName)
        await writeFile(filePath, JSON.stringify(submissionData, null, 2), 'utf-8')
        console.log(`✅ Данные сохранены локально (резерв): ${filePath}`)
      } catch (localError) {
        console.error('Ошибка при локальном сохранении:', localError)
      }
      
      return NextResponse.json(
        { error: 'Ошибка при сохранении данных', savedLocally: true },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Ошибка при сохранении данных формы:', error)
    return NextResponse.json(
      { error: 'Ошибка при сохранении данных' },
      { status: 500 }
    )
  }
}

