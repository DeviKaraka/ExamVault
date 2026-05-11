import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "mcq" | "coding" | "descriptive" | "aptitude" | "verbal";
export type DifficultyLevel = "easy" | "medium" | "hard";

export interface MCQOption {
  id: string;
  text: string;
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: MCQOption[];          // MCQ only
  correctAnswer?: string;         // MCQ option id or descriptive answer
  explanation?: string;
  marks: number;
  difficulty: DifficultyLevel;
  topic: string;
  codeTemplate?: string;          // coding questions
  testCases?: { input: string; expected: string }[];
}

interface GeneratorFormState {
  subject: string;
  topic: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
}

interface AIQuestionGeneratorProps {
  onQuestionsGenerated?: (questions: GeneratedQuestion[]) => void;
}

// ── Azure OpenAI helper ───────────────────────────────────────────────────────

const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT as string;
const AZURE_OPENAI_API_KEY  = import.meta.env.VITE_AZURE_OPENAI_API_KEY  as string;
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT ?? "gpt-4";
const AZURE_OPENAI_API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION ?? "2024-02-01";

async function callAzureOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error(
      "Azure OpenAI credentials are not configured. " +
      "Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in your .env file."
    );
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
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
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Azure OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Azure OpenAI");
  return content;
}

function buildSystemPrompt(): string {
  return `You are ExamVault's AI question generation engine.
Always respond with a valid JSON object matching this exact schema:
{
  "questions": [
    {
      "id": "string (uuid-like)",
      "type": "mcq | coding | descriptive | aptitude | verbal",
      "text": "string",
      "options": [{ "id": "a|b|c|d", "text": "string" }],   // MCQ only
      "correctAnswer": "string",
      "explanation": "string",
      "marks": number,
      "difficulty": "easy | medium | hard",
      "topic": "string",
      "codeTemplate": "string",                              // coding only
      "testCases": [{ "input": "string", "expected": "string" }]  // coding only
    }
  ]
}
Rules:
- For MCQ: always include exactly 4 options (a, b, c, d) and set correctAnswer to the option id.
- For coding: include a codeTemplate stub and at least 2 testCases.
- For descriptive/verbal: omit options, set correctAnswer to a model answer.
- marks should be 1 for easy, 2 for medium, 3 for hard.
- Do NOT wrap the JSON in markdown code fences.`;
}

function buildUserPrompt(form: GeneratorFormState): string {
  return `Generate ${form.count} ${form.difficulty} ${form.questionType} question(s) for:
Subject: ${form.subject}
Topic: ${form.topic}
Ensure each question is unique, educationally sound, and appropriate for an academic exam.`;
}

function parseQuestionsFromResponse(raw: string): GeneratedQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    const questions: GeneratedQuestion[] = parsed.questions ?? parsed ?? [];
    // Assign proper IDs if missing
    return questions.map((q, i) => ({
      ...q,
      id: q.id || `ai-q-${Date.now()}-${i}`,
    }));
  } catch {
    throw new Error("Failed to parse AI response as JSON. Raw response: " + raw.slice(0, 200));
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AIQuestionGenerator({ onQuestionsGenerated }: AIQuestionGeneratorProps) {
  const [form, setForm] = useState<GeneratorFormState>({
    subject: "",
    topic: "",
    questionType: "mcq",
    difficulty: "medium",
    count: 5,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.subject.trim() || !form.topic.trim()) {
      toast.error("Please fill in Subject and Topic before generating.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedQuestions([]);

    try {
      const rawResponse = await callAzureOpenAI(
        buildSystemPrompt(),
        buildUserPrompt(form)
      );

      const questions = parseQuestionsFromResponse(rawResponse);

      if (questions.length === 0) {
        throw new Error("AI returned no questions. Try adjusting your inputs.");
      }

      setGeneratedQuestions(questions);
      onQuestionsGenerated?.(questions);
      toast.success(`Successfully generated ${questions.length} question(s) using Azure OpenAI.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      toast.error("Question generation failed: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setGeneratedQuestions([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Question Generator
            <Badge variant="secondary" className="text-xs">Azure OpenAI</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Subject *</label>
              <Input
                placeholder="e.g. Data Structures"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Topic *</label>
              <Input
                placeholder="e.g. Binary Trees"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Question Type</label>
              <Select
                value={form.questionType}
                onValueChange={(v) => setForm((f) => ({ ...f, questionType: v as QuestionType }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="aptitude">Aptitude</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Difficulty</label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as DifficultyLevel }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Number of Questions</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.count}
                onChange={(e) =>
                  setForm((f) => ({ ...f, count: Math.max(1, Math.min(20, Number(e.target.value))) }))
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Generating with Azure OpenAI…
              </>
            ) : (
              "Generate Questions"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Error state ── */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive font-medium">Generation Error</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            {error.includes("credentials") && (
              <p className="text-xs text-muted-foreground mt-2">
                Add <code>VITE_AZURE_OPENAI_ENDPOINT</code> and{" "}
                <code>VITE_AZURE_OPENAI_API_KEY</code> to your <code>.env</code> file.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Results ── */}
      {generatedQuestions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Generated Questions ({generatedQuestions.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClearResults}>
              Clear
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedQuestions.map((q, index) => (
              <QuestionCard key={q.id} question={q} index={index} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Question display card ─────────────────────────────────────────────────────

function QuestionCard({ question, index }: { question: GeneratedQuestion; index: number }) {
  const difficultyColor: Record<DifficultyLevel, string> = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          Q{index + 1}. {question.text}
        </p>
        <div className="flex gap-2 shrink-0">
          <Badge variant="outline" className="text-xs capitalize">{question.type}</Badge>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[question.difficulty]}`}>
            {question.difficulty}
          </span>
          <Badge variant="secondary" className="text-xs">{question.marks} mark{question.marks !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {question.options && (
        <ul className="space-y-1 pl-2">
          {question.options.map((opt) => (
            <li
              key={opt.id}
              className={`text-sm ${opt.id === question.correctAnswer ? "text-green-700 font-medium" : "text-muted-foreground"}`}
            >
              ({opt.id}) {opt.text}
              {opt.id === question.correctAnswer && " ✓"}
            </li>
          ))}
        </ul>
      )}

      {question.type === "coding" && question.codeTemplate && (
        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
          {question.codeTemplate}
        </pre>
      )}

      {question.type !== "mcq" && question.correctAnswer && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <span className="font-medium">Model Answer:</span> {question.correctAnswer}
        </div>
      )}

      {question.explanation && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Explanation:</span> {question.explanation}
        </div>
      )}
    </div>
  );
}

export default AIQuestionGenerator;
