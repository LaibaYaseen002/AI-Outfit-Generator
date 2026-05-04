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
- **Shareable result links** — copy a link to send a generated outfit to a friend.

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

### Outfit Recommendation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/outfit/generate` | Generate AI outfit based on skin tone, occasion, preferences. Returns the saved recommendation `id`. | ✅ |
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
| `GET`    | `/api/history`       | Fetch past recommendations (paginated). Query: `limit` (default 20, max 100), `offset` (default 0). | ✅ |
| `GET`    | `/api/history/:id`   | Fetch a single saved recommendation | ✅ |
| `DELETE` | `/api/history/:id`   | Delete a saved recommendation | ✅ |

`GET /api/history` returns:

```json
{
  "items": [{ "id": "…", "occasion": "dinner", "outfit": { "...": "..." }, "created_at": "..." }],
  "limit": 20,
  "offset": 0,
  "total": 42
}
```

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
| **OpenAI** | LLM for outfit generation; optional image provider | `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `IMAGE_API_KEY`, `IMAGE_BASE_URL`, `IMAGE_MODEL` | [platform.openai.com](https://platform.openai.com) → API keys |
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
- 🔗 **Shareable result links** with OG previews.
- 📱 **Mobile PWA** version with offline history.
- 🛍 **Shopping links** — connect outfit items to e-commerce listings.
- 👗 **Wardrobe mode** — upload your existing clothes and get outfits using only items you own.
- 🌐 **Multi-language UI** (English + Urdu first).

---

## License

MIT — see `LICENSE` file (added in a later phase).
