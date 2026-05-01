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

// Model names change over time; we will additionally confirm availability via ListModels.
const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
];

const FALLBACK_LISTMODELS_MODEL_CANDIDATES = ["gemini-1.5-flash", "gemini-2.5-flash"];
let cachedAvailableGeminiModels: Set<string> | null = null;

function modelNameToUrlPart(modelName: string): string {
  // ListModels returns names like: "models/gemini-1.5-flash"
  const trimmed = modelName.trim();
  const idx = trimmed.lastIndexOf("/");
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

async function listAvailableGeminiModels(apiKey: string): Promise<Set<string>> {
  if (cachedAvailableGeminiModels) return cachedAvailableGeminiModels;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        method: "GET",
        headers: {
          "X-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      // Cache fallback to avoid spamming list calls on every chat.
      cachedAvailableGeminiModels = new Set(FALLBACK_LISTMODELS_MODEL_CANDIDATES);
      return cachedAvailableGeminiModels;
    }

    const payload = (await response.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    const available = new Set<string>();
    for (const m of payload.models ?? []) {
      if (!m?.name) continue;
      const urlPart = modelNameToUrlPart(m.name);
      const methods = m.supportedGenerationMethods ?? [];
      // Ensure the model supports generateContent on this endpoint.
      if (methods.length > 0) {
        if (methods.includes("generateContent")) available.add(urlPart);
      } else {
        // Be permissive if the field is absent.
        available.add(urlPart);
      }
    }

    cachedAvailableGeminiModels = available.size > 0 ? available : new Set(FALLBACK_LISTMODELS_MODEL_CANDIDATES);
    return cachedAvailableGeminiModels;
  } catch {
    cachedAvailableGeminiModels = new Set(FALLBACK_LISTMODELS_MODEL_CANDIDATES);
    return cachedAvailableGeminiModels;
  }
}

function getGeminiModelCandidates(): string[] {
  const fromEnv = (config.geminiModel ?? "").trim();
  const candidates = [fromEnv, ...DEFAULT_MODEL_CANDIDATES].filter((m) => m.length > 0);
  return [...new Set(candidates)];
}

function normalizeAiText(raw: string): string {
  // Keep chat output plain text for RN bubbles.
  return raw
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .trim();
}

function looksTruncated(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.endsWith("**")) return true;
  if (/\*\*[^*]*$/.test(t)) return true; // unmatched markdown opener at end
  // Heuristic: if long enough but no sentence end, often a clipped generation.
  if (t.length >= 40 && !/[.!?]"?$/.test(t)) return true;
  return false;
}

function buildCoachingFallbackReply(
  ctx: CommitteeCoachingContext,
  userPrompt: string
): string {
  const dueDate = new Date(ctx.nextCycleDateIso).toLocaleDateString("en-GB");
  const statusLine =
    ctx.paymentStatus === "overdue"
      ? "Aapki payment overdue hai, is liye aaj hi contribution complete karna best hai."
      : ctx.paymentStatus === "due_soon"
        ? "Aapki payment due soon hai, 24 ghantay pehle amount arrange kar lein."
        : "Aapka status on-track lag raha hai, bas consistency maintain rakhein.";

  return normalizeAiText(
    `AOA! Committee "${ctx.committeeName}" ke liye cycle ${ctx.cycleNumber} of ${ctx.totalCycles} chal raha hai. ` +
      `Current due amount $${ctx.contributionUSDC.toFixed(2)} USDC hai aur due date ${dueDate} hai. ` +
      `${statusLine} Agar aap chahein to main "${userPrompt}" ke liye step-by-step short plan bhi de sakta hoon.`
  );
}

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
  const modelCandidates = getGeminiModelCandidates();
  const availableModels = await listAvailableGeminiModels(apiKey);
  const filteredCandidates = modelCandidates.filter((m) => availableModels.has(m));
  const candidatesToTry = filteredCandidates.length > 0 ? filteredCandidates : modelCandidates;
  const callGemini = async (promptText: string) => {
    let lastErr: Error | null = null;
    for (const model of candidatesToTry) {
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
        const err = new Error(`Gemini request failed [${model}] (${response.status}): ${errBody}`);
        lastErr = err;
        // Bad API key/Auth errors won't be fixed by trying other models.
        if (response.status === 401 || response.status === 403) throw err;
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();
      if (!text) throw new Error(`Unexpected Gemini response shape [${model}]`);
      return text;
    }
    throw lastErr ?? new Error("Gemini request failed: no model candidates worked");
  };

  const strictPrompt = `${buildSystemPrompt(ctx)}

User query: ${userPrompt}

Output requirement:
- Answer the user query directly.
- Include concrete context where relevant (cycle, due amount, days left, or payment status).
- You can respond naturally in mixed English/Urdu.
- Use plain text only (no markdown, no **bold**, no bullet symbols).`;

  let text = normalizeAiText(await callGemini(strictPrompt));
  const shortGreetingOnly =
    text.split(/\s+/).length < 7 &&
    /(assalam|salam|walikum|walaikum|hello|hi)/i.test(text);
  if (shortGreetingOnly || looksTruncated(text)) {
    text = normalizeAiText(
      await callGemini(
        `${strictPrompt}\n\nRetry and make sure the answer is complete, ends naturally, and remains plain text.`
      )
    );
  }
  if (looksTruncated(text)) {
    text = normalizeAiText(
      await callGemini(
        `${strictPrompt}\n\nReturn EXACTLY 2 complete sentences. Keep it plain text and end with a period.`
      )
    );
  }
  if (looksTruncated(text)) {
    return buildCoachingFallbackReply(ctx, userPrompt);
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
  const modelCandidates = getGeminiModelCandidates();
  const availableModels = await listAvailableGeminiModels(apiKey);
  const filteredCandidates = modelCandidates.filter((m) => availableModels.has(m));
  const candidatesToTry = filteredCandidates.length > 0 ? filteredCandidates : modelCandidates;
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

  let lastErr: Error | null = null;
  for (const model of candidatesToTry) {
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
      const err = new Error(`Gemini request failed [${model}] (${response.status}): ${errBody}`);
      lastErr = err;
      if (response.status === 401 || response.status === 403) throw err;
      continue;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!text) throw new Error(`Unexpected Gemini response shape [${model}]`);
    return text;
  }
  throw lastErr ?? new Error("Gemini request failed: no model candidates worked");
}
