import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured. Please check .env.local file and restart the server.' },
        { status: 500 }
      )
    }

    // Ограничиваем длину контента для API
    const limitedContent = content.length > 50000 
      ? content.substring(0, 50000) + '...' 
      : content

    // Отправляем запрос к OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Article Thesis',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating article summaries. Create a structured list of key points (theses) from the article in Russian. Format as a numbered or bulleted list. Return only the theses without any additional comments.',
          },
          {
            role: 'user',
            content: `Create key theses from this article in Russian:\n\n${limitedContent}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('OpenRouter API error:', errorData)
      
      const errorMessage = errorData.error?.message || response.statusText || 'Unknown error'
      
      if (errorMessage.includes('not available in your region') || errorMessage.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Ошибка: Сервис недоступен в вашем регионе. Попробуйте использовать VPN или обратитесь к администратору.' },
          { status: response.status }
        )
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return NextResponse.json(
          { error: 'Ошибка: Превышен лимит запросов. Попробуйте позже или проверьте настройки API ключа.' },
          { status: response.status }
        )
      } else if (errorMessage.includes('invalid') || errorMessage.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Ошибка: Неверный API ключ. Проверьте настройки в файле .env.local' },
          { status: response.status }
        )
      }
      
      return NextResponse.json(
        { error: `Ошибка: ${errorMessage}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      )
    }

    const thesis = data.choices[0].message.content

    return NextResponse.json({
      result: thesis.trim(),
    })
  } catch (error) {
    console.error('Thesis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

