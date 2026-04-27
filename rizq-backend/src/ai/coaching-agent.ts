import { config } from "../config";

export type CommitteeCoachingContext = {
  committeeName: string;
  cycleNumber: number;
  totalCycles: number;
  contributionUSDC: number;
  nextCycleDateIso: string;
  paymentStatus: "paid" | "due_soon" | "overdue";
  languagePref: "english" | "urdu" | "mixed";
  pkrRate: number;
};

const FALLBACK_MODEL = "gemini-2.5-flash";

export function buildSystemPrompt(ctx: CommitteeCoachingContext): string {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(ctx.nextCycleDateIso).getTime() - Date.now()) / 86_400_000)
  );
  const toneByStatus =
    ctx.paymentStatus === "overdue"
      ? "User is overdue; be direct but kind."
      : ctx.paymentStatus === "due_soon"
        ? "User payment is due soon; keep urgency moderate."
        : "User is on track; reinforce consistency.";

  return `
Role: Rizq committee savings coach (Pakistan, English/Urdu mixed).

Use ONLY this data:
committee=${ctx.committeeName}
cycle=${ctx.cycleNumber}/${ctx.totalCycles}
due_usdc=${ctx.contributionUSDC.toFixed(2)}
due_date=${ctx.nextCycleDateIso}
days_left=${daysLeft}
payment_status=${ctx.paymentStatus}
language_pref=${ctx.languagePref}
pkr_usdc_rate=${ctx.pkrRate}
tone_hint=${toneByStatus}

Hard rules:
- Never invent facts, dates, balances, or names.
- If something is missing, say "data not available yet".
- Give practical guidance (1-3 actionable points is fine).
- If overdue: clearly say overdue + immediate next step.
- No investing/betting/staking language.
- End with an encouraging line.
`.trim();
}

export async function generateCoaching(
  ctx: CommitteeCoachingContext,
  userPrompt = "Generate my weekly coaching message."
): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    return "Coaching unavailable: set GEMINI_API_KEY on the server.";
  }
  const model = config.geminiModel || FALLBACK_MODEL;
  const callGemini = async (promptText: string) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.45,
            topP: 0.9,
            maxOutputTokens: 520,
          },
        }),
      }
    );
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${errBody}`);
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!text) throw new Error("Unexpected Gemini response shape");
    return text;
  };

  const strictPrompt = `${buildSystemPrompt(ctx)}

User query: ${userPrompt}

Output requirement:
- Answer the user query directly.
- Include concrete context where relevant (cycle, due amount, days left, or payment status).
- You can respond naturally in mixed English/Urdu.`;

  let text = await callGemini(strictPrompt);
  const shortGreetingOnly =
    text.split(/\s+/).length < 7 &&
    /(assalam|salam|walikum|walaikum|hello|hi)/i.test(text);
  if (shortGreetingOnly) {
    text = await callGemini(`${strictPrompt}\n\nRetry with a fuller, practical response.`);
  }
  return text;
}

export async function generateGeneralChat(
  userPrompt: string,
  history: Array<{ role: "user" | "ai"; message: string }> = []
): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    return "AI chat unavailable: set GEMINI_API_KEY on the server.";
  }
  const model = config.geminiModel || FALLBACK_MODEL;
  const historyText = history
    .slice(-10)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.message}`)
    .join("\n");
  const prompt = `
You are Rizq AI assistant. Keep response helpful, natural, and conversational.
No fixed format required. Answer directly and practically.

Recent chat history:
${historyText || "No previous messages."}

User: ${userPrompt}
Assistant
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          topP: 0.95,
          maxOutputTokens: 700,
        },
      }),
    }
  );
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errBody}`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Unexpected Gemini response shape");
  return text;
}
