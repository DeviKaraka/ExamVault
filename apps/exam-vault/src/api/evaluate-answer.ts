/**
 * evaluate-answer.ts — Azure OpenAI Answer Evaluation Proxy
 *
 * Deploy as an Azure Function or Express route at POST /api/evaluate-answer
 *
 * This keeps AZURE_OPENAI_API_KEY server-side so it is NEVER exposed
 * to the browser (fixes the critical security finding in the evaluation).
 *
 * Expected request body:
 *   { sampleAnswer, rubric, maxScore, studentAnswer }
 *
 * Returns:
 *   { score: number, feedback: string }
 */

// ─── For Azure Functions (default export) ────────────────────────────────────
// If using Express, see the Express adapter at the bottom of this file.

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? "";
const AZURE_OPENAI_API_KEY  = process.env.AZURE_OPENAI_API_KEY ?? "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
const AZURE_OPENAI_API_VERSION = "2024-02-01";

interface EvaluationRequest {
  sampleAnswer: string;
  rubric: string;
  maxScore: number;
  studentAnswer: string;
}

interface EvaluationResponse {
  score: number;
  feedback: string;
}

async function callAzureOpenAI(body: EvaluationRequest): Promise<EvaluationResponse> {
  const systemPrompt = `You are an impartial academic examiner. 
Evaluate the student's answer against the sample answer and rubric provided.
Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{"score": <number>, "feedback": "<one or two sentences of constructive feedback>"}`;

  const userPrompt = `
Rubric: ${body.rubric}
Max Score: ${body.maxScore}

Sample Answer:
${body.sampleAnswer}

Student Answer:
${body.studentAnswer}

Return ONLY the JSON object.`;

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Strip potential ```json fences before parsing
  const clean = content.replace(/```json|```/g, "").trim();
  const parsed: EvaluationResponse = JSON.parse(clean);

  // Clamp score to maxScore
  parsed.score = Math.min(Math.max(parsed.score, 0), body.maxScore);
  return parsed;
}

// ─── Azure Functions Handler ─────────────────────────────────────────────────

export async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (request.method !== "POST") {
    return { status: 405, body: "Method Not Allowed" };
  }

  try {
    const body: EvaluationRequest = await request.json() as EvaluationRequest;

    if (!body.studentAnswer || !body.sampleAnswer) {
      return { status: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    const result = await callAzureOpenAI(body);
    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    context.error("evaluate-answer error:", err);
    return {
      status: 500,
      body: JSON.stringify({ error: "Evaluation failed", details: String(err) }),
    };
  }
}

export default { handler };

// ─── Express Adapter (alternative) ──────────────────────────────────────────
// Uncomment if using Express instead of Azure Functions:
//
// import { Router } from "express";
// export const evaluateAnswerRouter = Router();
// evaluateAnswerRouter.post("/api/evaluate-answer", async (req, res) => {
//   try {
//     const result = await callAzureOpenAI(req.body);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });
