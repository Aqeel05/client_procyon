# Procyon Agents — Outreach Intelligence

## ⚡ START HERE EVERY SESSION
**Read `memory.md` before doing anything else.**
It contains the full project history, known failures, pending tasks, architecture decisions, and gotchas that will save you from repeating past mistakes.

---

## Project overview
React CRM for Procyon Creations (exhibition stand design, Qatar).
Sales team manages clients and trade events, then generates outreach emails via two Claude AI agents.

## Tech stack
- **Frontend**: Create React App (`react-scripts 5.0.1`)
- **Database**: Supabase (PostgreSQL) — `clients` + `events` tables
- **AI**: Anthropic Managed Agents API (beta) via Vercel serverless proxy
- **Deployment**: Vercel (`client-procyon.vercel.app`)

## Agent IDs
- Cold Email Agent: `agent_011CZwxfXbUhcTxgcg35dFL4`
- Warm Email Agent: `agent_011Ca1x9MAbi3XMWR6pUsv9C`

## Key files
| File | Purpose |
|------|---------|
| `src/App.jsx` | Entire app (~650 lines) — UI, state, CRUD, agent calls |
| `src/index.jsx` | Entry point |
| `src/index.css` | CSS custom properties + base reset |
| `src/supabaseClient.js` | Supabase client (uses `REACT_APP_*` env vars) |
| `api/agent.js` | Vercel serverless proxy for Anthropic agent calls |
| `vercel.json` | SPA routing rewrite |
| `memory.md` | Full project history — **read every session** |

## Rules
- Never hardcode API keys — use environment variables only
- All Anthropic API calls must go through `/api/agent` proxy, never directly from browser
- All calls to Anthropic Managed Agents API require header: `anthropic-beta: managed-agents-2026-04-01`
- The endpoint `/v1/agents/:id/messages` **does not exist** — do not use it
- Keep `src/App.jsx` ESLint-clean — Vercel builds with `CI=true` (warnings → errors)
- Never create `*.js` files in `src/` that could shadow `*.jsx` files (CRA resolves `.js` first)
- Update `memory.md` at the end of every session with new decisions, fixes, and pending work
