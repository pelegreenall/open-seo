import { env } from "cloudflare:workers";

// Simulating basic fetch to test DataForSEO Claude endpoint directly
async function testClaude(len: number) {
  const apiKey = "cGVsZUB2ZXJpdGx5LmNvLnVrOjZiZDQyZmNkMThhOWU1NTU=";
  const prompt = "a".repeat(len);
  
  const payload = [
    {
      user_prompt: prompt,
      model_name: "claude-sonnet-4-0",
      web_search: false,
    },
  ];

  try {
    const response = await fetch("https://api.dataforseo.com/v3/ai_optimization/claude/llm_responses/live", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const res: any = await response.json();
    console.log(`Claude ${len} chars: status = ${res.status_code}, message = ${res.status_message ?? "none"}`);
    if (res.tasks?.[0]) {
      console.log(`Task status: ${res.tasks[0].status_code}, message = ${res.tasks[0].status_message ?? "none"}`);
    }
  } catch (err: any) {
    console.error(`Failed: ${err.message}`);
  }
}

async function main() {
  await testClaude(500);
  await testClaude(1000);
  await testClaude(2000);
}

main();
