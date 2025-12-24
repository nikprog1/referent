import { NextResponse } from 'next/server'

/**
 * Унифицированная обработка ошибок OpenRouter API
 */
export function handleOpenRouterError(
  errorData: any,
  responseStatus: number,
  responseStatusText: string
): NextResponse {
  const errorMessage = errorData?.error?.message || responseStatusText || 'Unknown error'
  
  // Ошибка недоступности сервиса в регионе
  if (errorMessage.includes('not available in your region') || errorMessage.includes('Access denied')) {
    const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') || 
                       process.env.NEXT_PUBLIC_APP_URL?.includes('127.0.0.1')
    
    const errorMsg = isLocalhost
      ? 'Сервис недоступен в вашем регионе при работе на localhost. На Vercel (https://referent-steel.vercel.app/) эта проблема отсутствует, так как запросы идут с серверов Vercel. Для работы на localhost используйте VPN или протестируйте приложение на Vercel.'
      : 'Сервис недоступен в вашем регионе. Попробуйте использовать VPN или обратитесь к администратору для настройки альтернативного сервиса.'
    
    return NextResponse.json(
      { error: errorMsg },
      { status: responseStatus }
    )
  }
  
  // Превышение лимита запросов
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return NextResponse.json(
      { error: 'Превышен лимит запросов. Попробуйте позже или проверьте настройки API ключа.' },
      { status: responseStatus }
    )
  }
  
  // Неверный API ключ
  if (errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
    return NextResponse.json(
      { error: 'Неверный API ключ. Проверьте настройки в файле .env.local и перезапустите сервер.' },
      { status: responseStatus }
    )
  }
  
  // Общая ошибка
  return NextResponse.json(
    { error: `Ошибка API: ${errorMessage}` },
    { status: responseStatus }
  )
}

/**
 * Валидация контента статьи
 */
export function validateContent(content: string | undefined): { isValid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Контент статьи обязателен для заполнения' }
  }
  
  if (content.trim().length === 0) {
    return { isValid: false, error: 'Контент статьи не может быть пустым' }
  }
  
  if (content.length < 50) {
    return { isValid: false, error: 'Контент статьи слишком короткий (минимум 50 символов)' }
  }
  
  return { isValid: true }
}

/**
 * Ограничение длины контента для API
 */
export function limitContent(content: string, maxLength: number = 50000): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.substring(0, maxLength) + '...'
}

