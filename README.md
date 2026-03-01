# TODO App

Fullstack приложение для управления задачами с авторизацией.

**Стек:** Node.js · Express · SQLite · React · Vite

---

## Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/wisteryyy/TODO-LIST-Web.git
cd TODO-LIST-Web
```

### 2. Установить все зависимости

```bash
npm run install:all
```

### 3. Создать `.env` файл в папке `todo-backend`

```bash
# todo-backend/.env
PORT=3000
DB_PATH=./todo.db
JWT_SECRET=ваш_секретный_ключ
JWT_EXPIRES_IN=7d
```

### 4. Запустить проект

```bash
npm run dev
```

- Бэкенд: [http://localhost:3000](http://localhost:3000)
- Фронтенд: [http://localhost:5173](http://localhost:5173)