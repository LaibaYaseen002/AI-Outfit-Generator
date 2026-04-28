# Backend — AI Outfit Generator

Express server for the AI Outfit Generator.

## Run

```bash
npm install
cp .env.example .env   # fill in values
npm run dev            # http://localhost:5000
```

## Health check

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{ "status": "ok", "service": "ai-outfit-generator-be", "timestamp": "..." }
```

## Folder layout

```
src/
├── index.js              # entry
├── routes/               # express routers
├── controllers/          # request handlers (added per feature)
├── services/             # supabase, openai, etc.
├── middlewares/          # auth, errors
└── utils/
```
