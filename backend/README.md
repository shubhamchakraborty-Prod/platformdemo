# Course Finder API - backend for the career counsellor bot

Server for the Swift AI Academy career counsellor bot. It takes a learner's answers and returns a short, explained learning plan, as the **ITI Course Finder: Product and Technical Specification (7 Oct 2026)** describes.

The engine is ported **unchanged** from the reference prototype (artifact "Swift AI Academy - Find your courses (ITI)"), with one documented addition. The six regression personas produce exactly the plans in spec section A2, in English and Hindi.

| Item | Value |
|---|---|
| Runtime | Node.js 18+ (tested on 22). **No dependencies** |
| Population packs | `iti` (v1). Diploma, B.Tech, BSc and BA packs plug in per spec B9.3 |
| Languages | English, Hindi |
| Tests | 26 tests, including the spec's B12 acceptance suite: 20,000 random profiles, persona regression, translation coverage, no blanks |
| Plan time | About 0.4 ms per plan (spec budget: 300 ms) |

## Run it

```bash
cd backend
npm test                                  # 26 tests, about 11 s
STAFF_TOKEN=change-me npm start           # http://localhost:8787
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | HTTP port |
| `DATA_DIR` | `backend/data` | Where sessions, names, events and catalogue changes are stored |
| `DATA_KEY` | Development key generated in `DATA_DIR/.devkey` | 32-byte key, base64. Encrypts answers, plans and names at rest (AES-256-GCM). **Required when `NODE_ENV=production`**. Create one with `openssl rand -base64 32` |
| `STAFF_TOKEN` | none (staff endpoints closed) | Bearer token for the staff trace and course admin |
| `ALLOWED_ORIGINS` | `*` | Comma-separated origins allowed by CORS, for example the platform's GitHub Pages URL |
| `RETENTION_DAYS` | `180` | Sessions untouched for longer are deleted (spec B13: confirm the period with legal) |
| `RATE_LIMIT_PER_MIN` | `300` | Requests per IP per minute |

Docker: `docker build -t course-finder-api backend && docker run -p 8787:8787 -e DATA_KEY=... -e STAFF_TOKEN=... -v cf-data:/data course-finder-api`. The Dockerfile is written but **not yet built or tested** (Docker is not available in the build environment).

## Spec coverage

| Spec section | Where |
|---|---|
| A4 questionnaire (32 questions, 15 screens, 8 parts) | `src/questionnaire.js`, rules in `src/questions.js` |
| A5 plan and course card fields | `src/planView.js` |
| A6 English and Hindi | `src/i18n.js`, `src/locale.js` |
| A7 product rules | Engine, proved by `test/engine.test.js` |
| A8 catalogue (19 courses, 39 skills, 11 goals) | `src/data.js` |
| B3 evidence rules, B4 levels, B5 eligibility, B6 scoring, B7 planner, B8 explanations | `src/engine.js` |
| B9.1 and B9.2 course ingestion and validation | `src/catalogue.js` |
| B10 APIs and stores | `src/server.js`, `src/store.js` |
| B12 acceptance tests | `test/` |
| B13 privacy: random session IDs, encryption at rest, name stored separately, retention, staff-only trace | `src/store.js`, `src/server.js` |

## API

All bodies are JSON. Errors are `{ "error": code, "message": text }`, plus details where useful.

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/v1/health` | GET | | `ok`, versions, populations |
| `/v1/config` | GET | `?population=iti&lang=hi` | Screens, questions (text, options, show-if rules as data), sections, UI strings, versions |
| `/v1/sessions` | POST | `{ population, lang }` | `201 { session_id }` |
| `/v1/sessions/{id}` | GET | | Answers so far, `missing` questions, `plan_ready`, last plan summary (for resuming) |
| `/v1/sessions/{id}/answers` | PATCH | `{ answers: {questionId: value}, screen?, lang?, ms_on_screen? }` | `204`, or `422` with `errors` per question and `first_error`. Well-formed answers are always saved (`saved: true`), so nothing is lost. Send `screen` when the learner taps Continue |
| `/v1/sessions/{id}/plan` | POST | `{ lang? }` | Plan: `start`, `next[]`, `also[]`, `path`, `profile.summary`, `live`, `header`, `engine_version`, `catalogue_version`. `422 { missing }` if incomplete |
| `/v1/sessions/{id}` | DELETE | | `204`. Erases answers and name |
| `/v1/plan` | POST | `{ answers, lang }` | Same plan, no session stored. For the bot ("the career bot can call /plan with the same answers schema", B10) |
| `/v1/courses` | GET | | Catalogue and its version |
| `/v1/courses/{id}` | GET | | One course |
| `/v1/courses` | POST | Course metadata (B9.1) | **Staff.** `201` with placement (`precededBy`, `leadsTo`, `goals`), or `422` with every problem listed |
| `/v1/courses/{id}` | PATCH | Changed fields | **Staff.** Re-validated, re-placed |
| `/v1/staff/sessions/{id}/trace` | GET | | **Staff.** Per-course eligibility, blocks, feature scores, bonuses, unserved needs |
| `/v1/events` | POST | `{ name, props, session_id? }` | `202`. Names from spec A9 |

### Example

```bash
B=http://localhost:8787
SID=$(curl -s -X POST $B/v1/sessions -H 'Content-Type: application/json' -d '{"lang":"hi"}' | jq -r .session_id)
curl -s -X PATCH $B/v1/sessions/$SID/answers -H 'Content-Type: application/json' \
  -d '{"screen":"iti","answers":{"trade":"electrician","itiStatus":"y1"}}'      # 204
# ...one PATCH per screen...
curl -s -X POST $B/v1/sessions/$SID/plan -H 'Content-Type: application/json' -d '{}' | jq '.start.name, .start.why'
```

A plan card looks like this (shortened):

```json
{ "id": "AIF-1", "slot": "start", "status": "eligible", "name": "AI First Steps on Your Phone",
  "category": { "id": "aif", "label": "AI Foundations" }, "oneLiner": "...", "level": "Beginner, NSQF 1 (proposed)",
  "time": { "hours": 8, "weeks": 6, "text": "8 hours, about 6 weeks at your pace" },
  "languages": { "list": ["English", "Hindi"], "text": "English and Hindi", "note": null },
  "youWillLearn": ["Sharing files", "Searching online", "Knowing AI apps"],
  "why": "You told us you want to get a government job, and you have not searched for information online yet. This is the best first step for you, because the other courses build on it. ...",
  "modules": [{ "name": "...", "hours": 2 }], "action": { "type": "start", "label": "Start course", "url": null } }
```

Learners never receive scores, weights or skill codes (A7 rule 4). Those appear only in the staff trace.

## Client for the bot

`client/course-finder-client.js` works in the browser (`<script>` tag, `window.CourseFinder`) and in Node:

```js
const cf = CourseFinder.createClient('https://your-api-host');
const { session_id } = await cf.createSession('hi');
try { await cf.saveAnswers(session_id, { trade: 'fitter' }, 'iti'); }
catch (e) { if (e.status === 422) showErrors(e.errors); } // { itiStatus: { code: 'required', message: 'कृपया एक जवाब चुनें।' } }
const plan = await cf.plan(session_id);
```

## Changes from the prototype

| Change | Why |
|---|---|
| "You may also like" falls back to the best remaining open course when every other fallback is empty (`src/engine.js`, marked) | The 20,000-profile run found 5 learners with an empty section, breaking A7 rule 9. They had mastered most of the catalogue, and only a specialist course was left, just under its bar. After the fix: 0 in 100,000. Persona plans are unchanged |
| Server-side answer validation and course-ingestion validation | Spec B9.1 and B11. The prototype validated in the browser only |

## Known gaps

| Gap | Note |
|---|---|
| Courses COM-L6, COM-L65, COM-L7, COM-L8 have no Hindi copy, and 3 have no promise sentence | They are always filtered out for ITI learners (A8), so learners never see them. They would fail validation if re-ingested |
| Content gaps the engine flags (A8): no course for computer basics, documents, spreadsheets, CV writing; no Hindi interview course | Shown in the staff trace as `unserved` |
| The career counsellor bot in `mvp_prd_doc.html` does not call this API yet | Next step. Its questions differ from the course-finder answers schema, so the bot's conversation needs the 15 course-finder screens, rendered from `/v1/config` |
| Hosting | GitHub Pages serves static files only. This API needs a Node host (for example Render, Railway, Fly.io or Google Cloud Run) |
| Legal | Retention period and consent for learners under 18 need confirming under the DPDP Act before launch (B13) |
