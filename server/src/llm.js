// The ONLY file that talks to the AI provider. To switch to Gemini or OpenAI later, change just this file.
export async function askLLM(system, user) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing in server/.env");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "claude-sonnet-5-5",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}). Check your API key and model name.`);
  const data = await res.json();
  return data.content.map((b) => b.text || "").join("");
}
