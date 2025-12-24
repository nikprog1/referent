# Referent

Я изучаю Next.js.

## Getting Started

First, install the dependencies:

```powershell
npm install
```

### Настройка переменных окружения

Создайте файл `.env.local` в корне проекта и добавьте ваш API ключ OpenRouter:

```env
OPENROUTER_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Получить API ключ можно на сайте [https://openrouter.ai/](https://openrouter.ai/)

**Важно:** После создания или изменения файла `.env.local` необходимо перезапустить сервер разработки!

### Запуск сервера разработки

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Решение проблем

### Ошибка "Service is not available in your region" на localhost

**Проблема:** На localhost может возникать ошибка "Access denied: This service is not available in your region", в то время как на Vercel приложение работает нормально.

**Причина:** 
- На localhost запросы к OpenRouter API идут с вашего IP-адреса, который может находиться в регионе, где OpenRouter недоступен
- На Vercel запросы идут с серверов Vercel, которые находятся в регионах, где OpenRouter доступен

**Решения:**
1. **Использовать Vercel для тестирования** - приложение доступно на [https://referent-steel.vercel.app/](https://referent-steel.vercel.app/)
2. **Использовать VPN** - подключите VPN к региону, где OpenRouter доступен
3. **Использовать другую модель** - добавьте в `.env.local`:
   ```env
   OPENROUTER_MODEL=openai/gpt-3.5-turbo
   ```
   Или другую доступную модель из [списка моделей OpenRouter](https://openrouter.ai/models)

### Другие ошибки

- **"Превышен лимит запросов"** - подождите или проверьте лимиты вашего аккаунта OpenRouter
- **"Неверный API ключ"** - проверьте правильность ключа в файле `.env.local`

## Функции приложения

- **Парсинг статей** - извлечение контента из англоязычных статей
- **Перевод** - перевод статей на русский язык
- **О чем статья?** - краткое резюме статьи на русском языке
- **Тезисы** - структурированный список ключевых тезисов
- **Пост для Telegram** - готовый пост для публикации в Telegram

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

PROJECT.md - описание проекта
