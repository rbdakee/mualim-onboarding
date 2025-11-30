import { NextRequest } from 'next/server'
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
      return new Response(JSON.stringify({ error: 'Аудио файл не найден' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Создаем временный файл для аудио
    const tempDir = tmpdir()
    const tempFileName = `tajwid_audio_${Date.now()}.webm`
    const tempFilePath = join(tempDir, tempFileName)
    
    // Сохраняем аудио файл во временную директорию
    const audioBuffer = await audioFile.arrayBuffer()
    await writeFile(tempFilePath, Buffer.from(audioBuffer))

    // Создаем ReadableStream для streaming ответа
    const stream = new ReadableStream({
      async start(controller) {
        const pythonScript = join(process.cwd(), 'scripts', 'analyze_tajwid.py')
        
        // Формируем команду
        const isWin = process.platform === 'win32'
        const envPython = process.env.PYTHON_EXECUTABLE
        let cmd = 'python'
        let cmdArgs: string[] = []

        if (envPython && envPython.trim().length > 0) {
          cmd = envPython
          cmdArgs = [pythonScript, tempFilePath, '--stream']
        } else if (isWin) {
          cmd = 'py'
          cmdArgs = ['-3.13', pythonScript, tempFilePath, '--stream']
        } else {
          cmd = 'python'
          cmdArgs = [pythonScript, tempFilePath, '--stream']
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

        let buffer = ''
        
        // Отправляем событие "start"
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

        pythonProcess.stdout.on('data', (data) => {
          buffer += data.toString()
          
          // Обрабатываем построчно (Python скрипт должен выводить JSON строки)
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Последняя неполная строка остается в буфере
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                // Пытаемся распарсить как JSON
                const parsed = JSON.parse(line.trim())
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(parsed)}\n\n`))
              } catch (e) {
                // Если не JSON, отправляем как текст
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'log', message: line })}\n\n`))
              }
            }
          }
        })

        pythonProcess.stderr.on('data', (data) => {
          const errorMsg = data.toString()
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`))
        })

        pythonProcess.on('close', async (code) => {
          // Обрабатываем последнюю строку из буфера
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim())
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(parsed)}\n\n`))
            } catch (e) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'log', message: buffer })}\n\n`))
            }
          }

          // Удаляем временный файл
          try {
            await unlink(tempFilePath)
          } catch (err) {
            console.error('Ошибка удаления временного файла:', err)
          }

          // Отправляем событие "done"
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', code })}\n\n`))
          controller.close()
        })

        pythonProcess.on('error', async (err) => {
          console.error('Ошибка запуска Python процесса:', err)
          
          try {
            await unlink(tempFilePath)
          } catch (unlinkErr) {
            console.error('Ошибка удаления временного файла:', unlinkErr)
          }
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: 'Не удалось запустить анализ аудио' })}\n\n`))
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (error) {
    console.error('Ошибка в API route:', error)
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

