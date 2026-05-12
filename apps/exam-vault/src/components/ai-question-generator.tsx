/**
 * ai-question-generator.tsx — AI-Powered Question Generation UI
 *
 * Security fix: Azure OpenAI API key is NO LONGER called client-side.
 * All requests go through POST /api/generate-questions (Azure Function proxy).
 * This prevents credential leakage in the browser.
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Spinner } from "./ui/spinner";

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType = "mcq" | "coding" | "descriptive" | "aptitude" | "verbal";
type DifficultyLevel = "easy" | "medium" | "hard";

interface GenerateRequest {
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  count: number;
}

interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  question: string;
  options?: string[];          // MCQ
  correctAnswer?: string;
  sampleAnswer?: string;       // Descriptive
  testCases?: { input: string; output: string }[]; // Coding
  keywords?: string[];         // Descriptive keywords
  marks: number;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIQuestionGenerator({
  onQuestionsGenerated,
}: {
  onQuestionsGenerated?: (questions: GeneratedQuestion[]) => void;
}) {
  const [form, setForm] = useState<GenerateRequest>({
    subject: "",
    topic: "",
    difficulty: "medium",
    questionType: "mcq",
    count: 5,
  });

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function handleGenerate() {
    if (!form.subject.trim() || !form.topic.trim()) {
      setError("Please enter both subject and topic.");
      return;
    }

    setLoading(true);
    setError(null);
    setElapsed(null);
    const start = Date.now();

    try {
      // ✅ API key stays server-side — this calls the Azure Function proxy
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data: { questions: GeneratedQuestion[] } = await res.json();
      setQuestions(data.questions);
      setElapsed(Math.round((Date.now() - start) / 1000));
      onQuestionsGenerated?.(data.questions);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof GenerateRequest>(key: K, value: GenerateRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span> AI Question Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                className="mt-1"
                placeholder="e.g. Computer Science"
                value={form.subject}
                onChange={(e) => updateForm("subject", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Topic</label>
              <Input
                className="mt-1"
                placeholder="e.g. Binary Trees"
                value={form.topic}
                onChange={(e) => updateForm("topic", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Question Type</label>
              <Select
                value={form.questionType}
                onValueChange={(v) => updateForm("questionType", v as QuestionType)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="aptitude">Aptitude</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty</label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => updateForm("difficulty", v as DifficultyLevel)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Number of Questions</label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={20}
                value={form.count}
                onChange={(e) => updateForm("count", Number(e.target.value))}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating with Azure OpenAI…
                </>
              ) : (
                "Generate Questions"
              )}
            </Button>
            {elapsed !== null && (
              <span className="text-xs text-muted-foreground">
                Generated in {elapsed}s
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Questions Preview */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">
            Generated Questions ({questions.length})
          </h3>
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium">Q{i + 1}. {q.question}</span>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="outline">{q.type}</Badge>
                    <Badge
                      variant={
                        q.difficulty === "hard"
                          ? "destructive"
                          : q.difficulty === "medium"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {q.difficulty}
                    </Badge>
                    <Badge variant="outline">{q.marks}m</Badge>
                  </div>
                </div>

                {q.options && (
                  <ul className="ml-4 space-y-1">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className={`text-sm ${
                          opt === q.correctAnswer
                            ? "text-green-700 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(65 + j)}. {opt}
                        {opt === q.correctAnswer && " ✓"}
                      </li>
                    ))}
                  </ul>
                )}

                {q.sampleAnswer && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Sample: {q.sampleAnswer.slice(0, 120)}…
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={() => onQuestionsGenerated?.(questions)}>
            Add All to Question Bank
          </Button>
        </div>
      )}
    </div>
  );
}
