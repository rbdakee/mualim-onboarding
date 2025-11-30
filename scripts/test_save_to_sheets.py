#!/usr/bin/env python3
"""
Тесты для скрипта save_to_sheets.py
"""

import sys
import os
import json
import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Добавляем путь к скриптам для импорта
sys.path.insert(0, str(Path(__file__).parent))

# Импортируем функции из save_to_sheets
from save_to_sheets import save_to_sheets

class TestSaveToSheets(unittest.TestCase):
    """Тесты для функции save_to_sheets"""
    
    def setUp(self):
        """Настройка тестовых данных"""
        self.test_data = {
            "timestamp": "2024-01-01T12:00:00Z",
            "leadData": {
                "name": "Тестовый Пользователь",
                "contact": "+1234567890"
            },
            "answers": {
                "q1_age": "age_18_25",
                "q2_gender": "male",
                "q4_level": "basics",
                "q5_frequency": "daily",
                "q6_where": "home",
                "q7_learning_style": "self_paced",
                "q9_important": "spiritual",
                "q10_inspiration": "morning",
                "q11_why": "spiritual_connection",
                "q13_duration": "15_20_min",
                "q14_reminders": "daily",
                "q15_inspiration_source": "progress"
            },
            "analysisResult": {
                "message_type": "surah",
                "score_percent": 85.5,
                "correct_ayahs": 5,
                "total_ayahs": 6
            }
        }
    
    @patch('save_to_sheets.get_google_sheets_client')
    @patch('save_to_sheets.SHEET_ID', 'TEST_SHEET_ID')
    def test_save_to_sheets_success(self, mock_get_client):
        """Тест успешного сохранения в Google Sheets"""
        # Создаем моки для Google Sheets API
        mock_worksheet = MagicMock()
        mock_worksheet.get_all_values.return_value = [
            ["Дата и время", "Имя", "Контакт"]  # Заголовки уже есть
        ]
        mock_worksheet.append_row = MagicMock()
        
        mock_spreadsheet = MagicMock()
        mock_spreadsheet.sheet1 = mock_worksheet
        
        mock_client = MagicMock()
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_get_client.return_value = mock_client
        
        # Вызываем функцию
        result = save_to_sheets(self.test_data)
        
        # Проверяем результат
        self.assertTrue(result["success"])
        self.assertIn("row", result)
        self.assertIn("message", result)
        
        # Проверяем, что append_row был вызван
        self.assertTrue(mock_worksheet.append_row.called)
        
        # Проверяем данные, которые были переданы (теперь с текстовыми значениями)
        call_args = mock_worksheet.append_row.call_args[0][0]
        self.assertEqual(call_args[1], "Тестовый Пользователь")
        self.assertEqual(call_args[2], "+1234567890")
        self.assertEqual(call_args[3], "18–25 лет")  # q1_age преобразован
        self.assertEqual(call_args[4], "Мужчина")  # q2_gender преобразован
        self.assertEqual(call_args[5], "Только изучал(а) основы")  # q4_level преобразован
        self.assertEqual(call_args[16], "5/6")  # Правильно аятов
        self.assertEqual(call_args[17], 85.5)  # Процент слов
    
    @patch('save_to_sheets.get_google_sheets_client')
    @patch('save_to_sheets.SHEET_ID', 'TEST_SHEET_ID')
    def test_save_to_sheets_with_empty_sheet(self, mock_get_client):
        """Тест сохранения в пустую таблицу (создание заголовков)"""
        # Создаем моки для пустой таблицы
        mock_worksheet = MagicMock()
        mock_worksheet.get_all_values.return_value = []  # Пустая таблица
        mock_worksheet.append_row = MagicMock()
        
        mock_spreadsheet = MagicMock()
        mock_spreadsheet.sheet1 = mock_worksheet
        
        mock_client = MagicMock()
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_get_client.return_value = mock_client
        
        # Вызываем функцию
        result = save_to_sheets(self.test_data)
        
        # Проверяем, что append_row был вызван дважды (заголовки + данные)
        self.assertEqual(mock_worksheet.append_row.call_count, 2)
        
        # Первый вызов - заголовки
        first_call = mock_worksheet.append_row.call_args_list[0][0][0]
        self.assertEqual(first_call[0], "Дата и время")
        self.assertEqual(first_call[1], "Имя")
    
    @patch('save_to_sheets.get_google_sheets_client')
    @patch('save_to_sheets.SHEET_ID', 'TEST_SHEET_ID')
    def test_save_to_sheets_with_basmalah_result(self, mock_get_client):
        """Тест сохранения с результатом басмалы"""
        test_data_basmalah = {
            "timestamp": "2024-01-01T12:00:00Z",
            "leadData": {
                "name": "Тест",
                "contact": "+1234567890"
            },
            "answers": {},
            "analysisResult": {
                "message_type": "text",
                "score_percent": 95.0
            }
        }
        
        mock_worksheet = MagicMock()
        mock_worksheet.get_all_values.return_value = [
            ["Дата и время", "Имя", "Контакт"]
        ]
        mock_worksheet.append_row = MagicMock()
        
        mock_spreadsheet = MagicMock()
        mock_spreadsheet.sheet1 = mock_worksheet
        
        mock_client = MagicMock()
        mock_client.open_by_key.return_value = mock_spreadsheet
        mock_get_client.return_value = mock_client
        
        result = save_to_sheets(test_data_basmalah)
        
        # Проверяем, что результат басмалы сохранен
        call_args = mock_worksheet.append_row.call_args[0][0]
        self.assertEqual(call_args[15], 95.0)  # Результат басмалы
    
    @patch('save_to_sheets.get_google_sheets_client')
    def test_save_to_sheets_error_handling(self, mock_get_client):
        """Тест обработки ошибок"""
        # Мокируем ошибку при открытии таблицы
        mock_client = MagicMock()
        mock_client.open_by_key.side_effect = Exception("Таблица не найдена")
        mock_get_client.return_value = mock_client
        
        # Проверяем, что исключение пробрасывается
        with self.assertRaises(Exception):
            save_to_sheets(self.test_data)

class TestMainFunction(unittest.TestCase):
    """Тесты для функции main"""
    
    @patch('save_to_sheets.save_to_sheets')
    @patch('sys.argv', ['test_save_to_sheets.py', '{"test": "data"}'])
    def test_main_success(self, mock_save):
        """Тест успешного выполнения main"""
        mock_save.return_value = {"success": True, "row": 2}
        
        from save_to_sheets import main
        
        # Захватываем вывод
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            try:
                main()
            except SystemExit:
                pass
        
        output = f.getvalue()
        self.assertIn("success", output)
    
    @patch('sys.argv', ['test_save_to_sheets.py'])
    def test_main_no_args(self):
        """Тест main без аргументов"""
        from save_to_sheets import main
        import json
        
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            try:
                main()
            except SystemExit:
                pass
        
        output = f.getvalue().strip()
        # Парсим JSON вывод
        result = json.loads(output)
        self.assertFalse(result.get("success", True))
        self.assertIn("error", result)
        self.assertIn("Необходимо передать JSON", result["error"])
    
    @patch('sys.argv', ['test_save_to_sheets.py', 'invalid json'])
    def test_main_invalid_json(self):
        """Тест main с невалидным JSON"""
        from save_to_sheets import main
        import json
        
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            try:
                main()
            except SystemExit:
                pass
        
        output = f.getvalue().strip()
        # Парсим JSON вывод
        result = json.loads(output)
        self.assertFalse(result.get("success", True))
        self.assertIn("error", result)
        self.assertIn("Ошибка парсинга JSON", result["error"])

def run_tests():
    """Запуск всех тестов"""
    # Создаем test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Добавляем тесты
    suite.addTests(loader.loadTestsFromTestCase(TestSaveToSheets))
    suite.addTests(loader.loadTestsFromTestCase(TestMainFunction))
    
    # Запускаем тесты
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Возвращаем код выхода
    return 0 if result.wasSuccessful() else 1

if __name__ == "__main__":
    # Запускаем тесты
    exit_code = run_tests()
    sys.exit(exit_code)

