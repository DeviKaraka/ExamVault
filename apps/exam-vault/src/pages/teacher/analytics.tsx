/**
 * analytics.tsx — Teacher Analytics & Performance Dashboard
 *
 * Features:
 *  - Cohort performance overview
 *  - Score distribution chart
 *  - Topic mastery heatmap
 *  - AI-generated natural language summary
 *  - Power BI Embedded iframe (when VITE_POWERBI_EMBED_URL is set)
 *  - Exportable reports
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Progress } from "../../components/ui/progress";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExamSummary {
  id: string;
  title: string;
  date: string;
  totalStudents: number;
  avgScore: number;
  passRate: number;
  topicMastery: Record<string, number>;
}

interface ScoreBand {
  label: string;
  count: number;
  color: string;
}

// ─── Mock Data (replace with useExam / useAttempt hooks) ────────────────────

const MOCK_EXAMS: ExamSummary[] = [
  {
    id: "e1",
    title: "Data Structures Mid-Term",
    date: "2026-05-10",
    totalStudents: 45,
    avgScore: 68.4,
    passRate: 78,
    topicMastery: {
      "Arrays & Strings": 82,
      "Linked Lists": 71,
      "Trees & Graphs": 55,
      "Sorting Algorithms": 74,
      "Dynamic Programming": 43,
    },
  },
  {
    id: "e2",
    title: "OOP Concepts Quiz",
    date: "2026-04-28",
    totalStudents: 52,
    avgScore: 75.1,
    passRate: 88,
    topicMastery: {
      Encapsulation: 90,
      Inheritance: 85,
      Polymorphism: 72,
      Abstraction: 68,
      Interfaces: 60,
    },
  },
];

const SCORE_BANDS: ScoreBand[] = [
  { label: "90–100", count: 4, color: "#22c55e" },
  { label: "75–89",  count: 12, color: "#84cc16" },
  { label: "60–74",  count: 16, color: "#eab308" },
  { label: "45–59",  count: 9,  color: "#f97316" },
  { label: "0–44",   count: 4,  color: "#ef4444" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreDistributionChart({ bands }: { bands: ScoreBand[] }) {
  const max = Math.max(...bands.map((b) => b.count));
  return (
    <div className="space-y-2">
      {bands.map((band) => (
        <div key={band.label} className="flex items-center gap-3">
          <span className="text-xs w-16 text-right font-mono">{band.label}</span>
          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
              style={{
                width: `${(band.count / max) * 100}%`,
                backgroundColor: band.color,
                minWidth: band.count > 0 ? "2rem" : 0,
              }}
            >
              <span className="text-xs font-bold text-white">{band.count}</span>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-right">
        students per score band
      </p>
    </div>
  );
}

function TopicMasteryHeatmap({ mastery }: { mastery: Record<string, number> }) {
  const getMasteryColor = (score: number) => {
    if (score >= 80) return "bg-green-500 text-white";
    if (score >= 65) return "bg-yellow-400 text-black";
    if (score >= 50) return "bg-orange-400 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(mastery).map(([topic, score]) => (
        <div key={topic} className="flex items-center justify-between gap-2">
          <span className="text-sm truncate flex-1">{topic}</span>
          <div className="flex items-center gap-2">
            <Progress value={score} className="w-24 h-2" />
            <Badge className={`text-xs w-12 justify-center ${getMasteryColor(score)}`}>
              {score}%
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function AISummaryCard({ exam }: { exam: ExamSummary }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary(
        `Cohort of ${exam.totalStudents} students achieved an average of ${exam.avgScore.toFixed(1)}% ` +
        `with a ${exam.passRate}% pass rate. Topics needing most attention: ` +
        Object.entries(exam.topicMastery)
          .sort(([, a], [, b]) => a - b)
          .slice(0, 2)
          .map(([t]) => t)
          .join(" and ") + "."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">AI Performance Summary</CardTitle>
        <Button size="sm" variant="outline" onClick={generateSummary} disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Click Generate to create an AI-written performance summary for this exam.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PowerBISection() {
  const embedUrl =
    typeof import.meta !== "undefined"
      ? (import.meta as Record<string, Record<string, string>>).env?.VITE_POWERBI_EMBED_URL
      : undefined;

  if (embedUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Power BI Embedded Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border" style={{ height: 500 }}>
            <iframe
              title="Power BI Report"
              src={embedUrl}
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Power BI Embedded Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-sm font-medium mb-1">Power BI dashboard not configured</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            Set <code className="bg-muted px-1 rounded">VITE_POWERBI_EMBED_URL</code> to embed
            a live Microsoft Power BI report with drill-down analytics.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://learn.microsoft.com/en-us/power-bi/developer/embedded/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Setup Power BI Embed →
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Analytics() {
  const [selectedExamId, setSelectedExamId] = useState(MOCK_EXAMS[0].id);
  const selectedExam = MOCK_EXAMS.find((e) => e.id === selectedExamId) ?? MOCK_EXAMS[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Cohort performance and topic mastery insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_EXAMS.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedExam.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedExam.avgScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedExam.passRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Exam Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{selectedExam.date}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="powerbi">Power BI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreDistributionChart bands={SCORE_BANDS} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Topic Mastery</CardTitle>
              </CardHeader>
              <CardContent>
                <TopicMasteryHeatmap mastery={selectedExam.topicMastery} />
              </CardContent>
            </Card>
          </div>

          <AISummaryCard exam={selectedExam} />
        </TabsContent>

        <TabsContent value="powerbi" className="mt-4">
          <PowerBISection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
