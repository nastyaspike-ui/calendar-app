# Когда все свободны? 📅

Совместный календарь для планирования встреч. Каждый участник входит под своим именем и отмечает занятые дни. Приложение в реальном времени показывает когда все свободны.

## Деплой на Vercel (5 минут)

### 1. Установи Node.js
Скачай с [nodejs.org](https://nodejs.org) (версия LTS)

### 2. Загрузи код на GitHub
- Создай аккаунт на [github.com](https://github.com)
- Нажми **New repository** → назови `calendar-app` → **Create**
- Нажми **uploading an existing file** → перетащи все файлы из этой папки → **Commit**

### 3. Задеплой на Vercel
- Зайди на [vercel.com](https://vercel.com) → **Sign up with GitHub**
- Нажми **Add New → Project**
- Выбери репозиторий `calendar-app` → **Deploy**
- Через ~1 минуту получишь ссылку вида `calendar-app-xxx.vercel.app`

### 4. Настрой Firebase (если ещё не сделано)
В Firebase Console → Realtime Database → Rules замени на:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
Это даёт доступ всем по ссылке (без авторизации). Подходит для личного использования.

## Локальный запуск

```bash
npm install
npm run dev
```

Открой http://localhost:5173
