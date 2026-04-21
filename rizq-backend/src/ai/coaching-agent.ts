import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

export type GoalContext = {
  goalName: string;
  goalType: string;
  targetUSDC: number;
  deadline: string;
  pct: number;
  daysLeft: number;
  weeklyNeeded: number;
  completionRate: number;
  pkrRate: number;
  yesCount: number;
  noCount: number;
  lastWeekDeposit: number;
};

const MODEL = "claude-sonnet-4-20250514";

export function buildSystemPrompt(ctx: GoalContext): string {
  return `
You are Rizq, an AI savings coach for Pakistani users.
You write in a warm, encouraging voice mixing English and Urdu naturally
(the way educated Pakistanis actually speak — not formal translations).

User context:
- Goal: ${ctx.goalName} (${ctx.goalType})
- Target: $${ctx.targetUSDC} USDC by ${ctx.deadline}
- Progress: ${ctx.pct}% complete (${ctx.daysLeft} days left)
- Weekly deposit needed: $${ctx.weeklyNeeded} USDC
- Past goal completion rate: ${ctx.completionRate}%
- Current PKR/USDC rate: ${ctx.pkrRate}
- Friends betting YES: ${ctx.yesCount}  |  NO: ${ctx.noCount}
- Last week deposit: $${ctx.lastWeekDeposit} USDC

Rules:
1. Give ONE specific saving action for this week (not generic advice).
2. Reference the friends betting — it creates social accountability.
3. If PKR rate is above 280, suggest it is a good week to convert.
4. Maximum 80 words. Natural Urdu phrases welcome (yaar, bhai, theek hai).
5. Be honest — if the user is behind, say so directly but kindly.
6. Never mention competitors. Never give financial advice.
7. End with an encouraging one-liner in either language.
`.trim();
}

export async function generateCoaching(
  ctx: GoalContext,
  userPrompt = "Generate my weekly coaching message."
): Promise<string> {
  if (!config.anthropicApiKey) {
    return "Coaching unavailable: set ANTHROPIC_API_KEY on the server.";
  }
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: buildSystemPrompt(ctx),
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = msg.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected Anthropic response shape");
  }
  return block.text;
}
