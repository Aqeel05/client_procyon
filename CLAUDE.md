# Procyon Agents — Outreach Intelligence

## Project overview
React app for Procyon Creations (exhibition stand design, Qatar). 
Two AI-powered outreach tools — cold email agent and warm email agent — 
both backed by Anthropic Managed Agents via the Claude API.

## Tech stack
- React + Vite
- Anthropic Managed Agents API
- Supabase (auth + database, when integrated)
- Vercel (deployment)

## Agent IDs
- Cold Email Agent: agent_011CZwxfXbUhcTxgcg35dFL4
- Warm Email Agent: agent_011Ca1x9MAbi3XMWR6pUsv9C

## Key files
- src/App.jsx — The real application. A single-file React app (~788 lines) containing all seed data, UI components, and agent call logic. Structured into:
- Seed data — hardcoded clients (8 oil/energy sector contacts) and trade events across Singapore (36), Malaysia (17), and Japan (18)
- callAgent() — calls the Anthropic Agents API (/v1/agents/:id/messages) for two agents: a cold outreach agent and a warm outreach agent
- UI primitives — PulseLoader, Btn, CopyBtn, EmailCard, ResearchCard, Modal, FormField
- CRUD modals — ClientModal, EventModal, DeleteModal for managing clients and events
- List cards — ClientCard, EventCard with inline edit/delete
- App() (main export) — two-tab layout ("Cold Outreach" and "Warm Outreach"), all state management, agent invocation handlers, and modal routing. State is persisted to localStorage.
- src/index.jsx — Slim entry point. Mounts <App> into the DOM root via ReactDOM.createRoot.
- src/index.css — Design token definitions (CSS custom properties for colours, fonts, borders) plus base body reset. This is the active stylesheet.
- src/logo.svg — The default Create React App logo SVG. Not used by App.jsx.

## Rules
- Never hardcode API keys — use environment variables only
- All Anthropic API calls must go through /api/chat proxy, never directly from browser
- Follow Vercel React best practices (see .skills/)
- Follow Supabase Postgres best practices when writing any DB queries (see .skills/)
- localStorage keys are prefixed with pc_ (pc_clients, pc_events)
