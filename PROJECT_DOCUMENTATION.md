# AI Outfit Generator — Project Documentation

> Continuously maintainable technical documentation, generated from a deep read of every source file in the repository.
> When new code is added, **append** new entries below the relevant section rather than rewriting existing ones.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [End-to-End Flow](#4-end-to-end-flow)
5. [Backend (BE) — File-by-File Analysis](#5-backend-be--file-by-file-analysis)
   - 5.1 [`BE/src/index.js`](#51-besrcindexjs--app-bootstrap)
   - 5.2 [Routes (`BE/src/routes/*`)](#52-routes-besrcroutes)
   - 5.3 [Controllers (`BE/src/controllers/*`)](#53-controllers-besrccontrollers)
   - 5.4 [Services (`BE/src/services/*`)](#54-services-besrcservices)
   - 5.5 [Middlewares (`BE/src/middlewares/*`)](#55-middlewares-besrcmiddlewares)
   - 5.6 [SQL Migrations (`BE/migrations/*`)](#56-sql-migrations-bemigrations)
6. [Frontend (FE) — File-by-File Analysis](#6-frontend-fe--file-by-file-analysis)
   - 6.1 [App routes (`FE/app/**`)](#61-app-routes-feapp)
   - 6.2 [Components (`FE/components/*`)](#62-components-fecomponents)
   - 6.3 [Library helpers (`FE/lib/*`)](#63-library-helpers-felib)
   - 6.4 [Configuration files](#64-configuration-files)
7. [React Hooks Catalogue](#7-react-hooks-catalogue)
8. [Component Hierarchy](#8-component-hierarchy)
9. [API Reference & Integration Map](#9-api-reference--integration-map)
10. [State Management & Data Flow](#10-state-management--data-flow)
11. [Important Logic, Optimizations & Tricky Parts](#11-important-logic-optimizations--tricky-parts)
12. [Feature Traceability Matrix](#12-feature-traceability-matrix)
13. [Environment Configuration](#13-environment-configuration)
14. [Continuous Update Mode (How to Append)](#14-continuous-update-mode-how-to-append)
15. [Possible Interview Questions From This Project](#15-possible-interview-questions-from-this-project)

---

## 1. Project Overview

AI Outfit Generator is a multi-step web app that produces a complete outfit recommendation (top, bottom, footwear, accessories, color palette, explanation, and a photorealistic preview image) for an authenticated user. The user uploads a photo, the system detects skin tone, gender presentation, and age group from that photo, optionally pulls weather for a location/date, then asks an OpenAI-compatible LLM to draft a styled outfit, and finally asks an image model (Hugging Face FLUX or OpenAI Images) to render it on a mannequin.

It is a **two-package monorepo** (`FE/` Next.js 14 App Router + `BE/` Express ESM) with no root `package.json`. Auth, storage, and persistence all sit on Supabase.

---

## 2. Tech Stack

| Layer            | Tech                                                                 |
|------------------|----------------------------------------------------------------------|
| Frontend         | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS       |
| Backend          | Node.js · Express 4 · ESM (`"type": "module"`) · Multer · Morgan      |
| Auth             | Supabase Auth (anon SDK on FE, service-role + anon clients on BE)    |
| Database         | Supabase Postgres (`recommendations` table + RLS)                    |
| Storage          | Supabase Storage (private bucket, signed URLs, 5 MB cap)             |
| LLM (text)       | OpenAI SDK against any OpenAI-compatible base URL (OpenAI/Groq/etc.) |
| Image generation | Hugging Face Inference API (FLUX.1-schnell default) **or** OpenAI Images |
| Image processing | `sharp` for resize/crop and skin-tone heuristic                      |
| Weather          | Open-Meteo (no API key) for forecast + geocoding                     |

---

## 3. Repository Layout

```
AI-Outfit-Generator/
├── BE/                          # Express API
│   ├── migrations/              # SQL run against Supabase
│   │   ├── 001_recommendations.sql
│   │   ├── 002_outfit_image.sql
│   │   └── 003_favorites.sql
│   ├── src/
│   │   ├── index.js             # App bootstrap, route mounting, error pipeline
│   │   ├── routes/              # Express Routers (one per feature)
│   │   ├── controllers/         # Request handlers (validation + glue)
│   │   ├── middlewares/         # requireAuth, errorHandler, notFound
│   │   └── services/            # External I/O: supabase, openai, weather, etc.
│   ├── .env / .env.example
│   └── package.json
├── FE/                          # Next.js 14 client
│   ├── app/                     # App Router pages
│   │   ├── (auth)/login/        # Route group — doesn't appear in URL
│   │   ├── (auth)/signup/
│   │   ├── dashboard/
│   │   ├── upload/              # Step 1
│   │   ├── occasion/            # Step 2
│   │   ├── result/              # Step 3
│   │   ├── history/[id]/
│   │   ├── history/             # List
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home (marketing)
│   │   └── globals.css          # Tailwind + design tokens
│   ├── components/              # Reusable UI primitives
│   ├── lib/                     # API client, types, sessionStorage flow store
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.mjs
│   └── package.json
├── CLAUDE.md                    # AI-agent guidance (architecture, conventions)
├── README.md                    # Public-facing project doc
└── PROJECT_DOCUMENTATION.md     # ← this file
```

---

## 4. End-to-End Flow

```
┌─────────┐  signup/login   ┌──────────────┐
│ Browser │ ──────────────▶ │  Supabase    │
└────┬────┘                 │  Auth (anon) │
     │ access_token         └──────────────┘
     ▼
┌─────────────┐  POST /api/upload (multipart, Bearer)   ┌──────────┐
│ FE /upload  │ ─────────────────────────────────────▶  │ Express  │
│             │ POST /api/skin-tone   { path }          │ requireAuth
│             │ POST /api/analyze-user{ path }   ◀─ JSON │  (admin) │
└────┬────────┘                                         └─────┬────┘
     │ skin tone + gender + age + (optional weather)         │
     ▼                                                       ▼
┌──────────────┐  POST /api/weather / /api/weather/geocode   Supabase
│ FE /occasion │  pick occasion + style + colors + notes   ┌──────────┐
└────┬─────────┘                                           │ Storage  │
     │ POST /api/outfit/generate                           │ Postgres │
     ▼                                                     └──────────┘
┌────────────┐ writes recommendations row, returns id      │
│ FE /result │ ──────POST /api/outfit/:id/preview──────────┘
│ + polls GET /api/outfit/:id/preview every 3s until ready
└────────────┘
```

The split is: **Supabase Auth happens on the FE (anon key)**; **the BE verifies tokens** with the service-role client and does all server-side work.

---

## 5. Backend (BE) — File-by-File Analysis

### 5.1 `BE/src/index.js` — App Bootstrap

**Purpose:** The Express app entry point. Loads `.env`, configures middleware, mounts every router under `/api/*`, and attaches the 404 + error handlers.

**Connections:** Imports every router from `routes/*` and the two terminal middlewares. Reads `PORT` and `CORS_ORIGIN` from env.

**Key wiring:**
- `cors({ origin: CORS_ORIGIN, credentials: true })`
- `express.json({ limit: "10mb" })` so base64 images / large weather payloads pass.
- `morgan("dev")` for request logging.
- Route mounts (in order):
  - `/api/health`     → `health.js`
  - `/api/auth`       → `auth.js`
  - `/api/upload`     → `upload.js`
  - `/api/skin-tone`  → `skinTone.js`
  - `/api/analyze-user` → `appearance.js`
  - `/api/weather`    → `weather.js`
  - `/api/outfit`     → `outfit.js`
  - `/api/history`    → `history.js`
- `notFound` and `errorHandler` are attached **last** so unknown routes and thrown errors converge into the canonical `{ error: { message, status } }` JSON shape.

### 5.2 Routes (`BE/src/routes/*`)

Every router is a thin wiring layer that maps HTTP verbs to controller functions and inserts `requireAuth` where needed.

| File                 | Path                          | Verbs / Endpoints                                                                         |
|----------------------|-------------------------------|-------------------------------------------------------------------------------------------|
| `health.js`          | `/api/health`                 | `GET /` → `{status, service, timestamp}` (no auth)                                        |
| `auth.js`            | `/api/auth`                   | `POST /signup`, `POST /login` (public); `POST /logout`, `GET /me` (auth)                   |
| `upload.js`          | `/api/upload`                 | `POST /` (multer, 5 MB), `GET /signed-url?path=...`                                         |
| `skinTone.js`        | `/api/skin-tone`              | `POST /` `{ path }`                                                                       |
| `appearance.js`      | `/api/analyze-user`           | `POST /` `{ path }`                                                                       |
| `weather.js`         | `/api/weather`                | `POST /`, `POST /geocode`                                                                 |
| `outfit.js`          | `/api/outfit`                 | `POST /generate`, `POST /:id/preview`, `GET /:id/preview`                                  |
| `history.js`         | `/api/history`                | `GET /`, `GET /:id`, `DELETE /:id`, `PATCH /:id/favorite`                                  |

`upload.js` is the only router with custom error middleware: `handleMulterError` traps `MulterError` (e.g. `LIMIT_FILE_SIZE`) and converts it to JSON instead of HTML.

### 5.3 Controllers (`BE/src/controllers/*`)

#### `authController.js`
| Function | What it does | Called from |
|----------|-------------|-------------|
| `signup(req, res, next)` | Validates `email`/`password`, calls `supabaseAnon.auth.signUp` with `full_name` metadata, returns user + session. Returns 201. | `routes/auth.js` `POST /signup` |
| `login(req, res, next)` | Calls `supabaseAnon.auth.signInWithPassword`, returns 401 on bad creds. | `POST /login` |
| `logout(req, res, next)` | Reads `req.token` (set by `requireAuth`) and revokes that session via `supabaseAdmin.auth.admin.signOut(token)`. | `POST /logout` |
| `me(req, res)` | Returns `{ user: req.user }` (already populated by middleware). | `GET /me` |
| `badRequest(res, message)` | Helper that sends a 400 in canonical shape. | Internal |

#### `uploadController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `extFromMime(mime)` | Maps `image/jpeg|png|webp` to `jpg|png|webp`; falls back to `bin`. | `uploadPhoto` |
| `uploadPhoto(req, res, next)` | Validates `req.file`, MIME, builds path `<userId>/<uuid>.<ext>`, uploads via service role, signs URL for 1 h, returns metadata + signed URL. | `POST /api/upload` |
| `getSignedUrl(req, res, next)` | Reads `?path=...`, enforces ownership (`path.split('/')[0] === req.user.id`), creates a 1 h signed URL. **First line of IDOR defense.** | `GET /api/upload/signed-url` |

#### `skinToneController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `analyzeSkinTone(req, res, next)` | Validates `path` from body, enforces ownership, downloads bytes from Supabase Storage, calls `services/skinTone.detectSkinTone`, returns `{path, tone, hex, rgb, luminance, skinPixelRatio, method}`. | `POST /api/skin-tone` |

#### `appearanceController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `postAnalyzeUser(req, res, next)` | Same authorization pattern as skinTone. Downloads image, calls `services/appearance.analyzeAppearance`. If `result.status === "no_face"` returns **400 with `code: "NO_FACE_DETECTED"`** so the FE shows the "clear front-facing image" hint. Wraps OpenAI errors as **502** to distinguish from server bugs. | `POST /api/analyze-user` |

#### `weatherController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `sendUpstreamError(res, err)` | If `err instanceof WeatherHttpError`, responds with the upstream status + message. Otherwise returns `null` and the caller falls through to `next(err)`. | Both controllers below |
| `postWeather(req, res, next)` | Calls `getWeather({lat, lon, date, locationLabel})`. | `POST /api/weather` |
| `postGeocode(req, res, next)` | Calls `geocodeCity(query)`. | `POST /api/weather/geocode` |

#### `outfitController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `validateOptionalEnum(value, allowed, fieldName)` | Returns `null` if not provided, the value if valid, or `{error}` if invalid. | `postGenerateOutfit` (gender, ageGroup) |
| `pickNumber(value)` | Coerces to finite number or returns `null`. | `sanitizeWeather` |
| `sanitizeWeather(raw)` | Trust-but-validate the FE-supplied weather payload. Asserts `tempC` is finite, validates `bucket` and `condition` against allow-lists, slices long strings (`conditionLabel ≤ 80`, `locationLabel ≤ 120`, `timezone ≤ 80`, `date ≤ 10`). Returns `{error}` if invalid, otherwise the cleaned snapshot. | `postGenerateOutfit` |
| `postGenerateOutfit(req, res, next)` | Master controller: validates `skinTone`, `occasion`, optional `gender`/`ageGroup`/`weather`/`imagePath`, enforces ownership on `imagePath`, calls `generateOutfit(...)` (LLM), then `saveRecommendation(...)`. Persists `gender`/`ageGroup`/`weather` **inside `preferences` JSON** so no SQL migration was needed. Includes `id` and `is_favorite: false` in the response so the FE can show the heart immediately. OpenAI errors → **502**. | `POST /api/outfit/generate` |

#### `outfitPreviewController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `maybeSignedUrl(path)` | Calls `supabaseAdmin.storage.createSignedUrl(path, 3600)`; returns `null` on error or missing path. | `shapePreview`, both endpoints |
| `shapePreview(rec, signedUrl)` | Translates a DB row into the public preview shape `{id, status, imagePath, imageUrl, error, updatedAt}`. | Both endpoints |
| `runImageJob(recommendationId, userId)` | Background worker: marks `image_status=generating`, refetches the row, calls `generateOutfitImage`, marks `ready` with `outfit_image_path` or `failed` with `image_error`. | `setImmediate(...)` inside `postOutfitPreview` |
| `postOutfitPreview(req, res, next)` | **Idempotent:** returns existing row if `pending`, `generating`, or already `ready`; otherwise marks `pending` synchronously, kicks off `runImageJob` via `setImmediate`, responds **202 Accepted**. | `POST /api/outfit/:id/preview` |
| `getOutfitPreview(req, res, next)` | Polled by the FE every 3 s. Returns the latest row + a fresh signed URL when ready. | `GET /api/outfit/:id/preview` |

#### `historyController.js`
| Function | Purpose | Called from |
|----------|---------|-------------|
| `parsePositiveInt(value, fallback)` | Defensive int parsing. | `listHistory` |
| `parseFavoriteFlag(value)` | Maps `true|1|yes|on` to `true`, `false|0|no|off` to `false`, anything else to `null` (no filter). | `listHistory` |
| `listHistory(req, res, next)` | Reads `?limit`, `?offset`, `?favorite`. Builds Supabase query filtered by `user_id = req.user.id`, sorts `is_favorite DESC, created_at DESC` (backed by `003_favorites.sql` index), returns `{items, limit, offset, total}`. | `GET /api/history` |
| `setFavorite(req, res, next)` | Validates `body.favorite: boolean`, updates the row scoped by both `id` AND `user_id`. Returns 404 if no row matched. | `PATCH /api/history/:id/favorite` |
| `getHistoryItem(req, res, next)` | Single-row lookup scoped by `user_id`. | `GET /api/history/:id` |
| `deleteHistoryItem(req, res, next)` | Scoped delete; returns `{id, deleted: true}` or 404. | `DELETE /api/history/:id` |
| `saveRecommendation({...})` | Inserts a new `recommendations` row with `image_status: "idle"`. Throws on error so the caller can fall back gracefully. | `outfitController.postGenerateOutfit` |
| `getRecommendationForUser(id, userId)` | Used by the preview controller to refetch the row inside the background job. | `outfitPreviewController` |
| `updateImageStatus(id, patch)` | Patches the row and bumps `image_updated_at`. | `outfitPreviewController.runImageJob` |

### 5.4 Services (`BE/src/services/*`)

#### `supabase.js`
- Exports `supabaseAdmin` (service-role key — bypasses RLS, used for storage and token verification) and `supabaseAnon` (anon key — used for the BE's `signup`/`login` proxy).
- Warns at boot if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing.

#### `openai.js`
- Exports `openai` SDK instance configured with `OPENAI_API_KEY` and **optional `OPENAI_BASE_URL`**, so the same code targets OpenAI, Groq, OpenRouter, Together, etc.
- Exports `OPENAI_MODEL` (default `gpt-4o-mini`).

#### `openaiImage.js`
- Mirror of `openai.js` for image generation. Uses `IMAGE_API_KEY || OPENAI_API_KEY` and `IMAGE_BASE_URL`.
- Exports `openaiImage`, `IMAGE_MODEL` (default `gpt-image-1`), `IMAGE_SIZE` (default `1024x1536`).
- Reason for split: text providers like Groq don't host image models, so credentials may differ.

#### `skinTone.js`
- `isSkinPixel(r, g, b)` — Kovac et al. RGB rule (R>95, G>40, B>20, max-min>15, |R-G|>15, R>G, R>B). Filters background, hair, clothes.
- `detectSkinTone(imageBuffer)` — Pipeline:
  1. `sharp(...).resize(256, 256, { fit: "cover" })`
  2. `extract` central 60% (where faces sit in selfies)
  3. `removeAlpha().raw().toBuffer({ resolveWithObject: true })`
  4. Loop pixels, accumulate skin-only sums (`rSum`/`gSum`/`bSum`) and overall sums (`rAll`/...).
  5. If `skinCount ≥ 1% of crop` → use skin filter mean, else **central-mean fallback** (returned in `method`).
  6. BT.709 luminance `(0.2126·R + 0.7152·G + 0.0722·B) / 255`. `<0.4` dark, `<0.65` medium, else light.
  7. Returns `{tone, hex, rgb, luminance, skinPixelRatio, method}`.

#### `appearance.js`
- `analyzeAppearance(imageBuffer)`:
  1. `sharp.rotate()` honors EXIF (so faces aren't sideways) and resizes to `512x512` JPEG q80 to bound payload.
  2. Builds a `data:image/jpeg;base64,...` URL.
  3. Calls `openai.chat.completions.create` with the same `OPENAI_MODEL`, `temperature: 0`, `response_format: { type: "json_object" }`.
  4. System prompt asks for strict JSON `{faceDetected, gender, ageGroup, confidence, reason}` with explicit rules around demographics, low confidence (<0.7 for ambiguous), age buckets (`child` 0–12, `teenager` 13–19, `adult` 20+).
  5. Parses response, normalizes via allow-lists, clamps `confidence` to `[0,1]`, slices `reason` to 200 chars.
  6. Computes `status`: `"no_face"` if face missing or fields null, `"low_confidence"` if conf<0.7, else `"ok"`.

#### `outfit.js`
- `describeWeather(weather)` — assembles a multi-line block with temperature range/avg, feels-like, bucket, conditions, precipitation (>0), wind (≥20 km/h), humidity (≥80%), location, and a "Forecast for: <date>" line if not current.
- `buildUserMessage({...})` — joins gender, age group, skin tone (+hex), occasion, weather block, and preferences (`style`, `colorsLike`, `colorsAvoid`, `notes`) into a single user message.
- `generateOutfit(input)` — calls the LLM with a long system prompt that defines:
  - Output schema (`outfit.{top,bottom,footwear,accessories[]}`, exactly 3 hex `colors`, `explanation`).
  - Age-group guidance (child/teenager/adult).
  - Gender guidance.
  - Weather guidance (per-bucket dressing + rain/snow/thunder/fog/wind clauses).
  - "When weather and occasion clash" guidance.
  - `temperature: 0.8` for variety.
  - Validates required keys, `outfit.top`, `bottom`, `footwear`, `accessories` array, non-empty `colors`. Throws on malformed JSON.

#### `outfitImage.js`
- `describeSubject({gender, ageGroup, toneDesc})` picks the right archetype (`boy/girl/man/woman/person`) and avoids the redundant "adult man".
- `describeWeatherForImage(weather)` appends a short weather sentence to the prompt (e.g., "5°C, light rain").
- `buildImagePrompt({...})` — builds a clean photoreal prompt: full-body fashion editorial, single mannequin-styled subject, neutral light-grey backdrop, soft even lighting; lists Top/Bottom/Footwear/Accessories, palette, optional style hint, weather hint; explicitly says "no text, no watermark, no logo, no brand markings". Exported so it can be unit-tested or reused.
- `uploadPng({userId, base64})` — decodes base64, uploads to `<userId>/outfits/<uuid>.png` (note the **`/outfits/`** subfolder so user uploads and generated images don't collide).
- `parseSize(size)` — splits `"1024x1536"` etc.
- `generateBase64ViaOpenAI(prompt)` — calls `openaiImage.images.generate`, prefers `b64_json`, falls back to fetching the URL when only that's returned.
- `generateOutfitImage({userId, recommendation})` — reads `gender/ageGroup/weather` from `recommendation.preferences`, dispatches to **either** `huggingfaceImage.generateImageBase64` (default, free) or OpenAI based on `IMAGE_PROVIDER`, then `uploadPng`.

#### `huggingfaceImage.js`
- Posts to `https://router.huggingface.co/hf-inference/models/<HF_IMAGE_MODEL>` with `Accept: image/png` and `wait_for_model: true`.
- `callOnce(prompt, {width, height})` reads response body **once** (calling `.json()` then `.text()` on the same response throws), classifies errors, returns base64 of the PNG.
- `generateImageBase64(prompt, options)` — single retry on a 503 cold-start, sleeping for `estimated_time` (capped at 60 s).

#### `weather.js`
- Constants: `FORECAST_URL`, `GEOCODE_URL`, `MAX_FORECAST_DAYS = 15`, `WMO` table mapping weather codes to `[label, condition-bucket]`.
- `tempBucket(tempC)` — `≤0 freezing`, `≤10 cold`, `≤17 cool`, `≤23 mild`, `≤29 warm`, `else hot`.
- `describeWmo(code)` looks up `WMO[code]` or returns `{label: "Unknown", condition: "clear"}`.
- `isValidLat`, `isValidLon` — bounds checks.
- `normalizeDate(input)` — coerces to `YYYY-MM-DD` ISO; throws `HttpError(400)` on invalid.
- `class HttpError extends Error` with a `status` field. Re-exported as `WeatherHttpError`.
- `fetchJson(url)` — wraps fetch with **502 mapping** so upstream failures don't surface as 500s.
- `geocodeCity(query, {count = 5})` — input length ≥ 2, calls Open-Meteo geocoding, normalizes results to `{name, country, admin1, latitude, longitude, timezone, label}`.
- `getWeather({lat, lon, date, locationLabel})` — Validates coords, decides `current` vs `forecast` mode (rejects past dates and dates >15 days out), assembles the right query (current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day; forecast=daily min/max). For `forecast` mode, daily endpoint has no representative temperature so `tempC` is computed as the **midpoint of min/max** (with `tempMaxC` as fallback). Returns the canonical snapshot the rest of the system uses.

### 5.5 Middlewares (`BE/src/middlewares/*`)

| File | What it does |
|------|-------------|
| `requireAuth.js` | Reads `Authorization: Bearer <token>`, verifies with `supabaseAdmin.auth.getUser(token)`, attaches `req.user` and `req.token`, or returns 401 with the canonical error shape. |
| `errorHandler.js` | Final error sink — logs the error, returns `{error: {message, status}}`. |
| `notFound.js` | Catches unmatched routes with a clear `Route not found: <method> <url>`. |

### 5.6 SQL Migrations (`BE/migrations`)

- **`001_recommendations.sql`** — Creates `public.recommendations`. Columns: `id uuid pk`, `user_id uuid → auth.users(id) on delete cascade`, `image_path`, `skin_tone CHECK IN ('light','medium','dark')`, `skin_hex`, `occasion`, `preferences jsonb`, `outfit jsonb`, `colors jsonb`, `explanation`, `model`, `created_at`. Adds `(user_id, created_at desc)` index. Enables RLS with three per-user policies (select/insert/delete).
- **`002_outfit_image.sql`** — Adds `outfit_image_path`, `image_status` (default `idle`, CHECK in `('idle','pending','generating','ready','failed')`), `image_error`, `image_updated_at`. Drops & recreates the constraint safely via `DO $$` block.
- **`003_favorites.sql`** — Adds `is_favorite boolean default false`. Adds composite index `(user_id, is_favorite DESC, created_at DESC)` to back the "favorites first, recent first" sort. Adds an UPDATE RLS policy.

---

## 6. Frontend (FE) — File-by-File Analysis

### 6.1 App routes (`FE/app/**`)

#### `app/layout.tsx`
- Root layout. Sets `<html lang="en">`, imports `globals.css`, applies `font-sans antialiased`. Exports `metadata` (title, description).

#### `app/page.tsx`
- Public marketing home. Server component. Renders the gradient hero with "Get Started" → `/signup` and "Log In" → `/login`.

#### `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx`
- Both are **client components**. They render `<AuthForm mode="login|signup" onSubmit={...}>`, calling `signInWithEmail` / `signUpWithEmail` from `lib/auth.ts`.
- On signup, if Supabase returns a session immediately (auto-confirm enabled) → push to `/dashboard`; else `alert("Please check your email…")` + push to `/login`.
- `(auth)` is a [route group](https://nextjs.org/docs/app/building-your-application/routing/route-groups) — the parens prevent the segment from showing up in the URL.

#### `app/dashboard/page.tsx`
- Wrapped in `<ProtectedRoute>`. Shows current user email (fetched once via `supabase.auth.getUser()` inside `useEffect`), and three CTAs: Try Outfit Generator → `/upload`, View History → `/history`, Log out.

#### `app/upload/page.tsx` (Step 1 of 3)
- The most logic-heavy page. State variables:
  - `file`, `previewUrl`, `progress`, `uploading`, `result`, `error` (upload).
  - `analyzing`, `skinTone`, `skinToneError` (skin tone detection).
  - `appearance`, `appearanceOverridden`, `appearanceError`, `noFace` (appearance detection).
- `useEffect([file])` creates an `URL.createObjectURL(file)` for the preview and revokes it on cleanup.
- `handleUpload()` calls `uploadImage(file, setProgress)` then runs `detectSkinTone` and `analyzeAppearance` in **parallel via `Promise.allSettled`** (independent calls). Persists `upload`, `skinTone`, and `appearance` into the FlowState.
- Catches `ApiError` with `code === "NO_FACE_DETECTED"` to show an inline "Please upload a clear front-facing image" warning.
- `handleAppearanceChange(next)` sets `appearance.status="ok"` and `confidence=1` after manual override and persists to flow.
- `canContinue` gate: requires both `skinTone` and `appearance`, **and** if `appearance.status === "low_confidence"`, the user must have explicitly overridden before proceeding.

#### `app/occasion/page.tsx` (Step 2 of 3)
- Reads flow state on mount; redirects-via-render to a "Please upload first" card if `upload`/`skinTone` are missing.
- Local state for `occasion`, `style`, `colorsLike`, `colorsAvoid`, `notes`, `weather`, `submitting`.
- 9 occasions (`casual`, `office`, `dinner`, `wedding`, `mehndi`, `party`, `gym`, `beach`, `formal`) and 5 styles (`minimal`, `classic`, `bold`, `streetwear`, `boho`).
- `handleGenerate()` builds `preferences` object, calls `generateOutfit(...)`, stores the response in `sessionStorage["outfit-result-v1"]`, navigates to `/result`.
- Embeds `<WeatherCard value={weather} onChange={handleWeatherChange}>`.

#### `app/result/page.tsx` (Step 3 of 3)
- Reads `outfit-result-v1` from sessionStorage. If missing → "No result yet" card. While loading → spinner.
- Top header has `<FavoriteButton variant="chip">` (only when `result.id` exists), History link, Dashboard link.
- `<OutfitPreview recommendationId={result.id} />` triggers the image generation pipeline.
- Below: skin-tone swatch (using `getFlowState().skinTone.hex`), skin-tone label, occasion (capitalized), gender · ageGroup metadata if present, weather emoji + summary if present, color swatches.
- 4-card grid for top/bottom/footwear/accessories; "Why this works" card with the LLM explanation.
- "Start over" link wipes both sessionStorage keys.
- Inner `OutfitItem` helper component for the labeled card.

#### `app/history/page.tsx`
- Lists previous recommendations. PAGE_SIZE = 12.
- State: `items`, `total`, `offset`, `loading`, `error`, `deletingId`, `favoritesOnly`.
- `load(offset, favOnly)` calls `listHistory({limit, offset, favorite})` and updates state.
- `toggleFavoritesOnly()` re-queries with the new filter.
- `handleFavoriteChange(id, isFavorite)` updates the in-memory list **without refetching**; if the favorites filter is active and the item just got un-favorited, drops it and decrements `total`.
- `handleDelete(id)` `confirm()` → `deleteHistoryItem` → splice + decrement.
- Cards link to `/history/[id]`. Each has a `FavoriteButton variant="icon"` overlay (top-right), a `HistoryThumb`, occasion, tone label, top·bottom preview, and a Delete button.
- Pagination: prev/next disabled based on `offset` and `items.length < total`.

#### `app/history/[id]/page.tsx`
- Detail page. `useParams<{id}>()`, fetches via `getHistoryItem(id)` once. Cleanup uses a `cancelled` flag to avoid setting state after unmount.
- Renders `<OutfitPreview recommendationId={id} initial={...}>` (passing initial state to skip a duplicate POST when the image is already `ready`).
- Reference photo via `<HistoryThumb userImagePath={item.image_path}>`.
- Same skin-tone/occasion/colors header, four detail items, and "Why this works" copy.

### 6.2 Components (`FE/components/*`)

| File | Purpose | Key props / state |
|------|---------|-------------------|
| `AuthForm.tsx` | Login/signup form. Local state for `email`, `password`, `fullName`, `error`, `loading`. On submit calls the parent `onSubmit({email, password, fullName?})`. | `mode: "login" \| "signup"`, `onSubmit` |
| `ProtectedRoute.tsx` | Auth guard. Calls `supabase.auth.getSession()` once and subscribes to `onAuthStateChange`; redirects to `/login` if no session. Renders a centered spinner while checking. | `children` |
| `UploadDropzone.tsx` | Drag-and-drop or click-to-pick file input. Validates MIME (`jpeg/png/webp`) and 5 MB size **client-side** before invoking parent. Shows preview when `previewUrl` is provided. | `onFileSelected`, `disabled`, `previewUrl` |
| `SkinToneCard.tsx` | Renders the detected tone (light/medium/deep), the hex swatch, luminance, and tone-specific copy. Shows an "amber tip" if `method === "central-mean-fallback"`. | `result: SkinToneResult` |
| `AppearanceCard.tsx` | Shows detected gender + age (with emoji), a "Confidence X%" pill, and an "Override" button. When `needsConfirmation` is true, ring-amber + auto-expanded edit panel and "Please confirm" copy. Two pill rows (Gender, Age group). Calls `onChange({gender, ageGroup})`. | `gender`, `ageGroup`, `confidence`, `overridden`, `needsConfirmation`, `onChange` |
| `WeatherCard.tsx` | Three-mode card (`off`, `loading`, `ready`, `error`). Lets the user (a) "Use my location" via `navigator.geolocation`, (b) pick a date (today → +14 days), (c) search a city via the geocode endpoint. Displays the current snapshot with emoji + summary. | `value`, `onChange` |
| `OutfitPreview.tsx` | Owns the image-generation lifecycle. POSTs once (idempotent), then polls `getOutfitPreview` every 3 s until `ready`/`failed`. `startedFor` ref guards against StrictMode double-effect. Has retry on failure. | `recommendationId`, `initial?`, `className?` |
| `HistoryThumb.tsx` | Square thumbnail. Fetches a signed URL on mount for `outfitImagePath ?? userImagePath ?? path`. Shows shimmering placeholder while loading and a 👗 emoji fallback if missing/failed. | `outfitImagePath?`, `userImagePath?`, `path?`, `alt?` |
| `FavoriteButton.tsx` | Heart toggle. **Optimistic** UI flip with rollback on error. Two visual variants — `icon` (compact, used as overlay on history cards) and `chip` (labeled, used in detail/result headers). Notifies parent via `onChange(next)` so list state stays in sync without a refetch. | `id`, `initial`, `onChange?`, `variant?`, `className?` |

### 6.3 Library helpers (`FE/lib/*`)

| File | Exports / Role |
|------|----------------|
| `supabaseClient.ts` | Single shared `supabase` browser client. Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Only the anon key may be in the FE.** |
| `auth.ts` | `getSession()`, `getAccessToken()`, `signInWithEmail`, `signUpWithEmail`, `signOut`. Thin wrappers around Supabase auth. |
| `api.ts` | `apiFetch<T>(path, options)` — central wrapper around `fetch`. When `options.auth=true`, pulls `access_token` from Supabase and sets the `Authorization` header. Parses error bodies into `class ApiError extends Error { status, code?, details? }`. Used by every other client lib. |
| `upload.ts` | `uploadImage(file, onProgress)` — uses `XMLHttpRequest` (NOT fetch) for **upload progress events**, attaches the bearer token manually. Returns `UploadResult { url, path, bucket, size, mimeType }`. |
| `skinTone.ts` | `detectSkinTone(path)` → `SkinToneResult`. Type-only re-export of `SkinTone`. |
| `appearance.ts` | `analyzeAppearance(path)` → `AppearanceResult`. Types: `Gender`, `AgeGroup`, `AppearanceStatus`. |
| `weather.ts` | `getWeather(input)`, `geocode(query)`, `weatherEmoji`, `weatherSummary`. Defines `WeatherCondition`, `TempBucket`, `WeatherSnapshot`, `GeocodeResult`. |
| `outfit.ts` | `generateOutfit(input)` → `OutfitResponse`. Types: `Outfit`, `GenerateOutfitInput`. |
| `preview.ts` | `startOutfitPreview(id)`, `getOutfitPreview(id)`, `pollOutfitPreview(id, options)`. The `pollOutfitPreview` helper loops with `intervalMs` (default 3 s) until status is terminal or the `timeoutMs` (default 120 s) deadline is reached. Supports an `AbortSignal`. |
| `history.ts` | `listHistory({limit, offset, favorite})`, `getHistoryItem(id)`, `deleteHistoryItem(id)`, `setFavorite(id, favorite)`, `getSignedUrl(path)`. |
| `flow.ts` | The **session-scoped flow store**. Reads/writes `outfit-flow-state-v1` in `sessionStorage`. `getFlowState()`, `setFlowState(patch)` (shallow merge), `clearFlowState()`. Holds `upload`, `skinTone`, `appearance`, `weather`, `occasion`, `preferences`. |

### 6.4 Configuration files

- **`tailwind.config.ts`** — Brand color scale (50–900) tuned to a warm beige/brown palette. Custom box shadows (`brand`, `brand-lg`, `soft`, `inner-soft`), gradient backgrounds (`brand-gradient`, `brand-gradient-soft`, `page-glow`), and a `fade-in-up` keyframe animation reused across pages.
- **`next.config.mjs`** — `reactStrictMode: true`. Whitelists `*.supabase.co` and `res.cloudinary.com` in `images.remotePatterns` (Cloudinary is reserved but not yet used).
- **`tsconfig.json`** — Strict TS, `bundler` resolution, path alias `@/*` → root.
- **`globals.css`** — Tailwind layers + design system. Defines the page-shell utilities (`.page`, `.page-center`, `.container-narrow`, `.page-header`, `.page-title`), card utilities (`.card`, `.card-flat`), inputs (`.input`, `.label`), and a full button system (`.btn` + sizes `.btn-sm/md/lg/block` + variants `.btn-primary/secondary/soft/ghost/danger/icon`). The `.btn-primary::after` adds a subtle gloss on hover.

---

## 7. React Hooks Catalogue

| Hook                       | Where used                              | Why it's there |
|----------------------------|------------------------------------------|----------------|
| `useState`                 | Almost every client component           | Local UI state — form fields, fetched data, loading/error flags, optimistic toggles. |
| `useEffect`                | `app/upload/page.tsx`                   | Creates a blob URL for the file preview and revokes it on unmount/cleanup (prevents memory leaks). |
| `useEffect`                | `app/dashboard/page.tsx`                | Fetches the user's email once on mount. |
| `useEffect`                | `app/occasion/page.tsx`                 | Reads flow state on mount to determine if upload step is complete. |
| `useEffect`                | `app/result/page.tsx`                   | Reads `outfit-result-v1` from sessionStorage, sets `missing` if absent. |
| `useEffect`                | `app/history/page.tsx`                  | Initial `load(0)` of the first page. |
| `useEffect`                | `app/history/[id]/page.tsx`             | Fetches one history item by id; uses a `cancelled` flag to avoid setting state after unmount. |
| `useEffect`                | `components/ProtectedRoute.tsx`         | Bootstraps `getSession()` and subscribes to `onAuthStateChange`; cleans up the listener. |
| `useEffect`                | `components/HistoryThumb.tsx`           | Re-fetches the signed URL when `effectivePath` changes; cancellation flag. |
| `useEffect`                | `components/OutfitPreview.tsx`          | One-shot trigger of `startAndPoll()` per `recommendationId`. Uses a **`useRef`** to dedupe across StrictMode double-effects. |
| `useState` + optimistic    | `components/FavoriteButton.tsx`         | Flip the heart immediately, then call the API; roll back on failure. |
| `useState` + edit toggle   | `components/AppearanceCard.tsx`         | `editing` flag (auto-true when `needsConfirmation`). |
| `useRef`                   | `components/UploadDropzone.tsx`         | Reference to the hidden `<input type="file">` so the dropzone can trigger it on click. |
| `useRef<string>`           | `components/OutfitPreview.tsx`          | `startedFor` — guards against duplicate `startAndPoll` runs in React 18 StrictMode. |
| `useRouter`, `useParams`   | Client pages                            | Programmatic navigation (`router.push/replace`) and reading dynamic segments (`[id]`). |

There are **no custom hooks** in the codebase — all reusable behavior is encapsulated in `lib/*` async functions.

---

## 8. Component Hierarchy

```
RootLayout (app/layout.tsx)
├── HomePage (app/page.tsx)
├── LoginPage / SignupPage (app/(auth)/.../page.tsx)
│   └── AuthForm
├── DashboardPage (ProtectedRoute)
├── UploadPage (ProtectedRoute)         ← Step 1
│   ├── UploadDropzone
│   ├── SkinToneCard
│   └── AppearanceCard
├── OccasionPage (ProtectedRoute)       ← Step 2
│   └── WeatherCard
├── ResultPage (ProtectedRoute)         ← Step 3
│   ├── FavoriteButton  (variant="chip")
│   ├── OutfitPreview
│   └── OutfitItem      (inline)
├── HistoryPage (ProtectedRoute)
│   ├── HistoryThumb
│   └── FavoriteButton  (variant="icon")
└── HistoryDetailPage (ProtectedRoute)
    ├── OutfitPreview
    ├── HistoryThumb
    ├── FavoriteButton  (variant="chip")
    └── DetailItem      (inline)
```

`ProtectedRoute` wraps every authenticated page and handles redirect-to-login.

---

## 9. API Reference & Integration Map

> All endpoints are JSON. Errors come back as `{ error: { message, status, code?, details? } }`. The FE reads `body.error.message` in `lib/api.ts`.

| Endpoint                                | Method | Auth | Request body / query                                                                 | Response (success)                                              | Called from (FE file → function)                              |
|-----------------------------------------|--------|------|---------------------------------------------------------------------------------------|------------------------------------------------------------------|----------------------------------------------------------------|
| `/api/health`                           | GET    | —    | —                                                                                     | `{ status, service, timestamp }`                                 | manual / smoke test                                            |
| `/api/auth/signup`                      | POST   | —    | `{ email, password, fullName? }`                                                      | `{ user, session, message }`                                     | not used by FE — FE uses Supabase SDK directly (`lib/auth.ts`) |
| `/api/auth/login`                       | POST   | —    | `{ email, password }`                                                                 | `{ user, session }`                                              | not used by FE                                                 |
| `/api/auth/logout`                      | POST   | yes  | —                                                                                     | `{ message }`                                                    | not used by FE                                                 |
| `/api/auth/me`                          | GET    | yes  | —                                                                                     | `{ user }`                                                       | not used by FE                                                 |
| `/api/upload`                           | POST   | yes  | multipart `image` field, ≤ 5 MB                                                        | `{ url, path, bucket, size, mimeType, expiresIn }`               | `lib/upload.ts → uploadImage` (uses XHR for progress)          |
| `/api/upload/signed-url?path=`          | GET    | yes  | `path` query                                                                          | `{ url, path, expiresIn }`                                       | `lib/history.ts → getSignedUrl` → `HistoryThumb`               |
| `/api/skin-tone`                        | POST   | yes  | `{ path }`                                                                            | `{ path, tone, hex, rgb, luminance, skinPixelRatio, method }`    | `lib/skinTone.ts → detectSkinTone` ← `app/upload/page.tsx`     |
| `/api/analyze-user`                     | POST   | yes  | `{ path }`                                                                            | `{ path, gender, ageGroup, confidence, status, reason }`         | `lib/appearance.ts → analyzeAppearance` ← `app/upload/page.tsx` |
| `/api/weather`                          | POST   | yes  | `{ lat, lon, date?, locationLabel? }`                                                  | `WeatherSnapshot`                                                | `lib/weather.ts → getWeather` ← `WeatherCard`                  |
| `/api/weather/geocode`                  | POST   | yes  | `{ query }`                                                                           | `{ results: GeocodeResult[] }`                                   | `lib/weather.ts → geocode` ← `WeatherCard`                     |
| `/api/outfit/generate`                  | POST   | yes  | `{ skinTone, skinHex?, occasion, preferences?, imagePath?, gender?, ageGroup?, weather? }` | `OutfitResponse` (incl. `id`, `is_favorite: false`)               | `lib/outfit.ts → generateOutfit` ← `app/occasion/page.tsx`     |
| `/api/outfit/:id/preview`               | POST   | yes  | —                                                                                     | `OutfitPreview` (status pending\|generating\|ready\|failed)      | `lib/preview.ts → startOutfitPreview` ← `OutfitPreview`        |
| `/api/outfit/:id/preview`               | GET    | yes  | —                                                                                     | `OutfitPreview`                                                  | `lib/preview.ts → getOutfitPreview` ← `pollOutfitPreview`      |
| `/api/history`                          | GET    | yes  | `?limit, ?offset, ?favorite`                                                           | `{ items, limit, offset, total }`                                | `lib/history.ts → listHistory` ← `app/history/page.tsx`        |
| `/api/history/:id`                      | GET    | yes  | —                                                                                     | `HistoryItem`                                                    | `lib/history.ts → getHistoryItem` ← `app/history/[id]/page.tsx`|
| `/api/history/:id`                      | DELETE | yes  | —                                                                                     | `{ id, deleted: true }`                                          | `lib/history.ts → deleteHistoryItem`                           |
| `/api/history/:id/favorite`             | PATCH  | yes  | `{ favorite: boolean }`                                                                | `{ id, is_favorite }`                                            | `lib/history.ts → setFavorite` ← `FavoriteButton`              |

**External APIs called by the BE:**
- `https://api.open-meteo.com/v1/forecast` — weather (no auth).
- `https://geocoding-api.open-meteo.com/v1/search` — geocoding (no auth).
- `https://router.huggingface.co/hf-inference/models/<HF_IMAGE_MODEL>` — image generation (Bearer `HF_API_KEY`).
- OpenAI-compatible chat + images (any provider via `OPENAI_BASE_URL` / `IMAGE_BASE_URL`).
- `supabaseAdmin.auth.getUser`, `.storage.from(bucket).upload/createSignedUrl/download`, `.from('recommendations').*`.

---

## 10. State Management & Data Flow

There is **no Redux, no Zustand, no React Context**. State is layered by lifetime:

| Layer                                  | What it holds                                                                                                  | Lifetime         |
|----------------------------------------|----------------------------------------------------------------------------------------------------------------|------------------|
| Component `useState`                   | Form fields, async loading flags, page-local UI state                                                          | Component mount  |
| `sessionStorage["outfit-flow-state-v1"]` (`lib/flow.ts`) | The multi-step flow context (`upload`, `skinTone`, `appearance`, `weather`, `occasion`, `preferences`) | Single browser tab |
| `sessionStorage["outfit-result-v1"]`   | The full `OutfitResponse` returned from `/api/outfit/generate` so `/result` can render it without a refetch    | Single tab       |
| Supabase session (browser)             | `access_token`, `refresh_token` — managed by `@supabase/supabase-js` automatically                              | Persistent       |
| Postgres `recommendations` row         | Saved outfits, favorites, image generation status                                                              | Persistent       |
| Supabase Storage object                | User's uploaded photo (`<userId>/<uuid>.<ext>`) and generated outfit (`<userId>/outfits/<uuid>.png`)            | Persistent       |

**Why sessionStorage instead of Context?**
- Each step is a separate route. Context would require lifting state above the App Router tree (a Provider in `RootLayout`).
- A page refresh during the flow would wipe Context state. sessionStorage survives refresh but clears with the tab — exactly the desired UX.
- Trade-off: client-only (`typeof window === "undefined"` guard returns `{}` during SSR).

**Data flow for the happy path:**
```
upload page          → setFlowState({upload, skinTone, appearance})
   ↓ Continue
occasion page        → setFlowState({weather, occasion, preferences})
   ↓ Generate
POST /api/outfit/generate (uses flow state)
   ↓
sessionStorage["outfit-result-v1"] = OutfitResponse
   ↓ navigate
result page          → reads outfit-result-v1, kicks off /preview
                     → also reads getFlowState().skinTone.hex for the swatch
```

---

## 11. Important Logic, Optimizations & Tricky Parts

1. **Per-user path scoping (IDOR defense).** Every endpoint that accepts a storage `path` from the client checks `path.split("/")[0] === req.user.id` before operating on it (`uploadController.getSignedUrl`, `skinToneController.analyzeSkinTone`, `appearanceController.postAnalyzeUser`, `outfitController.postGenerateOutfit`). Without this, a user could reference somebody else's photo.

2. **Two Supabase clients on the BE.** `supabaseAdmin` (service role) bypasses RLS and is used for storage / token verification. `supabaseAnon` is used by the BE's `/api/auth/*` proxy. RLS policies on `recommendations` are still installed as **defense-in-depth** even though service-role bypasses them.

3. **Skin-tone heuristic, not face-api.js.** Despite the README's tech-stack mention, `services/skinTone.js` is a pure `sharp` + Kovac-RGB pipeline. If <1% of the central crop passes the skin filter, it falls back to the central-region mean and the `method` field flips to `"central-mean-fallback"` so the FE can show an "upload a clearer photo" tip.

4. **Reusing the LLM for vision.** `services/appearance.js` calls the same OpenAI-compatible chat completion (just `response_format: json_object`, `temperature: 0`, and a vision input) instead of bundling face-api.js. Saves a heavy dependency and avoids an additional model.

5. **EXIF-aware preprocessing.** `sharp(...).rotate()` honors EXIF orientation in `appearance.js` so phone-shot portraits don't arrive sideways at the model.

6. **Trust-but-validate weather payload.** The FE has already called `/api/weather` so the BE doesn't re-fetch on `/api/outfit/generate`. Instead, `sanitizeWeather()` clamps types, slices long strings, and validates buckets/conditions against allow-lists (so a malformed payload can't poison the LLM prompt or `JSON.stringify` the persist).

7. **Persisting gender/ageGroup/weather inside `preferences` JSON.** The `recommendations.preferences` JSONB column carries them — no SQL migration was needed. `outfitImage.generateOutfitImage` reads them back from the same column to build the prompt.

8. **Idempotent preview start + background worker.** `POST /api/outfit/:id/preview` sets `image_status='pending'` synchronously, schedules `runImageJob` via `setImmediate`, and immediately returns 202. Subsequent POSTs short-circuit when status is `pending`/`generating`, and return the signed URL when `ready`. This makes the FE polling story safe even with React 18 StrictMode double-effects.

9. **StrictMode double-effect guard in `OutfitPreview.tsx`.** A `useRef<string>(startedFor)` records which `recommendationId` already triggered `startAndPoll()`. React 18 mounts effects twice in dev; without this guard you'd POST twice (still safe due to BE idempotency, but wasteful). Retry resets the ref.

10. **Optimistic favorites.** `FavoriteButton` flips local state synchronously, then calls `setFavorite(id, next)`. On failure it rolls back AND notifies the parent via `onChange`, so list state remains consistent.

11. **Composite index for "favorites first, recent first"**. `003_favorites.sql` adds `(user_id, is_favorite DESC, created_at DESC)`. `historyController.listHistory` orders by `is_favorite DESC, created_at DESC` — the index is exactly that shape so the sort is index-only.

12. **OpenAI errors → 502 (not 500).** Both `outfitController.postGenerateOutfit` and `appearanceController.postAnalyzeUser` detect SDK error objects (`err.status && err.error`) and remap them to 502 so the FE can distinguish upstream AI failures from genuine server bugs.

13. **HF cold-start retry.** `huggingfaceImage.generateImageBase64` retries once on a 503 with `estimated_time`, sleeping the suggested duration capped at 60 s. Avoids a flaky first request when the model is loading.

14. **Reading the HF response body once.** `await res.text().catch(...)` then `JSON.parse(text)` — calling `.json()` then `.text()` on the same `Response` would throw because the body stream is already consumed. Subtle pitfall.

15. **Daily forecast → midpoint temperature.** Open-Meteo's daily endpoint returns no representative temperature. `services/weather.js` synthesizes one as `(min + max) / 2` (or just `max` if `min` is missing) so `tempBucket()` and the prompt have something to reason about.

16. **`buildImagePrompt` weather hint.** Beyond the LLM, the **image** prompt also gets a short "Weather context: X°C, light rain — render the outfit consistent…" line so the rendered mannequin actually shows a coat for cold scenes.

17. **Storage path namespacing.** Generated outfit images go to `<userId>/outfits/<uuid>.png`, distinct from user uploads at `<userId>/<uuid>.<ext>`. Same ownership prefix so the IDOR check still works, but you can list "outfits/" if you ever need a user-only gallery.

18. **`Promise.allSettled` for parallel detection.** `app/upload/page.tsx → handleUpload` runs `detectSkinTone` and `analyzeAppearance` in parallel because they're independent. `allSettled` (not `all`) means one failure doesn't blow away the other result.

19. **`useEffect([file])` revoke pattern.** `URL.createObjectURL(file)` returns a URL backed by an in-memory blob; without `URL.revokeObjectURL` on cleanup, you'd leak memory each time the user picks a new file.

20. **Two routes, one product.** `app/(auth)/login` and `app/(auth)/signup` share the `(auth)` route group **without** changing the URL — letting them share styling concerns through the file structure if needed, while staying at `/login` and `/signup` publicly.

---

## 12. Feature Traceability Matrix

> "This feature is implemented where?" — exact pointers.

| Feature                                       | File(s) / Function(s)                                                                                                                                       |
|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| User signup / login (FE direct to Supabase)   | `FE/lib/auth.ts → signUpWithEmail/signInWithEmail`, called from `FE/app/(auth)/{login,signup}/page.tsx`                                                       |
| User signup / login (BE proxy, optional)      | `BE/src/controllers/authController.js → signup/login`, routed in `BE/src/routes/auth.js`                                                                     |
| Auth guard on protected pages                 | `FE/components/ProtectedRoute.tsx` (wraps every authenticated page)                                                                                          |
| Authorization header on every BE call         | `FE/lib/api.ts → apiFetch(..., { auth: true })` reads the access token via `lib/auth.ts → getAccessToken`                                                    |
| BE token verification & per-user scoping      | `BE/src/middlewares/requireAuth.js` → attaches `req.user`, `req.token`                                                                                       |
| File upload with progress                     | `FE/lib/upload.ts → uploadImage` (XHR), `FE/components/UploadDropzone.tsx`, `FE/app/upload/page.tsx → handleUpload`                                          |
| Server-side upload + signed URL               | `BE/src/controllers/uploadController.js → uploadPhoto/getSignedUrl`, multer config in `BE/src/routes/upload.js`                                              |
| MIME / size validation (client + server)      | `UploadDropzone.tsx → validateAndPick` and `uploadController.js → ALLOWED_MIME` + multer `limits.fileSize`                                                    |
| 5 MB-friendly error JSON (instead of HTML)    | `BE/src/routes/upload.js → handleMulterError`                                                                                                                |
| Skin-tone detection (heuristic)               | `BE/src/services/skinTone.js → detectSkinTone`, called by `BE/src/controllers/skinToneController.js → analyzeSkinTone` from `FE/lib/skinTone.ts`             |
| Skin-tone UI (badge, swatch, copy)            | `FE/components/SkinToneCard.tsx`                                                                                                                             |
| Gender + age detection (vision LLM)           | `BE/src/services/appearance.js → analyzeAppearance`, controller in `BE/src/controllers/appearanceController.js`                                              |
| "No face" UX                                  | Controller returns `code: "NO_FACE_DETECTED"`; `FE/app/upload/page.tsx` reads `ApiError.code` and shows the amber prompt                                     |
| Manual override of detected gender/age        | `FE/components/AppearanceCard.tsx`, `FE/app/upload/page.tsx → handleAppearanceChange`                                                                        |
| Weather card (geolocation, search, date pick) | `FE/components/WeatherCard.tsx`, `FE/lib/weather.ts`                                                                                                          |
| Weather forecast / geocoding                  | `BE/src/services/weather.js → getWeather/geocodeCity`, controller in `BE/src/controllers/weatherController.js`                                               |
| Open-Meteo provider                           | URLs in `BE/src/services/weather.js (FORECAST_URL, GEOCODE_URL)`; WMO mapping in same file                                                                   |
| Occasion + style picker                       | `FE/app/occasion/page.tsx → OCCASIONS`, `STYLES` constants                                                                                                   |
| Multi-step flow state (upload → occasion → result) | `FE/lib/flow.ts → getFlowState/setFlowState/clearFlowState` (sessionStorage `outfit-flow-state-v1`)                                                       |
| LLM outfit generation                         | `BE/src/services/outfit.js → generateOutfit` + `SYSTEM_PROMPT`, controller `BE/src/controllers/outfitController.js → postGenerateOutfit`                     |
| Persistence of recommendations                | `BE/src/controllers/historyController.js → saveRecommendation`, table `public.recommendations` (`BE/migrations/001_recommendations.sql`)                     |
| Result page rendering                         | `FE/app/result/page.tsx`                                                                                                                                     |
| Outfit preview image generation               | `BE/src/services/outfitImage.js → buildImagePrompt/generateOutfitImage`, providers `BE/src/services/huggingfaceImage.js` and `BE/src/services/openaiImage.js` |
| Async preview lifecycle (idle/pending/generating/ready/failed) | `BE/src/controllers/outfitPreviewController.js`, columns added by `BE/migrations/002_outfit_image.sql`                                                  |
| Polling preview from FE                       | `FE/lib/preview.ts → pollOutfitPreview`, used by `FE/components/OutfitPreview.tsx`                                                                           |
| Reference photo / outfit thumbnail            | `FE/components/HistoryThumb.tsx` (signs URLs on demand)                                                                                                      |
| History list with pagination & favorites filter | `FE/app/history/page.tsx`, `BE/src/controllers/historyController.js → listHistory`, index in `BE/migrations/003_favorites.sql`                              |
| History detail page                           | `FE/app/history/[id]/page.tsx`, `getHistoryItem`/`deleteHistoryItem` in `lib/history.ts`                                                                     |
| Favorite toggle (optimistic)                  | `FE/components/FavoriteButton.tsx`, BE writer `historyController.setFavorite` (`PATCH /api/history/:id/favorite`)                                            |
| Centralized error shape `{error:{message,status}}` | `BE/src/middlewares/errorHandler.js`, `BE/src/middlewares/notFound.js`; consumed by `FE/lib/api.ts → ApiError`                                              |
| Provider-agnostic LLM                         | `BE/src/services/openai.js` (uses optional `OPENAI_BASE_URL`)                                                                                                |
| Provider switch for image gen                 | `BE/src/services/outfitImage.js → PROVIDER` (`huggingface` | `openai`, env `IMAGE_PROVIDER`)                                                                  |

---

## 13. Environment Configuration

Both packages need their own env file before they'll work.

**`BE/.env`** (template at `BE/.env.example`):
- `PORT`, `NODE_ENV`, `CORS_ORIGIN`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` (optional, for non-OpenAI providers)
- `IMAGE_PROVIDER` (`huggingface` | `openai`), `IMAGE_SIZE`
- `HF_API_KEY`, `HF_IMAGE_MODEL`
- `IMAGE_API_KEY`, `IMAGE_BASE_URL`, `IMAGE_MODEL` (only needed when `IMAGE_PROVIDER=openai` against a different account)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (scaffolded, not yet used)

**`FE/.env.local`**:
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:5000/api`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (only the anon key may live here)

> **Critical security split:** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-only. Anything prefixed `NEXT_PUBLIC_*` is bundled into the browser.

---

## 14. Continuous Update Mode (How to Append)

When new code is added or features change, **append** new entries instead of rewriting:

1. **New file** → Add a row to the relevant table in §5 (BE) or §6 (FE), and link it from the file-by-file analysis.
2. **New endpoint** → Add a row to the API table in §9, and document the controller/service in §5.
3. **New React component** → Add it to §6.2, update the hierarchy in §8, and add hooks to §7.
4. **New env var** → Add it to §13 *and* `README.md` (project rule).
5. **New tricky logic / optimization** → Add a numbered item at the end of §11.
6. **New traceable feature** → Add a row at the end of §12.
7. **Schema migration** → Add to §5.6 in numbered order; mention any column read paths in the relevant controller entry.

Keep the existing wording for unchanged sections; only add deltas. If something is renamed or removed, leave a one-line note like *"`xxx` removed in commit `<sha>` — see §N for the replacement."*

---

## 15. Possible Interview Questions From This Project

> Use these as a study set. Each answer is grounded in the actual code — file/function references included.

### Architecture & design

1. **Q: Why split FE and BE into two packages instead of putting it all in Next.js API routes?**
   A: The BE handles server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) and does long-running work (image generation can take 15–30 s, see `outfitPreviewController.runImageJob`). Keeping it as Express makes it deployable independently (e.g., a separate VM or container) and lets us scale the AI worker without scaling the Next.js front. Auth happens FE-direct against Supabase (`lib/auth.ts`), so no extra hop for the common path; only privileged work goes through the BE.

2. **Q: How does authentication actually work end-to-end?**
   A: The browser uses `@supabase/supabase-js` with the anon key (`FE/lib/supabaseClient.ts`). Sign-in returns a JWT access token. Every BE call goes through `FE/lib/api.ts → apiFetch(..., { auth: true })`, which reads `session.access_token` and sets `Authorization: Bearer <token>`. On the BE, `requireAuth` middleware (`BE/src/middlewares/requireAuth.js`) verifies the token via `supabaseAdmin.auth.getUser(token)` and attaches `req.user`. There's also a BE proxy (`/api/auth/*`) that wraps the same Supabase calls — both paths produce the same Supabase session.

3. **Q: How do you prevent one user from accessing another user's photo?**
   A: Three layers. (1) The Supabase Storage bucket is **private**; objects are served only via signed URLs. (2) The path convention is `<userId>/<uuid>.<ext>` and every endpoint that takes a `path` from the client checks `path.split("/")[0] === req.user.id` (see `uploadController.getSignedUrl`, `skinToneController.analyzeSkinTone`, `appearanceController.postAnalyzeUser`, `outfitController.postGenerateOutfit`). (3) The `recommendations` table has RLS policies (`001_recommendations.sql`) so even if someone queried with the anon key, they couldn't read others' rows.

### LLM & vision

4. **Q: Why didn't you use face-api.js for skin tone or age/gender detection?**
   A: Skin tone is a pure RGB heuristic in `services/skinTone.js` — Kovac et al. rules pick out skin pixels, then BT.709 luminance buckets the average into light/medium/dark. It's deterministic, ships zero ML model bytes to the server, and runs in ~50 ms with `sharp`. Gender + age use the same OpenAI-compatible vision model (`services/appearance.js`) the outfit generator already uses; we get one provider, one bill, EXIF-aware preprocessing, and a structured JSON response without bundling face-api.js's WASM models.

5. **Q: How do you keep the LLM provider swappable?**
   A: `services/openai.js` instantiates the SDK with optional `OPENAI_BASE_URL`. Pointing it at Groq, OpenRouter, or Together changes only the URL and the model name. The same is true for image generation — `services/openaiImage.js` reuses the SDK pattern, and `services/outfitImage.js` switches between Hugging Face and OpenAI based on `IMAGE_PROVIDER`. No code changes; only env vars.

6. **Q: How do you make sure the LLM returns parseable output?**
   A: We pass `response_format: { type: "json_object" }` and a system prompt that explicitly says "Return ONLY valid JSON … no prose, no markdown, no code fences." `services/outfit.js` then `JSON.parse`s the response and **validates** that `outfit.{top,bottom,footwear,accessories}`, a non-empty `colors` array, and `explanation` are present. If anything's missing it throws — the controller maps that to a 502. Same approach for appearance detection in `services/appearance.js`.

### Async / image preview

7. **Q: Walk me through how the outfit preview image gets generated.**
   A: After `/api/outfit/generate` saves the row, the FE renders `<OutfitPreview recommendationId={id}/>` (`components/OutfitPreview.tsx`). On mount it POSTs `/api/outfit/:id/preview` once. The controller (`outfitPreviewController.postOutfitPreview`) sets `image_status='pending'` synchronously and kicks off `runImageJob` via `setImmediate`, returning **202** immediately. The job updates the row to `generating`, builds a prompt from the recommendation + stashed gender/ageGroup/weather, calls Hugging Face (or OpenAI), uploads the PNG to `<userId>/outfits/<uuid>.png`, and writes `image_status='ready'` with the path. The FE polls `GET /api/outfit/:id/preview` every 3 s until it sees `ready` or `failed`, with a 120 s timeout (`lib/preview.ts → pollOutfitPreview`).

8. **Q: What happens if a user double-clicks the page or React StrictMode runs the effect twice?**
   A: Two protections. On the BE, `postOutfitPreview` is **idempotent** — it returns the existing row when status is `pending`/`generating`/`ready` rather than starting a new job. On the FE, `OutfitPreview` keeps a `useRef<string>(startedFor)` to track which `recommendationId` already triggered `startAndPoll`, so the second StrictMode mount no-ops.

9. **Q: How does a 503 cold-start from Hugging Face get handled?**
   A: `services/huggingfaceImage.js → generateImageBase64` does one retry. On a 503 with `estimated_time`, it sleeps `min(estimated_time * 1000, 60_000)` ms and retries once. There's also a subtle gotcha — the response body can only be read once, so the error path uses `await res.text().catch(...)` then `JSON.parse(text)` instead of calling `.json()` and `.text()` separately (which would throw "body already consumed").

### Data model

10. **Q: Why is `is_favorite` a real column and not nested in `preferences`?**
    A: We sort and filter on it (favorites-first ordering, `?favorite=true` filter, see `historyController.listHistory`). JSONB filters can't share an index, but the composite B-tree `(user_id, is_favorite DESC, created_at DESC)` from `003_favorites.sql` gives an index-only sort.

11. **Q: Then why ARE gender, ageGroup, and weather nested in `preferences`?**
    A: They're not predicates — we never sort or filter on them. Stuffing them into the existing JSONB column avoided a schema migration. They're written in `outfitController.postGenerateOutfit` (look at `persistedPreferences`) and read back in `outfitImage.generateOutfitImage` to build the image prompt. If we ever needed to query by them, we'd promote them to real columns.

### State management

12. **Q: There's no Redux. How does state survive across the multi-step flow?**
    A: `lib/flow.ts` writes to `sessionStorage` under `outfit-flow-state-v1` with a shallow-merge `setFlowState(patch)`. Each page reads what it needs on mount. The `OutfitResponse` itself goes into a separate `outfit-result-v1` key so the result page can render before any network. sessionStorage clears with the tab — that's exactly the desired UX for a one-off styling session.

13. **Q: Trade-offs of sessionStorage vs Context API here?**
    A: Context would either need a Provider in `RootLayout` (lifting the state above the App Router tree, complicating Server Components) or per-step prop drilling. SessionStorage gives us refresh-survival "for free" and decouples pages cleanly. The downside is it's client-only — you have a `typeof window === "undefined"` guard in `getFlowState` for SSR.

### UX / FE specifics

14. **Q: How does the favorite button feel instant despite a network roundtrip?**
    A: `FavoriteButton.tsx` uses optimistic UI — it flips local state synchronously on click, fires the PATCH, and on failure rolls back AND notifies the parent via `onChange`. The history list takes that callback and updates its in-memory list without a refetch, dropping items if the favorites filter is on and the item just got un-favorited.

15. **Q: Why does the file uploader use XHR instead of fetch?**
    A: Native `fetch` doesn't expose upload-progress events. We need a real-time progress bar on the upload page. `lib/upload.ts → uploadImage` uses `XMLHttpRequest` with `xhr.upload.onprogress` to compute the percent. The token is set on the request manually since `auth: true` is an `apiFetch` concept.

16. **Q: Why `Promise.allSettled` on the upload page?**
    A: Skin-tone detection and appearance detection are independent — they share the same uploaded image but have no inter-dependency. Running them in parallel halves perceived latency, and `allSettled` (vs `all`) means a failure in one doesn't lose the other's result.

### API design

17. **Q: Why do you map OpenAI errors to 502 instead of 500?**
    A: 500 means "server bug." 502 is "bad gateway" — an upstream dependency failed. The FE distinguishes them: a 502 with a clear message is something the user can retry; a 500 needs a real fix. See the catch blocks in `outfitController.postGenerateOutfit` and `appearanceController.postAnalyzeUser`.

18. **Q: How is the BE error shape kept consistent?**
    A: All controllers return `{ error: { message, status, code?, details? } }`. The terminal middlewares (`errorHandler`, `notFound`) emit the same shape. The FE has a single `class ApiError extends Error` that reads it (`lib/api.ts`). Adding a new endpoint just means following the convention; consumers don't need special-casing.

### Security

19. **Q: What stops someone from calling `/api/weather` to use you as an open proxy to Open-Meteo?**
    A: Both `/api/weather` and `/api/weather/geocode` sit behind `requireAuth` (see comment in `routes/weather.js`). Open-Meteo doesn't have per-key billing, but locking it down avoids the "free proxy for anyone" surface.

20. **Q: How does `requireAuth` know who the user is?**
    A: It pulls `Authorization: Bearer <token>`, calls `supabaseAdmin.auth.getUser(token)` (which validates the JWT against Supabase's signing key + checks the session is alive), and on success attaches `req.user` (the full Supabase user object) and `req.token` to the request. Every protected controller then scopes queries by `req.user.id`.

### "What would you change?"

21. **Q: What's the biggest piece of tech debt right now?**
    A: A few candidates: (a) the README mentions `face-api.js` and `Cloudinary` that aren't actually wired (see `CLAUDE.md → README vs reality`); (b) there's no test runner — only manual smoke tests; (c) the `(auth)` proxy endpoints on the BE are unused by the FE but still exposed; (d) image generation is a fire-and-forget worker — no retry-on-failure beyond the FE's manual "Try again" button. If I had to ship one fix, it'd be a job table + a small cron retry for stuck `generating` rows.

22. **Q: How would you scale the image generation pipeline?**
    A: Today it runs in-process via `setImmediate` — fine for one box, but a server restart loses in-flight jobs. I'd push the work onto a queue (BullMQ on Redis, or pg-boss using the same Postgres). Workers consume jobs, write `image_status=ready/failed` back. The HTTP layer becomes purely "enqueue" + "poll DB," which scales horizontally and survives restarts.

---

*Last updated from a full read of the codebase on 2026-05-05.*
