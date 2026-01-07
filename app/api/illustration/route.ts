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
    const huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY

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
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
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
    
    const imageResponse = await fetch(
      `https://api-inference.huggingface.co/models/${modelName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: imagePrompt,
        }),
      }
    )

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error('Hugging Face API error:', errorText)
      
      // Hugging Face может вернуть ошибку в JSON или тексте
      let errorMessage = 'Ошибка при генерации изображения через Hugging Face API.'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        // Если не JSON, используем текст ошибки
        if (errorText) {
          errorMessage = errorText.substring(0, 200) // Ограничиваем длину
        }
      }

      // Если модель еще загружается, Hugging Face возвращает 503
      if (imageResponse.status === 503) {
        errorMessage = 'Модель генерации изображений еще загружается. Подождите несколько секунд и попробуйте снова.'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: imageResponse.status }
      )
    }

    // Hugging Face возвращает изображение как blob
    const imageBlob = await imageResponse.blob()
    
    // Проверяем, что это действительно изображение
    if (!imageBlob.type.startsWith('image/')) {
      // Если это не изображение, возможно это JSON с ошибкой
      const text = await imageBlob.text()
      try {
        const errorJson = JSON.parse(text)
        return NextResponse.json(
          { error: errorJson.error || 'Ошибка при генерации изображения.' },
          { status: 500 }
        )
      } catch {
        return NextResponse.json(
          { error: 'Получен некорректный ответ от сервиса генерации изображений.' },
          { status: 500 }
        )
      }
    }

    // Конвертируем blob в base64 для передачи на фронтенд
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const imageDataUrl = `data:${imageBlob.type};base64,${base64Image}`

    return NextResponse.json({
      result: imageDataUrl,
      prompt: imagePrompt, // Также возвращаем промпт для отображения
    })
  } catch (error) {
    console.error('Illustration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? `Ошибка при создании иллюстрации: ${error.message}` : 'Неизвестная ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}

