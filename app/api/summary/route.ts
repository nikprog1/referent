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
        'X-Title': 'Referent - Article Summary',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert article analyzer. Provide a clear, structured summary in Russian explaining what the article is about. The summary should: 1) Start with the main topic, 2) Include 2-3 key points, 3) Be concise (3-5 sentences), 4) Be informative and accurate. Return only the summary text without any additional comments, introductions, or formatting marks.',
          },
          {
            role: 'user',
            content: `О чем эта статья? Создай краткое резюме на русском языке:\n\n${limitedContent}`,
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
        { error: 'Некорректный ответ от AI сервиса. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    const summary = data.choices[0].message.content

    if (!summary || summary.trim().length === 0) {
      return NextResponse.json(
        { error: 'AI сервис вернул пустой результат. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      result: summary.trim(),
    })
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? `Ошибка при создании резюме: ${error.message}` : 'Неизвестная ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}

