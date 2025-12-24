import { NextRequest, NextResponse } from 'next/server'
import { validateContent, limitContent, handleOpenRouterError } from '../utils/errorHandler'

export async function POST(request: NextRequest) {
  try {
    const { content, title, sourceUrl } = await request.json()

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

    // Формируем промпт с заголовком и URL источника, если они есть
    let userPrompt = `Create a Telegram post in Russian based on this article:\n\n`
    if (title) {
      userPrompt += `Title: ${title}\n\n`
    }
    userPrompt += `Content: ${limitedContent}`
    if (sourceUrl) {
      userPrompt += `\n\nSource URL: ${sourceUrl}`
    }

    // Отправляем запрос к OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Telegram Post',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional social media content creator specializing in Telegram posts. Create an engaging, well-formatted Telegram post in Russian based on the article. Requirements: 1) Use relevant emojis (2-4 emojis total), 2) Start with an attention-grabbing hook, 3) Use clear paragraphs with line breaks, 4) Include key information from the article, 5) Keep it concise (maximum 2000 characters), 6) Make it engaging and easy to read, 7) If sourceUrl is provided, end the post with "Читать полностью:" followed by the source URL on a new line. The URL will be automatically converted to a clickable link, so just include it as plain text. Return only the post text without any additional comments, explanations, or metadata.',
          },
          {
            role: 'user',
            content: userPrompt,
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

    let telegramPost = data.choices[0].message.content

    if (!telegramPost || telegramPost.trim().length === 0) {
      return NextResponse.json(
        { error: 'AI сервис вернул пустой результат. Попробуйте еще раз.' },
        { status: 500 }
      )
    }

    // Если есть URL источника, преобразуем его в кликабельную ссылку для Telegram
    if (sourceUrl) {
      telegramPost = telegramPost.trim()
      
      // Экранируем специальные символы для regex
      const escapedUrl = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const urlPattern = new RegExp(escapedUrl, 'i')
      
      // Проверяем, есть ли уже URL в тексте
      if (urlPattern.test(telegramPost)) {
        // Если URL уже есть в тексте, преобразуем его в кликабельную ссылку markdown
        // Проверяем, не является ли уже ссылкой в формате markdown [текст](URL)
        const markdownLinkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'i')
        const htmlLinkPattern = new RegExp(`<a[^>]+href=["']${escapedUrl}["'][^>]*>`, 'i')
        
        if (!markdownLinkPattern.test(telegramPost) && !htmlLinkPattern.test(telegramPost)) {
          // URL есть, но не в формате ссылки - преобразуем в markdown
          telegramPost = telegramPost.replace(
            new RegExp(`(${escapedUrl})`, 'gi'),
            `[$1]($1)`
          )
        }
      } else {
        // Если URL нет в тексте, добавляем его в конце как кликабельную ссылку
        telegramPost += `\n\nЧитать полностью: [${sourceUrl}](${sourceUrl})`
      }
    }

    return NextResponse.json({
      result: telegramPost.trim(),
    })
  } catch (error) {
    console.error('Telegram post error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? `Ошибка при создании поста для Telegram: ${error.message}` : 'Неизвестная ошибка при обработке запроса' },
      { status: 500 }
    )
  }
}

