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
- Max 65 words.
- Never invent facts, dates, balances, or names.
- If something is missing, say "data not available yet".
- Give exactly 1 concrete weekly action.
- If overdue: clearly say overdue + immediate next step.
- No investing/betting/staking language.
- End with 1 short encouragement line.
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
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 220,
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
- Answer the user query directly, not greeting-only.
- Include at least one concrete context value (cycle, due amount, days left, or payment status).
- Keep it practical and short.`;

  let text = await callGemini(strictPrompt);
  const shortGreetingOnly =
    text.split(/\s+/).length < 7 &&
    /(assalam|salam|walikum|walaikum|hello|hi)/i.test(text);
  if (shortGreetingOnly) {
    text = await callGemini(
      `${strictPrompt}

Retry with strict format:
1) Current status line.
2) One immediate next action line.`
    );
  }
  return text;
}
