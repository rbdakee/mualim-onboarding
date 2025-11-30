#!/usr/bin/env python3
"""
FastAPI для Digital Ocean
Обрабатывает запросы от Next.js приложения
"""

import os
import sys
import json
import logging
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import tempfile
from typing import Optional

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tajwid API",
    description="""
    API для анализа таджвида (правильности чтения Корана) и сохранения данных пользователей.
    
    ## Возможности
    
    * **Анализ таджвида**: Проверка правильности чтения аятов Корана с использованием AI
    * **Сохранение данных**: Сохранение ответов пользователей в Google Sheets
    * **Уведомления**: Отправка уведомлений о новых лидах в Telegram
    
    ## Endpoints
    
    * `/health` - Проверка работоспособности API
    * `/api/analyze-tajwid` - Анализ аудио файла на правильность чтения
    * `/api/submit-lead` - Сохранение данных пользователя
    
    ## Документация
    
    * Swagger UI: `/docs`
    * ReDoc: `/redoc`
    * OpenAPI Schema: `/openapi.json`
    """,
    version="1.0.0",
    tags_metadata=[
        {
            "name": "Health",
            "description": "Проверка работоспособности сервиса",
        },
        {
            "name": "Tajwid Analysis",
            "description": "Анализ правильности чтения Корана с использованием AI",
        },
        {
            "name": "Leads",
            "description": "Управление лидами и сохранение данных пользователей",
        },
    ],
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Импортируем функции из наших скриптов
scripts_path = Path(__file__).parent / 'scripts'
sys.path.insert(0, str(scripts_path))

# Убеждаемся, что путь к файлам правильный
files_path = scripts_path / 'files'
if not files_path.exists():
    logger.warning(f"⚠️ Папка files не найдена: {files_path}")

try:
    # Импортируем напрямую, так как scripts_path добавлен в sys.path
    from main_ai import check_quran_ayah_soft, get_full_surah_texts, format_result_for_api, load_quran_ayahs
    from save_to_sheets import save_to_sheets, send_telegram_notification, convert_answers_to_labels
    logger.info("✅ Все модули успешно импортированы")
    logger.info(f"📁 Путь к скриптам: {scripts_path}")
    logger.info(f"📁 Путь к файлам: {files_path}")
except ImportError as e:
    import traceback
    logger.error(f"❌ Ошибка импорта модулей: {e}")
    logger.error(f"📁 Путь к скриптам: {scripts_path}")
    logger.error(f"📁 Существует ли: {scripts_path.exists()}")
    if scripts_path.exists():
        logger.error(f"📁 Содержимое: {[f.name for f in scripts_path.iterdir()]}")
    logger.error(f"Трассировка:\n{traceback.format_exc()}")
    raise

@app.get("/health", tags=["Health"])
async def health():
    """
    Проверка работоспособности API
    
    Returns:
        dict: Статус сервиса
    """
    return {
        "status": "ok",
        "service": "tajwid-api"
    }

@app.post("/api/analyze-tajwid", tags=["Tajwid Analysis"])
async def analyze_tajwid(
    audio: UploadFile = File(..., description="Аудио файл для анализа (webm, wav, mp3)"),
    surah: Optional[str] = Form(None, description="Номер суры (например, '1' для Аль-Фатиха)"),
    ayahNumber: Optional[str] = Form(None, description="Номер аята (например, '1' для басмалы)")
):
    """
    Анализирует аудио файл на правильность чтения таджвида
    
    Анализирует записанное аудио чтение Корана и сравнивает его с эталонным текстом.
    Поддерживает анализ как отдельных аятов (например, басмалы), так и всей суры.
    
    **Параметры:**
    - `audio`: Аудио файл в формате webm, wav или mp3
    - `surah`: Номер суры (опционально, по умолчанию анализируется Аль-Фатиха)
    - `ayahNumber`: Номер аята (опционально, если указан - анализируется конкретный аят)
    
    **Примеры использования:**
    - Анализ басмалы: `surah=1&ayahNumber=1`
    - Анализ всей суры Аль-Фатиха: без параметров surah и ayahNumber
    
    **Возвращает:**
    - Детальный анализ каждого слова с указанием правильности
    - Процент правильности чтения
    - Транскрипцию распознанного текста
    """
    temp_path = None
    try:
        logger.info(f"Получен запрос на анализ: surah={surah}, ayahNumber={ayahNumber}")
        
        # Сохраняем файл во временную директорию
        suffix = Path(audio.filename).suffix if audio.filename else '.webm'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Вызываем функцию анализа
        if surah and ayahNumber:
            # Анализ конкретного аята (басмала)
            quran_ayahs = load_quran_ayahs()
            surah_data = quran_ayahs.get(surah, {})
            ayah_data = surah_data.get(ayahNumber)
            
            if not ayah_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Аят {ayahNumber} не найден в суре {surah}"
                )
            
            # Получаем нормализованный текст аята
            if isinstance(ayah_data, list):
                ayah_text = ayah_data[0]  # Нормализованный текст
            else:
                ayah_text = ayah_data
            
            # Проверяем аят (передаем текст как первый аргумент)
            status, score, transcription, details = check_quran_ayah_soft(
                temp_path,
                ayah_text,
                ayahs_info=None,
                verbose=False
            )
            
            # Форматируем результат
            result = format_result_for_api(
                status, score, transcription, details,
                is_basmalah=(ayahNumber == "1"),
                surah_number=int(surah)
            )
        else:
            # Анализ всей суры Аль-Фатиха (без басмалы)
            surah_number = 1
            full_surah_norm, full_surah_display = get_full_surah_texts(
                surah_number,
                skip_first_ayah=True
            )
            
            if not full_surah_norm:
                raise HTTPException(
                    status_code=500,
                    detail=f"Не удалось загрузить текст суры {surah_number}"
                )
            
            # Подготавливаем информацию об аятах для разбивки
            quran_ayahs = load_quran_ayahs()
            surah_data = quran_ayahs.get(str(surah_number), {})
            ayahs_info = {str(surah_number): {}}
            
            # Пропускаем первый аят (басмала)
            for ayah_num in range(2, len(surah_data) + 1):
                ayah_key = str(ayah_num)
                if ayah_key in surah_data:
                    ayahs_info[str(surah_number)][ayah_key] = surah_data[ayah_key]
            
            # Проверяем всю суру
            status, score, transcription, details = check_quran_ayah_soft(
                temp_path,
                full_surah_norm,
                ayahs_info=ayahs_info,
                verbose=False
            )
            
            # Форматируем результат
            result = format_result_for_api(
                status, score, transcription, details,
                is_basmalah=False,
                surah_number=surah_number
            )
        
        logger.info("✅ Анализ завершен успешно")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка при анализе: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при анализе аудио: {str(e)}"
        )
    finally:
        # Удаляем временный файл
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Не удалось удалить временный файл: {e}")

@app.post("/api/submit-lead", tags=["Leads"])
async def submit_lead(data: dict):
    """
    Сохраняет данные лида в Google Sheets и отправляет уведомление в Telegram
    
    Принимает данные пользователя из формы и результаты анализа таджвида,
    сохраняет их в Google Sheets и отправляет уведомление в Telegram (если настроено).
    
    **Request Body:**
    ```json
    {
        "timestamp": "2024-01-01T12:00:00Z",
        "leadData": {
            "name": "Имя пользователя",
            "contact": "+77001234567"
        },
        "answers": {
            "q1_age": "age_18_25",
            "q2_gender": "male",
            "q4_level": "basics",
            ...
        },
        "analysisResult": {
            "score_percent": 85.5,
            "correct_ayahs": 5,
            "total_ayahs": 6
        }
    }
    ```
    
    **Возвращает:**
    - Статус сохранения
    - Номер строки в Google Sheets
    - Сообщение об успехе или ошибке
    """
    try:
        if not data:
            raise HTTPException(status_code=400, detail="Данные не предоставлены")
        
        logger.info(f"Получен запрос на сохранение лида: {data.get('leadData', {}).get('name', 'Unknown')}")
        
        # Преобразуем коды ответов в текстовые значения
        answers = data.get("answers", {})
        answers_with_labels = convert_answers_to_labels(answers)
        data["answers"] = answers_with_labels
        
        # Сохраняем в Google Sheets
        result = save_to_sheets(data)
        
        # Отправляем уведомление в Telegram (если настроено)
        try:
            send_telegram_notification(data, answers_with_labels)
        except Exception as telegram_error:
            logger.warning(f"Не удалось отправить уведомление в Telegram: {telegram_error}")
        
        logger.info("✅ Лид успешно сохранен")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка при сохранении лида: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при сохранении данных: {str(e)}"
        )

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Запуск сервера на порту {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
