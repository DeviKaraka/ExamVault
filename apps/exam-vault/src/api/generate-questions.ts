/**
 * generate-questions.ts — Azure Function: AI Question Generation Proxy
 *
 * Keeps AZURE_OPENAI_API_KEY server-side.
 * The React frontend calls POST /api/generate-questions.
 *
 * Expected request body:
 *   { subject, topic, difficulty, questionType, count }
 *
 * Returns:
 *   { questions: GeneratedQuestion[] }
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

const AZURE_OPENAI_ENDPOINT   = process.env.AZURE_OPENAI_ENDPOINT ?? "";
const AZURE_OPENAI_API_KEY    = process.env.AZURE_OPENAI_API_KEY ?? "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
const AZURE_OPENAI_API_VERSION = "2024-02-01";

interface GenerateRequest {
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "mcq" | "coding" | "descriptive" | "aptitude" | "verbal";
  count: number;
}

function buildPrompt(req: GenerateRequest): string {
  const typeInstructions: Record<string, string> = {
    mcq: `Each question must have 4 options (A-D) and one correct answer. Include "options": [...], "correctAnswer": "..."`,
    coding: `Each question must have 2-3 test cases. Include "testCases": [{"input": "...", "output": "..."}]`,
    descriptive: `Each question needs a sample answer and 5 keywords. Include "sampleAnswer": "...", "keywords": [...]`,
    aptitude: `Numerical or logical reasoning questions. Include "correctAnswer": "..."`,
    verbal: `Reading comprehension or grammar questions. Include "options": [...], "correctAnswer": "..."`,
  };

  return `Generate ${req.count} ${req.difficulty} ${req.questionType} questions on the topic "${req.topic}" in the subject "${req.subject}".

${typeInstructions[req.questionType]}

Respond ONLY with a valid JSON array (no markdown fences, no extra text). Each element must have:
- "id": unique string like "q1", "q2"...
- "type": "${req.questionType}"
- "difficulty": "${req.difficulty}"
- "question": the question text
- "marks": integer (easy=1, medium=2, hard=3)
- Plus the type-specific fields above.

Return ONLY the JSON array.`;
}

export async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (request.method !== "POST") {
    return { status: 405, body: "Method Not Allowed" };
  }

  try {
    const body = await request.json() as GenerateRequest;

    if (!body.subject || !body.topic || !body.count) {
      return {
        status: 400,
        body: JSON.stringify({ error: "subject, topic, and count are required" }),
      };
    }

    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator. Always respond with valid JSON only.",
          },
          { role: "user", content: buildPrompt(body) },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      context.error("Azure OpenAI error:", errText);
      return { status: 502, body: JSON.stringify({ error: "AI service unavailable" }) };
    }

    const aiData = await aiRes.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "[]";
    const clean = content.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(clean);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    };
  } catch (err) {
    context.error("generate-questions error:", err);
    return {
      status: 500,
      body: JSON.stringify({ error: "Question generation failed", details: String(err) }),
    };
  }
}

export default { handler };
