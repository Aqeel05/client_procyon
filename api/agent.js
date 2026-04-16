/**
 * Vercel serverless function — proxies chat messages to an Anthropic Managed Agent.
 *
 * Flow:
 *  1. Fetch the agent's configuration (model, system prompt) from the
 *     Managed Agents API (requires the managed-agents-2026-04-01 beta header).
 *  2. Forward the user message to the standard Messages API using those settings.
 *
 * This avoids spinning up a cloud environment/session for every request
 * while still leveraging each agent's stored model + system-prompt config.
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { agentId, userMessage } = req.body;
  if (!agentId || !userMessage) {
    return res.status(400).json({ error: "Missing agentId or userMessage" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
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
      return res
        .status(agentRes.status)
        .json({ error: "Failed to fetch agent configuration", details: err });
    }

    const agent = await agentRes.json();

    // agent.model may be a string ("claude-opus-4-7") or an object ({ id, speed })
    const modelId =
      agent.model && typeof agent.model === "object"
        ? agent.model.id
        : agent.model || "claude-opus-4-5";

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
        max_tokens: 1024,
        ...(agent.system ? { system: agent.system } : {}),
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await msgRes.json();
    return res.status(msgRes.status).json(data);
  } catch (err) {
    console.error("Agent proxy error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", message: err.message });
  }
};
