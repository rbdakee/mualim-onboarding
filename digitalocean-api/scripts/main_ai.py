import os
import re
import requests
from difflib import SequenceMatcher
from dotenv import load_dotenv
import logging
import json
import sys
import argparse
from pathlib import Path
import subprocess
import tempfile

# Устанавливаем правильную кодировку для Windows
if sys.platform == 'win32':
    try:
        import codecs
        # Проверяем, есть ли buffer (не все потоки имеют buffer)
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except (AttributeError, OSError):
        # Если не удалось установить кодировку, продолжаем работу
        pass

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Проверяем наличие imageio-ffmpeg для конвертации аудио
try:
    import imageio_ffmpeg as iio_ffmpeg
    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False
    logger.warning("imageio-ffmpeg не установлен. Установите: pip install imageio-ffmpeg")

# Регулярное выражение для удаления харакатов (диакритических знаков)
HARAKAT_RE = re.compile(r"[\u064B-\u065F\u0670\u06D6-\u06ED]")

# Пороговые значения для мягкой оценки
THRESHOLD_CORRECT = 0.92    # ≥ 92% — считаем правильным
THRESHOLD_PARTIAL = 0.70    # ≥ 70% — частично правильно
# < 70% — неправильное чтение

# Конфигурация Hugging Face Inference API
ENDPOINT_URL = os.getenv("HF_ENDPOINT_URL", "")
API_KEY = os.getenv("HF_API_KEY", "")

# Загружаем данные об аятах
_quran_ayahs = None

def load_quran_ayahs():
    """Загружает данные об аятах из JSON файла"""
    global _quran_ayahs
    if _quran_ayahs is None:
        # Сначала пробуем путь относительно текущего файла (для digitalocean-api)
        quran_ayahs_path = Path(__file__).parent / "files" / "quran_ayahs.json"
        if not quran_ayahs_path.exists():
            # Пробуем путь относительно родительской директории (для основного проекта)
            quran_ayahs_path = Path(__file__).parent.parent / "files" / "quran_ayahs.json"
        if not quran_ayahs_path.exists():
            # Пробуем альтернативный путь (в той же папке что и скрипт)
            quran_ayahs_path = Path(__file__).parent / "quran_ayahs.json"
        if quran_ayahs_path.exists():
            with open(quran_ayahs_path, "r", encoding="utf-8") as f:
                _quran_ayahs = json.load(f)
            logger.info(f"✅ Загружен quran_ayahs.json из: {quran_ayahs_path}")
        else:
            logger.error(f"❌ Файл quran_ayahs.json не найден. Проверенные пути:")
            logger.error(f"   1. {Path(__file__).parent / 'files' / 'quran_ayahs.json'}")
            logger.error(f"   2. {Path(__file__).parent.parent / 'files' / 'quran_ayahs.json'}")
            logger.error(f"   3. {Path(__file__).parent / 'quran_ayahs.json'}")
            _quran_ayahs = {}
    return _quran_ayahs


def convert_webm_to_wav(webm_path):
    """Конвертирует webm файл в wav используя ffmpeg"""
    if not FFMPEG_AVAILABLE:
        raise RuntimeError("imageio-ffmpeg не установлен. Необходим для конвертации webm в wav.")
    
    try:
        # Создаем временный wav файл
        fd_wav, wav_path = tempfile.mkstemp(suffix='.wav', prefix='tajwid_audio_')
        os.close(fd_wav)
        
        # Получаем путь к ffmpeg
        ffmpeg_path = iio_ffmpeg.get_ffmpeg_exe()
        
        # Конвертируем webm в wav (моно, 16kHz)
        cmd = [
            ffmpeg_path,
            "-y",  # Перезаписать выходной файл
            "-i", webm_path,
            "-ac", "1",  # Моно
            "-ar", "16000",  # 16kHz
            "-f", "wav",
            wav_path
        ]
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False
        )
        
        if result.returncode != 0:
            error_msg = result.stderr.decode('utf-8', errors='ignore')
            os.unlink(wav_path)
            raise RuntimeError(f"Ошибка конвертации webm в wav: {error_msg}")
        
        return wav_path
        
    except Exception as e:
        logger.error(f"Ошибка при конвертации webm в wav: {e}")
        raise e

def prepare_audio_file(file_path):
    """Подготавливает аудиофайл для отправки в API (конвертирует в wav если нужно)"""
    temp_wav_path = None
    try:
        # Если файл webm, конвертируем в wav
        if file_path.lower().endswith('.webm'):
            if not FFMPEG_AVAILABLE:
                raise RuntimeError("imageio-ffmpeg не установлен. Необходим для обработки webm файлов.")
            temp_wav_path = convert_webm_to_wav(file_path)
            return temp_wav_path
        
        # Если уже wav, возвращаем как есть
        if file_path.lower().endswith('.wav'):
            return file_path
        
        # Для других форматов тоже конвертируем в wav
        if not FFMPEG_AVAILABLE:
            raise RuntimeError("imageio-ffmpeg не установлен. Необходим для конвертации аудио.")
        
        temp_wav_path = convert_webm_to_wav(file_path)  # Функция работает и с другими форматами через ffmpeg
        return temp_wav_path
        
    except Exception as e:
        logger.error(f"Ошибка при подготовке аудио: {e}")
        raise e

def transcribe_audio_api(file_path):
    """Транскрибирует аудиофайл используя Hugging Face Inference API"""
    try:
        # Проверяем конфигурацию API
        if not ENDPOINT_URL:
            raise RuntimeError("HF_ENDPOINT_URL не установлен в переменных окружения")
        if not API_KEY:
            raise RuntimeError("HF_API_KEY не установлен в переменных окружения")
        
        # Подготавливаем аудиофайл (конвертируем в wav если нужно)
        audio_file_path = prepare_audio_file(file_path)
        temp_file_created = audio_file_path != file_path
        
        try:
            # Читаем аудиофайл
            with open(audio_file_path, "rb") as f:
                audio_bytes = f.read()
            
            # Формируем заголовки для запроса
            headers = {
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "audio/wav"
            }
            
            logger.info(f"Отправка запроса к Hugging Face API: {ENDPOINT_URL}")
            
            # Отправляем запрос к API
            response = requests.post(
                ENDPOINT_URL,
                headers=headers,
                data=audio_bytes,
                timeout=60  # Таймаут 60 секунд
            )
            
            # Проверяем статус ответа
            if response.status_code != 200:
                error_msg = f"API вернул ошибку: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
            
            # Парсим ответ
            result = response.json()
            
            # Извлекаем транскрипцию из ответа
            # Формат ответа может быть разным в зависимости от модели
            if isinstance(result, dict):
                # Пробуем разные возможные ключи
                transcription = result.get("text") or result.get("transcription") or result.get("output")
                if not transcription and "text" in result:
                    transcription = result["text"]
            elif isinstance(result, str):
                transcription = result
            else:
                # Если это список, берем первый элемент
                transcription = result[0] if isinstance(result, list) and len(result) > 0 else str(result)
            
            if not transcription:
                logger.warning(f"Неожиданный формат ответа API: {result}")
                transcription = str(result)
            
            logger.info(f"Транскрипция: {transcription}")
            return transcription
            
        finally:
            # Удаляем временный файл, если он был создан
            if temp_file_created and audio_file_path and os.path.exists(audio_file_path):
                try:
                    os.unlink(audio_file_path)
                except Exception as e:
                    logger.warning(f"Не удалось удалить временный файл {audio_file_path}: {e}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при запросе к API: {e}")
        return f"[ERROR] Ошибка при запросе к API: {str(e)}"
    except Exception as e:
        logger.error(f"Ошибка при транскрипции: {e}")
        return f"[ERROR] Ошибка при обработке аудио: {str(e)}"

def normalize_arabic(text):
    """
    Упрощает арабский текст для сравнения:
    - убирает харакаты (диакритические знаки)
    - заменяет варианты алефов на стандартный
    - убирает татвил (кашиды)
    - убирает спец. символы Корана
    - убирает лишние пробелы
    """
    # Удаляем харакаты (диакритические знаки)
    text = HARAKAT_RE.sub("", text)
    
    # Нормализуем алифы (все варианты алифа заменяем на стандартный)
    text = re.sub("[ٱأإآا]", "ا", text)
    
    # Убираем татвил/кашиды (удлиняющие символы)
    text = text.replace("ـ", "")
    
    # Убираем символы остановок, рецитации и прочие специальные символы Корана
    text = re.sub(r"[۞۩۝ۣ۪ۭۚۗۛۜ۟۠ۢۤۧۨ۫۬ۮۯ]", "", text)
    
    # Убираем лишние пробелы
    text = " ".join(text.split())
    
    return text

def similarity_ratio(a: str, b: str) -> float:
    """Возвращает коэффициент схожести (0.0-1.0) двух строк"""
    return SequenceMatcher(None, a, b).ratio()

def highlight_differences(ref: str, hyp: str, max_items: int = 5):
    """
    Находит слова, которые не совпали, и возвращает короткий список проблемных фрагментов.
    """
    ref_words = ref.split()
    hyp_words = hyp.split()
    diffs = []
    
    # Проходим по парам (ограниченно)
    for i, rw in enumerate(ref_words):
        if i < len(hyp_words):
            hw = hyp_words[i]
            if rw != hw:
                diffs.append((rw, hw))
        else:
            diffs.append((rw, "<пропущено>"))
        if len(diffs) >= max_items:
            break
    
    # Проверяем лишние слова в гипотезе
    if len(hyp_words) > len(ref_words) and len(diffs) < max_items:
        for i in range(len(ref_words), len(hyp_words)):
            if len(diffs) >= max_items:
                break
            diffs.append(("<лишнее>", hyp_words[i]))
    
    return diffs

def align_text_to_ayahs(ref_words, hyp_words, ayah_boundaries):
    """
    Выравнивает распознанный текст по аятам.
    
    Args:
        ref_words: список слов эталонного текста (все аяты вместе)
        hyp_words: список слов распознанного текста
        ayah_boundaries: список границ аятов в ref_words [(start_idx, end_idx), ...]
    
    Returns:
        list: список кортежей (start_idx, end_idx) для каждого аята в hyp_words
    """
    if not ayah_boundaries:
        return []
    
    # Используем SequenceMatcher для выравнивания
    matcher = SequenceMatcher(None, ref_words, hyp_words)
    matches = []
    
    # Собираем все совпадения
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal" or tag == "replace":
            matches.append((i1, i2, j1, j2))
    
    # Для каждого аята находим соответствующий фрагмент в распознанном тексте
    hyp_boundaries = []
    for ref_start, ref_end in ayah_boundaries:
        # Ищем совпадения, которые пересекаются с границами аята
        hyp_start = None
        hyp_end = None
        
        for i1, i2, j1, j2 in matches:
            # Если совпадение пересекается с аятом
            if i1 < ref_end and i2 > ref_start:
                if hyp_start is None:
                    hyp_start = j1
                hyp_end = j2
        
        # Если не нашли точного совпадения, используем пропорциональное распределение
        if hyp_start is None:
            total_ref_words = len(ref_words)
            if total_ref_words > 0:
                ref_ratio_start = ref_start / total_ref_words
                ref_ratio_end = ref_end / total_ref_words
                hyp_start = int(ref_ratio_start * len(hyp_words))
                hyp_end = int(ref_ratio_end * len(hyp_words))
            else:
                hyp_start = 0
                hyp_end = 0
        
        hyp_boundaries.append((hyp_start, hyp_end))
    
    return hyp_boundaries

def get_full_surah_texts(surah_number, skip_first_ayah: bool = False):
    """
    Получает полный текст суры из всех аятов в двух вариантах:
    - нормализованный (без харакатов) — для проверки
    - с харакатами — для отображения пользователю
    
    Returns:
        tuple[str, str]: (normalized_text, display_text)
    """
    quran_ayahs = load_quran_ayahs()
    surah = quran_ayahs.get(str(surah_number), {})
    if not surah:
        return "", ""
    
    norm_ayahs = []
    display_ayahs = []
    # Если нужно, пропускаем первый аят (Бисмиллях)
    start_index = 2 if skip_first_ayah else 1
    for i in range(start_index, len(surah) + 1):
        ayah_data = surah.get(str(i))
        if not ayah_data:
            continue
        if isinstance(ayah_data, list):
            # Формат: [normalized, display, (optional) translit]
            norm_ayahs.append(ayah_data[0])
            display_ayahs.append(ayah_data[1])
        else:
            # Строка без разделения — используем как есть
            norm_ayahs.append(ayah_data)
            display_ayahs.append(ayah_data)
    
    return " ".join(norm_ayahs), " ".join(display_ayahs)

def check_quran_ayah_soft(file_path, correct_ayah, ayahs_info=None, verbose=False):
    """
    Мягкая проверка с процентным совпадением и градацией.
    
    Args:
        file_path: путь к аудиофайлу
        correct_ayah: правильный текст (может быть весь текст суры или один аят)
        ayahs_info: опционально, словарь с информацией об аятах для разбивки результата
                   Формат: {surah_num: {ayah_num: [normalized, display], ...}, ...}
        verbose: выводить ли подробную информацию в лог
    
    Returns:
        tuple: (status, score, transcription, details)
            - status: "correct", "partial", "incorrect" или "error"
            - score: float от 0.0 до 1.0 (процент совпадения)
            - transcription: распознанный текст
            - details: словарь с дополнительной информацией, включая "ayahs_breakdown" если передан ayahs_info
    """
    try:
        transcription = transcribe_audio_api(file_path)
        if transcription.startswith("[ERROR]") or transcription.startswith("❌"):
            return "error", 0.0, transcription.replace("❌", "[ERROR]"), {"msg": transcription.replace("❌", "[ERROR]")}
        
        # Нормализуем оба текста
        hyp = normalize_arabic(transcription)
        ref = normalize_arabic(correct_ayah)
        
        # Вычисляем похожесть
        score = similarity_ratio(ref, hyp)
        
        # Градация по пороговым значениям
        if score >= THRESHOLD_CORRECT:
            status = "correct"
        elif score >= THRESHOLD_PARTIAL:
            status = "partial"
        else:
            status = "incorrect"
        
        # Собираем детали для обратной связи
        details = {
            "normalized_ref": ref,
            "normalized_hyp": hyp,
            "score": round(score, 4),
            "score_percent": round(score * 100, 2),
            "diffs": highlight_differences(ref, hyp),
            "advice": None
        }
        
        # Если передан ayahs_info, создаем разбивку по аятам
        if ayahs_info:
            ayahs_breakdown = {}
            ref_words = ref.split()
            hyp_words = hyp.split()
            
            for surah_num, ayahs in ayahs_info.items():
                ayahs_breakdown[surah_num] = {}
                ayah_boundaries = []
                current_idx = 0
                
                # Собираем границы аятов в эталонном тексте
                for ayah_num in sorted(ayahs.keys(), key=int):
                    ayah_data = ayahs[ayah_num]
                    if isinstance(ayah_data, list):
                        ayah_norm = ayah_data[0]
                    else:
                        ayah_norm = ayah_data
                    
                    ayah_words = ayah_norm.split()
                    ayah_start = current_idx
                    ayah_end = current_idx + len(ayah_words)
                    ayah_boundaries.append((ayah_start, ayah_end))
                    current_idx = ayah_end
                
                # Выравниваем распознанный текст по аятам
                hyp_boundaries = align_text_to_ayahs(ref_words, hyp_words, ayah_boundaries)
                
                # Собираем результат для каждого аята
                for idx, (ayah_num, ayah_data) in enumerate(sorted(ayahs.items(), key=lambda x: int(x[0]))):
                    if isinstance(ayah_data, list):
                        ayah_display = ayah_data[1] if len(ayah_data) > 1 else ayah_data[0]
                        ayah_norm = ayah_data[0]
                    else:
                        ayah_display = ayah_data
                        ayah_norm = ayah_data
                    
                    # Получаем распознанный фрагмент для этого аята
                    if idx < len(hyp_boundaries):
                        hyp_start, hyp_end = hyp_boundaries[idx]
                        read_text = " ".join(hyp_words[hyp_start:hyp_end]) if hyp_words else ""
                    else:
                        read_text = ""
                    
                    ayahs_breakdown[surah_num][ayah_num] = {
                        "ayah": ayah_display,
                        "normalized": ayah_norm,
                        "read": read_text
                    }
            
            details["ayahs_breakdown"] = ayahs_breakdown
        
        # Генерируем дружелюбные советы в зависимости от статуса
        if status == "correct":
            details["advice"] = "[OK] Отлично — аят прочитан верно (или близко к верному)."
        elif status == "partial":
            details["advice"] = "[WARN] Частично верно — обратите внимание на отдельные слова. Попробуйте медленнее и четче."
        else:
            details["advice"] = "[ERROR] Похоже, надо повторить. Попробуйте медленнее, сфокусируйтесь на артикуляции сомнительных слов."
        
        if verbose:
            logger.info(f"Status: {status}, score={score:.4f}, diffs={details['diffs']}")
            if ayahs_info:
                logger.info(f"Ayahs breakdown: {details.get('ayahs_breakdown', {})}")
        
        return status, score, transcription, details
        
    except Exception as e:
        logger.error(f"Ошибка при мягкой проверке: {e}")
        return "error", 0.0, f"[ERROR] Ошибка при проверке: {e}", {"msg": str(e)}

def format_result_for_api(status, score, transcription, details, is_basmalah=False, surah_number=1):
    """
    Форматирует результат проверки для API в формате, ожидаемом фронтендом.
    """
    result = {
        "success": status != "error",
        "transcription": transcription,
        "is_correct": status == "correct",
        "score": details.get("score", 0),
        "score_percent": details.get("score_percent", 0),
        "advice": details.get("advice", ""),
        "normalized_ref": details.get("normalized_ref", ""),
        "normalized_hyp": details.get("normalized_hyp", ""),
        "diffs": details.get("diffs", [])
    }
    
    if status == "error":
        result["error"] = transcription
        return result
    
    # Для басмалы (один аят)
    if is_basmalah:
        result["message_type"] = "text"
        result["reference"] = details.get("normalized_ref", "")
        # Создаем простое выравнивание для басмалы
        ref_words = result["reference"].split()
        hyp_words = result["normalized_hyp"].split()
        alignment = []
        matcher = SequenceMatcher(None, ref_words, hyp_words)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for idx in range(i1, i2):
                    if idx < len(ref_words):
                        alignment.append({
                            "op": "equal",
                            "ref_word": ref_words[idx],
                            "ref_idx": idx
                        })
            elif tag == "replace":
                for idx in range(i1, i2):
                    if idx < len(ref_words):
                        alignment.append({
                            "op": "replace",
                            "ref_word": ref_words[idx],
                            "ref_idx": idx
                        })
            elif tag == "delete":
                for idx in range(i1, i2):
                    if idx < len(ref_words):
                        alignment.append({
                            "op": "delete",
                            "ref_word": ref_words[idx],
                            "ref_idx": idx
                        })
            elif tag == "insert":
                for idx in range(j1, j2):
                    if idx < len(hyp_words):
                        alignment.append({
                            "op": "insert",
                            "hyp_word": hyp_words[idx]
                        })
        result["alignment"] = {"word": alignment}
        result["metrics"] = {
            "wer": 1 - score
        }
        return result
    
    # Для всей суры (с разбивкой по аятам)
    ayahs_breakdown = details.get("ayahs_breakdown", {})
    if ayahs_breakdown:
        result["message_type"] = "surah"
        ayahs = []
        surah_data = ayahs_breakdown.get(str(surah_number), {})
        
        for ayah_num in sorted(surah_data.keys(), key=int):
            ayah_info = surah_data[ayah_num]
            ayah_norm = ayah_info.get("normalized", "")
            ayah_display = ayah_info.get("ayah", "")
            read_text = ayah_info.get("read", "")
            
            # Вычисляем score для этого аята
            ayah_score = similarity_ratio(normalize_arabic(ayah_norm), normalize_arabic(read_text))
            ayah_is_correct = ayah_score >= THRESHOLD_CORRECT
            
            # Создаем выравнивание для аята
            ref_words = ayah_norm.split()
            hyp_words = read_text.split()
            alignment = []
            matcher = SequenceMatcher(None, ref_words, hyp_words)
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == "equal":
                    for idx in range(i1, i2):
                        if idx < len(ref_words):
                            alignment.append({
                                "op": "equal",
                                "ref_word": ref_words[idx],
                                "ref_idx": idx
                            })
                elif tag == "replace":
                    for idx in range(i1, i2):
                        if idx < len(ref_words):
                            alignment.append({
                                "op": "replace",
                                "ref_word": ref_words[idx],
                                "ref_idx": idx
                            })
                elif tag == "delete":
                    for idx in range(i1, i2):
                        if idx < len(ref_words):
                            alignment.append({
                                "op": "delete",
                                "ref_word": ref_words[idx],
                                "ref_idx": idx
                            })
                elif tag == "insert":
                    for idx in range(j1, j2):
                        if idx < len(hyp_words):
                            alignment.append({
                                "op": "insert",
                                "hyp_word": hyp_words[idx]
                            })
            
            ayahs.append({
                "ayah_number": int(ayah_num),
                "ayah_text": ayah_display,
                "is_correct": ayah_is_correct,
                "score": round(ayah_score, 4),
                "alignment": {"word": alignment},
                "read_words": read_text.split() if read_text else [],
                "remaining_words": []
            })
        
        result["ayahs"] = ayahs
        result["correct_ayahs"] = sum(1 for a in ayahs if a["is_correct"])
        result["total_ayahs"] = len(ayahs)
        result["all_correct"] = result["correct_ayahs"] == result["total_ayahs"]
    
    return result

def main():
    parser = argparse.ArgumentParser(description="Проверка чтения Корана с помощью AI")
    parser.add_argument("audio_file", type=str, help="Путь к аудиофайлу")
    parser.add_argument("--surah", type=int, default=1, help="Номер суры (по умолчанию 1 - Аль-Фатиха)")
    parser.add_argument("--ayah-number", type=int, dest="ayah_number", default=None, help="Номер аята для проверки (опционально, для басмалы используйте 1)")
    
    args = parser.parse_args()
    
    file_path = args.audio_file
    surah_number = args.surah
    ayah_number = args.ayah_number
    
    if not os.path.exists(file_path):
        result = {
            "success": False,
            "error": f"Файл не найден: {file_path}"
        }
        result_json = json.dumps(result, ensure_ascii=False)
        print(result_json, flush=True)
        sys.exit(1)
    
    try:
        # Если указан номер аята, проверяем только этот аят (для басмалы)
        if ayah_number is not None:
            quran_ayahs = load_quran_ayahs()
            surah = quran_ayahs.get(str(surah_number), {})
            ayah_data = surah.get(str(ayah_number))
            
            if not ayah_data:
                result = {
                    "success": False,
                    "error": f"Аят {ayah_number} не найден в суре {surah_number}"
                }
                result_json = json.dumps(result, ensure_ascii=False)
                print(result_json, flush=True)
                sys.exit(1)
            
            # Получаем нормализованный текст аята
            if isinstance(ayah_data, list):
                ayah_text = ayah_data[0]  # Нормализованный текст
            else:
                ayah_text = ayah_data
            
            # Проверяем аят
            status, score, transcription, details = check_quran_ayah_soft(
                file_path,
                ayah_text,
                verbose=False
            )
            
            # Форматируем результат для API
            result = format_result_for_api(status, score, transcription, details, is_basmalah=(ayah_number == 1))
            
        else:
            # Проверяем всю суру (без басмалы)
            full_surah_norm, full_surah_display = get_full_surah_texts(surah_number, skip_first_ayah=True)
            
            if not full_surah_norm:
                result = {
                    "success": False,
                    "error": f"Не удалось загрузить текст суры {surah_number}"
                }
                result_json = json.dumps(result, ensure_ascii=False)
                print(result_json, flush=True)
                sys.exit(1)
            
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
                file_path,
                full_surah_norm,
                ayahs_info=ayahs_info,
                verbose=False
            )
            
            # Форматируем результат для API
            result = format_result_for_api(status, score, transcription, details, is_basmalah=False, surah_number=surah_number)
        
        # Выводим результат в формате JSON (без эмодзи в сообщениях об ошибках для совместимости с Windows)
        result_json = json.dumps(result, ensure_ascii=False, indent=2)
        # Заменяем эмодзи на текстовые символы для совместимости
        result_json = result_json.replace('❌', '[ERROR]').replace('✅', '[OK]').replace('⚠️', '[WARN]')
        print(result_json, flush=True)
        
    except Exception as e:
        logger.error(f"Ошибка в main: {e}", exc_info=True)
        error_msg = str(e).replace('❌', '[ERROR]').replace('✅', '[OK]').replace('⚠️', '[WARN]')
        result = {
            "success": False,
            "error": f"Ошибка при обработке: {error_msg}"
        }
        result_json = json.dumps(result, ensure_ascii=False)
        result_json = result_json.replace('❌', '[ERROR]').replace('✅', '[OK]').replace('⚠️', '[WARN]')
        print(result_json, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

