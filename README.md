# odaklan

Study planner: Pomodoro timer, tasks, exams, calendar.

## Backend API

Server: Node.js + Express + MongoDB (Mongoose). Auth: JWT in the header `Authorization: Bearer <token>`.

### Run
```bash
cd server
npm install
cp .env.example .env   # fill in the values
npm run dev
```

### Endpoints
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