# AI Fornelli

Assistente AI self-hosted per il menu settimanale della casa: pianifica con l'AI (OpenRouter),
impara dai voti e dal feedback in chat, produce la lista della spesa (sottraendo la dispensa)
e gestisce la dispensa con le scadenze. Riscrittura da zero di `menu-assistant`, che sostituisce
**senza migrazione dati**. Specifiche e avanzamento nello spazio Notion "AI Fornelli".

## Stack

Next.js 15 (App Router) · TypeScript · React 19 · SQLite (better-sqlite3 + Drizzle, migrazioni
al boot) · Vercel AI SDK + OpenRouter · next-intl (IT/EN) · Tailwind v4 · Vitest.

## Funzioni

- **Setup**: wizard `/setup` (lingua, membri, slot pasti, modello AI); selettore profilo "Chi sei?".
- **Piano**: griglia settimanale, modifica manuale, generazione AI, "fuori casa", consumato vs
  pianificato, consiglio del giorno.
- **Apprendimento**: voti per persona, anti-ripetizione e gusti nel contesto AI.
- **Lista della spesa**: aggregazione ingredienti, sottrazione dispensa, voci manuali, spunte.
- **Dispensa**: CRUD con scadenze (l'AI privilegia gli ingredienti in scadenza).
- **Chat**: streaming con tool (modifica pasti, preferenze, dispensa, vincoli) e persistenza.

## Sviluppo

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # vitest (100+ test)
npm run lint
npm run db:generate    # genera migrazioni da src/server/db/schema.ts
DB_PATH=./data/ai-fornelli.db npm run seed   # dati di esempio (salta il wizard)
```

DB locale in `./data/ai-fornelli.db` (override con `DB_PATH`). Le funzioni AI richiedono
`OPENROUTER_API_KEY` nel `.env` (vedi `.env.example`); il modello si sceglie dalle impostazioni.

## Docker

```bash
docker build -t ai-fornelli .
docker run -p 8095:3000 -v ai_fornelli_data:/data -e OPENROUTER_API_KEY=sk-or-... ai-fornelli
# healthcheck: GET /api/health
```

Immagine di produzione: `ghcr.io/paoloventuri91/ai-fornelli:main` (pubblicata dalla CI su `main`).

## Deploy (self-hosted, Docker + Cloudflare)

Il compose pronto è in [`deploy/ai-fornelli.yml`](deploy/ai-fornelli.yml) — porta **8095** (stessa
del vecchio `menu-assistant`), volume `ai_fornelli_data`, `OPENROUTER_API_KEY` dal `.env` di root.

Cutover (manuale, comporta un breve downtime):

1. Copia `deploy/ai-fornelli.yml` in `docker-local-infrastructure/`.
2. `docker compose -f menu-assistant.yml down` (libera la porta 8095).
3. `docker compose -f ai-fornelli.yml up -d`.
4. Nel tunnel Cloudflare punta la route dell'hostname a `http://host.docker.internal:8095`
   (Cloudflare Access invariato).
5. Verificato il funzionamento, ritira `menu-assistant.yml`.
