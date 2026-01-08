# Referent

Я изучаю Next.js.

## Getting Started

First, install the dependencies:

```powershell
npm install
```

### Настройка переменных окружения

Создайте файл `.env.local` в корне проекта и добавьте ваши API ключи:

```env
OPENROUTER_API_KEY=your_api_key_here
HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**API ключи:**
- **OpenRouter API ключ** - получить можно на сайте [https://openrouter.ai/](https://openrouter.ai/)
- **Hugging Face API ключ** - получить можно на сайте [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (нужен токен с правами чтения)

**Важно для Vercel:** На Vercel переменная окружения должна называться `HUGGING_FACE_API_KEY` (с подчеркиваниями). После добавления переменной на Vercel может потребоваться перезапуск деплоя.

**Опционально:**
- `OPENROUTER_MODEL` - модель для OpenRouter (по умолчанию: `deepseek/deepseek-r1` - бесплатная модель Deepseek)
- `HUGGING_FACE_MODEL` - модель для генерации изображений (по умолчанию: `stabilityai/stable-diffusion-xl-base-1.0`)

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

### Ошибки при генерации иллюстраций

**Важно:** Генерация иллюстраций работает только на Vercel, а не на localhost!

**Проблема:** Hugging Face API блокирует запросы с локальных IP-адресов, поэтому функция "Иллюстрация" недоступна при работе на localhost.

**Решение:** Используйте приложение на Vercel для генерации иллюстраций: [https://referent-steel.vercel.app/](https://referent-steel.vercel.app/)

**Другие возможные ошибки:**

1. **Модель загружается (503)** - при первом запросе модель может загружаться 10-30 секунд. Попробуйте еще раз через некоторое время
2. **Неверный API ключ (401/403)** - убедитесь, что ключ добавлен в `.env.local` на Vercel (через настройки проекта) и имеет права чтения
3. **Модель недоступна** - модель `stabilityai/stable-diffusion-xl-base-1.0` может быть недоступна. Попробуйте другую модель в настройках Vercel:
   ```env
   HUGGING_FACE_MODEL=runwayml/stable-diffusion-v1-5
   ```
4. **Превышен лимит (429)** - подождите немного и попробуйте снова

## Функции приложения

- **Парсинг статей** - извлечение контента из англоязычных статей
- **Перевод** - перевод статей на русский язык
- **О чем статья?** - краткое резюме статьи на русском языке
- **Тезисы** - структурированный список ключевых тезисов
- **Пост для Telegram** - готовый пост для публикации в Telegram
- **Иллюстрация** - генерация изображения на основе статьи с помощью AI (OpenRouter + Hugging Face)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

PROJECT.md - описание проекта
