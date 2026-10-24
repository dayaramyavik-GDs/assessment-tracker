# Assessment Tracker

A mobile app that helps university students track units, assessments, deadlines and grades in one place. It works out what mark you need on the remaining work to reach your target grade, reminds you before things are due, and flags units and deadlines that are at risk.

**Android app:** Apache Cordova · **API:** Node.js + Express in Docker · **Database:** MongoDB Atlas · **Hosting:** Render (HTTPS)

![CI](https://github.com/dayaramyavik-GDs/assessment-tracker/actions/workflows/ci.yml/badge.svg)

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Prerequisites (Windows)](#prerequisites-windows)
- [Getting started](#getting-started)
- [Running the mobile app](#running-the-mobile-app)
- [Testing](#testing)
- [API reference](#api-reference)
- [Docker commands](#docker-commands)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## Features

| Feature | What it does |
| --- | --- |
| Accounts | Register, log in, log out, change password, delete account and all data |
| Units | Code, name, semester, credit points, target grade and colour |
| Assessments | Title, type, due date and time, weighting, max mark, mark received, status, notes |
| Grade calculator | Current weighted average, grade band (HD/D/C/P/N), weight already marked, and the mark needed on the remaining work to reach the target |
| Weighting check | Warns when a unit's weightings don't add up to 100%, and blocks totals over 100% |
| Dashboard | Counts for due this week, overdue and at risk, plus everything due in the next 14 days |
| Calendar | Month view with a coloured dot per item due; tap a day to see its assessments |
| Reminders | Local notifications before each deadline (default 3 days and 1 day before; configurable) |
| Study timer | Stopwatch or 25-minute Pomodoro, linked to a unit and optionally an assessment |
| At-risk view | Unreachable targets, targets needing more than 85%, deadlines within 3 days with under 60 minutes studied, and overdue work |
| Offline handling | Offline banner and friendly errors; unsaved study sessions are kept and can be retried |

### How the grade calculation works

For each unit, using the assessments that already have a mark:

```text
earned          = Σ (markReceived / maxMark) × weighting
completed       = Σ weighting of marked assessments
current average = earned / completed × 100
required        = (target − earned) / (100 − completed) × 100
```

**Example:** 62/100 on a 30% assignment and 18/20 on a 10% quiz gives earned = 27.6 of 40%, so the current average is 69%. With a 70% target, the student needs (70 − 27.6) / 60 × 100 = **70.7%** on the remaining 60%.

The same calculation file (`backend/src/services/grades.js`) runs on the server and in the app.

---

## Screenshots

Screenshots use demo data only.

| Welcome | Home | Unit detail | Assessment form |
| --- | --- | --- | --- |
| ![Welcome](docs/screenshots/welcome.png) | ![Home](docs/screenshots/home.png) | ![Unit detail](docs/screenshots/unit-detail.png) | ![Assessment form](docs/screenshots/assessment-form.png) |

| Calendar | Timer | At risk | Settings |
| --- | --- | --- | --- |
| ![Calendar](docs/screenshots/calendar.png) | ![Timer](docs/screenshots/timer.png) | ![At risk](docs/screenshots/at-risk.png) | ![Settings](docs/screenshots/settings.png) |

---

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Mobile app | Apache Cordova (cordova-android 15), HTML, CSS, JavaScript, jQuery | Builds an installable Android app from web code |
| Cordova plugins | `cordova-plugin-local-notification`, `cordova-plugin-network-information`, `cordova-plugin-device` | Deadline reminders, offline detection, device info |
| API | Node.js 24, Express 5 | Express 5 passes errors from `async` handlers to the error handler automatically |
| Database access | Mongoose 8 | Schemas, validation and indexes |
| Validation | Joi | Validates every request and strips unknown fields |
| Authentication | bcryptjs (cost 12), jsonwebtoken (HS256) | Hashed passwords and stateless login tokens |
| Security middleware | helmet, cors, express-rate-limit | Security headers, origin allow-list, brute-force protection |
| Logging | morgan | Request logs |
| Database | MongoDB 7 in Docker (development), MongoDB Atlas (production) | |
| Containers | Docker, Docker Compose | The same API environment on every machine |
| Hosting | Render (Docker web service, Singapore region) | Builds from the Dockerfile; HTTPS included |
| Tests and quality | Jest, Supertest, mongodb-memory-server, ESLint, npm audit, Snyk, Gitleaks | |
| CI | GitHub Actions | Lint, tests, audit, Docker build and secret scan on every pull request |

---

## Architecture

```text
Android phone (Cordova app)
        │  HTTPS, JSON, Bearer token
        ▼
Render: Docker container (Node + Express API)
        │  TLS
        ▼
MongoDB Atlas (database: assessment_tracker)
```

- **Development:** the phone reaches the API on the PC through `adb reverse tcp:3000 tcp:3000` over USB. The API and a local MongoDB run in Docker Compose.
- **Production:** the app calls `https://assessment-tracker-api.onrender.com/api`. Only the API holds the database credentials; the app holds no secrets.
- Reminders are scheduled on the phone, so no push-notification server is needed.

---

## Repository structure

```text
assessment-tracker/
├─ .github/workflows/ci.yml     # CI: backend tests, mobile lint, Docker build, secret scan
├─ backend/
│  ├─ src/
│  │  ├─ server.js              # starts the server, connects to MongoDB, graceful shutdown
│  │  ├─ app.js                 # Express app: middleware and routes
│  │  ├─ config/                # env.js (reads and checks environment variables), db.js
│  │  ├─ models/                # User, Unit, Assessment, StudySession
│  │  ├─ validators/            # Joi schemas
│  │  ├─ middleware/            # auth (JWT), validate, rate limits, errors
│  │  ├─ controllers/           # request handlers
│  │  ├─ routes/index.js        # every endpoint in one place
│  │  ├─ services/              # grades.js, atRisk.js, userData.js
│  │  └─ utils/AppError.js
│  ├─ tests/                    # Jest + Supertest
│  ├─ requests.http             # manual API calls (VS Code REST Client)
│  ├─ Dockerfile
│  └─ .dockerignore
├─ mobile/
│  ├─ config.xml                # Cordova app settings and network allow-list
│  ├─ res/android/              # Android network security config
│  ├─ scripts/set-config.js     # writes www/js/config.js for dev or prod
│  └─ www/
│     ├─ index.html             # single page with a Content-Security-Policy
│     ├─ css/app.css
│     ├─ lib/jquery.min.js
│     └─ js/                    # ui, auth, router, api, notifications, app, screens/
├─ docker-compose.yml           # API + local MongoDB for development
├─ .env.example                 # template only; copy to .env
└─ README.md
```

`node_modules/`, `mobile/platforms/` and `mobile/plugins/` are not committed. They are recreated by `npm install` and `cordova prepare`.

---

## Prerequisites (Windows)

| Software | Version used |
| --- | --- |
| Git | 2.5x |
| Node.js | 24 LTS (22 LTS also works) |
| Docker Desktop | with the WSL 2 backend |
| Apache Cordova CLI | `npm install -g cordova` |
| JDK | **17** (Eclipse Temurin) |
| Android Studio | SDK Platform, Build-Tools, Platform-Tools, Command-line Tools |
| Gradle | on `PATH` |
| VS Code | ESLint and REST Client extensions recommended |

Environment variables:

```text
JAVA_HOME    = C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot
ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk
Path        += %JAVA_HOME%\bin; %ANDROID_HOME%\platform-tools; %ANDROID_HOME%\cmdline-tools\latest\bin
```

> **Use JDK 17.** Android Studio's built-in Java is newer, and the Cordova Gradle build fails on it with `Unsupported class file major version`.

---

## Getting started

### 1. Clone

```powershell
git clone https://github.com/dayaramyavik-GDs/assessment-tracker.git
cd assessment-tracker
```

### 2. Configure environment variables

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Open `.env` and replace every `CHANGE_ME`:

- Paste the generated string into `JWT_SECRET`.
- Choose a local Mongo username and password (letters and numbers only), and use the **same** values in `MONGODB_URI` and `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`.

`.env` is listed in `.gitignore` and must never be committed. Check with `git check-ignore -v .env`.

### 3. Run the API and database with Docker

```powershell
docker compose up -d --build
docker compose ps                 # mongo and api should be healthy
```

Open <http://localhost:3000/api/health>. You should see `{"status":"ok","db":"connected"}`.

To run the API with hot reload instead, start only the database with Docker:

```powershell
docker compose stop api
docker compose up -d mongo
cd backend
npm install
npm run dev
```

### 4. Install the mobile app's dependencies

```powershell
cd mobile
npm install
cordova prepare
```

---

## Running the mobile app

### In a desktop browser (quickest)

```powershell
cd mobile
npm run browser                   # serves http://localhost:8000
```

Keep this terminal open while you use the app. Notifications are skipped in the browser.

### On an Android phone (local API)

1. Turn on **Developer options** and **USB debugging**, plug in the phone, and accept the prompt.
2. Run:

```powershell
adb devices                       # phone listed as "device"
adb reverse tcp:3000 tcp:3000     # repeat after every replug
cd mobile
npm run android:dev
```

Debug the app from the PC at `edge://inspect/#devices` (or `chrome://inspect/#devices`) → **inspect**.

### On an Android phone (production API)

```powershell
cd mobile
npm run config:prod               # API_BASE_URL -> https://assessment-tracker-api.onrender.com/api
cordova.cmd run android --device
npm run config:dev                # switch back for development
```

`npm run config:dev` and `npm run config:prod` rewrite `www/js/config.js`. The production URL must use HTTPS.

---

## Testing

### Automated

```powershell
cd backend
npm run lint
npm test                          # Jest + Supertest with an in-memory MongoDB
npm run test:coverage
npm audit --omit=dev
npx snyk test                     # run `npx snyk auth` once first

cd ..\mobile
npm run lint
npm audit
```

The backend tests cover:

- the grade calculation, including an unreachable target and the grade bands;
- registration, duplicate emails, weak passwords, and identical messages for a wrong password and an unknown email;
- NoSQL operator injection in login;
- missing and invalid tokens;
- another user's records returning 404, and ignoring a `userId` sent in the request body;
- invalid ids, duplicate unit codes, and repeated submissions with the same `clientId`;
- weighting totals over 100% and marks above the max mark.

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main` and `develop`:

| Job | Checks |
| --- | --- |
| backend | `npm ci`, lint, tests, `npm audit --audit-level=high` |
| mobile-lint | `npm ci`, lint |
| docker-build | builds the backend image |
| secret-scan | Gitleaks scan of the commit history |

### Manual (on an Android phone)

Invalid form input, wrong and duplicate logins, duplicate taps on Save, aeroplane mode (offline banner and recovery), reminders arriving, the timer saving sessions, the at-risk view, the Android back button, logout, and changing the password with a wrong current password.

---

## API reference

Base URL: `http://localhost:3000/api` (development) · `https://assessment-tracker-api.onrender.com/api` (production)

Protected routes need the header `Authorization: Bearer <token>`. Every error uses the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "details": [{ "field": "weighting", "message": "weighting must be less than or equal to 100" }]
  }
}
```

| Method | Path | Auth | Body | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | No | | 200 `{status, db}` | 503 if the database is down |
| POST | `/auth/register` | No | `{name, email, password}` | 201 `{token, user}` | 400, 409 email taken, 429 |
| POST | `/auth/login` | No | `{email, password}` | 200 `{token, user}` | 400, 401, 429 |
| GET | `/auth/me` | Yes | | 200 `{user}` | 401 |
| PATCH | `/users/me` | Yes | `{name?, settings?}` | 200 `{user}` | 400, 401 |
| PUT | `/users/me/password` | Yes | `{currentPassword, newPassword}` | 204 | 400 `WRONG_PASSWORD` |
| DELETE | `/users/me` | Yes | `{password}` | 204 (deletes all the user's data) | 400 `WRONG_PASSWORD` |
| GET | `/units?semester=` | Yes | | 200 units, each with a `summary` | 401 |
| POST | `/units` | Yes | `{code, name, semester, creditPoints?, targetGrade?, colour?, clientId?}` | 201 `{unit}` (200 if the same `clientId` already exists) | 400, 409 duplicate code |
| GET | `/units/:id` | Yes | | 200 `{unit, assessments, summary}` | 400, 404 |
| PATCH | `/units/:id` | Yes | any unit field | 200 `{unit}` | 400, 404, 409 |
| DELETE | `/units/:id` | Yes | | 204 (also deletes its assessments and sessions) | 404 |
| GET | `/assessments?unitId=&from=&to=&status=` | Yes | | 200 assessments sorted by due date | 400 |
| POST | `/assessments` | Yes | `{unitId, title, type, dueAt, weighting, maxMark?, markReceived?, status?, notes?, clientId?}` | 201 `{assessment}` | 400 (including `WEIGHTING_EXCEEDED`), 404 |
| GET | `/assessments/:id` | Yes | | 200 `{assessment}` | 404 |
| PATCH | `/assessments/:id` | Yes | any assessment field | 200 `{assessment}` | 400, 404 |
| DELETE | `/assessments/:id` | Yes | | 204 | 404 |
| GET | `/dashboard` | Yes | | 200 `{upcoming, overdue, dueThisWeek, overdueCount, atRiskCount}` | 401 |
| GET | `/at-risk` | Yes | | 200 `{unreachable, atRisk, deadlineRisk, overdue}` | 401 |
| GET | `/study-sessions?unitId=&from=&to=` | Yes | | 200 sessions | 400 |
| POST | `/study-sessions` | Yes | `{unitId, assessmentId?, startedAt, endedAt, durationMinutes, mode, clientId}` | 201 `{session}` (200 if repeated) | 400, 404 |
| DELETE | `/study-sessions/:id` | Yes | | 204 | 404 |

A record that belongs to another user returns **404**, not 403, so valid ids can't be discovered by guessing.

`backend/requests.http` contains ready-made requests for the VS Code REST Client extension.

---

## Docker commands

| Task | Command |
| --- | --- |
| Build and start | `docker compose up -d --build` |
| Status and health | `docker compose ps` |
| Follow API logs (Ctrl+C stops following) | `docker compose logs -f api` |
| Last 50 log lines | `docker compose logs --tail=50 api` |
| Shell inside the API container | `docker compose exec api sh` |
| Start the mongo-express viewer as well | `docker compose --profile tools up -d` |
| Stop (keep containers and data) | `docker compose stop` |
| Remove containers (keep data) | `docker compose down` |
| Remove containers **and delete local data** | `docker compose down -v` |
| Check the compose file is valid | `docker compose config --services` |

Local MongoDB data is kept in the named volume `mongo_data`, so it survives restarts. The API reaches the database at `mongo:27017` on the internal Docker network.

> Plain `docker compose config` prints your `.env` values, including passwords. Don't run it while sharing your screen.

---

## Deployment

### Backend: Render + MongoDB Atlas

1. **Atlas:** use a free cluster, create a database user with **readWrite on `assessment_tracker` only**, and add the IP access entry Render needs.
2. **Render:** New → Web Service → this repository.

   | Setting | Value |
   | --- | --- |
   | Runtime | Docker |
   | Branch | `main` |
   | Root directory | `backend` |
   | Region | Singapore |
   | Health check path | `/api/health` |

3. Set these environment variables **in the Render dashboard only**:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Atlas connection string, with `/assessment_tracker` before the `?` |
   | `JWT_SECRET` | a new 128-character random hex string (not the development one) |
   | `JWT_EXPIRES_IN` | `1d` |
   | `BCRYPT_ROUNDS` | `12` |
   | `CORS_ORIGINS` | `https://localhost` |

   Render sets `PORT` itself. Every merge to `main` redeploys automatically.

4. Check <https://assessment-tracker-api.onrender.com/api/health>.

> The free Render plan sleeps when idle. The first request after a quiet period can take up to about a minute; the app shows a retry message while it wakes up.

### Android release build

The signing key and `build.json` are kept **outside the repository** (for example in `C:\keys\`) and backed up privately.

```powershell
cd mobile
npm run config:prod
# Use cordova.cmd: in PowerShell, `cordova` drops the `--` and builds an .aab instead of an .apk
cordova.cmd build android --release --buildConfig=C:\keys\build.json -- --packageType=apk
npm run config:dev
```

The signed APK is written to `mobile/platforms/android/app/build/outputs/apk/release/app-release.apk`. Use `--packageType=bundle` to build an `.aab` for Google Play.

### Releases

Versions are tagged with Semantic Versioning (`v1.0.0`). Each GitHub release attaches only the signed APK, never keystores, `build.json` or `.env` files.

---

## Security and privacy

- Passwords are hashed with bcrypt (cost 12). They are never logged or returned by the API.
- Login tokens are JWTs signed with `JWT_SECRET` and expire after one day. The app clears them on logout or after a 401.
- Every database query is filtered by the logged-in user's id, and other users' records return 404.
- Joi validates every request and strips unknown fields, which blocks mass assignment and `$`-operator injection.
- Login and registration are rate-limited (10 failed attempts per 15 minutes per IP).
- helmet sets security headers. CORS allows only the listed origins.
- The app's Content-Security-Policy allows scripts only from the app itself and network requests only to the API. All user text is HTML-escaped before display.
- Notification text shows the title and due time only, never marks.
- Secrets live only in `.env` (local, git-ignored) and Render's environment settings. `.env.example` contains placeholders only. Gitleaks scans every pull request.
- The Atlas database user can only read and write the `assessment_tracker` database.
- **Known limitation:** Atlas network access allows `0.0.0.0/0`, because Render's free plan has no fixed outbound IP address. The strong, least-privilege database user is the main protection.
- Personal data stored: name, email, and the academic records the student enters. Students can delete their account and all their data in Settings.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Unsupported class file major version` during the Android build | Point `JAVA_HOME` at JDK 17, then run `platforms\android\gradlew.bat --stop` |
| The release build produced an `.aab` instead of an `.apk` | Run `cordova.cmd`, not `cordova`, so PowerShell keeps the `--` |
| `adb devices` shows `unauthorized` | Unlock the phone and accept the USB debugging prompt |
| The phone shows "Can't reach the server" (dev build) | Run `adb reverse tcp:3000 tcp:3000` again and check `docker compose ps` |
| `Refused to connect … Content Security Policy` | The API URL in `www/index.html` (`connect-src`) doesn't match |
| API returns 403 `CORS_BLOCKED` | Add the app's origin to `CORS_ORIGINS` (`https://localhost` for Android, `http://localhost:8000` for the browser) |
| Render returns 500 on register, and the log mentions `test.users` | `MONGODB_URI` is missing `/assessment_tracker` before the `?` |
| `docker compose` warns that variables are not set | `.env` is missing from the repository root |
| API log shows `Authentication failed` (local Mongo) | The Mongo credentials changed after the volume was created; run `docker compose down -v`, then `up -d` |
| `Missing environment variables` on startup | Compare `.env` (or Render's Environment settings) with `.env.example` |

---

## Roadmap

- Push notifications (Firebase Cloud Messaging) for reminders across devices
- Offline-first sync with a local queue
- Import deadlines from the university LMS calendar (`.ics`)
- GPA/WAM across semesters and "what-if" grade sliders
- Study statistics charts
- Password reset by email; secure token storage plugin
- iOS build and dark mode

---

## Licence

MIT. See [LICENSE](LICENSE).

**Author:** Yavik Dayaram ([@dayaramyavik-GDs](https://github.com/dayaramyavik-GDs))
