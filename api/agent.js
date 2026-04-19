/**
 * Vercel serverless function — proxies chat messages to an Anthropic Managed Agent.
 *
 * Accepts { agentType: "cold" | "warm", userMessage } from the frontend.
 * Agent IDs are resolved server-side from env vars — never exposed to the browser.
 *
 * Flow:
 *  1. Resolve agent ID from env (COLD_AGENT_ID / WARM_AGENT_ID).
 *  2. Fetch the agent's config (model, system prompt) from the Managed Agents API.
 *  3. Forward the user message to the standard Messages API.
 */
module.exports = async function handler(req, res) {
  // CORS — allow same-origin requests from the Vercel deployment
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { agentType, userMessage } = req.body || {};

  if (!agentType || !userMessage) {
    return res.status(400).json({ error: "Missing agentType or userMessage" });
  }
  if (!["cold", "warm"].includes(agentType)) {
    return res.status(400).json({ error: "agentType must be 'cold' or 'warm'" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured in environment variables" });
  }

  // Resolve agent ID server-side — never trust the client for this
  const agentId = agentType === "cold"
    ? process.env.COLD_AGENT_ID
    : process.env.WARM_AGENT_ID;

  if (!agentId) {
    return res.status(500).json({
      error: `${agentType.toUpperCase()}_AGENT_ID is not configured in environment variables`,
    });
  }

  try {
    // ── Step 1: Fetch the agent configuration ─────────────────────────────
    const agentRes = await fetch(
      `https://api.anthropic.com/v1/agents/${agentId}`,
      {
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "managed-agents-2026-04-01",
        },
      }
    );

    if (!agentRes.ok) {
      const err = await agentRes.json().catch(() => ({}));
      console.error("Failed to fetch agent config:", agentRes.status, err);
      return res.status(agentRes.status).json({
        error: `Failed to fetch agent configuration (HTTP ${agentRes.status})`,
        details: err,
      });
    }

    const agent = await agentRes.json();

    // agent.model may be a string or an object { id, ... }
    const modelId =
      agent.model && typeof agent.model === "object"
        ? agent.model.id
        : agent.model || "claude-sonnet-4-6";

    // ── Step 2: Send the user message via the Messages API ────────────────
    const msgRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        ...(agent.system ? { system: agent.system } : {}),
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await msgRes.json();

    if (!msgRes.ok) {
      console.error("Messages API error:", msgRes.status, data);
      return res.status(msgRes.status).json({
        error: `Anthropic Messages API returned HTTP ${msgRes.status}`,
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Agent proxy error:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
};
