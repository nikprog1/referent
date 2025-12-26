'use client'

import { useState, useRef, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getParseError, getTranslationError, getAIError, ErrorInfo } from '@/lib/errorMessages'

interface ParsedData {
  date: string
  title: string
  content: string
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [currentProcess, setCurrentProcess] = useState<string | null>(null)
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  // Автоматическая прокрутка к результатам после успешной генерации
  useEffect(() => {
    if (result && !loading && !error && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [result, loading, error])

  // Функция очистки всех состояний
  const handleClear = () => {
    setUrl('')
    setResult('')
    setLoading(false)
    setActionType(null)
    setParsedData(null)
    setCurrentProcess(null)
    setError(null)
    setCopied(false)
  }

  // Функция копирования результата
  const handleCopy = async () => {
    if (!result) return
    
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Ошибка при копировании:', err)
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea')
      textArea.value = result
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Ошибка при копировании (fallback):', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleParse = async (showResult: boolean = true): Promise<ParsedData | undefined> => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return undefined
    }

    setLoading(true)
    setCurrentProcess('Загружаю статью...')
    if (showResult) {
      setResult('')
    }
    setParsedData(null)

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse article')
      }

      const data: ParsedData = await response.json()
      setParsedData(data)
      if (showResult) {
        setResult(JSON.stringify(data, null, 2))
      }
      return data
    } catch (error) {
      if (showResult) {
        setResult(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      throw error
    } finally {
      setLoading(false)
      setCurrentProcess(null)
    }
  }

  const handleParseAndTranslate = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActionType('translate')
    setResult('')
    setError(null)
    setParsedData(null)

    try {
      // Этап 1: Парсинг
      setCurrentProcess('Загружаю статью...')
      
      let parseResponse: Response | null = null
      try {
        parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })
      } catch (fetchError) {
        // Ошибка сети при парсинге
        const errorInfo = getParseError(null, fetchError)
        setError(errorInfo)
        return
      }

      if (!parseResponse.ok) {
        let apiError: unknown = null
        try {
          apiError = await parseResponse.json()
        } catch {
          // Не удалось распарсить JSON ошибки
        }
        const errorInfo = getParseError(parseResponse, apiError)
        setError(errorInfo)
        return
      }

      let parsedData: ParsedData
      try {
        parsedData = await parseResponse.json()
      } catch (parseError) {
        const errorInfo = getParseError(parseResponse, parseError)
        setError(errorInfo)
        return
      }

      setParsedData(parsedData)

      if (!parsedData.content || parsedData.content.trim().length === 0) {
        const errorInfo: ErrorInfo = {
          message: 'Статья не содержит текстового контента для обработки.',
          stage: 'parsing'
        }
        setError(errorInfo)
        return
      }

      // Этап 2: Перевод
      setCurrentProcess('Перевожу статью...')

      let translateResponse: Response | null = null
      try {
        translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: parsedData.content }),
        })
      } catch (fetchError) {
        // Ошибка сети при переводе
        const errorInfo = getTranslationError(null, fetchError)
        setError(errorInfo)
        return
      }

      if (!translateResponse.ok) {
        let apiError: unknown = null
        try {
          apiError = await translateResponse.json()
        } catch {
          // Не удалось распарсить JSON ошибки
        }
        const errorInfo = getTranslationError(translateResponse, apiError)
        setError(errorInfo)
        return
      }

      let translateData
      try {
        translateData = await translateResponse.json()
      } catch (parseError) {
        const errorInfo = getTranslationError(translateResponse, parseError)
        setError(errorInfo)
        return
      }
      
      if (!translateData.translation || translateData.translation.trim().length === 0) {
        const errorInfo: ErrorInfo = {
          message: 'Ошибка перевода: получен пустой перевод.',
          stage: 'translation'
        }
        setError(errorInfo)
        return
      }

      setResult(translateData.translation)
      setError(null)
    } catch (error) {
      // Неожиданная ошибка
      const errorInfo: ErrorInfo = {
        message: 'Произошла неожиданная ошибка. Попробуйте еще раз.',
        stage: error instanceof Error && error.message.includes('парсинга') ? 'parsing' : 'translation'
      }
      setError(errorInfo)
      console.error('Error in handleParseAndTranslate:', error)
    } finally {
      setLoading(false)
      setCurrentProcess(null)
    }
  }

  const handleSubmit = async (action: 'summary' | 'thesis' | 'telegram') => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    // Очищаем предыдущие результаты
    setActionType(action)
    setResult('')
    setError(null)
    setLoading(true)
    
    // Устанавливаем процесс в зависимости от действия
    const processMessages: Record<string, string> = {
      summary: 'Анализирую статью...',
      thesis: 'Создаю тезисы...',
      telegram: 'Формирую пост для Telegram...'
    }
    setCurrentProcess(processMessages[action] || 'Обрабатываю...')

    try {
      // Сначала парсим статью (без отображения результата)
      let articleData: ParsedData | null = parsedData
      
      // Если данных еще нет, парсим статью
      if (!articleData || !articleData.content) {
        setCurrentProcess('Загружаю статью...')
        
        let parseResponse: Response | null = null
        try {
          parseResponse = await fetch('/api/parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          })
        } catch (fetchError) {
          const errorInfo = getParseError(null, fetchError)
          setError(errorInfo)
          return
        }

        if (!parseResponse.ok) {
          let apiError: unknown = null
          try {
            apiError = await parseResponse.json()
          } catch {
            // Не удалось распарсить JSON ошибки
          }
          const errorInfo = getParseError(parseResponse, apiError)
          setError(errorInfo)
          return
        }

        try {
          articleData = await parseResponse.json()
          setParsedData(articleData)
        } catch (parseError) {
          const errorInfo = getParseError(parseResponse, parseError)
          setError(errorInfo)
          return
        }
        
        if (!articleData || !articleData.content) {
          const errorInfo: ErrorInfo = {
            message: 'Статья не содержит текстового контента для обработки.',
            stage: 'parsing'
          }
          setError(errorInfo)
          return
        }
      }

      // Возвращаем процесс к AI обработке
      setCurrentProcess(processMessages[action] || 'Обрабатываю...')

      // Определяем endpoint в зависимости от действия
      let endpoint = ''
      switch (action) {
        case 'summary':
          endpoint = '/api/summary'
          break
        case 'thesis':
          endpoint = '/api/thesis'
          break
        case 'telegram':
          endpoint = '/api/telegram'
          break
        default:
          const errorInfo: ErrorInfo = {
            message: 'Неизвестное действие.',
            stage: action
          }
          setError(errorInfo)
          return
      }

      // Подготавливаем тело запроса
      const requestBody: { content: string; title?: string; sourceUrl?: string } = {
        content: articleData.content,
      }
      
      // Для Telegram также передаем заголовок и URL источника
      if (action === 'telegram') {
        if (articleData.title) {
          requestBody.title = articleData.title
        }
        // Передаем URL источника для добавления ссылки в конце поста
        requestBody.sourceUrl = url.trim()
      }

      // Вызываем соответствующий API endpoint
      let response: Response | null = null
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      } catch (fetchError) {
        const errorInfo = getAIError(null, fetchError, action)
        setError(errorInfo)
        return
      }

      if (!response.ok) {
        let apiError: unknown = null
        try {
          apiError = await response.json()
        } catch {
          // Не удалось распарсить JSON ошибки
        }
        const errorInfo = getAIError(response, apiError, action)
        setError(errorInfo)
        return
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const errorInfo = getAIError(response, parseError, action)
        setError(errorInfo)
        return
      }
      
      if (data.error) {
        const errorInfo = getAIError(response, new Error(data.error), action)
        setError(errorInfo)
        return
      }
      
      if (!data.result || data.result.trim().length === 0) {
        const errorInfo: ErrorInfo = {
          message: 'Получен пустой результат. Попробуйте еще раз.',
          stage: action
        }
        setError(errorInfo)
        return
      }
      
      setResult(data.result)
      setError(null)
    } catch (error) {
      // Неожиданная ошибка
      const errorInfo: ErrorInfo = {
        message: 'Произошла неожиданная ошибка. Попробуйте еще раз.',
        stage: action
      }
      setError(errorInfo)
      console.error('Error in handleSubmit:', error)
    } finally {
      setLoading(false)
      setCurrentProcess(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Referent
          </h1>
          <p className="text-lg text-gray-600">
            Анализ англоязычных статей с помощью AI
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            disabled={loading}
          />
          <p className="mt-2 text-xs text-gray-500">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={handleParseAndTranslate}
            disabled={loading || !url.trim()}
            title="Загрузить статью и перевести на русский язык"
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
          >
            Парсить и перевести
          </button>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading || !url.trim()}
              title="Получить краткое описание статьи на русском языке"
              className="px-6 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              О чем статья?
            </button>
            <button
              onClick={() => handleSubmit('thesis')}
              disabled={loading || !url.trim()}
              title="Создать структурированный список ключевых тезисов статьи"
              className="px-6 py-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Тезисы
            </button>
            <button
              onClick={() => handleSubmit('telegram')}
              disabled={loading || !url.trim()}
              title="Создать готовый пост для Telegram с ссылкой на источник"
              className="px-6 py-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Пост для Telegram
            </button>
          </div>
          
          <button
            onClick={handleClear}
            disabled={loading}
            title="Очистить все поля и результаты"
            className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-4"
          >
            Очистить
          </button>
        </div>

        {/* Блок текущего процесса */}
        {currentProcess && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-800">{currentProcess}</span>
            </div>
          </div>
        )}

        {/* Блок ошибок */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>
              {error.stage === 'parsing' && 'Ошибка загрузки статьи'}
              {error.stage === 'translation' && 'Ошибка перевода'}
              {error.stage === 'summary' && 'Ошибка анализа'}
              {error.stage === 'thesis' && 'Ошибка создания тезисов'}
              {error.stage === 'telegram' && 'Ошибка создания поста'}
              {!error.stage && 'Ошибка'}
            </AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div ref={resultRef} className="bg-white rounded-xl shadow-lg p-6 min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Результат
              {actionType && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({actionType === 'translate' && 'Перевод'}
                  {actionType === 'summary' && 'О чем статья?'}
                  {actionType === 'thesis' && 'Тезисы'}
                  {actionType === 'telegram' && 'Пост для Telegram'})
                </span>
              )}
            </h2>
            {result && !loading && (
              <button
                onClick={handleCopy}
                title="Копировать результат"
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Скопировано
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Копировать
                  </>
                )}
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <span className="ml-4 text-gray-600">Обработка...</span>
            </div>
          ) : result ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div 
                className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto"
                style={{ lineHeight: '1.6' }}
              >
                {(() => {
                  // Преобразуем markdown ссылки [текст](URL) в React элементы
                  const parts: (string | JSX.Element)[] = []
                  let lastIndex = 0
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
                  let match
                  
                  while ((match = linkRegex.exec(result)) !== null) {
                    // Добавляем текст до ссылки
                    if (match.index > lastIndex) {
                      parts.push(result.substring(lastIndex, match.index))
                    }
                    
                    // Проверяем, что это валидный URL
                    const url = match[2]
                    const text = match[1]
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                      // Создаем кликабельную ссылку
                      parts.push(
                        <a
                          key={match.index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                        >
                          {text}
                        </a>
                      )
                    } else {
                      // Если не валидный URL, оставляем как есть
                      parts.push(match[0])
                    }
                    
                    lastIndex = match.index + match[0].length
                  }
                  
                  // Добавляем оставшийся текст
                  if (lastIndex < result.length) {
                    parts.push(result.substring(lastIndex))
                  }
                  
                  return parts.length > 0 ? parts : result
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Введите URL статьи и нажмите "Парсить и перевести"</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
