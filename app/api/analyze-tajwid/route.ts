import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const surah = formData.get('surah') as string | null
    const ayahNumber = formData.get('ayahNumber') as string | null
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Аудио файл не найден' }, { status: 400 })
    }

    // Создаем временный файл для аудио
    const tempDir = tmpdir()
    const tempFileName = `tajwid_audio_${Date.now()}.webm`
    const tempFilePath = join(tempDir, tempFileName)
    
    // Сохраняем аудио файл во временную директорию
    const audioBuffer = await audioFile.arrayBuffer()
    await writeFile(tempFilePath, Buffer.from(audioBuffer))

    // Конвертация перенесена в Python-скрипт

    // Вызываем Python скрипт для анализа
    const pythonScript = join(process.cwd(), 'scripts', 'main_ai.py')
    
    return new Promise((resolve) => {
      // Формируем команду и базовые аргументы для Python
      const isWin = process.platform === 'win32'
      const envPython = process.env.PYTHON_EXECUTABLE
      let cmd = 'python'
      let cmdArgs: string[] = []

      if (envPython && envPython.trim().length > 0) {
        cmd = envPython
        cmdArgs = [pythonScript, tempFilePath]
      } else if (isWin) {
        // На Windows используем launcher 'py' с явной версией -3.13
        cmd = 'py'
        cmdArgs = ['-3.13', pythonScript, tempFilePath]
      } else {
        cmd = 'python'
        cmdArgs = [pythonScript, tempFilePath]
      }

      const args = [...cmdArgs]
      if (surah && surah.trim().length > 0) {
        args.push('--surah', surah)
      }
      if (ayahNumber && ayahNumber.trim().length > 0) {
        args.push('--ayah-number', ayahNumber)
      }
      const pythonProcess = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let result = ''
      let error = ''

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString()
      })

      pythonProcess.on('close', async (code) => {
        // Удаляем временный файл
        try {
          await unlink(tempFilePath)
        } catch (err) {
          console.error('Ошибка удаления временного файла:', err)
        }

        if (code !== 0) {
          console.error('Python скрипт завершился с ошибкой:', error)
          resolve(NextResponse.json(
            { error: 'Ошибка анализа аудио', details: error },
            { status: 500 }
          ))
          return
        }

        try {
          const analysisResult = JSON.parse(result)
          resolve(NextResponse.json(analysisResult))
        } catch (parseError) {
          console.error('Ошибка парсинга результата Python:', parseError)
          resolve(NextResponse.json(
            { error: 'Ошибка обработки результата анализа' },
            { status: 500 }
          ))
        }
      })

      pythonProcess.on('error', async (err) => {
        console.error('Ошибка запуска Python процесса:', err)
        
        // Удаляем временный файл при ошибке
        try {
          await unlink(tempFilePath)
        } catch (unlinkErr) {
          console.error('Ошибка удаления временного файла:', unlinkErr)
        }
        
        resolve(NextResponse.json(
          { error: 'Не удалось запустить анализ аудио' },
          { status: 500 }
        ))
      })
    })

  } catch (error) {
    console.error('Ошибка в API route:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
