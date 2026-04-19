# Project Memory — Procyon Agents

> Read this file at the start of every session before making any changes.
> Update this file at the end of every session with new decisions, failures, and completed work.

---

## What this app is

A React CRM for Procyon Creations (exhibition stand design, Qatar). Sales team uses it to manage clients and upcoming trade events, then generate outreach emails via two Claude AI agents:

- **Cold Email Agent** — drafts first-contact cold emails
- **Warm Email Agent** — drafts follow-up emails for existing clients

---

## Current architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Create React App (`react-scripts 5.0.1`) | Single `src/App.jsx` (~650 lines) + `src/index.jsx` + `src/index.css` |
| Database | Supabase (PostgreSQL) | `clients` and `events` tables; data loaded on mount |
| Agent proxy | Vercel serverless (`api/agent.js`) | Fetches agent config → calls Messages API. Keeps API key server-side |
| Deployment | Vercel | `client-procyon.vercel.app` |
| Routing | `vercel.json` SPA rewrite | All non-`/api/` paths → `index.html` |

---

## Supabase schema

```sql
create table clients (
  id text primary key,
  company text not null,
  contact text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz default now()
);

create table events (
  id text primary key,
  name text not null,
  dates text not null,
  venue text not null,
  sector text,
  region text,
  created_at timestamptz default now()
);
```

- **8 clients** seeded (oil/energy sector contacts)
- **71 events** seeded: 36 Singapore, 17 Malaysia, 18 Japan
- No auth / no user_id — data is shared across all users (intentional for small team)

---

## Environment variables

### Local (`.env.local` — gitignored, never commit)
```
REACT_APP_SUPABASE_URL=###
REACT_APP_SUPABASE_ANON_KEY=###
ANTHROPIC_API_KEY=###
```

### Vercel dashboard (⚠️ MUST be added manually — not auto-deployed)
Same three vars must be added at:
**Vercel → client-procyon → Settings → Environment Variables**

Status: ⚠️ **NOT YET ADDED** as of last session. This is why `/api/agent` returns 401/500 in production.

---

## How `api/agent.js` works

Two-step proxy (serverless-friendly, avoids needing cloud environments):

1. `GET https://api.anthropic.com/v1/agents/:agentId` with `anthropic-beta: managed-agents-2026-04-01` header — fetches agent's model and system prompt
2. `POST https://api.anthropic.com/v1/messages` with that model + system prompt + user message

Returns `{ content: [{ type: "text", text: "..." }] }` — same shape as Messages API.

Frontend (`App.jsx`) parses this as:
```js
return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
```

---

## Managed Agents API notes (read before touching agent code)

- All calls require header: `anthropic-beta: managed-agents-2026-04-01`
- The endpoint `/v1/agents/:id/messages` **does NOT exist** — never use it
- The full session flow (create environment → create session → send events → stream) requires cloud containers; not suitable for serverless per-request use
- Agent config lives at `GET /v1/agents/:id` — model + system prompt
- Events API: `POST /v1/sessions/:id/events`, streaming: `GET /v1/sessions/:id/stream` (SSE)
- Memory stores, outcomes, multi-agent are all research-preview features requiring additional beta headers

---

## Key files and their purpose

| File | Purpose |
|------|---------|
| `src/App.jsx` | Entire app (~650 lines). State, UI, CRUD, agent calls |
| `src/index.jsx` | Entry point — mounts `<App>` |
| `src/index.css` | CSS custom properties + base reset |
| `src/supabaseClient.js` | Creates Supabase client from `REACT_APP_*` env vars |
| `api/agent.js` | Vercel serverless proxy for Anthropic agent calls |
| `vercel.json` | SPA routing rewrite (all paths → `index.html` except `/api/`) |
| `memory.md` | **This file** — project history and decisions |
| `CLAUDE.md` | Claude Code instructions — references this file |

---

## Completed work (chronological)

### Session 1 — Cleanup + Supabase + Vercel

**Cleaned up stale CRA boilerplate:**
- Deleted via `git rm`: `src/App.js`, `src/App.css`, `src/App.test.js`, `src/index.js`, `src/reportWebVitals.js`, `src/logo.svg`, `src/index-Aqeel-Desktop.css`
- These were shadowing the real app files (`App.jsx`, `index.jsx`)
- Root cause: webpack resolves `.js` before `.jsx` — `index.js` was the entry point, not `index.jsx`

**Migrated localStorage → Supabase:**
- Created `clients` and `events` tables in Supabase
- Seeded 8 clients + 71 events via Supabase MCP `execute_sql`
- Removed all `SEED_*` constants and `loadStored()` from `App.jsx`
- Added `src/supabaseClient.js`
- Changed state init from `useState(() => loadStored(...))` to `useState([])`
- Added data load `useEffect` fetching both tables in parallel
- CRUD handlers use optimistic UI (update state immediately, fire Supabase in background)

**Deployed to Vercel:**
- Created `api/agent.js` (serverless proxy)
- Created `vercel.json` (SPA routing)
- Added `@supabase/supabase-js` to `package.json`

### Session 1 — Build fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Module not found: Can't resolve 'web-vitals'` | `git pull` restored stale `src/index.js` which imported `reportWebVitals` | `git rm` the stale files |
| `'useRef' is defined but never used` | `CI=true` promotes ESLint warnings to errors in Vercel | Removed `useRef` from import in `App.jsx` |
| `POST /api/agent → 404` | `api/agent.js` used `export default` (ES module) but no `"type": "module"` in `package.json` | Changed to `module.exports = ...` (CommonJS) |

### Session 2 — Managed Agents docs review + API fix

**Read all Managed Agents docs:**
- overview, quickstart, sessions, tools, environments, events-and-streaming, agent-setup, multi-agent, define-outcomes, memory

**Fixed `api/agent.js`:**
- Old code called `/v1/agents/:id/messages` — this endpoint **does not exist**
- Old code was missing `anthropic-beta: managed-agents-2026-04-01` header
- New code: fetch agent config from `GET /v1/agents/:id`, then call `POST /v1/messages`
- Added `ANTHROPIC_API_KEY` guard (returns 500 with clear error if not set)
- Added try/catch error handling

---

## Known failures and their resolutions

| Failure | Root cause | Status |
|---------|-----------|--------|
| `POST /api/agent 404` | `export default` instead of `module.exports` | ✅ Fixed |
| `POST /api/agent 401` | `ANTHROPIC_API_KEY` not set in Vercel env vars | ⚠️ Fix pending — user must add to Vercel dashboard |
| `Module not found: web-vitals` | Stale `src/index.js` shadowing `src/index.jsx` | ✅ Fixed |
| ESLint `useRef unused` error | `CI=true` in Vercel build | ✅ Fixed |
| Git merge conflict on `git pull` | Remote had files that would be overwritten | ✅ Resolved via stash/pop |

---

## Incomplete / pending tasks

### ⚠️ CRITICAL — Must do before app works in production

**Add environment variables to Vercel dashboard:**

Go to: https://vercel.com/syedaqeel5555-9604s-projects/client-procyon/settings/environment-variables

Add all three vars (Production + Preview + Development):
- `ANTHROPIC_API_KEY` — the Anthropic API key
- `REACT_APP_SUPABASE_URL` — the URL (see `.env.local`)
- `REACT_APP_SUPABASE_ANON_KEY` — the anon key (see `.env.local`)

After adding, **redeploy** from the Vercel dashboard.

### Pending / nice-to-have

- [ ] Test cold email generation end-to-end in production (blocked by env vars above)
- [ ] Test warm email generation end-to-end in production
- [ ] Verify Supabase data loads correctly on the live site
- [ ] Consider adding auth (currently no password protection — all users share data)
- [ ] Consider persisting session/conversation history across page reloads

---

## Architecture decisions (and why)

| Decision | Why |
|----------|-----|
| No auth on DB tables | Small internal team, no need for user isolation. Simple. |
| Optimistic UI for CRUD | Avoids making modal components async. Instant UX, Supabase syncs in background. |
| Serverless proxy (not full Managed Agents session flow) | Sessions require cloud container environments — too slow and heavy for per-request chat in a serverless function. Fetch agent config + Messages API is fast and sufficient. |
| CommonJS in `api/agent.js` | Vercel Node.js runtime treats `.js` as CommonJS unless `"type": "module"` is set in package.json. |
| CRA (react-scripts) not Vite | App was already built on CRA. No reason to migrate. |

---

## Gotchas to remember

1. **CRA resolves `.js` before `.jsx`** — never create `*.js` files in `src/` that might shadow `*.jsx` equivalents
2. **Vercel CI=true** — all ESLint warnings become errors during build. Keep App.jsx lint-clean.
3. **`.env.local` is gitignored** — env vars must be manually added in Vercel dashboard; they are never auto-deployed
4. **Managed Agents beta header required** — every call to `/v1/agents/*` or `/v1/sessions/*` needs `anthropic-beta: managed-agents-2026-04-01`
5. **`/v1/agents/:id/messages` does not exist** — the correct chat flow uses `/v1/sessions/:id/events`
6. **`npm install` must be run locally** after `package.json` changes — Vercel installs from `package.json` automatically on deploy
