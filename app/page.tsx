"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ChevronLeft, Mic, Square } from "lucide-react"
import Image from "next/image"

type Answer = {
  [key: string]: string
}

type LeadData = {
  name: string
  contact: string
}

type Screen = {
  type:
    | "hero"
    | "question"
    | "feedback"
    | "basmalah"
    | "reading"
    | "level-assessment"
    | "methodology"
    | "testimonials"
    | "teachers"
    | "why-important"
    | "what-we-gain"
    | "why-not-learned"
    | "mualim-approach"
    | "stats"
    | "lead"
    | "result"
    | "payment" // Added payment screen type
  id?: string
  emoji?: string
  question?: string
  category?: string
  options?: Array<{ id: string; label: string; feedback?: string }>
  quote?: string
}

const screens: Screen[] = [
  { type: "hero" },
  // Базовая информация
  {
    type: "question",
    id: "q1_age",
    emoji: "🌙",
    category: "1. Базовая информация",
    question: "Укажи свой возраст",
    options: [
      { id: "age_under18", label: "До 18 лет" },
      { id: "age_18_25", label: "18–25 лет" },
      { id: "age_26_35", label: "26–35 лет" },
      { id: "age_36_45", label: "36–45 лет" },
      { id: "age_over45", label: "Старше 45 лет" },
    ],
  },
  {
    type: "question",
    id: "q2_gender",
    emoji: "👤",
    category: "1. Базовая информация",
    question: "Укажи свой пол",
    options: [
      { id: "male", label: "Мужчина" },
      { id: "female", label: "Женщина" },
    ],
  },
  {
    type: "question",
    id: "q4_level",
    emoji: "📚",
    category: "1. Базовая информация",
    question: "Какой у тебя уровень знаний таджвида?",
    options: [
      { id: "basics", label: "Только изучал(а) основы" },
      { id: "forgot", label: "Проходил(а) курс, но многое забыл(а)" },
      { id: "know_no_practice", label: "Уверенно знаю правила, но не практикую" },
      { id: "practice_improve", label: "Практикую, но хочу улучшить произношение" },
    ],
  },
  {
    type: "question",
    id: "q5_frequency",
    emoji: "📖",
    category: "1. Базовая информация",
    question: "Как часто ты читаешь Коран?",
    options: [
      { id: "daily", label: "Ежедневно", feedback: "Машаллах! Регулярность — ключ к красивому чтению. 🌟" },
      {
        id: "few_times_week",
        label: "Несколько раз в неделю",
        feedback: "Отличный ритм — можно немного усилить постоянство. 📈",
      },
      { id: "sometimes", label: "Иногда", feedback: "Даже 10 минут в день уже укрепляют связь с Аллахом. 🤲" },
      {
        id: "rarely",
        label: "Почти не читаю сейчас",
        feedback: "Всё начинается с одного шага — приложение поможет вернуть привычку. 🚶",
      },
    ],
    quote:
      "И читай Коран размеренным чтением (с тарти́лем) [не спеша, четко проговаривая буквы, слова].\n\n— Сура Аль-Муззаммиль (73:4)",
  },
  // Контекст духовной и учебной практики
  {
    type: "question",
    id: "q6_where",
    emoji: "🕌",
    category: "2. Контекст духовной и учебной практики",
    question: "Где ты обычно читаешь Коран?",
    options: [
      { id: "home", label: "Дома, самостоятельно" },
      { id: "mosque", label: "В мечети" },
      { id: "online_group", label: "В онлайн-группе / с наставником" },
      { id: "not_regular", label: "Пока не читаю регулярно" },
    ],
  },
  {
    type: "question",
    id: "q7_learning_style",
    emoji: "🎓",
    category: "2. Контекст духовной и учебной практики",
    question: "Как ты предпочитаешь учиться?",
    options: [
      { id: "self_paced", label: "Самостоятельно, в удобное время" },
      { id: "with_mentor", label: "С наставником и обратной связью" },
      { id: "in_group", label: "В группе / с другими участниками" },
      { id: "short_videos", label: "Через короткие видео и тренировки" },
    ],
  },
  {
    type: "question",
    id: "q9_important",
    emoji: "💎",
    category: "2. Контекст духовной и учебной практики",
    question: "Что для тебя важнее всего в таджвиде?",
    options: [
      {
        id: "spiritual",
        label: "Духовное ощущение близости к Аллаху",
        feedback: "Это суть таджвида — каждое слово приближает к Создателю. 🤲",
      },
      {
        id: "beauty",
        label: "Красота и правильность чтения",
        feedback: "Ты стремишься к совершенству — отличный настрой. ✨",
      },
      {
        id: "discipline",
        label: "Дисциплина и регулярность",
        feedback: "Малая, но постоянная практика даёт великие результаты. 📊",
      },
      {
        id: "meaning",
        label: "Осознание смысла аятов",
        feedback: "Таджуид помогает читать не только красиво, но и с пониманием. 💡",
      },
    ],
    quote:
      "«Тот, кто читает Коран красиво, плавно и точно, будет в компании благородных и праведных ангелов. А тот, кто читает его с трудом, заикаясь или сбиваясь, получит двойное вознаграждение»\n\n(Сахих Муслим)",
  },
  {
    type: "question",
    id: "q10_inspiration",
    emoji: "✨",
    category: "2. Контекст духовной и учебной практики",
    question: "Когда ты чувствуешь вдохновение читать Коран?",
    options: [
      { id: "after_prayer", label: "После молитвы" },
      { id: "morning", label: "Утром" },
      { id: "evening", label: "Вечером перед сном" },
      { id: "friday_ramadan", label: "В пятницу / Рамадан" },
      { id: "when_mood", label: "Когда есть настроение" },
    ],
  },
  // Мотивация и цели
  {
    type: "question",
    id: "q11_why",
    emoji: "🌿",
    category: "3. Мотивация и цели",
    question: "Зачем ты хочешь вернуться к практике таджвида?",
    options: [
      { id: "spiritual_connection", label: "Хочу укрепить духовную связь с Аллахом" },
      { id: "family_example", label: "Хочу быть примером для семьи / детей" },
      { id: "confident_reading", label: "Хочу читать уверенно и красиво" },
      { id: "refresh_knowledge", label: "Хочу вспомнить и закрепить знания" },
    ],
  },
  {
    type: "question",
    id: "q13_duration",
    emoji: "⏰",
    category: "3. Мотивация и цели",
    question: "Какая длительность занятий тебе комфортна?",
    options: [
      { id: "5_10_min", label: "5–10 минут в день" },
      { id: "15_20_min", label: "15–20 минут в день" },
      { id: "one_long", label: "Один длинный урок в неделю" },
      { id: "auto_remind", label: "Хочу, чтобы система сама напоминала" },
    ],
  },
  {
    type: "question",
    id: "q14_reminders",
    emoji: "🔔",
    category: "3. Мотивация и цели",
    question: "Хочешь получать напоминания и мотивацию?",
    options: [
      { id: "daily", label: "Да, ежедневно" },
      { id: "2_3_week", label: "Да, 2–3 раза в неделю" },
      { id: "new_tasks", label: "Только при новых заданиях" },
      { id: "no_self", label: "Нет, хочу сам контролировать" },
    ],
  },
  {
    type: "question",
    id: "q15_inspiration_source",
    emoji: "💫",
    category: "3. Мотивация и цели",
    question: "Что вдохновляет тебя больше всего?",
    options: [
      { id: "progress", label: "Прогресс и результаты" },
      { id: "quran_hadith", label: "Слова из Корана и хадисы" },
      { id: "others_examples", label: "Примеры других учеников" },
      { id: "voice_beauty", label: "Голос и красота чтения" },
    ],
  },
  { type: "basmalah" },
  { type: "reading" },
  { type: "level-assessment" },
  { type: "methodology" },
  { type: "testimonials" },
  { type: "teachers" },
  { type: "why-important" },
  { type: "what-we-gain" },
  { type: "stats" },
  { type: "why-not-learned" },
  { type: "mualim-approach" },
  { type: "lead" },
  { type: "result" },
  { type: "payment" }, // Added payment screen to flow
]

const testimonials = [
  {
    name: "Амина",
    age: 28,
    text: "Я всегда боялась читать Коран вслух из-за ошибок. Теперь читаю уверенно и даже веду намаз дома!",
    rating: 5,
  },
  {
    name: "Ибрагим",
    age: 35,
    text: "За 3 месяца я научился читать с таджвидом. AI Устаз терпеливо исправлял каждую ошибку.",
    rating: 5,
  },
  {
    name: "Фатима",
    age: 42,
    text: "Хотела научить детей, но сама не знала правил. Теперь мы учимся вместе!",
    rating: 5,
  },
]

export default function OnboardingPage() {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [leadData, setLeadData] = useState<LeadData>({ name: "", contact: "" })
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [selectedFeedback, setSelectedFeedback] = useState<string>("")
  const [currentQuote, setCurrentQuote] = useState<string>("")
  const [isRecording, setIsRecording] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [timeLeft, setTimeLeft] = useState(300) // Added timer state (5 minutes = 300 seconds)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const prevScreenTypeRef = useRef<string | undefined>(undefined)
  
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ar-SA' // Арабский язык
      utterance.rate = 0.7 // Медленнее для лучшего понимания
      speechSynthesis.speak(utterance)
    }
  }

  const getErrorTooltip = (op: string) => {
    switch (op) {
      case 'replace': return 'Неправильное произношение'
      case 'delete': return 'Пропущено слово'
      case 'insert': return 'Пропущено слово'
      default: return ''
    }
  }

  const getErrorColor = (op: string) => {
    switch (op) {
      case 'equal': return { text: 'text-green-400', border: 'border-green-400/30', bg: 'bg-green-400/10' }
      case 'replace': return { text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/10' }
      case 'delete': return { text: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/10' }
      case 'insert': return { text: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/10' }
      default: return { text: 'text-gray-400', border: 'border-gray-400/30', bg: 'bg-gray-400/10' }
    }
  }
  const renderWordAlignment = (alignment: any[], side: 'ref' | 'hyp', originalRefTokens?: string[]) => {
    if (!Array.isArray(alignment)) return null
    return (
      <div className="flex flex-wrap gap-1 items-start" dir="rtl" style={{unicodeBidi: 'isolate'}}>
        {alignment.map((op, idx) => {
          let token = ''
          if (side === 'ref') {
            // Если есть массив оригинальных слов с огласовками и индекс в выравнивании, берём его
            if (originalRefTokens && typeof op.ref_idx === 'number' && originalRefTokens[op.ref_idx]) {
              token = originalRefTokens[op.ref_idx]
            } else {
              token = op.ref_word || ''
            }
          } else {
            token = op.hyp_word || ''
          }
          if (!token) {
            return null
          }
          
          const colors = getErrorColor(op.op)
          const tooltip = getErrorTooltip(op.op)
          const isClickable = op.op !== 'equal' && side === 'ref'
          
          return (
            <span 
              key={idx} 
              className={`
                px-1 py-0.5 rounded border text-sm cursor-pointer transition-all duration-200 hover:scale-105
                ${colors.text} ${colors.border} ${colors.bg}
                ${isClickable ? 'hover:shadow-md' : 'cursor-default'}
              `}
              title={tooltip}
              onClick={() => {
                if (isClickable) {
                  speakText(token)
                }
              }}
            >
              {token}
            </span>
          )
        })}
      </div>
    )
  }
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)

  const screen = screens[currentScreen]
  const totalScreens = screens.length
  const progress = ((currentScreen + 1) / totalScreens) * 100

  useEffect(() => {
    if (screen.type === "payment" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [screen.type, timeLeft])

  // Очистка состояния аудио при переходе к экрану чтения Аль-Фатихи
  useEffect(() => {
    const prevScreenType = prevScreenTypeRef.current
    const currentScreenType = screen.type
    
    // Очищаем состояние только при реальном переходе между экранами
    if (currentScreenType === "reading" && prevScreenType !== "reading") {
      // Останавливаем запись, если она активна
      setMediaRecorder((currentRecorder) => {
        if (currentRecorder && currentRecorder.state !== 'inactive') {
          try {
            currentRecorder.stop()
          } catch (e) {
            // Игнорируем ошибки при остановке
          }
        }
        return null
      })
      setIsRecording(false)
      
      // Очищаем все состояние, связанное с предыдущей записью басмалы
      setAnalysisResult(null)
      setAudioChunks([])
      setIsAnalyzing(false)
      
      // Освобождаем URL объекта перед очисткой
      setRecordedAudioUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl)
        }
        return null
      })
    }
    
    // Также очищаем состояние при переходе к басмале (на случай возврата назад)
    if (currentScreenType === "basmalah" && prevScreenType !== "basmalah") {
      // Останавливаем запись, если она активна
      setMediaRecorder((currentRecorder) => {
        if (currentRecorder && currentRecorder.state !== 'inactive') {
          try {
            currentRecorder.stop()
          } catch (e) {
            // Игнорируем ошибки при остановке
          }
        }
        return null
      })
      setIsRecording(false)
      
      // Очищаем все состояние
      setAnalysisResult(null)
      setAudioChunks([])
      setIsAnalyzing(false)
      
      // Освобождаем URL объекта перед очисткой
      setRecordedAudioUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl)
        }
        return null
      })
    }
    
    // Обновляем предыдущий тип экрана
    prevScreenTypeRef.current = currentScreenType
  }, [screen.type])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleOptionSelect = (questionId: string, optionId: string, feedback?: string, quote?: string) => {
    setAnswers({ ...answers, [questionId]: optionId })

    if (feedback) {
      setSelectedFeedback(feedback)
      setCurrentQuote(quote || "")
      // Убрали setTimeout - теперь пользователь сам нажимает "Далее"
    } else {
      if (currentScreen < screens.length - 1) {
        setCurrentScreen(currentScreen + 1)
      }
    }
  }

  const handleFeedbackNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1)
      setSelectedFeedback("")
      setCurrentQuote("")
    }
  }

  const validateLead = () => {
    const newErrors: { [key: string]: string } = {}

    if (leadData.name.trim().length < 2) {
      newErrors.name = "Укажи своё имя"
    }

    const contactPattern = /^(\+?\d{7,15}|@[-_a-zA-Z0-9]{3,32})$/
    if (!contactPattern.test(leadData.contact.trim())) {
      newErrors.contact = "Укажи корректный контакт"
    }

    if (!policyAccepted) {
      newErrors.policy = "Необходимо согласие"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (screen.type === "lead") {
      if (!validateLead()) return
      
      // Отправляем данные формы на сервер
      try {
        const response = await fetch('/api/submit-lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leadData,
            answers,
            analysisResult,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ Данные формы сохранены:', result)
        } else {
          console.error('Ошибка при сохранении данных формы')
        }
      } catch (error) {
        console.error('Ошибка при отправке данных формы:', error)
        // Продолжаем даже если сохранение не удалось
      }
    }

    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1)
    }
  }

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1)
      setErrors({})
      setSelectedFeedback("")
      setCurrentQuote("")
    }
  }

  const canProceed = () => {
    if (screen.type === "question" && screen.id) {
      return !!answers[screen.id]
    }
    return true
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }
      
      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
      setAudioChunks([])
    } catch (error) {
      console.error('Ошибка при запуске записи:', error)
      alert('Не удалось получить доступ к микрофону')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const analyzeAudio = async (isBasmalah: boolean = false) => {
    if (audioChunks.length === 0) return
    
    setIsAnalyzing(true)
    
    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      
      // Создаем URL для воспроизведения аудио
      const audioUrl = URL.createObjectURL(audioBlob)
      setRecordedAudioUrl(audioUrl)
      
      console.log('🎤 Отправляем аудио на анализ:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: audioChunks.length,
        isBasmalah
      })
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      if (isBasmalah) {
        // Для басмалы проверяем только аят 1
        formData.append('surah', '1')
        formData.append('ayahNumber', '1')
      } else {
        // Для основной страницы проверяем Аль-Фатиху без басмалы (аяты 2-7)
        formData.append('surah', '1')
      }
      
      console.log('📤 Отправляем запрос к API...')
      
      const response = await fetch('/api/analyze-tajwid', {
        method: 'POST',
        body: formData,
      })
      
      console.log('📥 Получен ответ от API:', response.status)
      
      const result = await response.json()
      console.log('🔍 Результат анализа:', result)
      
      // Фильтрация больше не нужна - Python скрипт уже исключает басмалу при проверке
      // Но оставляем для обратной совместимости, если что-то пойдет не так
      if (!isBasmalah && result.success && result.message_type === "surah" && result.ayahs) {
        // Убеждаемся, что басмала не попала в результаты (на всякий случай)
        result.ayahs = result.ayahs.filter((ayah: any) => ayah.ayah_number >= 2 && ayah.ayah_number <= 7)
        // Пересчитываем статистику
        result.correct_ayahs = result.ayahs.filter((ayah: any) => ayah.is_correct).length
        result.total_ayahs = result.ayahs.length
        result.all_correct = result.correct_ayahs === result.total_ayahs
      }
      
      setAnalysisResult(result)
      
      if (result.success) {
        console.log('✅ Анализ успешен')
        // Результат отображается в UI, пользователь сам решает когда продолжить
      } else {
        console.error('❌ Ошибка анализа:', result.error || result.details)
      }
    } catch (error) {
      console.error('💥 Ошибка при анализе аудио:', error)
      alert('Ошибка при анализе аудио. Попробуйте еще раз.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleFinishReading = () => {
    if (isRecording) {
      stopRecording()
    }
    
    if (audioChunks.length > 0) {
      const isBasmalah = screen.type === "basmalah"
      analyzeAudio(isBasmalah)
    }
    // Убрали автоматический переход - пользователь сам нажмет "Продолжить" после анализа
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="mx-auto max-w-md bg-[#0a0e1a] min-h-screen relative">
        {/* Progress Bar */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-md w-full h-1 bg-[#1a1f2e] z-50">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Back Button */}
        {currentScreen > 0 && 
          screen.type !== "result" && 
          screen.type !== "payment" && 
          !selectedFeedback && 
          screen.type !== "question" && (
          <button
            onClick={handleBack}
            className="fixed top-4 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2rem)] z-40"
          >
            <div className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-background transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        )}

        {/* Screen Content */}
        <div className="pt-16 pb-32 px-6 min-h-screen animate-in fade-in duration-500">
          {screen.type === "hero" && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
              <h1 className="text-3xl font-bold mb-6 text-white text-balance leading-tight px-4">
                Обрети уверенность в чтении Корана с AI Устазом
              </h1>

              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="text-yellow-400 text-sm">🌿</div>
                <div className="text-yellow-400 text-xl">⭐⭐⭐⭐⭐</div>
                <div className="text-yellow-400 text-sm">🌿</div>
              </div>
              <div className="text-white/80 font-semibold mb-8">4.9 • 8K RATINGS</div>

              <div className="relative mb-8 animate-in zoom-in duration-700">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-emerald-400/20 to-blue-500/30 rounded-full blur-3xl scale-110" />
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500/20">
                  <Image
                    src="/images/hero-character.png"
                    alt="TajwidAI Character"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              </div>

              <div className="relative max-w-sm mb-8">
                <div className="bg-[#1a1f2e]/90 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-2xl">
                  <p className="text-white/90 text-lg leading-relaxed">
                    Сможешь ли ты прочитать аль-Фатиху без ошибок? 🤔 Давай проверим!
                  </p>
                </div>
                {/* Speech bubble tail */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#1a1f2e]/90 rotate-45 border-l border-t border-white/10" />
              </div>

              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span className="text-yellow-400">✨</span>
                <span>Бесплатный тест — всего 4 мин</span>
              </div>
            </div>
          )}

          {/* Removed intro screen rendering as it was removed from screens array */}

          {screen.type === "basmalah" && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-6 animate-in zoom-in duration-500">📖</div>
              <h2 className="text-2xl font-bold text-center mb-4 text-white">Давай начнем с простого</h2>
              <p className="text-white/70 text-center mb-8 max-w-sm">
                Прочитай басмалу (бисмилляхиррахманиррахим). AI Устаз будет слушать и анализировать твоё чтение.
              </p>

              <div className="relative mb-8">
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                    isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-emerald-500 hover:bg-emerald-600",
                  )}
                >
                  {isRecording ? <Square className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
                </button>
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                )}
              </div>

              {isRecording && (
                <div className="text-center mb-8">
                  <p className="text-white/90 text-lg mb-2">Слушаю...</p>
                  <div className="flex gap-1 justify-center">
                    <div
                      className="w-1 h-8 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1 h-12 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1 h-10 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                    <div
                      className="w-1 h-14 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "450ms" }}
                    />
                    <div
                      className="w-1 h-8 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "600ms" }}
                    />
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4 animate-spin">🔄</div>
                  <p className="text-white/90 text-lg mb-2">Анализирую чтение...</p>
                  <p className="text-white/70 text-sm">AI Устаз проверяет твоё произношение</p>
                </div>
              )}

              {analysisResult && analysisResult.success && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-white/90 text-lg mb-4">Анализ завершён!</p>
                  
                  {/* Результат проверки басмалы (один аят) */}
                  <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-600/30 max-w-sm mx-auto mb-4">
                    <div className="text-2xl font-bold text-emerald-400 mb-3">
                      Результат проверки
                    </div>
                    
                    {/* Аят c разметкой слов */}
                    <div className="mb-4">
                      <div className="bg-black/30 rounded-xl p-5 text-right text-white/90 text-lg sm:text-xl leading-relaxed">
                        {analysisResult.alignment?.word
                          ? renderWordAlignment(
                              analysisResult.alignment.word,
                              'ref',
                              (analysisResult.reference || '').trim().split(/\s+/)
                            )
                          : analysisResult.reference}
                      </div>
                    </div>

                    {/* Подсветка правильного/ошибочного чтения */}
                    {analysisResult.alignment?.word && (
                      <div className="mb-4 text-right">
                        {/* Легенда цветов */}
                        <div className="mb-3 p-2 bg-black/20 rounded-lg">
                          <div className="text-white/80 text-xs mb-2 font-semibold">Обозначения:</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-1 py-0.5 rounded border border-green-400/30 bg-green-400/10 text-green-400">✅ Правильно</span>
                            <span className="px-1 py-0.5 rounded border border-orange-400/30 bg-orange-400/10 text-orange-400">🔄 Неправильно</span>
                            <span className="px-1 py-0.5 rounded border border-red-400/30 bg-red-400/10 text-red-400">❌ Пропущено</span>
                          </div>
                          <div className="text-white/60 text-xs mt-1">💡 Кликни на цветное слово эталона, чтобы услышать правильное произношение</div>
                        </div>

                        {/* Статистика ошибок */}
                        {analysisResult.metrics && (
                          <div className="mt-3 p-2 bg-black/20 rounded-lg">
                            <div className="text-white/80 text-xs mb-1 font-semibold">Статистика:</div>
                            <div className="text-white/60 text-xs">
                              Точность: {Math.round((1 - analysisResult.metrics.wer) * 100)}% слов
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Результат проверки */}
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {analysisResult.is_correct ? (
                          <>
                            <div className="text-2xl">✅</div>
                            <div className="text-green-400 font-semibold">Правильно!</div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl">⚠️</div>
                            <div className="text-yellow-400 font-semibold">Есть ошибки</div>
                          </>
                        )}
                      </div>
                      <div className="text-white/70 text-xs">
                        {analysisResult.is_correct 
                          ? "Ты правильно прочитал басмалу!" 
                          : "Попробуй еще раз, обращая внимание на произношение"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Воспроизведение аудио */}
                  {recordedAudioUrl && (
                    <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-600/30 max-w-sm mx-auto mb-4">
                      <div className="text-white/80 text-sm mb-2 font-semibold">Твоя запись:</div>
                      <audio 
                        controls 
                        className="w-full h-10"
                        src={recordedAudioUrl}
                      >
                        Твой браузер не поддерживает воспроизведение аудио
                      </audio>
                    </div>
                  )}
                  
                  {/* Дополнительная информация */}
                  <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-600/30 max-w-sm mx-auto mb-4">
                    <div className="text-blue-400 text-sm font-semibold mb-2">💡 Совет:</div>
                    <div className="text-white/80 text-xs leading-relaxed">
                      {analysisResult.is_correct 
                        ? "Отлично! Теперь перейдем к основной суре Аль-Фатиха."
                        : analysisResult.alignment?.word ? (
                          (() => {
                            const errors = analysisResult.alignment.word.filter((op: any) => op.op !== 'equal')
                            const replaceCount = errors.filter((op: any) => op.op === 'replace').length
                            const deleteCount = errors.filter((op: any) => op.op === 'delete').length
                            
                            if (replaceCount > 0) {
                              return "Обрати внимание на произношение слов — некоторые звуки нужно произносить точнее."
                            } else if (deleteCount > 0) {
                              return "Не пропускай слова — читай медленно и внимательно каждое слово."
                            } else {
                              return "Слушай внимательно правильное произношение и повторяй медленно."
                            }
                          })()
                        ) : "Слушай внимательно правильное произношение и повторяй медленно."}
                    </div>
                  </div>
                  
                  {/* Кнопки действий */}
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => {
                        setAnalysisResult(null)
                        setRecordedAudioUrl(null)
                        setAudioChunks([])
                      }}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Записать снова
                    </Button>
                    <Button
                      onClick={() => {
                        if (currentScreen < screens.length - 1) {
                          setCurrentScreen(currentScreen + 1)
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Продолжить
                    </Button>
                  </div>
                </div>
              )}

              {analysisResult && !analysisResult.success && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-white/90 text-lg mb-4">Ошибка анализа</p>
                  
                  <div className="bg-red-600/20 rounded-2xl p-6 border border-red-600/30 max-w-sm mx-auto mb-4">
                    <div className="text-red-400 font-semibold mb-2">Что произошло:</div>
                    <div className="text-white/80 text-sm mb-4">
                      {analysisResult.error || 'Неизвестная ошибка при анализе аудио'}
                    </div>
                    
                    {/* Показываем детали ошибки для диагностики */}
                    {analysisResult.details && (
                      <div className="mb-4">
                        <div className="text-red-400 font-semibold mb-2 text-xs">Детали ошибки:</div>
                        <div className="bg-black/30 rounded-lg p-3 text-white/70 text-xs leading-relaxed text-left">
                          {analysisResult.details}
                        </div>
                      </div>
                    )}
                    
                    {/* Воспроизведение аудио даже при ошибке */}
                    {recordedAudioUrl && (
                      <div className="mb-4">
                        <div className="text-white/80 text-sm mb-2 font-semibold">Твоя запись:</div>
                        <audio 
                          controls 
                          className="w-full h-10"
                          src={recordedAudioUrl}
                        >
                          Твой браузер не поддерживает воспроизведение аудио
                        </audio>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => {
                        setAnalysisResult(null)
                        setRecordedAudioUrl(null)
                        setAudioChunks([])
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Попробовать снова
                    </Button>
                  </div>
                </div>
              )}

              {(isRecording || audioChunks.length > 0) && !isAnalyzing && !analysisResult && (
                <Button
                  onClick={handleFinishReading}
                  className="bg-white text-emerald-600 hover:bg-white/90 font-semibold"
                  size="lg"
                >
                  {isRecording ? 'Завершить запись' : 'Отправить на анализ'}
                </Button>
              )}
            </div>
          )}

          {screen.type === "reading" && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-6 animate-in zoom-in duration-500">📖</div>
              <h2 className="text-2xl font-bold text-center mb-4 text-white">Прочитай аль-Фатиху</h2>
              <p className="text-white/70 text-center mb-8 max-w-sm">
                Нажми на микрофон и начни читать. AI Устаз будет слушать и анализировать твоё чтение. (Аяты 2-7, без басмалы)
              </p>

              <div className="relative mb-8">
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                    isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-emerald-500 hover:bg-emerald-600",
                  )}
                >
                  {isRecording ? <Square className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
                </button>
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                )}
              </div>

              {isRecording && (
                <div className="text-center mb-8">
                  <p className="text-white/90 text-lg mb-2">Слушаю...</p>
                  <div className="flex gap-1 justify-center">
                    <div
                      className="w-1 h-8 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1 h-12 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1 h-10 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                    <div
                      className="w-1 h-14 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "450ms" }}
                    />
                    <div
                      className="w-1 h-8 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: "600ms" }}
                    />
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4 animate-spin">🔄</div>
                  <p className="text-white/90 text-lg mb-2">Анализирую чтение...</p>
                  <p className="text-white/70 text-sm">AI Устаз проверяет твоё произношение</p>
                </div>
              )}

              {analysisResult && analysisResult.success && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-white/90 text-lg mb-4">Анализ завершён!</p>
                  
                  {/* Проверка всей суры */}
                  {analysisResult.message_type === "surah" && analysisResult.ayahs ? (
                    <div className="max-w-2xl mx-auto space-y-4">
                      {/* Общая статистика */}
                      <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-600/30 mb-4">
                        <div className="text-2xl font-bold text-emerald-400 mb-3">
                          Результат проверки Аль-Фатихи
                        </div>
                        <div className="text-white/80 text-sm mb-2">
                          Прочитано правильно {Math.round(analysisResult.score_percent || 0)}% слов
                        </div>
                        <div className="text-white/70 text-xs">
                          {analysisResult.all_correct 
                            ? "🎉 Отлично! Ты правильно прочитал всю суру Аль-Фатиха!" 
                            : "Есть аяты с ошибками. Посмотри детали ниже."}
                        </div>
                      </div>

                      

                      {/* Результаты по каждому аяту */}
                      <div className="space-y-4">
                        {analysisResult.ayahs.map((ayah: any) => {
                          // Определяем правильность аята на основе alignment: все эталонные слова должны быть "equal"
                          const alignment = ayah.alignment?.word || []
                          const refWords = (ayah.ayah_text || '').trim().split(/\s+/)
                          const refWordCount = refWords.length
                          
                          // Подсчитываем правильные слова (equal) и ошибки
                          const equalOps = alignment.filter((op: any) => op.op === "equal" && op.ref_idx !== undefined)
                          const errorOps = alignment.filter((op: any) => op.op !== "equal" && op.op !== "insert")
                          
                          // Аят правильный, если:
                          // 1. Все эталонные слова прочитаны правильно (equal)
                          // 2. Нет ошибок замены или удаления
                          // 3. Количество правильных слов равно количеству эталонных слов
                          const uniqueEqualIndices = new Set(equalOps.map((op: any) => op.ref_idx)).size
                          const ayahIsCorrect = uniqueEqualIndices === refWordCount && errorOps.length === 0 && alignment.length > 0
                          
                          return (
                          <div 
                            key={ayah.ayah_number}
                            className={`rounded-2xl p-6 border ${
                              ayahIsCorrect
                                ? "bg-emerald-600/20 border-emerald-600/30" 
                                : "bg-yellow-600/20 border-yellow-600/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {ayahIsCorrect ? (
                                  <div className="text-2xl">✅</div>
                                ) : (
                                  <div className="text-2xl">⚠️</div>
                                )}
                                <div className={`font-semibold ${ayahIsCorrect ? "text-green-400" : "text-yellow-400"}`}>
                                  Аят {ayah.ayah_number}
                                </div>
                              </div>
                            </div>

                            {/* Текст аята с разметкой слов */}
                            <div className="mb-3">
                              {/* Заголовок убран по требованию */}
                              <div className="bg-black/30 rounded-xl p-5 text-right text-white/90 text-lg sm:text-xl leading-relaxed">
                                {ayah.alignment?.word ? (
                                  renderWordAlignment(
                                    ayah.alignment.word,
                                    'ref',
                                    (ayah.ayah_text || '').trim().split(/\s+/)
                                  )
                                ) : (
                                  <>{ayah.ayah_text}</>
                                )}
                              </div>
                            </div>

                            {/* Детали ошибок */}
                            {!ayahIsCorrect && (
                              <div className="mb-3 text-right">
                                {/* Убрана секция "Эталон" */}
                                {ayah.feedback && (
                                  <div className="mt-3 п-2 bg-black/20 rounded-lg text-left">
                                    <div className="text-white/80 text-xs font-semibold mb-1">💡 Разбор:</div>
                                    <div className="text-white/70 text-xs whitespace-pre-line">
                                      {ayah.feedback.replace(/\*\*/g, '')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Проверка одного аята (старый формат) */
                    <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-600/30 max-w-sm mx-auto mb-4">
                      <div className="text-2xl font-bold text-emerald-400 mb-3">
                        Результат проверки
                      </div>
                      
                      {/* Аят c разметкой слов */}
                      <div className="mb-4">
                        <div className="bg-black/30 rounded-xl p-5 text-right text-white/90 text-lg sm:text-xl leading-relaxed">
                          {analysisResult.alignment?.word
                            ? renderWordAlignment(
                                analysisResult.alignment.word,
                                'ref',
                                (analysisResult.reference || '').trim().split(/\s+/)
                              )
                            : analysisResult.reference}
                        </div>
                      </div>

                      {/* Подсветка правильного/ошибочного чтения */}
                      {analysisResult.alignment?.word && (
                        <div className="mb-4 text-right">
                          {/* Легенда цветов */}
                          <div className="mb-3 p-2 bg-black/20 rounded-lg">
                            <div className="text-white/80 text-xs mb-2 font-semibold">Обозначения:</div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="px-1 py-0.5 rounded border border-green-400/30 bg-green-400/10 text-green-400">✅ Правильно</span>
                              <span className="px-1 py-0.5 rounded border border-orange-400/30 bg-orange-400/10 text-orange-400">🔄 Неправильно</span>
                              <span className="px-1 py-0.5 rounded border border-red-400/30 bg-red-400/10 text-red-400">❌ Пропущено</span>
                            </div>
                            <div className="text-white/60 text-xs mt-1">💡 Кликни на цветное слово эталона, чтобы услышать правильное произношение</div>
                          </div>

                          {/* Убраны блоки Эталон/Твоя транскрипция */}
                          
                          {/* Статистика ошибок */}
                          {analysisResult.metrics && (
                            <div className="mt-3 p-2 bg-black/20 rounded-lg">
                              <div className="text-white/80 text-xs mb-1 font-semibold">Статистика:</div>
                              <div className="text-white/60 text-xs">
                                Точность: {Math.round((1 - analysisResult.metrics.wer) * 100)}% слов
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Результат проверки */}
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {analysisResult.is_correct ? (
                            <>
                              <div className="text-2xl">✅</div>
                              <div className="text-green-400 font-semibold">Правильно!</div>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl">⚠️</div>
                              <div className="text-yellow-400 font-semibold">Есть ошибки</div>
                            </>
                          )}
                        </div>
                        <div className="text-white/70 text-xs">
                          {analysisResult.is_correct 
                            ? "Ты правильно прочитал первый аят Аль-Фатихи!" 
                            : "Попробуй еще раз, обращая внимание на произношение"}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Воспроизведение аудио */}
                  {recordedAudioUrl && (
                    <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-600/30 max-w-sm mx-auto mb-4">
                      <div className="text-white/80 text-sm mb-2 font-semibold">Твоя запись:</div>
                      <audio 
                        controls 
                        className="w-full h-10"
                        src={recordedAudioUrl}
                      >
                        Твой браузер не поддерживает воспроизведение аудио
                      </audio>
                    </div>
                  )}
                  
                  {/* Дополнительная информация */}
                  <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-600/30 max-w-sm mx-auto mb-4">
                    <div className="text-blue-400 text-sm font-semibold mb-2">💡 Совет:</div>
                    <div className="text-white/80 text-xs leading-relaxed">
                      {analysisResult.message_type === "surah" 
                        ? (analysisResult.all_correct 
                            ? "🎉 Отлично! Ты правильно прочитал всю суру Аль-Фатиха! Продолжай практиковаться." 
                            : "Обрати внимание на аяты с ошибками. Попробуй прочитать их еще раз, обращая внимание на произношение.")
                        : analysisResult.is_correct 
                          ? "Отлично! Продолжай практиковаться с остальными аятами."
                          : analysisResult.alignment?.word ? (
                            (() => {
                              const errors = analysisResult.alignment.word.filter((op: any) => op.op !== 'equal')
                              const replaceCount = errors.filter((op: any) => op.op === 'replace').length
                              const deleteCount = errors.filter((op: any) => op.op === 'delete').length
                              const insertCount = errors.filter((op: any) => op.op === 'insert').length
                              
                              if (replaceCount > 0) {
                                return "Обрати внимание на произношение слов — некоторые звуки нужно произносить точнее."
                              } else if (deleteCount > 0) {
                                return "Не пропускай слова — читай медленно и внимательно каждое слово."
                              } else if (insertCount > 0) {
                                return "Старайся не добавлять лишних слов — следуй тексту точно."
                              } else {
                                return "Слушай внимательно правильное произношение и повторяй медленно."
                              }
                            })()
                          ) : "Слушай внимательно правильное произношение и повторяй медленно."}
                    </div>
                  </div>
                  
                  {/* Кнопки действий */}
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => {
                        setAnalysisResult(null)
                        setRecordedAudioUrl(null)
                        setAudioChunks([])
                      }}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Записать снова
                    </Button>
                    <Button
                      onClick={() => {
                        if (currentScreen < screens.length - 1) {
                          setCurrentScreen(currentScreen + 1)
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Продолжить
                    </Button>
                  </div>
                </div>
              )}

              {analysisResult && !analysisResult.success && (
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-white/90 text-lg mb-4">Ошибка анализа</p>
                  
                  <div className="bg-red-600/20 rounded-2xl p-6 border border-red-600/30 max-w-sm mx-auto mb-4">
                    <div className="text-red-400 font-semibold mb-2">Что произошло:</div>
                    <div className="text-white/80 text-sm mb-4">
                      {analysisResult.error || 'Неизвестная ошибка при анализе аудио'}
                    </div>
                    
                    {/* Показываем детали ошибки для диагностики */}
                    {analysisResult.details && (
                      <div className="mb-4">
                        <div className="text-red-400 font-semibold mb-2 text-xs">Детали ошибки:</div>
                        <div className="bg-black/30 rounded-lg p-3 text-white/70 text-xs leading-relaxed text-left">
                          {analysisResult.details}
                        </div>
                      </div>
                    )}
                    
                    {/* Воспроизведение аудио даже при ошибке */}
                    {recordedAudioUrl && (
                      <div className="mb-4">
                        <div className="text-white/80 text-sm mb-2 font-semibold">Твоя запись:</div>
                        <audio 
                          controls 
                          className="w-full h-10"
                          src={recordedAudioUrl}
                        >
                          Твой браузер не поддерживает воспроизведение аудио
                        </audio>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => {
                        setAnalysisResult(null)
                        setRecordedAudioUrl(null)
                        setAudioChunks([])
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Попробовать снова
                    </Button>
                  </div>
                </div>
              )}

              {(isRecording || audioChunks.length > 0) && !isAnalyzing && !analysisResult && (
                <Button
                  onClick={handleFinishReading}
                  className="bg-white text-emerald-600 hover:bg-white/90 font-semibold"
                  size="lg"
                >
                  {isRecording ? 'Завершить запись' : 'Отправить на анализ'}
                </Button>
              )}
            </div>
          )}

          {screen.type === "level-assessment" && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-6 animate-in zoom-in duration-500">🎯</div>
              <h2 className="text-2xl font-bold text-center mb-4 text-white">Твой уровень определён!</h2>

              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-3xl p-8 border-2 border-emerald-600/30 mb-6 max-w-sm">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-emerald-400 mb-2">Начальный</div>
                  <p className="text-white/70 text-sm">Уровень таджвида</p>
                </div>

                <div className="space-y-4 text-white/90">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✅</div>
                    <p className="text-sm leading-relaxed">Ты знаешь основы, но есть над чем работать</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📈</div>
                    <p className="text-sm leading-relaxed">С нашей программой ты улучшишь произношение за 4-6 недель</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎓</div>
                    <p className="text-sm leading-relaxed">
                      AI Устаз будет исправлять каждую ошибку в реальном времени
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1f2e]/50 rounded-2xl p-6 border border-white/10 max-w-sm">
                <p className="text-white/80 text-center leading-relaxed italic text-sm">
                  "Не важно, с какого уровня ты начинаешь. Важно, что ты начинаешь. Каждый шаг приближает тебя к
                  совершенству в чтении Слова Аллаха."
                </p>
              </div>
            </div>
          )}

          {screen.type === "question" && screen.id && selectedFeedback && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-600 text-white rounded-3xl p-8 shadow-2xl max-w-sm text-center space-y-6">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-lg leading-relaxed">{selectedFeedback}</p>
                {currentQuote && (
                  <div className="pt-6 border-t border-white/20">
                    <p className="text-sm leading-relaxed italic whitespace-pre-line">{currentQuote}</p>
                  </div>
                )}
                <Button
                  onClick={handleFeedbackNext}
                  className="mt-6 bg-white text-emerald-600 hover:bg-white/90 font-semibold w-full"
                  size="lg"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}

          {screen.type === "question" && screen.id && !selectedFeedback && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">{screen.emoji}</div>
              <h2 className="text-2xl font-bold text-center mb-8 text-balance text-white">{screen.question}</h2>
              <div className="space-y-3">
                {screen.options?.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(screen.id!, option.id, option.feedback, screen.quote)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-3",
                      "hover:border-emerald-600/50 active:scale-[0.98]",
                      answers[screen.id!] === option.id
                        ? "bg-emerald-600 text-white border-transparent shadow-lg"
                        : "bg-[#1a1f2e]/50 border-white/10 text-white/90",
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
                        answers[screen.id!] === option.id ? "bg-white border-white" : "border-white/30",
                      )}
                    >
                      {answers[screen.id!] === option.id && <div className="w-3 h-3 rounded-full bg-emerald-600" />}
                    </div>
                    <span className="flex-1">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen.type === "methodology" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">📚</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Твой путь к совершенству</h1>
              <p className="text-white/70 mb-8 text-center">Структурированная программа обучения таджвиду</p>

              <div className="bg-[#1a1f2e]/50 rounded-3xl p-6 border border-white/10 mb-6">
                <Image
                  src="/images/methodology.png"
                  alt="Методология обучения"
                  width={400}
                  height={300}
                  className="w-full h-auto rounded-2xl"
                />
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📖</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Грамматика и правила</div>
                      <div className="text-sm text-white/70">7 уроков от основ до продвинутого уровня</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Практика с AI</div>
                      <div className="text-sm text-white/70">Персональная обратная связь на каждом этапе</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Результат</div>
                      <div className="text-sm text-white/70">Уверенное чтение Корана с правильным таджвидом</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.type === "testimonials" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">💬</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Отзывы наших студентов</h1>
              <p className="text-white/70 mb-8 text-center">Реальные истории успеха</p>

              <div className="space-y-4 mb-8">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className={cn(
                      "bg-[#1a1f2e]/50 rounded-3xl p-6 border border-white/10 transition-all duration-500",
                      index === currentTestimonial ? "opacity-100 scale-100" : "opacity-50 scale-95",
                    )}
                    onClick={() => setCurrentTestimonial(index)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center text-xl">
                        👤
                      </div>
                      <div>
                        <div className="font-semibold text-white">{testimonial.name}</div>
                        <div className="text-sm text-white/60">{testimonial.age} лет</div>
                      </div>
                    </div>
                    <div className="text-yellow-400 mb-2">{"⭐".repeat(testimonial.rating)}</div>
                    <p className="text-white/80 leading-relaxed">{testimonial.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentTestimonial ? "bg-emerald-500 w-8" : "bg-white/30",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {screen.type === "teachers" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">👨‍🏫</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Наши устазы</h1>

              <div className="space-y-6 mb-8">
                {/* Profile Images */}
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center text-4xl border-2 border-emerald-600/30">
                    👩‍🦳
                  </div>
                  <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center text-4xl border-2 border-emerald-600/30">
                    👨
                  </div>
                  <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center text-4xl border-2 border-emerald-600/30">
                    👨
                  </div>
                </div>

                {/* Qualifications */}
                <div className="space-y-4">
                  <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📖</div>
                      <div>
                        <div className="font-semibold text-white mb-1">Хафизы Корана</div>
                        <div className="text-sm text-white/70">Полностью выучили Священный Коран наизусть</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎓</div>
                      <div>
                        <div className="font-semibold text-white mb-1">Обучались в NMU</div>
                        <div className="text-sm text-white/70">Профессиональное образование в исламских науках</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⏱️</div>
                      <div>
                        <div className="font-semibold text-white mb-1">3 года опыта преподавания</div>
                        <div className="text-sm text-white/70">Арабского языка и таджвида</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.type === "why-important" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">📿</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Почему важно читать Коран с правильным произношением?</h1>

              <div className="space-y-6 mb-8">
                <div className="bg-emerald-600/20 rounded-3xl p-6 border border-emerald-600/30">
                  <p className="text-white/90 leading-relaxed mb-4 text-center">
                    "И читай Коран размеренным чтением (с тарти́лем) [не спеша, четко проговаривая буквы, слова]."
                  </p>
                  <p className="text-white/70 text-sm text-center italic">
                    — Сура Аль-Муззаммиль (73:4)
                  </p>
                </div>

                <div className="bg-blue-600/20 rounded-3xl p-6 border border-blue-600/30">
                  <p className="text-white/90 leading-relaxed text-center">
                    «Тот, кто читает Коран красиво, плавно и точно, будет в компании благородных и праведных ангелов.
                  </p>
                  <p className="text-white/90 leading-relaxed text-center mt-3">
                    А тот, кто читает его с трудом, заикаясь или сбиваясь, получит двойное вознаграждение»
                  </p>
                  <p className="text-white/70 text-sm text-center italic mt-4">
                    (Сахих Муслим)
                  </p>
                </div>
              </div>
            </div>
          )}

          {screen.type === "what-we-gain" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">✨</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Что мы приобретаем изучая таджвид?</h1>

              <div className="space-y-4 mb-8">
                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📚</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Больше желания углубиться в изучении религии</div>
                      <div className="text-sm text-white/70">В отличие от чтения на кириллице</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🕌</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Повысится уверенность в правильности чтения в намазе</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🌍</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Первый шаг на пути к изучению арабского языка</div>
                      <div className="text-sm text-white/70">И пониманию слов Аллаха</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💎</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Инвестиция в нашу ахиру</div>
                      <div className="text-sm text-white/70">Вечное вознаграждение за правильное чтение</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.type === "why-not-learned" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">🤔</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Но зная всю важность чтения, почему мы все еще не выучили таджвид?</h1>

              <div className="space-y-3 mb-8">
                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">⏰</div>
                    <p className="text-white/90 leading-relaxed">Нету времени на самостоятельное изучение (откладывание на потом)</p>
                  </div>
                </div>

                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">😰</div>
                    <p className="text-white/90 leading-relaxed">Отсутствие уверенности в своих знаниях</p>
                  </div>
                </div>

                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">👨‍🏫</div>
                    <p className="text-white/90 leading-relaxed">Отсутствие устаза для проверки знаний</p>
                  </div>
                </div>

                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">📖</div>
                    <p className="text-white/90 leading-relaxed">Неэффективные методы обучения</p>
                  </div>
                </div>

                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">💰</div>
                    <p className="text-white/90 leading-relaxed">Бесплатное не ценится</p>
                  </div>
                </div>

                <div className="bg-red-600/10 rounded-2xl p-4 border border-red-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">👥</div>
                    <p className="text-white/90 leading-relaxed">Обычно в группе много людей, поэтому устаз не успевает уделять внимание каждому</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.type === "mualim-approach" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">🎯</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">В Mualim, мы делаем акцент на индивидуальном подходе к каждому студенту</h1>

              <div className="space-y-4 mb-8">
                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-emerald-400">1</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Индивидуальные занятия или группы до 3 человек</div>
                      <div className="text-sm text-white/70">Персональный подход каждому</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-emerald-400">2</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Возможность комфортного онлайн-обучения из дома</div>
                      <div className="text-sm text-white/70">В удобное для вас время</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-emerald-400">3</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Все устазы с опытом преподавания</div>
                      <div className="text-sm text-white/70">В таджвиде и арабском языке</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-emerald-400">4</div>
                    <div>
                      <div className="font-semibold text-white mb-1">Ваш вклад в обучение поддерживает устазов</div>
                      <div className="text-sm text-white/70">И помогает другим людям изучать Коран</div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-600/10 rounded-2xl p-4 border border-emerald-600/20">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-emerald-400">5</div>
                    <div>
                      <div className="font-semibold text-white mb-1">ИИ устаз 24/7 доступом</div>
                      <div className="text-sm text-white/70">Чтобы практиковаться таджвиду в любое время</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.type === "stats" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">📊</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Наши результаты</h1>
              <p className="text-white/70 mb-8 text-center">
                После полного прохождения курса, наши студенты читают правильно и свободно Коран на арабском с таджвидом
              </p>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-3xl p-6 border border-emerald-600/30">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-emerald-400 mb-2">1 150+</div>
                    <p className="text-white/90 leading-relaxed">
                      студентов уже успешно прошли обучение и научились читать Коран
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-3xl p-6 border border-blue-600/30">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-blue-400 mb-2">60+</div>
                    <p className="text-white/90 leading-relaxed">
                      опытных устазов, готовых делиться своими знаниями и поддерживать Вас на пути к совершенству
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-600/10 rounded-3xl p-6 border border-yellow-600/30">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-white/90 leading-relaxed font-semibold">
                    Гарантия результата – Вы начнете читать Коран с правильным таджвидом
                  </p>
                </div>
              </div>
            </div>
          )}

          {screen.type === "lead" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">✍️</div>
              <h1 className="text-3xl font-bold mb-3 text-white">Последний шаг!</h1>
              <p className="text-white/70 mb-8">Оставь контакты — подготовим старт под тебя</p>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold mb-2 block text-white">
                    Имя *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Как к тебе обращаться?"
                    value={leadData.name}
                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                    className={cn(
                      "h-12 bg-[#1a1f2e]/50 border-white/10 text-white placeholder:text-white/40",
                      errors.name && "border-destructive",
                    )}
                  />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="contact" className="text-sm font-semibold mb-2 block text-white">
                    WhatsApp / Telegram / Телефон *
                  </Label>
                  <Input
                    id="contact"
                    placeholder="+7... или @username"
                    value={leadData.contact}
                    onChange={(e) => setLeadData({ ...leadData, contact: e.target.value })}
                    className={cn(
                      "h-12 bg-[#1a1f2e]/50 border-white/10 text-white placeholder:text-white/40",
                      errors.contact && "border-destructive",
                    )}
                  />
                  {errors.contact && <p className="text-sm text-destructive mt-1">{errors.contact}</p>}
                </div>

                <div
                  className={cn(
                    "flex items-start gap-3 p-4 bg-[#1a1f2e]/30 rounded-xl cursor-pointer transition-colors hover:bg-[#1a1f2e]/50 border border-white/10",
                    errors.policy && "border-2 border-destructive",
                  )}
                  onClick={() => setPolicyAccepted(!policyAccepted)}
                >
                  <Checkbox
                    id="policy"
                    checked={policyAccepted}
                    onCheckedChange={(checked) => setPolicyAccepted(checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="policy" className="text-sm leading-relaxed cursor-pointer flex-1 text-white/80">
                    Соглашаюсь с политикой конфиденциальности
                  </label>
                </div>
                {errors.policy && <p className="text-sm text-destructive -mt-3">{errors.policy}</p>}
              </div>
            </div>
          )}

          {screen.type === "result" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-center mb-6">
                <div className="text-8xl mb-4 animate-in zoom-in duration-700">🎉</div>
                <h1 className="text-3xl font-bold mb-3 text-white">Готово, {leadData.name}!</h1>
                <p className="text-white/70">Мы подготовили старт под тебя. Начнём с "Аль-Фатиха" — прямо сейчас.</p>
              </div>
            </div>
          )}

          {screen.type === "payment" && (
            <div className="flex flex-col min-h-[calc(100vh-12rem)]">
              <div className="text-7xl text-center mb-4 animate-in zoom-in duration-500">💳</div>
              <h1 className="text-3xl font-bold mb-3 text-white text-center">Специальное предложение!</h1>

              {/* Timer */}
              {timeLeft > 0 ? (
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-600/30 rounded-2xl p-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-white/70 mb-1">Предложение истекает через:</div>
                    <div className="text-4xl font-bold text-red-400">{formatTime(timeLeft)}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1a1f2e]/50 border border-white/10 rounded-2xl p-4 mb-6">
                  <div className="text-center text-white/70">Специальное предложение истекло</div>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-3xl p-8 border-2 border-emerald-600/30 mb-6">
                <div className="text-center mb-6">
                  <div className="text-lg text-white/70 mb-2">Подписка на 3 месяца</div>

                  {timeLeft > 0 ? (
                    <>
                      <div className="text-2xl text-white/50 line-through mb-2">$30 / 16 000 ₸</div>
                      <div className="text-5xl font-bold text-emerald-400 mb-2">$15 / 7 900 ₸</div>
                      <div className="inline-block bg-red-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                        Скидка 50%
                      </div>
                    </>
                  ) : (
                    <div className="text-5xl font-bold text-white mb-2">$30 / 16 000 ₸</div>
                  )}
                </div>

                <div className="space-y-3 text-white/90 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">✅</div>
                    <p className="text-sm">Полный доступ ко всем урокам таджвида</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">✅</div>
                    <p className="text-sm">Персональная обратная связь от AI Устаза</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">✅</div>
                    <p className="text-sm">Практика чтения с анализом ошибок</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">✅</div>
                    <p className="text-sm">Доступ к сообществу учеников</p>
                  </div>
                </div>
              </div>

              {/* Kaspi QR Code */}
              <div className="bg-[#1a1f2e]/50 rounded-3xl p-6 border border-white/10 mb-6">
                <h3 className="text-xl font-semibold text-white text-center mb-4">Оплата через Kaspi QR</h3>
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
                  <img 
                    src="/files/kaspi_qr.png" 
                    alt="Kaspi QR код" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-white/70 text-sm text-center mt-4">
                  Отсканируйте QR-код в приложении Kaspi для оплаты
                </p>
              </div>

              {/* ИЛИ разделитель */}
              <div className="flex items-center justify-center my-6">
                <div className="flex-1 border-t border-white/20"></div>
                <span className="px-4 text-white/60 text-sm font-medium">ИЛИ</span>
                <div className="flex-1 border-t border-white/20"></div>
              </div>

              {/* Кнопка оплаты в приложении */}
              <div className="mb-6">
                <a
                  href="kaspikz://pay.kaspi.kz/pay/ilffc9pz"
                  className="block w-full bg-[#00D9FF] hover:bg-[#00C5E6] text-white font-semibold py-4 px-6 rounded-2xl text-center transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Оплатить в приложении
                </a>
              </div>

              <div className="text-center text-white/60 text-xs">
                После оплаты вы получите доступ к курсу в течение 5 минут
              </div>
            </div>
          )}
        </div>

        {/* Bottom Button */}
        {screen.type !== "result" &&
          screen.type !== "payment" &&
          screen.type !== "question" &&
          screen.type !== "reading" &&
          screen.type !== "basmalah" &&
          screen.type !== "level-assessment" &&
          !selectedFeedback && (
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full p-6 bg-[#0a0e1a] border-t border-white/10">
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full h-14 text-lg font-semibold shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
                size="lg"
              >
                {screen.type === "hero" && "Продолжить"}
                {screen.type === "methodology" && "Далее"}
                {screen.type === "testimonials" && "Далее"}
                {screen.type === "teachers" && "Далее"}
                {screen.type === "why-important" && "Далее"}
                {screen.type === "what-we-gain" && "Далее"}
                {screen.type === "stats" && "Далее"}
                {screen.type === "why-not-learned" && "Далее"}
                {screen.type === "mualim-approach" && "Далее"}
                {screen.type === "lead" && "🎁 Получить персональный план"}
              </Button>
            </div>
          )}

        {screen.type === "result" && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full p-6 bg-[#0a0e1a] border-t border-white/10">
            <Button
              onClick={handleNext}
              className="w-full h-14 text-lg font-semibold shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0"
              size="lg"
            >
              Начать обучение
            </Button>
          </div>
        )}

        {screen.type === "level-assessment" && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full p-6 bg-[#0a0e1a] border-t border-white/10">
            <Button
              onClick={handleNext}
              className="w-full h-14 text-lg font-semibold shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0"
              size="lg"
            >
              Продолжить
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
