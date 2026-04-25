import Anthropic from "@anthropic-ai/sdk";
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

const MODEL = "claude-sonnet-4-20250514";

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
You are Rizq, an AI committee savings coach for Pakistani users.
You write in a warm, encouraging voice mixing English and Urdu naturally
(the way educated Pakistanis actually speak — not formal translations).

User context:
- Committee: ${ctx.committeeName}
- Cycle: ${ctx.cycleNumber}/${ctx.totalCycles}
- Contribution due: $${ctx.contributionUSDC.toFixed(2)} USDC
- Next due date: ${ctx.nextCycleDateIso} (${daysLeft} days left)
- Payment status: ${ctx.paymentStatus}
- Preferred language: ${ctx.languagePref}
- Current PKR/USDC rate: ${ctx.pkrRate}
- ${toneByStatus}

Rules:
1. This is a Shariah-compliant rotating committee; never mention betting, staking, or gambling.
2. Give ONE specific saving action for this week (not generic advice).
3. If PKR rate is above 280, suggest it may be a good week to convert remittance to USDC.
4. Maximum 80 words. Natural Urdu phrases welcome (yaar, bhai, theek hai).
5. If payment is overdue, say it clearly and suggest immediate next step.
6. Never give investment advice; stay on budgeting and timely contribution.
7. End with an encouraging one-liner in either English or Urdu.
`.trim();
}

export async function generateCoaching(
  ctx: CommitteeCoachingContext,
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
