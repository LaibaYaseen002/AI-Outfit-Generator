# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-package monorepo. There is **no root `package.json`** — install and run commands must be issued from `FE/` or `BE/` separately.

- `FE/` — Next.js 14 App Router (TypeScript, Tailwind), the user-facing client.
- `BE/` — Express API (ESM, `"type": "module"`), the server.
- `README.md` — public-facing project doc. Note that some sections describe planned-but-unimplemented behavior; see "README vs reality" below before trusting it.

## Common commands

### Backend (`cd BE`)
- `npm install` — install deps.
- `npm run dev` — Nodemon-watched dev server on `http://localhost:5000`.
- `npm start` — production-style run with `node src/index.js`.
- Health probe: `curl http://localhost:5000/api/health`.

### Frontend (`cd FE`)
- `npm install` — install deps.
- `npm run dev` — Next dev server on `http://localhost:3000`.
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — `next lint`.

There is **no test runner configured** in either package — don't claim to "run tests"; verify changes by exercising the app.

### Local development requires both processes running simultaneously
The FE assumes the BE is reachable at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:5000/api`). Start BE first, then FE in a second terminal.

## High-level architecture

### Auth handshake (split between FE and BE)
The frontend talks **directly to Supabase** for sign-up / sign-in via `FE/lib/supabaseClient.ts` using the public anon key. After login, every API call to the BE goes through `FE/lib/api.ts → apiFetch(..., { auth: true })`, which pulls `session.access_token` from Supabase and sends it as `Authorization: Bearer <token>`.

The BE's `requireAuth` middleware (`BE/src/middlewares/requireAuth.js`) calls `supabaseAdmin.auth.getUser(token)` to verify and attaches `req.user` and `req.token`. The BE uses two clients (`BE/src/services/supabase.js`):
- `supabaseAdmin` — service-role key, bypasses RLS, used for storage ops and token verification.
- `supabaseAnon` — anon key, used for the BE's own `/api/auth/signup` and `/api/auth/login` proxy endpoints.

There are **two valid auth paths**: the FE can call Supabase auth directly (preferred — see `FE/lib/auth.ts`) **or** call the BE's `/api/auth/*` proxy. Both produce a Supabase session; don't mix them in new code without a reason.

### Storage and per-user path scoping
Uploads go to a **private** Supabase Storage bucket (default name `user-photos`, set via `SUPABASE_BUCKET`). Object paths follow the convention `<userId>/<uuid>.<ext>` — the **first folder is the owner's user ID**, and authorization in `uploadController.getSignedUrl` and `skinToneController.analyzeSkinTone` is enforced by checking `path.split("/")[0] === req.user.id`. Any new endpoint that accepts a storage `path` from the client must apply the same check, or it becomes an IDOR.

Because the bucket is private, the FE displays images via short-lived signed URLs (TTL 1 hour). For long-term display, re-sign on demand with the stored `path` rather than persisting the URL.

### Skin-tone detection is server-side and heuristic
`BE/src/services/skinTone.js` does **not** use face-api.js (despite what the README's tech-stack table says). It uses `sharp` to resize → center-crop 60% → run a Kovac et al. RGB skin-pixel heuristic, average the matching pixels, then bucket by BT.709 luminance into `light` / `medium` / `dark`. If <1% of the crop passes the skin filter, it falls back to the central-region mean. The endpoint downloads the image from the storage `path`, never accepts raw image bytes — so it's gated on the upload path's user-scoping.

### Appearance detection (gender + age group) reuses the OpenAI vision pipeline
`BE/src/services/appearance.js` does **not** use face-api.js either. It resizes the image to 512px JPEG with `sharp`, then makes a single OpenAI-compatible vision call (same `openai` client, same `OPENAI_MODEL` env). The system prompt asks for strict JSON `{faceDetected, gender, ageGroup, confidence, reason}`. The service maps that to a `status` of `ok` (≥0.70), `low_confidence` (<0.70 with a face), or `no_face` — the controller then turns `no_face` into a `400` with `error.code === "NO_FACE_DETECTED"`. Same per-user `path` ownership check as skinTone. `gender` and `ageGroup` flow into `services/outfit.js` (system prompt has age-group + gender styling rules) and into `services/outfitImage.js`'s mannequin description — they're persisted on the recommendation row inside `preferences.gender` / `preferences.ageGroup` to avoid a SQL migration. Confidence is forwarded to the FE so it can prompt for confirmation when the model is unsure.

### Weather is provider-agnostic but defaults to Open-Meteo (no API key)
`BE/src/services/weather.js` calls Open-Meteo's free forecast + geocoding endpoints — no API key, no signup. WMO weather codes are mapped to a coarse `condition` bucket (`clear`/`cloudy`/`rain`/`snow`/`thunder`/`fog`) and the temperature to a `bucket` (`freezing`/`cold`/`cool`/`mild`/`warm`/`hot`). `POST /api/weather` returns the normalized snapshot; `POST /api/weather/geocode` resolves city names to lat/lon. Both routes require auth so the BE's outbound traffic isn't proxiable by anonymous clients. The FE-supplied `weather` object on `POST /api/outfit/generate` is **trust-but-validated** in the controller (it isn't re-fetched server-side). Weather-aware guidance is appended to the outfit system prompt (heavy coat for ≤0°C, breathable for ≥30°C, water-resistant in rain, etc.) and a short "weather context" line is appended to the image prompt so the rendered mannequin matches. The full snapshot is persisted on the recommendation row inside `preferences.weather` — same pattern as appearance, no SQL migration. Provider can be swapped by replacing only `services/weather.js`. Open-Meteo's free tier is non-commercial.

### LLM call is provider-agnostic
`BE/src/services/openai.js` instantiates the `openai` SDK but honors an optional `OPENAI_BASE_URL`. This means the same code works with OpenAI, Groq, OpenRouter, Together, etc. — anything OpenAI-compatible. `OPENAI_MODEL` controls which model is used. `BE/src/services/outfit.js` requests `response_format: json_object` and validates the parsed payload has `outfit.{top,bottom,footwear,accessories}`, `colors[]`, and `explanation`. OpenAI errors are surfaced as **502** (not 500) so the FE can distinguish upstream AI failures from server bugs.

### Favorites
`recommendations.is_favorite` (boolean, default false) is the source of truth — a real column rather than nested in `preferences` because the FE filters and sorts on it. `PATCH /api/history/:id/favorite { favorite: bool }` is the only writer; `listHistory` orders favorites-first then by `created_at DESC` (composite index in `003_favorites.sql`) and accepts `?favorite=true` to filter. The FE's `FavoriteButton` does an optimistic flip with rollback on error and notifies the parent so list state stays in sync without a refetch. The outfit-generation response includes `is_favorite: false` so the result page can show the heart immediately.

### FE flow state is sessionStorage, not a router or context
`FE/lib/flow.ts` (`outfit-flow-state-v1`) glues the multi-step UX (upload → occasion → result). It stores the `UploadResult`, `SkinToneResult`, `FlowAppearance` (`{gender, ageGroup, confidence, overridden}`), `WeatherSnapshot`, occasion, and preferences across page navigations within a single tab. Closing the tab clears it. When adding new steps to the flow, extend `FlowState` here rather than threading props through pages or adding a global store.

### Backend conventions
- All routes are mounted under `/api/*` in `BE/src/index.js`.
- Errors come back as `{ error: { message, status } }` — preserve this shape; `FE/lib/api.ts` reads `body.error.message`.
- Auth-required routes use the `requireAuth` middleware. Currently every `/api/*` route except `/api/auth/*` and `/api/health` requires it.
- Multer uses **memory storage** with a 5 MB cap and an inline error handler that returns JSON instead of HTML on `MulterError`.
- ESM only — use `import`/`export` and `.js` extensions in relative imports.

## Environment configuration

Both packages need their own env file before they'll work. Templates:
- `BE/.env.example` → copy to `BE/.env`.
- `FE/.env.example` → copy to `FE/.env.local`.

Critical splits to keep correct:
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are **server-only**. Never put them in any `NEXT_PUBLIC_*` variable — those are bundled into the browser.
- The **only** Supabase key that belongs in the FE is the anon key, exposed as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Per the project workflow rule below, every new env var must also be documented in `README.md` when added.

## README vs reality (be careful)

The README describes the full intended product, not just what's implemented. As of now:
- **History endpoints** (`/api/history*`) are documented but **not yet implemented** — no `routes/history.js` exists. Don't reference them as if they work.
- **Skin tone detection** is described as `face-api.js`-based but is actually `sharp` + an RGB heuristic (see above).
- **Cloudinary** env vars are scaffolded but no Cloudinary code path exists yet — uploads only go to Supabase Storage.
- The Supabase tables `profiles` and `recommendations` are mentioned as setup steps but aren't yet read or written by any BE code.

When adding features, treat the README as a spec to fulfill, not a description of current behavior.

## Project workflow rules (from user memory)

- **One feature per branch / PR.** Build a single feature end-to-end (FE + BE), wait for explicit approval, then move on. Don't bundle multiple features.
- **Document every new key or env var in `README.md`** in the same change that introduces it.
- **No Claude attribution in commits or PRs** — do not add `Co-Authored-By: Claude` trailers or "Generated with Claude Code" footers.
