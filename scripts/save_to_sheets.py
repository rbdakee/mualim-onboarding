#!/usr/bin/env python3
"""
Скрипт для сохранения данных формы в Google Sheets
"""

import os
import sys
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Устанавливаем правильную кодировку для Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False
    logger.error("gspread не установлен. Установите: pip install gspread google-auth")

# Конфигурация из переменных окружения
SHEET_ID = os.getenv("SHEET_ID", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Поддержка Google Credentials из переменной окружения (для Vercel/.env) или файла
GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS", "")
CREDENTIALS_PATH = Path(__file__).parent.parent / "credentials.json"

# Если credentials.json не найден в корне, пробуем в scripts
if not CREDENTIALS_PATH.exists():
    CREDENTIALS_PATH = Path(__file__).parent / "credentials.json"

# Маппинг кодов ответов на текстовые значения
ANSWER_LABELS = {
    # q1_age
    "age_under18": "До 18 лет",
    "age_18_25": "18–25 лет",
    "age_26_35": "26–35 лет",
    "age_36_45": "36–45 лет",
    "age_over45": "Старше 45 лет",
    # q2_gender
    "male": "Мужчина",
    "female": "Женщина",
    # q4_level
    "basics": "Только изучал(а) основы",
    "forgot": "Проходил(а) курс, но многое забыл(а)",
    "know_no_practice": "Уверенно знаю правила, но не практикую",
    "practice_improve": "Практикую, но хочу улучшить произношение",
    # q5_frequency
    "daily": "Ежедневно",
    "few_times_week": "Несколько раз в неделю",
    "sometimes": "Иногда",
    "rarely": "Почти не читаю сейчас",
    # q6_where
    "home": "Дома, самостоятельно",
    "mosque": "В мечети",
    "online_group": "В онлайн-группе / с наставником",
    "not_regular": "Пока не читаю регулярно",
    # q7_learning_style
    "self_paced": "Самостоятельно, в удобное время",
    "with_mentor": "С наставником и обратной связью",
    "in_group": "В группе / с другими участниками",
    "short_videos": "Через короткие видео и тренировки",
    # q9_important
    "spiritual": "Духовное ощущение близости к Аллаху",
    "beauty": "Красота и правильность чтения",
    "discipline": "Дисциплина и регулярность",
    "meaning": "Осознание смысла аятов",
    # q10_inspiration
    "after_prayer": "После молитвы",
    "morning": "Утром",
    "evening": "Вечером перед сном",
    "friday_ramadan": "В пятницу / Рамадан",
    "when_mood": "Когда есть настроение",
    # q11_why
    "spiritual_connection": "Хочу укрепить духовную связь с Аллахом",
    "family_example": "Хочу быть примером для семьи / детей",
    "confident_reading": "Хочу читать уверенно и красиво",
    "refresh_knowledge": "Хочу вспомнить и закрепить знания",
    # q13_duration
    "5_10_min": "5–10 минут в день",
    "15_20_min": "15–20 минут в день",
    "one_long": "Один длинный урок в неделю",
    "auto_remind": "Хочу, чтобы система сама напоминала",
    # q14_reminders
    "2_3_week": "Да, 2–3 раза в неделю",
    "new_tasks": "Только при новых заданиях",
    "no_self": "Нет, хочу сам контролировать",
    # q15_inspiration_source
    "progress": "Прогресс и результаты",
    "quran_hadith": "Слова из Корана и хадисы",
    "others_examples": "Примеры других учеников",
    "voice_beauty": "Голос и красота чтения",
}

def get_answer_label(answer_code):
    """
    Преобразует код ответа в текстовое значение
    
    Args:
        answer_code: код ответа (например, "male", "age_18_25")
        
    Returns:
        str: текстовое значение или исходный код, если маппинг не найден
    """
    if not answer_code:
        return ""
    return ANSWER_LABELS.get(answer_code, answer_code)

def convert_answers_to_labels(answers):
    """
    Преобразует все коды ответов в текстовые значения
    
    Args:
        answers: словарь с кодами ответов
        
    Returns:
        dict: словарь с текстовыми значениями
    """
    if not answers:
        return {}
    return {key: get_answer_label(value) for key, value in answers.items()}

def send_telegram_notification(data, answers_with_labels):
    """
    Отправляет уведомление о новом лиде в Telegram
    
    Args:
        data: словарь с данными формы
        answers_with_labels: словарь с текстовыми значениями ответов
    """
    logger.info(f"Попытка отправить уведомление в Telegram. TELEGRAM_BOT_TOKEN: {'установлен' if TELEGRAM_BOT_TOKEN else 'не установлен'}, TELEGRAM_CHAT_ID: {'установлен' if TELEGRAM_CHAT_ID else 'не установлен'}")
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram не настроен (отсутствует TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID)")
        return
    
    try:
        from telegram import Bot
        
        # Формируем сообщение
        lead_data = data.get("leadData", {})
        name = lead_data.get("name", "Не указано")
        contact = lead_data.get("contact", "Не указано")
        
        # Формируем строку с возрастом и полом
        age = answers_with_labels.get("q1_age", "")
        gender = answers_with_labels.get("q2_gender", "")
        age_gender = ", ".join(filter(None, [age, gender]))
        
        # Формируем строку с частотой чтения и местом
        frequency = answers_with_labels.get("q5_frequency", "")
        where = answers_with_labels.get("q6_where", "")
        reading_info = ", ".join(filter(None, [frequency, where]))
        
        # Остальные поля
        level = answers_with_labels.get("q4_level", "")
        learning_style = answers_with_labels.get("q7_learning_style", "")
        important = answers_with_labels.get("q9_important", "")
        why = answers_with_labels.get("q11_why", "")
        
        message = f"""<b>Новый лид</b>
<b>Контакт:</b> {contact}
<b>{name}:</b> {age_gender}

<b>Уровень знаний:</b> {level}
<b>Читает Коран:</b> {reading_info}
<b>Учится:</b> {learning_style}
<b>Важно в таджвиде:</b> {important}
<b>Желание:</b> {why}"""
        
        # Отправляем сообщение
        logger.info(f"Отправка сообщения в Telegram. Chat ID: {TELEGRAM_CHAT_ID}")
        logger.debug(f"Текст сообщения: {message}")
        
        # Используем синхронный вызов через run
        import asyncio
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        
        async def send_async():
            try:
                result = await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message, parse_mode="HTML")
                return result
            except Exception as e:
                logger.error(f"Ошибка в async функции отправки: {type(e).__name__}: {str(e)}")
                raise
        
        # Запускаем асинхронную функцию
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(send_async())
        logger.info(f"✅ Уведомление успешно отправлено в Telegram. Message ID: {result.message_id}")
        
    except ImportError as import_error:
        logger.error(f"python-telegram-bot не установлен. Установите: pip install python-telegram-bot. Ошибка: {import_error}")
    except Exception as e:
        error_type = type(e).__name__
        logger.error(f"❌ Ошибка при отправке уведомления в Telegram: {error_type}: {str(e)}")
        import traceback
        logger.error(f"Трассировка ошибки Telegram:\n{traceback.format_exc()}")
        # Не поднимаем исключение, чтобы не прерывать сохранение в Sheets

def get_google_sheets_client():
    """Создает клиент для работы с Google Sheets"""
    if not GSPREAD_AVAILABLE:
        raise RuntimeError("gspread не установлен. Установите: pip install gspread google-auth")
    
    if not SHEET_ID:
        raise ValueError("SHEET_ID должен быть установлен в переменных окружения")
    
    # Получаем email Service Account для логирования
    try:
        import json as json_lib
        if GOOGLE_CREDENTIALS_JSON:
            try:
                creds_data = json_lib.loads(GOOGLE_CREDENTIALS_JSON)
                service_account_email = creds_data.get('client_email', 'неизвестен')
                logger.info(f"Используется Service Account из переменной окружения GOOGLE_CREDENTIALS: {service_account_email}")
            except json_lib.JSONDecodeError as e:
                logger.error(f"Ошибка парсинга GOOGLE_CREDENTIALS из .env: {e}")
                raise ValueError("GOOGLE_CREDENTIALS содержит невалидный JSON")
        elif CREDENTIALS_PATH.exists():
            with open(CREDENTIALS_PATH, 'r', encoding='utf-8') as f:
                creds_data = json_lib.load(f)
                service_account_email = creds_data.get('client_email', 'неизвестен')
            logger.info(f"Используется Service Account из файла {CREDENTIALS_PATH}: {service_account_email}")
        else:
            logger.warning(f"Не удалось найти credentials: файл {CREDENTIALS_PATH} не существует и GOOGLE_CREDENTIALS не установлен")
    except Exception as e:
        logger.warning(f"Не удалось прочитать email Service Account: {e}")
    
    try:
        # Определяем область доступа
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive"
        ]
        
        # Загружаем credentials из переменной окружения (.env/Vercel) или файла
        # Приоритет: GOOGLE_CREDENTIALS из .env > credentials.json файл
        if GOOGLE_CREDENTIALS_JSON:
            import json as json_lib
            try:
                creds_data = json_lib.loads(GOOGLE_CREDENTIALS_JSON)
                creds = Credentials.from_service_account_info(creds_data, scopes=scope)
                logger.info("✅ Используются credentials из переменной окружения GOOGLE_CREDENTIALS (.env)")
            except json_lib.JSONDecodeError as e:
                logger.error(f"❌ Ошибка парсинга GOOGLE_CREDENTIALS из .env: {e}")
                raise ValueError(
                    "GOOGLE_CREDENTIALS содержит невалидный JSON. "
                    "Убедитесь, что JSON в одну строку без переносов. "
                    "Можно использовать онлайн-инструмент для минификации JSON."
                )
        elif CREDENTIALS_PATH.exists():
            creds = Credentials.from_service_account_file(
                str(CREDENTIALS_PATH),
                scopes=scope
            )
            logger.info(f"✅ Используются credentials из файла: {CREDENTIALS_PATH}")
        else:
            error_msg = (
                f"❌ Не найдены credentials для Google Sheets.\n"
                f"   Файл credentials.json не найден по пути: {CREDENTIALS_PATH}\n"
                f"   И переменная окружения GOOGLE_CREDENTIALS не установлена.\n"
                f"   Решение: Добавьте GOOGLE_CREDENTIALS в .env файл (весь JSON в одну строку) "
                f"или разместите credentials.json в корне проекта."
            )
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Создаем клиент
        client = gspread.authorize(creds)
        
        logger.info("Успешно подключено к Google Sheets")
        return client
    
    except Exception as e:
        logger.error(f"Ошибка при подключении к Google Sheets: {e}")
        raise

def save_to_sheets(data):
    """
    Сохраняет данные в Google Sheets
    
    Args:
        data: словарь с данными формы
            {
                "timestamp": str,
                "leadData": {"name": str, "contact": str},
                "answers": dict,
                "analysisResult": dict or None
            }
    """
    try:
        client = get_google_sheets_client()
        
        # Используем SHEET_ID напрямую
        if not SHEET_ID:
            raise ValueError("SHEET_ID не установлен в переменных окружения")
        
        logger.info(f"Открываем таблицу с ID: {SHEET_ID}")
        
        # Открываем таблицу по ID
        try:
            spreadsheet = client.open_by_key(SHEET_ID)
        except gspread.exceptions.APIError as api_error:
            if api_error.response.status_code == 403:
                error_msg = (
                    "Ошибка доступа к Google Sheets (403 Forbidden). "
                    "Убедитесь, что:\n"
                    "1. Service Account email из credentials.json добавлен в таблицу с правами редактора\n"
                    "2. Таблица существует и ID правильный\n"
                    "3. Google Sheets API включен в Google Cloud Console"
                )
                logger.error(error_msg)
                raise PermissionError(error_msg) from api_error
            raise
        except PermissionError:
            # Перебрасываем PermissionError как есть
            raise
        
        # Получаем первый лист (или создаем новый если нужно)
        try:
            worksheet = spreadsheet.sheet1
            logger.info("Используется существующий лист 'sheet1'")
        except gspread.exceptions.WorksheetNotFound:
            logger.info("Лист 'sheet1' не найден, создаем новый лист 'Leads'")
            worksheet = spreadsheet.add_worksheet(title="Leads", rows=1000, cols=20)
        except Exception as e:
            logger.warning(f"Ошибка при получении листа: {e}, создаем новый")
            worksheet = spreadsheet.add_worksheet(title="Leads", rows=1000, cols=20)
        
        # Получаем все существующие записи для определения следующей строки
        # Используем get_all_values() чтобы найти последнюю заполненную строку
        all_values = worksheet.get_all_values()
        
        # Находим первую пустую строку (пропускаем заголовки)
        next_row = 1
        if len(all_values) > 0:
            # Ищем последнюю строку с данными (не пустую)
            for i in range(len(all_values) - 1, -1, -1):
                if any(cell.strip() for cell in all_values[i] if cell):
                    next_row = i + 2  # +2 потому что индексация с 0 и нужно добавить после последней строки
                    break
            else:
                # Если все строки пустые, начинаем со 2-й (после заголовков)
                next_row = 2 if len(all_values) > 0 else 1
        
        # Если это первая строка, добавляем заголовки
        if next_row == 1:
            headers = [
                "Дата и время",
                "Имя",
                "Контакт",
                "Возраст",
                "Пол",
                "Уровень таджвида",
                "Частота чтения",
                "Где читает",
                "Стиль обучения",
                "Что важно",
                "Вдохновение",
                "Зачем вернуться",
                "Длительность занятий",
                "Напоминания",
                "Источник вдохновения",
                "Результат басмалы (%)",
                "Правильно аятов (всего)",
                "Процент слов (Аль-Фатиха)",
                "Все ответы (JSON)"
            ]
            # Записываем заголовки в диапазон A1:S1
            worksheet.update('A1:S1', [headers])
            next_row = 2
        
        # Извлекаем данные из answers
        answers = data.get("answers", {})
        # Преобразуем коды в текстовые значения
        answers_with_labels = convert_answers_to_labels(answers)
        
        # Формируем строку для добавления (используем текстовые значения)
        row_data = [
            data.get("timestamp", ""),
            data.get("leadData", {}).get("name", ""),
            data.get("leadData", {}).get("contact", ""),
            answers_with_labels.get("q1_age", ""),
            answers_with_labels.get("q2_gender", ""),
            answers_with_labels.get("q4_level", ""),
            answers_with_labels.get("q5_frequency", ""),
            answers_with_labels.get("q6_where", ""),
            answers_with_labels.get("q7_learning_style", ""),
            answers_with_labels.get("q9_important", ""),
            answers_with_labels.get("q10_inspiration", ""),
            answers_with_labels.get("q11_why", ""),
            answers_with_labels.get("q13_duration", ""),
            answers_with_labels.get("q14_reminders", ""),
            answers_with_labels.get("q15_inspiration_source", ""),
            "",  # Результат басмалы (если есть)
            "",  # Правильно аятов
            "",  # Процент слов
            json.dumps(answers_with_labels, ensure_ascii=False)  # Все ответы в JSON с текстовыми значениями
        ]
        
        # Добавляем данные анализа, если есть
        analysis = data.get("analysisResult")
        if analysis:
            # Проверяем тип результата
            message_type = analysis.get("message_type", "")
            
            # Результат басмалы (один аят)
            if message_type == "text" or ("score_percent" in analysis and "total_ayahs" not in analysis):
                row_data[15] = analysis.get("score_percent", "")
            
            # Результаты Аль-Фатихи (вся сура)
            if message_type == "surah" or ("correct_ayahs" in analysis and "total_ayahs" in analysis):
                row_data[16] = f"{analysis.get('correct_ayahs', 0)}/{analysis.get('total_ayahs', 0)}"
                row_data[17] = analysis.get("score_percent", "")
        
        # Добавляем строку в таблицу, используя явный диапазон для гарантии правильных колонок
        try:
            logger.info(f"Попытка добавить строку {next_row} с {len(row_data)} колонками")
            # Используем update() с явным указанием диапазона A{next_row}:S{next_row}
            # Это гарантирует, что данные всегда будут в колонках A-S
            range_name = f'A{next_row}:S{next_row}'
            worksheet.update(range_name, [row_data])
            logger.info(f"✅ Данные успешно сохранены в Google Sheets, строка {next_row}, диапазон {range_name}")
        except Exception as append_error:
            logger.error(f"Ошибка при добавлении строки: {type(append_error).__name__}: {str(append_error)}")
            raise
        
        # Отправляем уведомление в Telegram (не блокируем сохранение в Sheets при ошибках)
        logger.info("Попытка отправить уведомление в Telegram...")
        try:
            send_telegram_notification(data, answers_with_labels)
            logger.info("Процесс отправки уведомления в Telegram завершен")
        except Exception as telegram_error:
            # Не прерываем выполнение, если Telegram не работает
            logger.warning(f"Не удалось отправить уведомление в Telegram (но данные сохранены в Sheets): {telegram_error}")
        
        return {
            "success": True,
            "row": next_row,
            "message": f"Данные сохранены в строку {next_row}"
        }
    
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        logger.error(f"Ошибка при сохранении в Google Sheets: {error_type}: {error_msg}")
        import traceback
        logger.error(f"Трассировка ошибки:\n{traceback.format_exc()}")
        raise

def main():
    """Основная функция для запуска из командной строки"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Необходимо передать JSON данные в качестве аргумента"
        }), flush=True)
        sys.exit(1)
    
    try:
        # Парсим JSON данные из аргумента
        data_json = sys.argv[1]
        data = json.loads(data_json)
        
        # Сохраняем в Google Sheets
        result = save_to_sheets(data)
        
        # Выводим результат
        print(json.dumps(result, ensure_ascii=False), flush=True)
        
    except json.JSONDecodeError as e:
        error_result = {
            "success": False,
            "error": f"Ошибка парсинга JSON: {str(e)}"
        }
        print(json.dumps(error_result, ensure_ascii=False), flush=True)
        sys.exit(1)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        error_result = {
            "success": False,
            "error": f"Ошибка при сохранении: {error_type}: {error_msg}"
        }
        # Выводим ошибку и в stderr для логирования
        logger.error(f"Критическая ошибка в main(): {error_type}: {error_msg}")
        import traceback
        logger.error(f"Трассировка:\n{traceback.format_exc()}")
        print(json.dumps(error_result, ensure_ascii=False), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

