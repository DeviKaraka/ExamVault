import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock, Target, AlertTriangle, CheckCircle, Award, BookOpen, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useExamList } from '@/generated/hooks/use-exam';
import { useAttemptList } from '@/generated/hooks/use-attempt';
import { useResponseList } from '@/generated/hooks/use-response';
import { useQuestionList } from '@/generated/hooks/use-question';
import { useSectionList } from '@/generated/hooks/use-section';
import { ExamStatusKeyToLabel } from '@/generated/models/exam-model';
import { QuestionQuestionTypeKeyToLabel } from '@/generated/models/question-model';
import type { Question } from '@/generated/models/question-model';
import type { Attempt } from '@/generated/models/attempt-model';
import type { Section } from '@/generated/models/section-model';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo as useMemoReact } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const chartConfig = {
  passed: { label: 'Passed', color: 'var(--chart-3)' },
  failed: { label: 'Failed', color: 'var(--chart-1)' },
  pending: { label: 'Pending', color: 'var(--chart-4)' },
  score: { label: 'Avg Score', color: 'var(--chart-2)' },
  attempts: { label: 'Attempts', color: 'var(--chart-5)' },
  violations: { label: 'Violations', color: 'var(--destructive)' },
} satisfies ChartConfig;

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  
  const { data: exams, isLoading: examsLoading } = useExamList();
  const { data: attempts } = useAttemptList();
  const { data: responses } = useResponseList();
  const { data: questions } = useQuestionList();
  const { data: sections } = useSectionList();
  // Filter data by selected exam
  const filteredAttempts = useMemo(() => {
    if (!attempts) return [];
    if (selectedExamId === 'all') return attempts;
    return attempts.filter((a: Attempt) => a.exam.id === selectedExamId);
  }, [attempts, selectedExamId]);

  const filteredResponses = useMemo(() => {
    if (!responses) return [];
    const attemptIds = new Set(filteredAttempts.map((a: Attempt) => a.id));
    return responses.filter((r) => attemptIds.has(r.attempt.id));
  }, [responses, filteredAttempts]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const completedAttempts = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4');
    const submittedAttempts = filteredAttempts.filter((a: Attempt) => 
      a.statusKey === 'StatusKey4' || a.statusKey === 'StatusKey1' || a.statusKey === 'StatusKey3'
    );
    
    const avgScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum: number, a: Attempt) => sum + ((a.totalScore || 0) / (a.totalPossible || 1) * 100), 0) / completedAttempts.length
      : 0;
    
    const passingAttempts = completedAttempts.filter((a: Attempt) => {
      const examData = exams?.find((e) => e.id === a.exam.id);
      const scorePercent = (a.totalScore || 0) / (a.totalPossible || 1) * 100;
      return scorePercent >= (examData?.passingScore || 60);
    });
    
    const passRate = completedAttempts.length > 0
      ? (passingAttempts.length / completedAttempts.length) * 100
      : 0;
    
    const totalViolations = filteredAttempts.reduce((sum: number, a: Attempt) => sum + (a.violationCount || 0), 0);
    const cancelledAttempts = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey2').length;
    
    const avgDuration = submittedAttempts.length > 0
      ? submittedAttempts.reduce((sum: number, a: Attempt) => {
          if (a.startedAt && a.submittedAt) {
            return sum + differenceInMinutes(parseISO(a.submittedAt), parseISO(a.startedAt));
          }
          return sum;
        }, 0) / submittedAttempts.length
      : 0;
    
    return {
      totalAttempts: filteredAttempts.length,
      completedAttempts: completedAttempts.length,
      avgScore,
      passRate,
      totalViolations,
      cancelledAttempts,
      avgDuration,
      pendingGrading: filteredResponses.filter((r) => r.gradingStatusKey === 'GradingStatusKey0').length,
    };
  }, [filteredAttempts, filteredResponses, exams]);

  // Score distribution data
  const scoreDistribution = useMemo(() => {
    const completedAttempts = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4');
    const ranges = [
      { range: '0-20%', min: 0, max: 20, count: 0 },
      { range: '21-40%', min: 21, max: 40, count: 0 },
      { range: '41-60%', min: 41, max: 60, count: 0 },
      { range: '61-80%', min: 61, max: 80, count: 0 },
      { range: '81-100%', min: 81, max: 100, count: 0 },
    ];
    
    completedAttempts.forEach((a: Attempt) => {
      const scorePercent = (a.totalScore || 0) / (a.totalPossible || 1) * 100;
      const bucket = ranges.find((r) => scorePercent >= r.min && scorePercent <= r.max);
      if (bucket) bucket.count++;
    });
    
    return ranges;
  }, [filteredAttempts]);

  // Question type performance
  const questionTypePerformance = useMemo(() => {
    if (!questions || !filteredResponses) return [];
    
    const typeStats: Record<string, { total: number; correct: number; label: string }> = {};
    
    filteredResponses.forEach((response) => {
      const question = questions.find((q: Question) => q.id === response.question.id);
      if (!question) return;
      
      const typeKey = question.questionTypeKey;
      const label = QuestionQuestionTypeKeyToLabel[typeKey];
      
      if (!typeStats[typeKey]) {
        typeStats[typeKey] = { total: 0, correct: 0, label };
      }
      
      typeStats[typeKey].total++;
      if (response.isCorrect) {
        typeStats[typeKey].correct++;
      }
    });
    
    return Object.entries(typeStats).map(([key, stats]) => ({
      type: stats.label,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total,
    }));
  }, [questions, filteredResponses]);

  // Question-level difficulty analysis
  const questionDifficultyAnalysis = useMemo(() => {
    if (!questions || !filteredResponses || !exams || !sections) return [];
    
    // Build a section-to-exam map
    const sectionToExam = new Map<string, { examId: string; examTitle: string }>();
    sections.forEach((s: Section) => {
      sectionToExam.set(s.id, { examId: s.exam.id, examTitle: s.exam.title });
    });
    
    const questionStats: Record<string, {
      id: string;
      text: string;
      type: string;
      typeKey: string;
      examTitle: string;
      examId: string;
      totalResponses: number;
      correctResponses: number;
      incorrectResponses: number;
      unanswered: number;
      points: number;
      avgPointsEarned: number;
    }> = {};
    
    // Initialize stats for each question
    questions.forEach((q: Question) => {
      const examInfo = sectionToExam.get(q.section.id);
      questionStats[q.id] = {
        id: q.id,
        text: q.questionText.length > 80 ? q.questionText.substring(0, 80) + '...' : q.questionText,
        type: QuestionQuestionTypeKeyToLabel[q.questionTypeKey],
        typeKey: q.questionTypeKey,
        examTitle: examInfo?.examTitle || 'Unknown Exam',
        examId: examInfo?.examId || '',
        totalResponses: 0,
        correctResponses: 0,
        incorrectResponses: 0,
        unanswered: 0,
        points: q.points,
        avgPointsEarned: 0,
      };
    });
    
    // Tally responses
    filteredResponses.forEach((response) => {
      const qId = response.question.id;
      if (questionStats[qId]) {
        questionStats[qId].totalResponses++;
        if (response.isCorrect) {
          questionStats[qId].correctResponses++;
        } else if (response.answerText && response.answerText.trim() !== '') {
          questionStats[qId].incorrectResponses++;
        } else {
          questionStats[qId].unanswered++;
        }
        questionStats[qId].avgPointsEarned += response.pointsEarned || 0;
      }
    });
    
    // Calculate averages and difficulty
    return Object.values(questionStats)
      .filter((q) => q.totalResponses > 0)
      .map((q) => {
        const correctRate = (q.correctResponses / q.totalResponses) * 100;
        const avgPoints = q.avgPointsEarned / q.totalResponses;
        let difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
        let difficultyColor: string;
        
        if (correctRate >= 80) {
          difficulty = 'Easy';
          difficultyColor = 'bg-chart-3 text-background';
        } else if (correctRate >= 60) {
          difficulty = 'Medium';
          difficultyColor = 'bg-chart-4 text-background';
        } else if (correctRate >= 40) {
          difficulty = 'Hard';
          difficultyColor = 'bg-chart-1 text-background';
        } else {
          difficulty = 'Very Hard';
          difficultyColor = 'bg-destructive text-destructive-foreground';
        }
        
        return {
          ...q,
          correctRate: Math.round(correctRate),
          avgPoints: Math.round(avgPoints * 10) / 10,
          difficulty,
          difficultyColor,
        };
      })
      .sort((a, b) => a.correctRate - b.correctRate); // Sort by difficulty (hardest first)
  }, [questions, filteredResponses, exams, sections]);

  // Difficulty distribution summary
  const difficultyDistribution = useMemo(() => {
    const distribution = {
      'Very Hard': { count: 0, color: 'var(--destructive)' },
      'Hard': { count: 0, color: 'var(--chart-1)' },
      'Medium': { count: 0, color: 'var(--chart-4)' },
      'Easy': { count: 0, color: 'var(--chart-3)' },
    };
    
    questionDifficultyAnalysis.forEach((q) => {
      distribution[q.difficulty].count++;
    });
    
    return Object.entries(distribution).map(([name, data]) => ({
      name,
      value: data.count,
      color: data.color,
    })).filter((d) => d.value > 0);
  }, [questionDifficultyAnalysis]);

  // Group questions by exam for collapsible view
  const questionsByExam = useMemo(() => {
    const grouped: Record<string, typeof questionDifficultyAnalysis> = {};
    questionDifficultyAnalysis.forEach((q) => {
      if (!grouped[q.examId]) {
        grouped[q.examId] = [];
      }
      grouped[q.examId].push(q);
    });
    return grouped;
  }, [questionDifficultyAnalysis]);

  // Expanded exams state
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  // Exam performance comparison
  const examPerformance = useMemo(() => {
    if (!exams || !attempts) return [];
    
    return exams.map((exam) => {
      const examAttempts = attempts.filter((a: Attempt) => a.exam.id === exam.id);
      const completedAttempts = examAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4');
      
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum: number, a: Attempt) => sum + ((a.totalScore || 0) / (a.totalPossible || 1) * 100), 0) / completedAttempts.length
        : 0;
      
      return {
        name: exam.title.length > 15 ? exam.title.substring(0, 15) + '...' : exam.title,
        fullName: exam.title,
        attempts: examAttempts.length,
        avgScore: Math.round(avgScore),
        status: exam.statusKey,
      };
    }).slice(0, 8);
  }, [exams, attempts]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const completed = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4').length;
    const inProgress = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey0').length;
    const cancelled = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey2').length;
    const pending = filteredAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey3' || a.statusKey === 'StatusKey1').length;
    
    return [
      { name: 'Completed', value: completed, color: 'var(--chart-3)' },
      { name: 'In Progress', value: inProgress, color: 'var(--chart-2)' },
      { name: 'Pending Review', value: pending, color: 'var(--chart-4)' },
      { name: 'Cancelled', value: cancelled, color: 'var(--destructive)' },
    ].filter((d) => d.value > 0);
  }, [filteredAttempts]);

  // Top performers
  const topPerformers = useMemo(() => {
    return filteredAttempts
      .filter((a: Attempt) => a.statusKey === 'StatusKey4' && a.totalScore !== undefined)
      .sort((a: Attempt, b: Attempt) => {
        const aPercent = (a.totalScore || 0) / (a.totalPossible || 1);
        const bPercent = (b.totalScore || 0) / (b.totalPossible || 1);
        return bPercent - aPercent;
      })
      .slice(0, 5);
  }, [filteredAttempts]);

  // Violations by exam
  const violationsByExam = useMemo(() => {
    if (!exams || !attempts) return [];
    
    return exams.map((exam) => {
      const examAttempts = attempts.filter((a: Attempt) => a.exam.id === exam.id);
      const totalViolations = examAttempts.reduce((sum: number, a: Attempt) => sum + (a.violationCount || 0), 0);
      
      return {
        name: exam.title.length > 12 ? exam.title.substring(0, 12) + '...' : exam.title,
        violations: totalViolations,
        cancelled: examAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey2').length,
      };
    }).filter((e) => e.violations > 0 || e.cancelled > 0);
  }, [exams, attempts]);

  const statsCards = [
    { label: 'Total Attempts', value: metrics.totalAttempts, icon: Users, color: 'text-chart-2', description: 'All exam attempts' },
    { label: 'Avg Score', value: `${Math.round(metrics.avgScore)}%`, icon: Target, color: 'text-chart-3', description: 'Across completed exams' },
    { label: 'Pass Rate', value: `${Math.round(metrics.passRate)}%`, icon: TrendingUp, color: 'text-chart-5', description: 'Meeting passing threshold' },
    { label: 'Avg Duration', value: `${Math.round(metrics.avgDuration)}m`, icon: Clock, color: 'text-chart-4', description: 'Time to complete' },
    { label: 'Violations', value: metrics.totalViolations, icon: AlertTriangle, color: 'text-destructive', description: 'Proctoring alerts' },
    { label: 'Pending Review', value: metrics.pendingGrading, icon: BookOpen, color: 'text-primary', description: 'Needs manual grading' },
  ];

  if (examsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>

        {/* Question Difficulty Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Question Difficulty Analysis
              </CardTitle>
              <CardDescription>Per-question performance metrics with difficulty classification</CardDescription>
            </CardHeader>
            <CardContent>
              {questionDifficultyAnalysis.length > 0 ? (
                <div className="space-y-6">
                  {/* Difficulty Distribution Overview */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-card-foreground mb-3">Difficulty Distribution</h4>
                      <div className="flex items-center gap-4">
                        <div className="h-[140px] w-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={difficultyDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {difficultyDistribution.map((entry, index) => (
                                  <Cell key={`diff-cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {difficultyDistribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-card-foreground">{item.name}</span>
                              </div>
                              <span className="font-semibold text-card-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-card-foreground mb-3">Summary Statistics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-2xl font-bold text-card-foreground">{questionDifficultyAnalysis.length}</p>
                          <p className="text-xs text-muted-foreground">Questions Analyzed</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-2xl font-bold text-card-foreground">
                            {Math.round(questionDifficultyAnalysis.reduce((sum, q) => sum + q.correctRate, 0) / questionDifficultyAnalysis.length)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Correct Rate</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-2xl font-bold text-destructive">{questionDifficultyAnalysis.filter((q) => q.correctRate < 40).length}</p>
                          <p className="text-xs text-muted-foreground">Problematic Questions</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-2xl font-bold text-chart-3">{questionDifficultyAnalysis.filter((q) => q.correctRate >= 80).length}</p>
                          <p className="text-xs text-muted-foreground">Easy Questions</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hardest Questions Highlight */}
                  <div>
                    <h4 className="text-sm font-medium text-card-foreground mb-3">Top 5 Hardest Questions</h4>
                    <div className="space-y-2">
                      {questionDifficultyAnalysis.slice(0, 5).map((q, index) => (
                        <div key={q.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-destructive">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-card-foreground">{q.text}</p>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{q.type}</Badge>
                                <span className="text-xs text-muted-foreground">{q.examTitle}</span>
                                <Badge className={`${q.difficultyColor} text-xs`}>{q.difficulty}</Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-destructive">{q.correctRate}%</p>
                              <p className="text-xs text-muted-foreground">correct</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-1.5 rounded bg-chart-3/10">
                              <p className="font-semibold text-chart-3">{q.correctResponses}</p>
                              <p className="text-muted-foreground">Correct</p>
                            </div>
                            <div className="p-1.5 rounded bg-destructive/10">
                              <p className="font-semibold text-destructive">{q.incorrectResponses}</p>
                              <p className="text-muted-foreground">Incorrect</p>
                            </div>
                            <div className="p-1.5 rounded bg-muted">
                              <p className="font-semibold text-muted-foreground">{q.unanswered}</p>
                              <p className="text-muted-foreground">Skipped</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Questions by Exam (Collapsible) */}
                  <div>
                    <h4 className="text-sm font-medium text-card-foreground mb-3">All Questions by Exam</h4>
                    <div className="space-y-2">
                      {Object.entries(questionsByExam).map(([examId, examQuestions]) => {
                        const isExpanded = expandedExams.has(examId);
                        const examTitle = examQuestions[0]?.examTitle || 'Unknown Exam';
                        const avgCorrectRate = Math.round(examQuestions.reduce((sum, q) => sum + q.correctRate, 0) / examQuestions.length);
                        
                        return (
                          <Collapsible key={examId} open={isExpanded} onOpenChange={(open) => {
                            const newSet = new Set(expandedExams);
                            if (open) newSet.add(examId);
                            else newSet.delete(examId);
                            setExpandedExams(newSet);
                          }}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-secondary/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                  <span className="font-medium text-card-foreground">{examTitle}</span>
                                  <Badge variant="outline" className="text-xs">{examQuestions.length} questions</Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">Avg: {avgCorrectRate}% correct</span>
                                  <Progress value={avgCorrectRate} className="w-20 h-2" />
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Question</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Type</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Points</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Correct</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Incorrect</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Skipped</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Rate</th>
                                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Difficulty</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {examQuestions.map((q) => (
                                      <tr key={q.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                        <td className="py-2 px-3 max-w-[300px]">
                                          <p className="text-card-foreground truncate">{q.text}</p>
                                        </td>
                                        <td className="text-center py-2 px-3">
                                          <Badge variant="outline" className="text-xs">{q.type}</Badge>
                                        </td>
                                        <td className="text-center py-2 px-3 font-mono text-card-foreground">{q.points}</td>
                                        <td className="text-center py-2 px-3 font-mono text-chart-3">{q.correctResponses}</td>
                                        <td className="text-center py-2 px-3 font-mono text-destructive">{q.incorrectResponses}</td>
                                        <td className="text-center py-2 px-3 font-mono text-muted-foreground">{q.unanswered}</td>
                                        <td className="text-center py-2 px-3">
                                          <div className="flex items-center justify-center gap-2">
                                            <Progress value={q.correctRate} className="w-12 h-1.5" />
                                            <span className="font-mono text-xs text-card-foreground">{q.correctRate}%</span>
                                          </div>
                                        </td>
                                        <td className="text-center py-2 px-3">
                                          <Badge className={`${q.difficultyColor} text-xs`}>{q.difficulty}</Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No question response data available</p>
                  <p className="text-xs mt-1">Data will appear after students complete exams</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Performance insights and exam statistics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams?.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map(({ label, value, icon: Icon, color, description }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' as const }}
            >
              <Card className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-2xl font-bold text-card-foreground">{value}</span>
                  </div>
                  <p className="text-xs font-medium text-card-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Score Distribution
                </CardTitle>
                <CardDescription>How students scored across exams</CardDescription>
              </CardHeader>
              <CardContent>
                {scoreDistribution.some((d) => d.count > 0) ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={scoreDistribution} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="Students" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No completed exams yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Attempt Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Attempt Status
                </CardTitle>
                <CardDescription>Current status of all attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {statusDistribution.map((status) => (
                        <div key={status.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                            <span className="text-sm text-card-foreground">{status.name}</span>
                          </div>
                          <span className="font-semibold text-card-foreground">{status.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No attempts recorded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Question Type Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Performance by Question Type
                </CardTitle>
                <CardDescription>Accuracy rate for each question type</CardDescription>
              </CardHeader>
              <CardContent>
                {questionTypePerformance.length > 0 ? (
                  <div className="space-y-4">
                    {questionTypePerformance.map((item) => (
                      <div key={item.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-card-foreground">{item.type}</span>
                          <span className="text-muted-foreground">{item.accuracy}% ({item.total} responses)</span>
                        </div>
                        <Progress value={item.accuracy} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No response data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Exam Performance Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Exam Comparison
                </CardTitle>
                <CardDescription>Average scores across different exams</CardDescription>
              </CardHeader>
              <CardContent>
                {examPerformance.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={examPerformance} accessibilityLayer layout="vertical">
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="avgScore" fill="var(--chart-3)" radius={[0, 4, 4, 0]} name="Avg Score (%)" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No exam data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-chart-4" />
                  Top Performers
                </CardTitle>
                <CardDescription>Highest scoring students</CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {topPerformers.map((attempt, index) => {
                      const scorePercent = Math.round(((attempt.totalScore || 0) / (attempt.totalPossible || 1)) * 100);
                      return (
                        <div key={attempt.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-chart-4 text-background' :
                            index === 1 ? 'bg-chart-5 text-background' :
                            index === 2 ? 'bg-chart-2 text-background' :
                            'bg-secondary text-secondary-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-card-foreground truncate">{attempt.studentName}</p>
                            <p className="text-xs text-muted-foreground truncate">{attempt.exam.title}</p>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {scorePercent}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-center">
                    <div>
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No completed exams yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Violations Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Proctoring Violations
                </CardTitle>
                <CardDescription>Violations and auto-cancellations by exam</CardDescription>
              </CardHeader>
              <CardContent>
                {violationsByExam.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={violationsByExam} accessibilityLayer>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="violations" fill="var(--chart-4)" radius={[4, 4, 0, 0]} name="Violations" />
                      <Bar dataKey="cancelled" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Cancelled" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-center">
                    <div>
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-chart-3" />
                      <p>No violations recorded</p>
                      <p className="text-xs mt-1">All exams conducted fairly</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Exam Details Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Exam Summary
              </CardTitle>
              <CardDescription>Overview of all exams with key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {exams && exams.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Exam</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Attempts</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Completed</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Avg Score</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Pass Rate</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Violations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map((exam) => {
                        const examAttempts = attempts?.filter((a: Attempt) => a.exam.id === exam.id) || [];
                        const completedAttempts = examAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4');
                        const avgScore = completedAttempts.length > 0
                          ? completedAttempts.reduce((sum: number, a: Attempt) => sum + ((a.totalScore || 0) / (a.totalPossible || 1) * 100), 0) / completedAttempts.length
                          : 0;
                        const passedCount = completedAttempts.filter((a: Attempt) => {
                          const scorePercent = (a.totalScore || 0) / (a.totalPossible || 1) * 100;
                          return scorePercent >= exam.passingScore;
                        }).length;
                        const passRate = completedAttempts.length > 0 ? (passedCount / completedAttempts.length) * 100 : 0;
                        const violations = examAttempts.reduce((sum: number, a: Attempt) => sum + (a.violationCount || 0), 0);

                        return (
                          <tr key={exam.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-medium text-card-foreground">{exam.title}</p>
                                <p className="text-xs text-muted-foreground">Code: {exam.accessCode}</p>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <Badge variant={
                                exam.statusKey === 'StatusKey1' ? 'default' :
                                exam.statusKey === 'StatusKey0' ? 'secondary' : 'outline'
                              }>
                                {ExamStatusKeyToLabel[exam.statusKey]}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-2 font-mono text-card-foreground">{examAttempts.length}</td>
                            <td className="text-center py-3 px-2 font-mono text-card-foreground">{completedAttempts.length}</td>
                            <td className="text-center py-3 px-2">
                              <span className={`font-mono ${avgScore >= exam.passingScore ? 'text-chart-3' : 'text-destructive'}`}>
                                {Math.round(avgScore)}%
                              </span>
                            </td>
                            <td className="text-center py-3 px-2">
                              <span className={`font-mono ${passRate >= 50 ? 'text-chart-3' : 'text-destructive'}`}>
                                {Math.round(passRate)}%
                              </span>
                            </td>
                            <td className="text-center py-3 px-2">
                              {violations > 0 ? (
                                <Badge variant="destructive" className="font-mono">{violations}</Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No exams created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
