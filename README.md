# ShokVito - Avito Seller Dashboard

Современный веб-приложение для управления объявлениями на Avito с поддержкой AI-ассистента для генерации описаний и рекомендации цен.

## Функциональность

- **Список объявлений** с фильтрацией по категориям, поиском и сортировкой
- **Просмотр объявления** со всеми параметрами
- **Редактирование объявлений** с сохранением в БД
- **AI-ассистент** для генерации описаний и рекомендации цен
- **Интеграция Supabase** для бэкенда
- **Адаптивный дизайн** с использованием Tailwind CSS

## Быстрый старт

### Требования

- Node.js 18+
- pnpm или npm
- Бэкенд API на http://localhost:8080

### Установка зависимостей

```bash
pnpm install
# или
npm install
```

### Запуск в режиме разработки

```bash
pnpm dev
# или
npm run dev
```

Приложение будет доступно по адресу: **http://localhost:3000**

### Сборка для продакшена

```bash
pnpm build
pnpm preview
```

## Настройка LLM (AI-ассистент)

### Суть

AI-ассистент работает как **Supabase Edge Function** для генерации:
- Описаний товаров (copywriting)
- Рекомендаций по цене

Функция находится в: `supabase/functions/ai-assistant/index.ts`

### Текущая конфигурация

```typescript
model: "google/gemini-3-flash-preview"
gateway: "https://ai.gateway.shokvito.dev/v1/chat/completions"
```

### Настройка собственного LLM

#### Вариант 1: Google Gemini API

1. Получи API ключ на [Google AI Studio](https://aistudio.google.com)
2. Обнови `supabase/functions/ai-assistant/index.ts`:

```typescript
const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SHOKVITO_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gemini-1.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  }),
});
```

3. Добавь переменную окружения в `.env`:

```env
VITE_SUPABASE_URL="твой_supabase_url"
VITE_SUPABASE_ANON_KEY="твой_ключ"
SHOKVITO_API_KEY="твой_gemini_api_key"
```

#### Вариант 2: OpenAI API

```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SHOKVITO_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  }),
});
```

## Самостоятельные решения

### 1. Генерация ID для объявлений

**Проблема:** Бэкенд API не возвращает `id` в списке объявлений (`GET /items`), только в деталях (`GET /items/:id`).

**Решение:** Вычисление ID на фронтенде на основе индекса и параметра `skip`:
```typescript
const skip = (page - 1) * ITEMS_PER_PAGE;
items: result.items.map((item, idx) => ({
  ...item,
  id: String(skip + idx + 1)
}))
```

**Результат:** Корректная навигация по объявлениям, клики работают

---

### 2. Перемена брендинга с Lovable на ShokVito

**Решение:** 
- Переименованы все упоминания в коде (README, index.html, metadata)
- Обновлена фавиконка (сине-зелёный цвет вместо красного)
- Удалены все комментарии, указывающие на AI-генерацию
- Удален файл `src/tailwind.config.lov.json`
- Обновлены Playwright конфиги с удалением Lovable зависимостей

---

### 3. Проксирование AI Gateway

**Проблема:** URL `ai.gateway.lovable.dev` - это внешний сервис, недоступный без ключа.

**Выбор:** Код сохранён с поддержкой любого AI Gateway (Google Gemini, OpenAI), требует только замены URL и API ключа.

---

### 4. Изменение порта с 8080 на 3000

Обновлено в `vite.config.ts`:
```typescript
server: {
  port: 3000,  // было 8080
}
```

Причина: стандартный порт для React приложений.

---

## Структура проекта

```
src/
├── pages/              # Страницы (список, просмотр, редактирование)
├── components/         # UI компоненты (shadcn/ui)
├── lib/               # Утилиты (API, drafts)
├── hooks/             # React хуки
├── integrations/      # Интеграции (Supabase)
├── types/             # TypeScript типы
├── test/              # Тесты
└── main.tsx           # Точка входа

supabase/
└── functions/
    └── ai-assistant/  # Serverless функция для AI
```

## Переменные окружения

```env
VITE_SUPABASE_URL=твой_supabase_url
VITE_SUPABASE_ANON_KEY=твой_supabase_ключ
SHOKVITO_API_KEY=твой_ai_api_ключ
```

## Технологический стек

- React 18 - UI фреймворк
- TypeScript - Типизация
- Vite - Сборщик
- React Router - Маршрутизация
- React Query - Управление состоянием
- Tailwind CSS - Стили
- shadcn/ui - UI компоненты
- Supabase - БД и Edge Functions
- Playwright - E2E тесты

## Запуск тестов

```bash
# Unit тесты
pnpm test

# E2E тесты
pnpm test:e2e

# Playwright UI
pnpm test:ui
```

## Troubleshooting

### Ошибка 404 при клике на объявление
- Убедись, что бэкенд API запущен на http://localhost:8080
- Проверь консоль браузера (F12) на ошибки сети

### AI-ассистент не работает
- Убедись, что в `.env` установлены правильные переменные `SHOKVITO_API_KEY`
- Проверь лимиты API у поставщика
- В консоли браузера должны быть подробные ошибки

### CSS не применяется
- Очисти кэш браузера (Ctrl+Shift+Delete)
- Пересоберись: `pnpm build`

## Лицензия

Тестовое задание для стажировки

## Контакты

Вопросы по настройке? Проверь логи бэкенда и браузера (F12).

