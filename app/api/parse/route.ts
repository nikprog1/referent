import { NextRequest, NextResponse } from 'next/server'
import cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Получаем HTML страницы
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Извлекаем заголовок
    let title = ''
    // Пробуем разные селекторы для заголовка
    const titleSelectors = [
      'h1',
      'article h1',
      '.post-title',
      '.article-title',
      '.entry-title',
      '[class*="title"]',
      'title',
    ]

    for (const selector of titleSelectors) {
      const found = $(selector).first().text().trim()
      if (found && found.length > 10) {
        title = found
        break
      }
    }

    // Если не нашли, берем из тега title
    if (!title) {
      title = $('title').text().trim()
    }

    // Извлекаем дату
    let date = ''
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[class*="date"]',
      '[class*="published"]',
      '[class*="time"]',
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="publish-date"]',
    ]

    for (const selector of dateSelectors) {
      if (selector.startsWith('meta')) {
        const meta = $(selector).attr('content')
        if (meta) {
          date = meta
          break
        }
      } else {
        const found = $(selector).first()
        const datetime = found.attr('datetime') || found.text().trim()
        if (datetime) {
          date = datetime
          break
        }
      }
    }

    // Извлекаем основной контент
    let content = ''
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '.entry-content',
      '.post-content',
      '[class*="article"]',
      '[class*="content"]',
      'main',
    ]

    for (const selector of contentSelectors) {
      const found = $(selector).first()
      if (found.length > 0) {
        // Удаляем скрипты, стили и другие ненужные элементы
        found.find('script, style, nav, header, footer, aside, .ad, .advertisement').remove()
        const text = found.text().trim()
        if (text && text.length > 100) {
          content = text
          break
        }
      }
    }

    // Если не нашли контент, пробуем body без header/footer
    if (!content) {
      const body = $('body')
      body.find('script, style, nav, header, footer, aside').remove()
      content = body.text().trim()
    }

    // Очищаем контент от лишних пробелов
    content = content.replace(/\s+/g, ' ').trim()

    return NextResponse.json({
      date: date || 'Not found',
      title: title || 'Not found',
      content: content || 'Not found',
    })
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

