/**
 * Преобразует ошибки API в дружественные сообщения на русском языке
 */

export interface ErrorInfo {
  message: string
  stage?: 'parsing' | 'translation' | 'summary' | 'thesis' | 'telegram'
}

/**
 * Обрабатывает ошибки парсинга статьи
 */
export function getParseError(response: Response | null, error: unknown): ErrorInfo {
  // Ошибки сети (таймаут, нет соединения и т.д.)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Не удалось загрузить статью по этой ссылке. Проверьте подключение к интернету.',
      stage: 'parsing'
    }
  }

  // HTTP ошибки
  if (response) {
    switch (response.status) {
      case 404:
        return {
          message: 'Не удалось загрузить статью по этой ссылке. Страница не найдена.',
          stage: 'parsing'
        }
      case 403:
        return {
          message: 'Не удалось загрузить статью по этой ссылке. Доступ запрещен.',
          stage: 'parsing'
        }
      case 408:
      case 504:
        return {
          message: 'Не удалось загрузить статью по этой ссылке. Превышено время ожидания.',
          stage: 'parsing'
        }
      case 500:
      case 502:
      case 503:
        return {
          message: 'Не удалось загрузить статью по этой ссылке. Проблема на сервере.',
          stage: 'parsing'
        }
      case 429:
        return {
          message: 'Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.',
          stage: 'parsing'
        }
      default:
        return {
          message: 'Не удалось загрузить статью по этой ссылке.',
          stage: 'parsing'
        }
    }
  }

  // Ошибки валидации контента
  if (error instanceof Error) {
    if (error.message.includes('контента') || error.message.includes('content')) {
      return {
        message: 'Статья не содержит текстового контента для обработки.',
        stage: 'parsing'
      }
    }
  }

  // Общая ошибка парсинга
  return {
    message: 'Не удалось загрузить статью по этой ссылке.',
    stage: 'parsing'
  }
}

/**
 * Обрабатывает ошибки перевода
 */
export function getTranslationError(response: Response | null, error: unknown): ErrorInfo {
  // Ошибки сети
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Ошибка перевода: нет подключения к интернету.',
      stage: 'translation'
    }
  }

  // HTTP ошибки
  if (response) {
    switch (response.status) {
      case 400:
        return {
          message: 'Ошибка перевода: неверный запрос. Возможно, статья слишком длинная или пустая.',
          stage: 'translation'
        }
      case 401:
      case 403:
        return {
          message: 'Ошибка перевода: проблема с доступом к сервису перевода.',
          stage: 'translation'
        }
      case 408:
      case 504:
        return {
          message: 'Ошибка перевода: превышено время ожидания. Попробуйте еще раз.',
          stage: 'translation'
        }
      case 429:
        return {
          message: 'Ошибка перевода: слишком много запросов. Пожалуйста, подождите.',
          stage: 'translation'
        }
      case 500:
      case 502:
      case 503:
        return {
          message: 'Ошибка перевода: проблема на сервере. Попробуйте позже.',
          stage: 'translation'
        }
      default:
        return {
          message: 'Ошибка перевода: не удалось перевести статью.',
          stage: 'translation'
        }
    }
  }

  // Ошибки от API
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('region') || errorMsg.includes('регион')) {
      return {
        message: 'Ошибка перевода: сервис недоступен в вашем регионе. Попробуйте использовать VPN или развернуть приложение на Vercel.',
        stage: 'translation'
      }
    }
    
    if (errorMsg.includes('rate limit') || errorMsg.includes('лимит')) {
      return {
        message: 'Ошибка перевода: превышен лимит запросов. Подождите немного.',
        stage: 'translation'
      }
    }
    
    if (errorMsg.includes('api key') || errorMsg.includes('ключ')) {
      return {
        message: 'Ошибка перевода: проблема с настройками API.',
        stage: 'translation'
      }
    }
  }

  return {
    message: 'Ошибка перевода: не удалось перевести статью.',
    stage: 'translation'
  }
}

/**
 * Обрабатывает ошибки AI обработки (summary, thesis, telegram)
 */
export function getAIError(
  response: Response | null,
  error: unknown,
  stage: 'summary' | 'thesis' | 'telegram'
): ErrorInfo {
  const stageNames = {
    summary: 'анализа',
    thesis: 'создания тезисов',
    telegram: 'создания поста'
  }

  // Ошибки сети
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: `Ошибка ${stageNames[stage]}: нет подключения к интернету.`,
      stage
    }
  }

  // HTTP ошибки
  if (response) {
    switch (response.status) {
      case 400:
        return {
          message: `Ошибка ${stageNames[stage]}: неверный запрос. Проверьте, что статья была успешно загружена.`,
          stage
        }
      case 401:
      case 403:
        return {
          message: `Ошибка ${stageNames[stage]}: проблема с доступом к AI сервису.`,
          stage
        }
      case 408:
      case 504:
        return {
          message: `Ошибка ${stageNames[stage]}: превышено время ожидания. Попробуйте еще раз.`,
          stage
        }
      case 429:
        return {
          message: `Ошибка ${stageNames[stage]}: слишком много запросов. Подождите немного.`,
          stage
        }
      case 500:
      case 502:
      case 503:
        return {
          message: `Ошибка ${stageNames[stage]}: проблема на сервере. Попробуйте позже.`,
          stage
        }
      default:
        return {
          message: `Ошибка ${stageNames[stage]}: не удалось обработать статью.`,
          stage
        }
    }
  }

  // Ошибки от API
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase()
    
    if (errorMsg.includes('region') || errorMsg.includes('регион')) {
      return {
        message: `Ошибка ${stageNames[stage]}: сервис недоступен в вашем регионе. Попробуйте использовать VPN или развернуть приложение на Vercel.`,
        stage
      }
    }
    
    if (errorMsg.includes('rate limit') || errorMsg.includes('лимит')) {
      return {
        message: `Ошибка ${stageNames[stage]}: превышен лимит запросов. Подождите немного.`,
        stage
      }
    }
    
    if (errorMsg.includes('api key') || errorMsg.includes('ключ')) {
      return {
        message: `Ошибка ${stageNames[stage]}: проблема с настройками API.`,
        stage
      }
    }
  }

  return {
    message: `Ошибка ${stageNames[stage]}: не удалось обработать статью.`,
    stage
  }
}

