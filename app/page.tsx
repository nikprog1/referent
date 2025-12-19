'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)

  const handleSubmit = async (action: 'summary' | 'thesis' | 'telegram') => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActionType(action)
    setResult('')

    // Здесь будет логика подключения к AI
    // Пока что просто имитация загрузки
    setTimeout(() => {
      setResult(`Результат для действия "${action}" будет здесь...`)
      setLoading(false)
    }, 1000)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Referent
          </h1>
          <p className="text-lg text-gray-600">
            Анализ англоязычных статей с помощью AI
          </p>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL англоязычной статьи
          </label>
          <div className="flex gap-3">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
            />
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => handleSubmit('summary')}
            disabled={loading || !url.trim()}
            className="px-6 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
          >
            О чем статья?
          </button>
          <button
            onClick={() => handleSubmit('thesis')}
            disabled={loading || !url.trim()}
            className="px-6 py-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
          >
            Тезисы
          </button>
          <button
            onClick={() => handleSubmit('telegram')}
            disabled={loading || !url.trim()}
            className="px-6 py-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
          >
            Пост для Telegram
          </button>
        </div>

        {/* Блок результатов */}
        <div className="bg-white rounded-xl shadow-lg p-6 min-h-[300px]">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Результат
            {actionType && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({actionType === 'summary' && 'О чем статья?'}
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
            <div className="prose max-w-none">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{result}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="mx-auto h-12 w-12 text-gray-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Введите URL статьи и выберите действие</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
