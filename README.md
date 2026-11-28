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
- Profile (name, e-mail, region) and language switch
- Home screen: greeting in the time zone of the chosen city, weather and the next public holiday of the chosen country
- Success and error notifications
- Social: friends, groups with admin and deputy roles, blocking, daily ranking
- Admin panel for the site owner (see [Admin panel](#admin-panel))

## Data models

`User`, `Subject`, `Task`, `Exam` (with checklist items), `StudySession`, `ScheduleItem`, `Friendship`, `Block`, `Group`,
`ActivityLog` (logins and logouts), `AdminLog` (admin actions), `Announcement`.
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
`BREVO_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(optional for local dev: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
The `.env` file holds secrets and is ignored by git: never commit it, copy `.env.example` instead.

### 2. Client
```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

In development the client proxies `/api` to `http://localhost:4000`.
For production set `VITE_API_URL` to the API address before `npm run build`.

## Admin panel

The admin is a single account configured in `server/.env`:

```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=at-least-8-characters
```

On every server start the account with this e-mail is created (or updated) with the admin role,
a confirmed e-mail and the given password; any other admin is demoted to a normal user.
Log in on the usual login page with these credentials. The admin API requires both the admin role
in the database and the e-mail from `ADMIN_EMAIL`, so a role change in the database alone is not enough.

**What the admin sees** (tabs in the panel):

- **Overview**: number of users, online and studying now, new users, active users, total study time, top students, charts
- **Users**: search, sorting, last activity, a user card with study time; block, unblock or delete a user; CSV export
- **Study**: all study sessions, average session, the busiest hour, a heat map by weekday and hour; CSV export
- **Logins**: log of logins and logouts
- **Content**: tasks, exams, subjects and schedule of any user (read only)
- **Groups**: groups with members and study time; delete a group or remove a member
- **Announcements**: messages shown to all users as a banner
- **Admin log**: who did what and why

The admin never sees passwords or confirmation codes. Blocking, deleting a user or a group and
removing a member from a group require a reason, which is saved in the admin log.
The admin cannot block or delete themselves or another admin.

**Demo data.** To fill the panel with realistic data for a presentation, run in `server/`:

```bash
npm run seed:demo            # create (or recreate) demo data
npm run seed:demo -- --clear # remove all demo data
```

The script writes to the database from `MONGO_URI` and creates demo students
(e-mails end with `@demo.odaklan.test`) with study sessions, tasks, exams, schedule, groups and login history.
It touches only these demo users, so real data stays safe. Nobody can log in as a demo user.

## Deploy

**Server (Render, Web Service)**: Root Directory `server`, Build Command `npm install`, Start Command `npm start`, Health Check Path `/api/health`.
Environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (for example `https://virakyslytsia.github.io`), `BREVO_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
In MongoDB Atlas open Network Access and allow `0.0.0.0/0`, because Render has no fixed IP on the free plan.

E-mail goes through the Brevo HTTP API: free Render services block outbound SMTP ports (25, 465, 587), so plain SMTP does not work there.
`MAIL_FROM` must be a sender verified in Brevo.

**Client (GitHub Pages)**: the workflow `.github/workflows/main.yml` builds `client/` on every push to `main`.
In the repository open Settings -> Pages -> Source: GitHub Actions, then Settings -> Secrets and variables -> Actions -> Variables and add `VITE_API_URL` with the Render address (no `/api`, no trailing slash).
The app uses `HashRouter`, so page reloads work on GitHub Pages without extra setup.

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
| Announcements | `/api/announcements` | GET |
| Admin | `/api/admin/...` (admin only) | GET, POST, PATCH, DELETE |

All addresses except `/api/auth/*` and `/api/health` require a token; `/api/admin/*` also requires the admin account.
Errors are returned as `{ "error": "message" }` with the matching HTTP status
(400, 401, 403, 404, 409, 500). Request examples are in `server/api-tests.http`.

## Testing

The API is checked manually with `server/api-tests.http` (REST Client / Thunder Client):
registration, login, CRUD for every resource and negative cases (wrong input, foreign data, limits).