module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { agentId, userMessage } = req.body;
  if (!agentId || !userMessage) {
    return res.status(400).json({ error: "Missing agentId or userMessage" });
  }

  const response = await fetch(
    `https://api.anthropic.com/v1/agents/${agentId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        max_tokens: 1000,
        messages: [{ role: "user", content: userMessage }],
      }),
    }
  );

  const data = await response.json();
  res.status(response.status).json(data);
}
