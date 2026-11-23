# Odaklan

Study planner for students: Pomodoro timer, tasks, exams with live countdown and
preparation checklist, weekly class schedule, study statistics and a calendar.
Available in English, Turkish, Russian and Ukrainian.

## Architecture

| Part | Stack |
|---|---|
| `server/` | REST API: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Nodemailer |
| `client/` | Web app: React, React Router, Vite |

The client and the server are independent: the client talks to the API only through HTTP (`/api/...`).

## Features

- Registration with a 6-digit confirmation code sent by e-mail, login with JWT, hashed passwords
- Subjects with colors and accumulated study time
- Tasks by day, linked to a subject, with completion status
- Exams with exact date and time, live countdown and a preparation checklist
- Class schedule by weekday
- Pomodoro timer with adjustable work/break time; every finished session is saved for statistics
- Statistics and calendar: study time for any selected day or period
- Profile (name, e-mail, avatar, region) and language switch
- Home screen: greeting in the time zone of the chosen city, weather and the next public holiday of the chosen country
- Success and error notifications

## Data models

`User`, `Subject`, `Task`, `Exam` (with checklist items), `StudySession`, `ScheduleItem`.
Every record belongs to a user; all queries are filtered by the authenticated user.

## Run

Requirements: Node.js 20.19+ and a MongoDB database (for example MongoDB Atlas).

### 1. Server
```bash
cd server
npm install
cp .env.example .env   # fill in the values (see below)
npm run dev            # http://localhost:4000
```

`.env` variables: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

### 2. Client
```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

In development the client proxies `/api` to `http://localhost:4000`.
For production set `VITE_API_URL` to the API address before `npm run build`.

## Backend API

Auth: JWT in the header `Authorization: Bearer <token>`.

| Group | Address | Methods |
|---|---|---|
| Auth | `/api/auth/register`, `/verify`, `/resend`, `/login` | POST |
| Profile | `/api/profile` | GET, PUT, PATCH |
| Subjects | `/api/subjects`, `/api/subjects/:id` | GET, POST, PUT, PATCH, DELETE |
| Tasks | `/api/tasks?date=YYYY-MM-DD`, `/api/tasks/:id`, `/api/tasks/:id/toggle` | GET, POST, PUT, PATCH, DELETE |
| Exams | `/api/exams`, `/api/exams/:id` | GET, POST, PUT, PATCH, DELETE |
| Sessions | `/api/sessions` | POST |
| Stats | `/api/stats/day?date=`, `/api/stats/range?from=&to=` | GET |
| Schedule | `/api/schedule?day=1..7`, `/api/schedule/:id` | GET, POST, PUT, PATCH, DELETE |

All addresses except `/api/auth/*` and `/api/health` require a token.
Errors are returned as `{ "error": "message" }` with the matching HTTP status
(400, 401, 403, 404, 409, 500). Request examples are in `server/api-tests.http`.