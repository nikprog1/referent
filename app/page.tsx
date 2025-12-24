'use client'

import { useState } from 'react'

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

  const handleParse = async (showResult: boolean = true): Promise<ParsedData | undefined> => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return undefined
    }

    setLoading(true)
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
    }
  }

  const handleTranslate = async () => {
    if (!parsedData || !parsedData.content) {
      alert('Сначала распарсите статью')
      return
    }

    setLoading(true)
    setActionType('translate')
    setResult('Перевод...')

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: parsedData.content }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to translate article')
      }

      const data = await response.json()
      setResult(data.translation)
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
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
    setLoading(true)

    try {
      // Сначала парсим статью (без отображения результата)
      let articleData: ParsedData | null = parsedData
      
      // Если данных еще нет, парсим статью
      if (!articleData || !articleData.content) {
        const parsed = await handleParse(false)
        
        if (!parsed || !parsed.content) {
          throw new Error('Не удалось распарсить статью')
        }
        
        articleData = parsed
      }

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
          throw new Error('Неизвестное действие')
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = 'Ошибка при обработке статьи'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          // Если не удалось распарсить JSON с ошибкой
          if (response.status === 400) {
            errorMessage = 'Неверный запрос. Проверьте, что статья была успешно распарсена.'
          } else if (response.status === 500) {
            errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.'
          } else if (response.status === 503) {
            errorMessage = 'Сервис временно недоступен. Попробуйте позже.'
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.result || data.result.trim().length === 0) {
        throw new Error('Получен пустой результат. Попробуйте еще раз.')
      }
      
      setResult(data.result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setResult(`Ошибка: ${errorMessage}`)
      console.error('Error in handleSubmit:', error)
    } finally {
      setLoading(false)
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
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <button
            onClick={() => handleParse()}
            disabled={loading || !url.trim()}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
          >
            Парсить статью
          </button>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <button
              onClick={handleTranslate}
              disabled={loading || !parsedData}
              className="px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Перевести
            </button>
            <button
              onClick={() => handleSubmit('summary')}
              disabled={loading || !url.trim()}
              className="px-6 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              О чем статья?
            </button>
            <button
              onClick={() => handleSubmit('thesis')}
              disabled={loading || !url.trim()}
              className="px-6 py-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Тезисы
            </button>
            <button
              onClick={() => handleSubmit('telegram')}
              disabled={loading || !url.trim()}
              className="px-6 py-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Пост для Telegram
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 min-h-[300px]">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
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
              <p>Введите URL статьи и нажмите "Парсить статью"</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
