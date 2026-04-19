# Managed Agents API — Complete Reference

> Internal knowledge file for the Procyon Agents project.
> **Never put API keys, agent IDs, env IDs, session IDs, or any credentials in this file.**
> Reference secrets by variable name only (e.g. `ANTHROPIC_API_KEY`).

---

## Overview

Managed Agents is an Anthropic beta feature that lets you define persistent AI agents with:
- A fixed model + system prompt (stored in Anthropic's cloud)
- Stateful **sessions** tied to a user conversation
- **Environments** (cloud containers) that sessions run inside
- Streaming via SSE and structured event types

All Managed Agents API calls require:
```
anthropic-beta: managed-agents-2026-04-01
x-api-key: <ANTHROPIC_API_KEY>
anthropic-version: 2023-06-01
Content-Type: application/json
```

---

## Endpoints

### Agents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/agents/:agentId` | Fetch agent config (model, system prompt, tools) |
| `GET` | `/v1/agents` | List all agents |

**GET /v1/agents/:agentId response:**
```json
{
  "id": "agent_...",
  "name": "My Agent",
  "model": "claude-opus-4-6",
  "system_prompt": "You are a helpful assistant...",
  "tools": [],
  "created_at": "2026-04-01T00:00:00Z"
}
```

---

### Environments

Environments are cloud containers that host agent sessions. Required for full session flow.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/environments` | Create a new environment |
| `GET` | `/v1/environments/:envId` | Get environment status |
| `DELETE` | `/v1/environments/:envId` | Delete environment |

**POST /v1/environments request:**
```json
{
  "agent_id": "agent_..."
}
```

**POST /v1/environments response:**
```json
{
  "id": "env_...",
  "agent_id": "agent_...",
  "status": "starting",
  "created_at": "2026-04-01T00:00:00Z"
}
```

Environment `status` values: `starting` → `ready` → `stopped`

Wait for `status: "ready"` before creating sessions.

---

### Sessions

Sessions represent a single conversation thread inside an environment.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/sessions` | Create a new session |
| `GET` | `/v1/sessions/:sessionId` | Get session info |
| `DELETE` | `/v1/sessions/:sessionId` | End a session |

**POST /v1/sessions request:**
```json
{
  "environment_id": "env_..."
}
```

**POST /v1/sessions response:**
```json
{
  "id": "sesn_...",
  "environment_id": "env_...",
  "status": "active",
  "created_at": "2026-04-01T00:00:00Z"
}
```

---

### Events (sending messages)

Send user messages into a session.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/sessions/:sessionId/events` | Send an event (user message) |

**POST /v1/sessions/:sessionId/events request:**
```json
{
  "type": "user_message",
  "content": "Hello, can you help me draft a cold email?"
}
```

**Response:** `202 Accepted` — the agent processes asynchronously.

---

### Streaming (receiving responses)

Poll or stream the agent's response via SSE.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/sessions/:sessionId/stream` | SSE stream of events |

**SSE event types:**

| Event type | Description |
|------------|-------------|
| `message_start` | Agent begins responding |
| `content_block_start` | Start of a text or tool block |
| `content_block_delta` | Incremental text chunk |
| `content_block_stop` | End of a block |
| `message_delta` | Token usage, stop reason |
| `message_stop` | Response complete |
| `error` | Error occurred |

**Example SSE stream:**
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","model":"claude-opus-4-6",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Dear "}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Ahmed,"}}

event: message_stop
data: {"type":"message_stop"}
```

---

## Full Session Flow (step by step)

This is the complete flow for a stateful conversation with memory:

```
1. Create Environment
   POST /v1/environments  { agent_id }
   → env_id

2. Poll until ready
   GET /v1/environments/:env_id
   → wait for status == "ready"

3. Create Session
   POST /v1/sessions  { environment_id: env_id }
   → session_id

4. Store mapping in your DB:
   user_session_id (your app) ↔ claude_session_id (sesn_...)

5. Send user message
   POST /v1/sessions/:session_id/events  { type: "user_message", content }
   → 202 Accepted

6. Stream response
   GET /v1/sessions/:session_id/stream
   → SSE stream, concatenate content_block_delta text chunks

7. For follow-up messages, repeat steps 5–6 (session remembers history)

8. When conversation ends
   DELETE /v1/sessions/:session_id
   DELETE /v1/environments/:env_id  (or reuse for next user)
```

---

## n8n Workflow Pattern (stateful chat integration)

This pattern was studied from the n8n workflow diagram in the Managed Agents docs.

### On each incoming user message:

```
1. Receive webhook (user_id + message)
2. Look up DB: does this user have an active claude_session_id?
   YES → go to step 5
   NO  → go to step 3

3. Create Environment
   POST /v1/environments { agent_id }
   Wait for status == "ready"

4. Create Session
   POST /v1/sessions { environment_id }
   Store: user_id → { env_id, session_id } in DB

5. Send event
   POST /v1/sessions/:session_id/events { type: "user_message", content: message }

6. Poll or stream for response
   Option A (polling): GET /v1/sessions/:session_id  until response available
   Option B (streaming): GET /v1/sessions/:session_id/stream  via SSE

7. Return response to user
```

### Key insight — session lookup table:
```sql
create table user_sessions (
  user_id text primary key,
  env_id text not null,        -- env_... (Anthropic)
  session_id text not null,    -- sesn_... (Anthropic)
  created_at timestamptz default now()
);
```

---

## Current Procyon Architecture vs Full Session Flow

| Aspect | Current (Procyon) | Full Session Flow |
|--------|-------------------|-------------------|
| How it works | Fetch agent config → call `/v1/messages` directly | Create env → session → events → stream |
| State / memory | None (each call is fresh) | Full conversation memory within session |
| Suitable for | Serverless per-request | Long-running cloud containers |
| Latency | Low (2 API calls) | Higher (env startup ~seconds) |
| Cost | Pay per token | Pay per token + container time |
| Implementation complexity | Low | Medium–High |

**Why current approach is correct for Procyon:**
- Vercel serverless functions time out after 10–30s; environment startup can take several seconds
- Each email generation is a one-shot task — no need for conversation memory
- The agent's model + system prompt is fetched fresh each call from `GET /v1/agents/:id`

**When to switch to full session flow:**
- If users need back-and-forth conversation with the agent (multi-turn)
- If moving off serverless to a persistent Node.js server or container

---

## Security rules (reiterated)

- **Never** commit agent IDs, env IDs, session IDs, or API keys to git
- Agent IDs live in `.env.local` and Vercel dashboard only
- All Anthropic calls go through `api/agent.js` proxy — never directly from the browser
- The browser never sees `ANTHROPIC_API_KEY`

---

## Common mistakes

| Mistake | Correct approach |
|---------|-----------------|
| `POST /v1/agents/:id/messages` | This endpoint does not exist |
| Missing `anthropic-beta` header | Always include `anthropic-beta: managed-agents-2026-04-01` |
| Committing agent IDs to git | Store in `.env.local` + Vercel dashboard only |
| Calling Anthropic API from browser | All calls must go through `api/agent.js` proxy |
| Not waiting for env `status: "ready"` | Poll until ready before creating session |
