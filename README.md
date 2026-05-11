# AI Outfit Generator — Smart Fashion Assistant

A full-stack AI-powered web application that recommends personalized outfits based on a user's photo, skin tone, occasion, and personal preferences. Upload a picture, pick where you're going, and let the AI suggest the perfect look — colors, accessories, and the reasoning behind every choice.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Folder Structure](#4-folder-structure)
5. [Setup Instructions](#5-setup-instructions)
6. [Environment Variables](#6-environment-variables)
7. [API Endpoints](#7-api-endpoints)
8. [Third-Party Services & Keys Used](#8-third-party-services--keys-used)
9. [Development Workflow](#9-development-workflow)
10. [Future Improvements](#10-future-improvements)

---

## 1. Project Overview

**AI Outfit Generator** is a smart fashion assistant that combines computer vision and large language models to deliver context-aware outfit recommendations.

The flow is simple:

1. User signs up / logs in.
2. Uploads a clear photo of themselves.
3. Selects an **occasion** (wedding, casual hangout, office, mehndi, gym, etc.) and optional **preferences** (style, budget, color likes/dislikes).
4. The backend detects the user's face, classifies skin tone, and forwards everything to an LLM.
5. The AI returns a structured outfit plan — top, bottom, footwear, accessories, color palette, and a short stylistic explanation.
6. Past recommendations are saved to the user's history.

The goal is a **production-ready** application with clean architecture, secure authentication, persistent storage, and a polished modern UI.

---

## 2. Features

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Project Setup** | Next.js frontend, Express backend, Supabase connection ready. |
| 2 | **Authentication** | Sign up / log in with Supabase Auth, protected routes, session handling. |
| 3 | **Image Upload** | Securely upload user photos to Supabase Storage (or Cloudinary), return a hosted URL. |
| 4 | **Skin Tone Detection** | Detect a face from the uploaded image and classify skin tone as `light` / `medium` / `dark`. |
| 5 | **AI Outfit Engine** | Send skin tone + occasion + preferences to an LLM, return a structured outfit recommendation. |
| 6 | **Modern Frontend UI** | Upload page, occasion selector, animated result cards, loaders, and smooth transitions. |
| 7 | **History System** | Persist every recommendation to Supabase and let users revisit past suggestions. |

### Advanced Features (Phase 2)

- **Weather-based suggestions** — adapt outfit to the user's current city weather.
- **Cultural mode** — wedding, mehndi, eid, formal, traditional contexts.
- **Outfit preview images** — AI-generated or static lookbook references for each suggestion.
- **Favorites / Saved looks** — users can star outfits they want to keep.
- **Shareable result links** — generate a public, read-only link for any saved outfit (with OG previews for social platforms). Owners can revoke at any time.
- **Wardrobe mode** — upload your own clothing items; turn on wardrobe-only mode to get outfits picked exclusively from what you own. AI auto-classifies category, name, colors, and attributes from each photo.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router), React, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Database & Auth** | Supabase (Postgres + Auth) |
| **Image Storage** | Supabase Storage *(default)* / Cloudinary *(optional)* |
| **AI / LLM** | OpenAI API *(or any compatible LLM endpoint)* |
| **Image Processing** | face-api.js *(or sharp + a tone-sampling routine)* |
| **HTTP Client** | Axios / Fetch |
| **State / Forms** | React hooks, server actions where appropriate |
| **Validation** | Zod (backend), simple client-side validation |
| **Deployment (planned)** | Vercel (FE), Render / Railway (BE) |

---

## 4. Folder Structure

```
AI-Outfit-Generator/
│
├── FE/                          # Next.js frontend
│   ├── app/                     # App Router pages
│   │   ├── (auth)/login/
│   │   ├── (auth)/signup/
│   │   ├── upload/
│   │   ├── result/
│   │   ├── history/
│   │   └── layout.tsx
│   ├── components/              # Reusable UI components
│   ├── lib/                     # Supabase client, API helpers
│   ├── public/
│   ├── styles/
│   ├── .env.local
│   ├── package.json
│   └── tailwind.config.js
│
├── BE/                          # Express backend
│   ├── src/
│   │   ├── routes/              # auth, upload, skin-tone, outfit, history
│   │   ├── controllers/
│   │   ├── services/            # supabase, openai, faceDetection
│   │   ├── middlewares/         # auth, error handler, rate limit
│   │   ├── utils/
│   │   └── index.js             # Express entry
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 5. Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **pnpm**
- A **Supabase** project (free tier is fine)
- An **OpenAI API key** (or compatible LLM)
- *(Optional)* A **Cloudinary** account if you prefer it over Supabase Storage

### Step 1 — Clone the repository

```bash
git clone https://github.com/<your-username>/AI-Outfit-Generator.git
cd AI-Outfit-Generator
```

### Step 2 — Backend setup

```bash
cd BE
npm install
cp .env.example .env       # then fill in real values
npm run dev                # starts Express on http://localhost:5000
```

### Step 3 — Frontend setup

Open a new terminal:

```bash
cd FE
npm install
cp .env.example .env.local # then fill in real values
npm run dev                # starts Next.js on http://localhost:3000
```

### Step 4 — Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. From **Project Settings → API**, copy the **Project URL**, **anon key**, and **service_role key**.
3. Run the SQL migrations from `BE/migrations/` in the Supabase SQL editor:
   - `001_recommendations.sql` — creates the `recommendations` table used by the History feature, with per-user RLS policies.
   - `002_outfit_image.sql` — adds `outfit_image_path`, `image_status`, `image_error`, `image_updated_at` columns used by the visual outfit preview feature.
   - `003_favorites.sql` — adds `is_favorite` column + composite index for the Favorites feature, plus an `update` RLS policy.
   - `004_share_token.sql` — adds the nullable `share_token` column + unique partial index for the Shareable Links feature.
   - `005_wardrobe.sql` — creates the `wardrobe_items` table + RLS policies for the Wardrobe Mode feature.
4. Create a **private** storage bucket named `user-photos`.
5. Enable email/password auth under **Authentication → Providers**.

### Step 5 — Run the app

Visit `http://localhost:3000`, create an account, upload a photo, choose an occasion, and generate your first outfit.

---

## 6. Environment Variables

### Frontend — `FE/.env.local`

```env
# Supabase (public — safe to expose)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Backend — `BE/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key   # SERVER ONLY — never expose
SUPABASE_BUCKET=user-photos

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
# Optional. Only set when OPENAI_MODEL is text-only (e.g. Groq's
# llama-3.3-70b-versatile). Used for appearance detection (gender + age) from
# the uploaded photo. Defaults to OPENAI_MODEL.
OPENAI_VISION_MODEL=

# Image generation (outfit preview)
# Provider: 'huggingface' (free, default) or 'openai' (paid).
IMAGE_PROVIDER=huggingface
IMAGE_SIZE=1024x1024

# Hugging Face — free token at huggingface.co/settings/tokens (Read scope)
HF_API_KEY=hf_your-token
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell

# OpenAI image overrides (used only when IMAGE_PROVIDER=openai).
# Falls back to OPENAI_API_KEY/OPENAI_BASE_URL when blank.
IMAGE_API_KEY=
IMAGE_BASE_URL=
IMAGE_MODEL=gpt-image-1

# Cloudinary (optional alternative to Supabase Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Misc
CORS_ORIGIN=http://localhost:3000
```

> ⚠️ Never commit `.env` files. They are listed in `.gitignore`.

---

## 7. API Endpoints

All backend endpoints are prefixed with `/api`.

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/signup` | Register a new user | ❌ |
| `POST` | `/api/auth/login`  | Log in with email + password | ❌ |
| `POST` | `/api/auth/logout` | End the current session | ✅ |
| `GET`  | `/api/auth/me`     | Get current user profile | ✅ |

### Image Upload

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/upload` | Upload user photo, return hosted URL | ✅ |

### Skin Tone Detection

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/skin-tone` | Analyze uploaded photo, return `light` / `medium` / `dark` | ✅ |

### Appearance Detection (gender + age group)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/analyze-user` | Analyze the uploaded photo and estimate apparent gender and age group. | ✅ |

Request body: `{ "path": "<userId>/<uuid>.jpg" }` — must be a path inside the user's own folder (per-user scoping is enforced).

Successful response:

```json
{
  "path": "<userId>/<uuid>.jpg",
  "gender": "female",
  "ageGroup": "adult",
  "confidence": 0.87,
  "status": "ok",
  "reason": "front-facing adult woman, well lit"
}
```

`status` is one of:
- `ok` — confidence ≥ 0.70, safe to use the call as-is.
- `low_confidence` — confidence < 0.70; the FE prompts the user to confirm or override.

When no face is visible the endpoint responds `400`:

```json
{ "error": { "message": "Please upload a clear front-facing image.", "status": 400, "code": "NO_FACE_DETECTED" } }
```

The detection is implemented as an OpenAI-compatible vision call (see `BE/src/services/appearance.js`) — the same `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` env that already powers outfit generation. Any vision-capable model works (`gpt-4o-mini`, Groq Llama vision, OpenRouter equivalents). Detected `gender` and `ageGroup` are forwarded into `POST /api/outfit/generate` and persisted on the saved recommendation (currently inside `preferences.gender` / `preferences.ageGroup` to avoid a schema migration).

### Weather (optional outfit input)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/weather` | Look up current weather or a forecast for given coordinates. | ✅ |
| `POST` | `/api/weather/geocode` | Look up coordinates for a free-text place name. | ✅ |

`POST /api/weather` request body:

```json
{
  "lat": 31.5497,
  "lon": 74.3436,
  "date": "2026-05-08",          // optional — omit / null for "current"; max 15 days out
  "locationLabel": "Lahore, PK"  // optional — passthrough; shown in the UI chip
}
```

Successful response:

```json
{
  "tempC": 32.4,
  "feelsLikeC": 35.1,
  "tempMinC": null,
  "tempMaxC": null,
  "condition": "clear",
  "conditionLabel": "Clear sky",
  "bucket": "hot",
  "windKph": 14.2,
  "precipitationMm": 0,
  "humidity": 38,
  "isDaytime": true,
  "target": "current",
  "date": "2026-05-05",
  "locationLabel": "Lahore, PK",
  "timezone": "Asia/Karachi",
  "provider": "open-meteo",
  "fetchedAt": "..."
}
```

`POST /api/weather/geocode` body: `{ "query": "Lahore" }` → `{ "results": [{ name, country, admin1, latitude, longitude, label }] }`.

Provider is **Open-Meteo** — free, no API key, no signup. The service file (`BE/src/services/weather.js`) is the only place that talks to the upstream, so swapping providers later is a one-file change. Free tier is non-commercial; if/when this app is monetized, switch to Open-Meteo's commercial plan or an alternative provider.

When the FE forwards a `weather` object into `POST /api/outfit/generate`, the outfit prompt gains weather-aware styling guidance (heavy coat for ≤0°C, breathable fabrics for ≥30°C, water-resistant outerwear in rain, etc.) and the rendered outfit image describes a climate-consistent look. Persisted on the recommendation row inside `preferences.weather` (no schema migration).

### Outfit Recommendation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/outfit/generate` | Generate AI outfit based on skin tone, occasion, preferences, (optional) detected `gender` + `ageGroup`, (optional) `weather`, and (optional) `wardrobeOnly: true` to constrain to the user's saved wardrobe items. Returns the saved recommendation `id` plus `outfitItemRefs` when in wardrobe mode. | ✅ |
| `POST` | `/api/outfit/:id/preview` | Kick off async image generation for the saved recommendation. Idempotent — returns current state if a job is in flight or already done. Responds `202` when a new job is started. | ✅ |
| `GET`  | `/api/outfit/:id/preview` | Poll the image-generation status. | ✅ |

The preview endpoints return:

```json
{
  "id": "…",
  "status": "idle | pending | generating | ready | failed",
  "imagePath": "<userId>/outfits/<uuid>.png | null",
  "imageUrl": "<signed url, 1h TTL> | null",
  "error": null,
  "updatedAt": "..."
}
```

The frontend triggers `POST /api/outfit/:id/preview` immediately after generation, then polls `GET` every 3 seconds (up to ~120 s) until `status` is `ready` or `failed`.

The image provider is pluggable via `IMAGE_PROVIDER`:
- `huggingface` (default) — free, uses the Hugging Face Inference API with FLUX.1-schnell or any model in `HF_IMAGE_MODEL`. May incur a one-time cold-start delay (~20–60 s) the first time a model is used.
- `openai` — paid, uses `gpt-image-1` (or whatever `IMAGE_MODEL` is set to).

### History

Every successful `POST /api/outfit/generate` automatically writes a row to the `recommendations` table for the authenticated user. Stored recommendations are scoped per user via the `user_id` column and (defense-in-depth) RLS policies.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`    | `/api/history`               | Fetch past recommendations (paginated). Query: `limit` (default 20, max 100), `offset` (default 0), `favorite=true` to filter to favorited only. Items are returned favorites-first, then most recent. | ✅ |
| `GET`    | `/api/history/:id`           | Fetch a single saved recommendation | ✅ |
| `DELETE` | `/api/history/:id`           | Delete a saved recommendation | ✅ |
| `PATCH`  | `/api/history/:id/favorite`  | Body: `{ "favorite": true \| false }`. Toggles the saved recommendation's favorite flag. Returns `{ id, is_favorite }`. | ✅ |
| `POST`   | `/api/history/:id/share`     | Mint (or return existing) public share token. Idempotent — calling twice returns the same token. Response: `{ id, token }`. | ✅ |
| `DELETE` | `/api/history/:id/share`     | Revoke the public share link. Response: `{ id, revoked: true }`. | ✅ |

`GET /api/history` returns:

```json
{
  "items": [{ "id": "…", "occasion": "dinner", "outfit": { "...": "..." }, "created_at": "..." }],
  "limit": 20,
  "offset": 0,
  "total": 42
}
```

### Public Share

Public, read-only access to an outfit by its share token. **No auth.**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/share/:token` | Fetch a shared outfit by its token. | ❌ |

The token (32 random bytes, base64url) is the bearer credential — anyone with the token can view. The response is intentionally lean: it strips `user_id`, the user's selfie path, free-text preferences, and other internal fields.

```json
{
  "token": "…",
  "outfit": { "top": "…", "bottom": "…", "footwear": "…", "accessories": ["…"] },
  "colors": ["#…"],
  "explanation": "…",
  "occasion": "dinner",
  "skinTone": "medium",
  "imageUrl": "<signed url for the AI-rendered outfit, 1h TTL — null if no preview yet>",
  "createdAt": "..."
}
```

The FE renders this at `/share/<token>` with OpenGraph metadata so the link shows a rich preview when shared on social platforms. Only the AI-rendered mannequin image is exposed — never the user's original photo.

### Wardrobe

Per-user catalog of clothing items the user already owns. When `POST /api/outfit/generate` is called with `wardrobeOnly: true`, the LLM is constrained to pick items only from this catalog and returns an `outfitItemRefs` map of slot → wardrobe-item id.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST`   | `/api/wardrobe/upload`        | Multipart upload (`image` field). Stores under `<userId>/wardrobe/<uuid>.<ext>` and runs an OpenAI vision auto-classify in the same call. Returns `{ path, imageUrl, suggestion }`. | ✅ |
| `POST`   | `/api/wardrobe/items`         | Finalize an item record. Body: `{ path, category, name, colors?, attributes? }`. | ✅ |
| `GET`    | `/api/wardrobe/items`         | List the user's items. Optional `?category=top\|bottom\|footwear\|accessory\|outerwear`. Each item is returned with a fresh `imageUrl` (1h TTL signed). | ✅ |
| `GET`    | `/api/wardrobe/items/:id`     | Fetch a single item. | ✅ |
| `PATCH`  | `/api/wardrobe/items/:id`     | Partial update — any of `{ category, name, colors, attributes }`. | ✅ |
| `DELETE` | `/api/wardrobe/items/:id`     | Remove the item record AND its storage object. | ✅ |

Item shape:

```json
{
  "id": "…",
  "user_id": "…",
  "image_path": "<userId>/wardrobe/<uuid>.jpg",
  "imageUrl": "<signed url, 1h TTL>",
  "category": "top",
  "name": "navy linen blazer",
  "colors": ["#1f3a8a"],
  "attributes": {
    "material": "linen",
    "season": "spring-fall",
    "occasions": ["office", "dinner"],
    "notes": null
  },
  "created_at": "..."
}
```

The auto-classifier is implemented in `BE/src/services/wardrobeClassify.js` — same OpenAI-compatible vision pipeline as appearance detection. Confidence < 0.7 still pre-fills the form; the user can edit any field before saving. Wardrobe-mode item references are persisted on the recommendation row inside `preferences.outfitItemRefs` (no schema migration on `recommendations`).

### Sample response — `POST /api/outfit/generate`

```json
{
  "outfit": {
    "top": "Off-white linen shirt",
    "bottom": "Beige tailored trousers",
    "footwear": "Tan loafers",
    "accessories": ["Brown leather belt", "Minimal silver watch"]
  },
  "colors": ["#F5EFE6", "#C8AD7F", "#7B5E3C"],
  "explanation": "Warm earth tones complement a medium skin tone and read as smart-casual for an evening dinner.",
  "occasion": "dinner",
  "skinTone": "medium"
}
```

---

## 8. Third-Party Services & Keys Used

This project depends on the following external services. You'll need an account and API key for each one before running locally.

| Service | Purpose | Keys / Variables Needed | Where to Get It |
|---------|---------|------------------------|----------------|
| **Supabase** | Database, Auth, Storage | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [supabase.com](https://supabase.com) → Project Settings → API |
| **OpenAI** | LLM for outfit generation; optional image provider | `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_VISION_MODEL`, `IMAGE_API_KEY`, `IMAGE_BASE_URL`, `IMAGE_MODEL` | [platform.openai.com](https://platform.openai.com) → API keys |
| **Hugging Face** | **Default** image provider for outfit preview (free) | `IMAGE_PROVIDER=huggingface`, `HF_API_KEY`, `HF_IMAGE_MODEL` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — create a Read token |
| **Cloudinary** *(optional)* | Alternative image hosting | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | [cloudinary.com](https://cloudinary.com) → Dashboard |
| **face-api.js** *(library)* | Face detection in the browser/server | No key — model files only | [github.com/justadudewhohacks/face-api.js](https://github.com/justadudewhohacks/face-api.js) |

### Key Safety Rules

- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` MUST stay server-side only — never expose in `NEXT_PUBLIC_*` variables.
- `NEXT_PUBLIC_*` keys are bundled into the browser. Only the Supabase **anon key** belongs there.
- All `.env` files are in `.gitignore`.

---

## 9. Development Workflow

This project follows a strict **feature-branch** workflow.

### Branch Strategy

- `main` → always deployable, protected, **never push directly**.
- `feature/<feature-name>` → one branch per feature (e.g. `feature/auth-system`, `feature/image-upload`).

### Per-Feature Cycle

1. **Create branch** — `git checkout -b feature/<name>`
2. **Build** — implement FE + BE changes for that feature only.
3. **Test locally** — confirm the feature works end-to-end.
4. **Commit** — small, descriptive commits.
5. **Push** — `git push origin feature/<name>`
6. **Open a PR** into `main` with a short summary of what changed.
7. **Merge** after review.

### Commit Style

```
feat: add user signup with supabase
fix: handle missing face in skin-tone endpoint
chore: bump dependencies
docs: update env example
```

---

## 10. Future Improvements

- 🌦 **Weather-aware recommendations** via OpenWeather API.
- 🎉 **Cultural & regional modes** (mehndi, eid, diwali, holiday parties, etc.).
- 🖼 **AI-generated outfit preview images** (DALL·E / Stable Diffusion).
- ⭐ **Favorites & saved lookbooks**.
- 📱 **Mobile PWA** version with offline history.
- 🛍 **Shopping links** — connect outfit items to e-commerce listings.
- 🌐 **Multi-language UI** (English + Urdu first).

---

## License

MIT — see `LICENSE` file (added in a later phase).
