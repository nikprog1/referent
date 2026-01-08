import { NextRequest, NextResponse } from 'next/server'
import { validateContent, limitContent, handleOpenRouterError } from '../utils/errorHandler'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    // Валидация входных данных
    const validation = validateContent(content)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    // Поддерживаем оба варианта названия переменной для совместимости
    const huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY || process.env.HUGGINGFACE_API_KEY

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API ключ не настроен. Проверьте файл .env.local и перезапустите сервер.' },
        { status: 500 }
      )
    }

    if (!huggingFaceApiKey) {
      return NextResponse.json(
        { error: 'Hugging Face API ключ не настроен. Проверьте файл .env.local и перезапустите сервер.' },
        { status: 500 }
      )
    }

    // Проверяем, работаем ли мы на localhost
    const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') || 
                       process.env.NEXT_PUBLIC_APP_URL?.includes('127.0.0.1') ||
                       !process.env.NEXT_PUBLIC_APP_URL

    // Ограничиваем длину контента для API
    const limitedContent = limitContent(content)

    // Этап 1: Генерация промпта для изображения через OpenRouter
    console.log('Генерация промпта для изображения...')
    const promptResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Illustration Prompt',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating image generation prompts. Based on the article content, create a detailed, descriptive prompt in English for generating an illustration. The prompt should: 1) Describe the main subject or theme of the article, 2) Include visual details (style, colors, composition), 3) Be suitable for AI image generation (like Stable Diffusion), 4) Be concise but descriptive (50-100 words), 5) Focus on visual elements. Return only the prompt text without any additional comments, introductions, or formatting marks.',
          },
          {
            role: 'user',
            content: `Based on this article, create a detailed prompt in English for generating an illustration that represents the main theme and content:\n\n${limitedContent}`,
          },
        ],
      }),
    })

    if (!promptResponse.ok) {
      const errorData = await promptResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('OpenRouter API error:', errorData)
      return handleOpenRouterError(errorData, promptResponse.status, promptResponse.statusText)
    }

    const promptData = await promptResponse.json()

    if (!promptData.choices || !promptData.choices[0] || !promptData.choices[0].message) {
      return NextResponse.json(
        { error: 'Некорректный ответ от AI сервиса при генерации промпта. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    const imagePrompt = promptData.choices[0].message.content.trim()

    if (!imagePrompt || imagePrompt.length === 0) {
      return NextResponse.json(
        { error: 'AI сервис вернул пустой промпт. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    console.log('Сгенерированный промпт:', imagePrompt)

    // Этап 2: Генерация изображения через Hugging Face
    console.log('Генерация изображения через Hugging Face...')
    // Используем модель Stable Diffusion XL для генерации изображений
    const modelName = process.env.HUGGING_FACE_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0'
    console.log('Используемая модель:', modelName)
    console.log('Длина промпта:', imagePrompt.length)
    
    let imageResponse: Response
    try {
      // Для Stable Diffusion используем стандартный формат запроса
      const requestBody: { inputs: string; parameters?: { num_inference_steps?: number; guidance_scale?: number } } = {
        inputs: imagePrompt,
      }
      
      // Добавляем параметры для лучшего качества (опционально)
      // Можно настроить через переменные окружения
      const numSteps = process.env.HUGGING_FACE_NUM_STEPS ? parseInt(process.env.HUGGING_FACE_NUM_STEPS) : undefined
      const guidanceScale = process.env.HUGGING_FACE_GUIDANCE_SCALE ? parseFloat(process.env.HUGGING_FACE_GUIDANCE_SCALE) : undefined
      
      if (numSteps || guidanceScale) {
        requestBody.parameters = {}
        if (numSteps) requestBody.parameters.num_inference_steps = numSteps
        if (guidanceScale) requestBody.parameters.guidance_scale = guidanceScale
      }
      
      console.log('Отправка запроса к Hugging Face с телом:', JSON.stringify({ ...requestBody, inputs: requestBody.inputs.substring(0, 100) + '...' }))
      
      // Используем новый endpoint router.huggingface.co/hf-inference вместо устаревшего api-inference.huggingface.co
      // Формат: https://router.huggingface.co/hf-inference/models/{model_name}
      imageResponse = await fetch(
        `https://router.huggingface.co/hf-inference/models/${modelName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )
      console.log('Hugging Face response status:', imageResponse.status)
      console.log('Hugging Face response headers:', Object.fromEntries(imageResponse.headers.entries()))
    } catch (fetchError) {
      console.error('Ошибка при запросе к Hugging Face:', fetchError)
      return NextResponse.json(
        { error: `Ошибка подключения к Hugging Face API: ${fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error('Hugging Face API error:', errorText, 'Status:', imageResponse.status)
      
      // Hugging Face может вернуть ошибку в JSON или тексте
      let errorMessage = 'Ошибка при генерации изображения через Hugging Face API.'
      
      // Проверяем, не заблокирован ли IP (403 или ошибка доступа)
      const isAccessDenied = imageResponse.status === 403 || 
                            errorText.toLowerCase().includes('forbidden') ||
                            errorText.toLowerCase().includes('access denied') ||
                            errorText.toLowerCase().includes('not allowed')
      
      if (isAccessDenied && isLocalhost) {
        errorMessage = 'Hugging Face API недоступен с localhost из-за блокировки IP. Генерация иллюстраций работает только на Vercel (https://referent-steel.vercel.app/). На Vercel запросы идут с серверов Vercel, которые не заблокированы.'
      } else if (imageResponse.status === 503) {
        errorMessage = 'Модель генерации изображений еще загружается. Подождите 10-30 секунд и попробуйте снова.'
      } else if (imageResponse.status === 401 || imageResponse.status === 403) {
        if (isLocalhost) {
          errorMessage = 'Hugging Face API недоступен с localhost из-за блокировки IP. Генерация иллюстраций работает только на Vercel (https://referent-steel.vercel.app/).'
        } else {
          errorMessage = 'Неверный Hugging Face API ключ. Проверьте файл .env.local и перезапустите сервер.'
        }
      } else if (imageResponse.status === 429) {
        errorMessage = 'Превышен лимит запросов к Hugging Face API. Подождите немного и попробуйте снова.'
      } else if (imageResponse.status === 500 || imageResponse.status === 502) {
        errorMessage = 'Временная проблема на сервере Hugging Face. Попробуйте через несколько секунд.'
      } else {
        // Пытаемся извлечь детальное сообщение об ошибке
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // Если не JSON, используем текст ошибки (ограничиваем длину)
          if (errorText && errorText.length > 0) {
            const truncatedError = errorText.substring(0, 200)
            if (truncatedError.length < errorText.length) {
              errorMessage = `${truncatedError}...`
            } else {
              errorMessage = truncatedError
            }
          }
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: imageResponse.status }
      )
    }

    // Hugging Face возвращает изображение как blob
    console.log('Получение blob от Hugging Face...')
    let imageBlob: Blob
    try {
      imageBlob = await imageResponse.blob()
      console.log('Blob получен, тип:', imageBlob.type, 'размер:', imageBlob.size)
    } catch (blobError) {
      console.error('Ошибка при получении blob:', blobError)
      return NextResponse.json(
        { error: `Ошибка при получении изображения: ${blobError instanceof Error ? blobError.message : 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }
    
    // Проверяем, что это действительно изображение
    if (!imageBlob.type.startsWith('image/')) {
      console.warn('Получен неожиданный тип данных:', imageBlob.type)
      // Если это не изображение, возможно это JSON с ошибкой
      try {
        const text = await imageBlob.text()
        console.log('Текст ответа (не изображение):', text.substring(0, 500))
        try {
          const errorJson = JSON.parse(text)
          return NextResponse.json(
            { error: errorJson.error || errorJson.message || 'Ошибка при генерации изображения.' },
            { status: 500 }
          )
        } catch {
          return NextResponse.json(
            { error: `Получен некорректный ответ от сервиса генерации изображений. Тип: ${imageBlob.type}` },
            { status: 500 }
          )
        }
      } catch (textError) {
        console.error('Ошибка при чтении текста из blob:', textError)
        return NextResponse.json(
          { error: 'Не удалось обработать ответ от сервиса генерации изображений.' },
          { status: 500 }
        )
      }
    }

    // Конвертируем blob в base64 для передачи на фронтенд
    console.log('Конвертация blob в base64...')
    try {
      const arrayBuffer = await imageBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Image = buffer.toString('base64')
      const imageDataUrl = `data:${imageBlob.type};base64,${base64Image}`
      console.log('Изображение успешно конвертировано, размер base64:', base64Image.length)

      return NextResponse.json({
        result: imageDataUrl,
        prompt: imagePrompt, // Также возвращаем промпт для отображения
      })
    } catch (conversionError) {
      console.error('Ошибка при конвертации изображения:', conversionError)
      return NextResponse.json(
        { error: `Ошибка при обработке изображения: ${conversionError instanceof Error ? conversionError.message : 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Illustration error (catch block):', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    const errorMessage = error instanceof Error 
      ? `Ошибка при создании иллюстрации: ${error.message}${error.stack ? `\n\nСтек ошибки: ${error.stack}` : ''}`
      : 'Неизвестная ошибка при обработке запроса'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

