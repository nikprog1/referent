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

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API ключ не настроен. Проверьте файл .env.local и перезапустите сервер.' },
        { status: 500 }
      )
    }

    // Ограничиваем длину контента для API
    const limitedContent = limitContent(content)

    // Отправляем запрос к OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Article Translator',
      },
      body: JSON.stringify({
        // Используем бесплатную/доступную модель по умолчанию
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the following English article to Russian. Preserve the structure and formatting. Return only the translation without any additional comments.',
          },
          {
            role: 'user',
            content: `Translate this article to Russian:\n\n${limitedContent}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('OpenRouter API error:', errorData)
      return handleOpenRouterError(errorData, response.status, response.statusText)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Некорректный ответ от сервиса перевода. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    const translation = data.choices[0].message.content.trim()

    if (!translation || translation.length === 0) {
      return NextResponse.json(
        { error: 'Сервис перевода вернул пустой результат. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      translation: translation,
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? `Ошибка при переводе: ${error.message}` : 'Неизвестная ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}

