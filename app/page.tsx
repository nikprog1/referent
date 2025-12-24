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
        setResult('Парсинг статьи...')
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

      // Показываем, что идет обработка AI
      setResult('Обработка AI...')

      // Подготавливаем тело запроса
      const requestBody: { content: string; title?: string } = {
        content: articleData.content,
      }
      
      // Для Telegram также передаем заголовок
      if (action === 'telegram' && articleData.title) {
        requestBody.title = articleData.title
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
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при обработке статьи')
      }

      const data = await response.json()
      setResult(data.result || data.error || 'Результат не получен')
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {result}
              </pre>
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
