# AI Fornelli

Assistente AI self-hosted per il menu settimanale della casa: genera il piano con AI (OpenRouter), impara dai voti e dal feedback in chat, produce la lista della spesa e gestisce la dispensa.

Riscrittura da zero di `menu-assistant`; specifiche e avanzamento nello spazio Notion "AI Fornelli".

## Stack

Next.js 15 (App Router) · TypeScript · SQLite (better-sqlite3 + Drizzle, migrazioni al boot) · Vercel AI SDK + OpenRouter · Tailwind v4 · Vitest

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run db:generate  # genera migrazioni da src/server/db/schema.ts
```

Il DB locale finisce in `./data/ai-fornelli.db` (override con `DB_PATH`). Copia `.env.example` in `.env` per le variabili.

## Docker

```bash
docker build -t ai-fornelli .
docker run -p 8095:3000 -v ai_fornelli_data:/data ai-fornelli
# healthcheck: GET /api/health
```

In produzione l'immagine è `ghcr.io/paoloventuri91/ai-fornelli:main`, dietro Cloudflare Tunnel + Access sulla porta 8095.
