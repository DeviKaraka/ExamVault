import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  User,
  Mail,
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  FileText,
  GraduationCap,
  Medal,
  Percent,
  Trophy,
  Zap,
  Brain,
  Timer,
  Eye,
  Bell,
  BellRing,
} from 'lucide-react';
import { useAtom, useSetAtom } from 'jotai';
import { notificationsAtom, markAllNotificationsReadAtom, type StudentNotification } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAttemptList } from '@/generated/hooks/use-attempt';
import { useExamList } from '@/generated/hooks/use-exam';
import { useSectionList } from '@/generated/hooks/use-section';
import type { Attempt } from '@/generated/models/attempt-model';
import type { Exam } from '@/generated/models/exam-model';
import type { Section } from '@/generated/models/section-model';
import { SectionSectionTypeKeyToLabel } from '@/generated/models/section-model';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts';

interface StudentInfo {
  name: string;
  email: string;
  studentId: string;
}

const chartConfig = {
  score: { label: 'Score', color: 'var(--chart-1)' },
  average: { label: 'Average', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const categoryConfig = {
  percentage: { label: 'Performance', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export default function StudentProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Get student info from session
  const studentData = sessionStorage.getItem('examStudent');
  const student: StudentInfo | null = studentData ? JSON.parse(studentData) : null;

  // Fetch all data
  const { data: allAttempts = [] } = useAttemptList();
  const { data: exams = [] } = useExamList();
  const { data: sections = [] } = useSectionList();

  // Notifications
  const [notifications] = useAtom(notificationsAtom);
  const markAllRead = useSetAtom(markAllNotificationsReadAtom);

  // Filter notifications for this student
  const studentNotifications = useMemo(() => {
    if (!student) return [];
    return notifications.filter(
      (n: StudentNotification) => n.studentEmail.toLowerCase() === student.email.toLowerCase()
    );
  }, [notifications, student]);

  const unreadCount = studentNotifications.filter((n: StudentNotification) => !n.read).length;

  // Filter attempts for this student
  const studentAttempts = useMemo(() => {
    if (!student) return [];
    return allAttempts
      .filter(
        (a: Attempt) =>
          a.studentEmail?.toLowerCase() === student.email.toLowerCase() ||
          a.studentID === student.studentId
      )
      .sort(
        (a: Attempt, b: Attempt) =>
          new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime()
      );
  }, [allAttempts, student]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (studentAttempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalTimeSpent: 0,
        passedExams: 0,
        failedExams: 0,
        passRate: 0,
        recentTrend: 'neutral' as const,
        improvementPercent: 0,
        averageTimePerExam: 0,
      };
    }

    // Calculate percentage scores
    const completedAttempts = studentAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4');
    const scores = completedAttempts.map((a: Attempt) => {
      const score = a.totalScore ?? a.autoScore ?? 0;
      return a.totalPossible > 0 ? Math.round((score / a.totalPossible) * 100) : 0;
    });

    if (scores.length === 0) {
      return {
        totalAttempts: studentAttempts.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalTimeSpent: 0,
        passedExams: 0,
        failedExams: 0,
        passRate: 0,
        recentTrend: 'neutral' as const,
        improvementPercent: 0,
        averageTimePerExam: 0,
      };
    }

    const totalScore = scores.reduce((sum: number, s: number) => sum + s, 0);
    const averageScore = Math.round(totalScore / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    const passed = completedAttempts.filter((a: Attempt) => {
      const exam = exams.find((e: Exam) => e.id === a.exam?.id);
      const passingScore = exam?.passingScore || 60;
      const score = a.totalScore ?? a.autoScore ?? 0;
      const percentage = a.totalPossible > 0 ? (score / a.totalPossible) * 100 : 0;
      return percentage >= passingScore;
    }).length;

    const totalTime = completedAttempts.reduce((sum: number, a: Attempt) => {
      if (!a.startedAt || !a.submittedAt) return sum;
      const start = new Date(a.startedAt).getTime();
      const end = new Date(a.submittedAt).getTime();
      return sum + (end - start);
    }, 0);

    // Calculate trend (compare last 3 vs previous 3)
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    let improvementPercent = 0;
    if (scores.length >= 4) {
      const recent = scores.slice(0, 3);
      const older = scores.slice(3, 6);
      if (older.length > 0) {
        const recentAvg = recent.reduce((s: number, v: number) => s + v, 0) / recent.length;
        const olderAvg = older.reduce((s: number, v: number) => s + v, 0) / older.length;
        trend = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'neutral';
        improvementPercent = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
      }
    }

    return {
      totalAttempts: studentAttempts.length,
      averageScore,
      highestScore,
      lowestScore,
      totalTimeSpent: Math.round(totalTime / (1000 * 60)), // minutes
      passedExams: passed,
      failedExams: completedAttempts.length - passed,
      passRate: completedAttempts.length > 0 ? Math.round((passed / completedAttempts.length) * 100) : 0,
      recentTrend: trend,
      improvementPercent,
      averageTimePerExam: completedAttempts.length > 0 ? Math.round(totalTime / (1000 * 60 * completedAttempts.length)) : 0,
    };
  }, [studentAttempts, exams]);

  // Performance over time chart data
  const performanceData = useMemo(() => {
    const completedAttempts = studentAttempts
      .filter((a: Attempt) => a.statusKey === 'StatusKey4')
      .slice()
      .reverse();
    
    return completedAttempts.map((a: Attempt, i: number) => {
      const score = a.totalScore ?? a.autoScore ?? 0;
      const percentage = a.totalPossible > 0 ? Math.round((score / a.totalPossible) * 100) : 0;
      return {
        attempt: i + 1,
        name: a.exam?.title?.slice(0, 15) || `Exam ${i + 1}`,
        score: percentage,
        average: stats.averageScore,
        date: a.submittedAt
          ? new Date(a.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '',
      };
    });
  }, [studentAttempts, stats.averageScore]);

  // Category performance based on section types from exams attempted
  const categoryPerformance = useMemo(() => {
    const categories: Record<string, { count: number; totalPercentage: number }> = {};

    studentAttempts
      .filter((a: Attempt) => a.statusKey === 'StatusKey4')
      .forEach((attempt: Attempt) => {
        const examSections = sections.filter((s: Section) => s.exam?.id === attempt.exam?.id);
        const attemptPercentage = attempt.totalPossible > 0
          ? ((attempt.totalScore ?? attempt.autoScore ?? 0) / attempt.totalPossible) * 100
          : 0;

        examSections.forEach((section: Section) => {
          const cat = SectionSectionTypeKeyToLabel[section.sectionTypeKey] || 'General';
          if (!categories[cat]) {
            categories[cat] = { count: 0, totalPercentage: 0 };
          }
          categories[cat].count++;
          categories[cat].totalPercentage += attemptPercentage;
        });
      });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        percentage: Math.round(data.totalPercentage / data.count),
        total: data.count,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [studentAttempts, sections]);

  const getScorePercentage = (attempt: Attempt) => {
    const score = attempt.totalScore ?? attempt.autoScore ?? 0;
    return attempt.totalPossible > 0 ? Math.round((score / attempt.totalPossible) * 100) : 0;
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Student Profile</CardTitle>
            <CardDescription>Please enter your details to view your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/student/join')}>
              Go to Join Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-accent/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/student/join')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Track your academic progress</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                {student.studentId}
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Student Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <Card className="mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                    {student.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">{student.name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {student.email}
                      </span>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {student.studentId}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.recentTrend === 'up' && (
                      <Badge className="bg-accent text-accent-foreground gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{stats.improvementPercent}% improvement
                      </Badge>
                    )}
                    {stats.recentTrend === 'down' && (
                      <Badge variant="destructive" className="gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {stats.improvementPercent}% decline
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.averageScore}%</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.highestScore}%</p>
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
                    <p className="text-sm text-muted-foreground">Exams Taken</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Percent className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.passRate}%</p>
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <Brain className="h-5 w-5" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2 relative">
                  {unreadCount > 0 ? (
                    <BellRing className="h-4 w-4 text-primary" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="overview" className="space-y-6">
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Performance Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Performance Trend
                          </CardTitle>
                          <CardDescription>Your scores over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {performanceData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                              <AreaChart data={performanceData}>
                                <defs>
                                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area
                                  type="monotone"
                                  dataKey="score"
                                  stroke="var(--chart-1)"
                                  fill="url(#scoreGradient)"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ChartContainer>
                          ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                              No completed exam data yet
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Pass/Fail Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Exam Results
                          </CardTitle>
                          <CardDescription>Pass vs fail distribution</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div className="flex items-center justify-center gap-8">
                              <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                                  <CheckCircle className="h-10 w-10 text-accent-foreground" />
                                </div>
                                <p className="text-3xl font-bold text-foreground">{stats.passedExams}</p>
                                <p className="text-sm text-muted-foreground">Passed</p>
                              </div>
                              <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                                  <XCircle className="h-10 w-10 text-destructive" />
                                </div>
                                <p className="text-3xl font-bold text-foreground">{stats.failedExams}</p>
                                <p className="text-sm text-muted-foreground">Failed</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Pass Rate</span>
                                <span className="font-medium text-foreground">{stats.passRate}%</span>
                              </div>
                              <Progress value={stats.passRate} className="h-3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Time Statistics */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Timer className="h-5 w-5" />
                            Time Statistics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-muted">
                              <Clock className="h-6 w-6 text-muted-foreground mb-2" />
                              <p className="text-2xl font-bold text-foreground">
                                {Math.floor(stats.totalTimeSpent / 60)}h {stats.totalTimeSpent % 60}m
                              </p>
                              <p className="text-sm text-muted-foreground">Total Time</p>
                            </div>
                            <div className="p-4 rounded-xl bg-muted">
                              <Zap className="h-6 w-6 text-muted-foreground mb-2" />
                              <p className="text-2xl font-bold text-foreground">
                                {stats.averageTimePerExam}m
                              </p>
                              <p className="text-sm text-muted-foreground">Avg per Exam</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recent Activity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Recent Exams
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {studentAttempts.length > 0 ? (
                            <div className="space-y-3">
                              {studentAttempts.slice(0, 4).map((attempt: Attempt) => {
                                const percentage = getScorePercentage(attempt);
                                const exam = exams.find((e: Exam) => e.id === attempt.exam?.id);
                                const passed = percentage >= (exam?.passingScore || 60);
                                
                                return (
                                  <div
                                    key={attempt.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => navigate(`/student/result/${attempt.id}`)}
                                  >
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {attempt.exam?.title || 'Unknown Exam'}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {attempt.submittedAt
                                          ? new Date(attempt.submittedAt).toLocaleDateString()
                                          : 'In Progress'}
                                      </p>
                                    </div>
                                    {attempt.statusKey === 'StatusKey4' ? (
                                      <Badge variant={passed ? 'default' : 'destructive'}>
                                        {percentage}%
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        {attempt.statusKey === 'StatusKey0' ? 'In Progress' : 'Pending'}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No exams taken yet
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>All Exam Results</CardTitle>
                        <CardDescription>Complete history of your exam attempts</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {studentAttempts.length > 0 ? (
                          <div className="space-y-4">
                            {studentAttempts.map((attempt: Attempt, index: number) => {
                              const exam = exams.find((e: Exam) => e.id === attempt.exam?.id);
                              const passingScore = exam?.passingScore || 60;
                              const percentage = getScorePercentage(attempt);
                              const passed = percentage >= passingScore && attempt.statusKey === 'StatusKey4';
                              const score = attempt.totalScore ?? attempt.autoScore ?? 0;

                              return (
                                <motion.div
                                  key={attempt.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
                                  onClick={() => navigate(`/student/result/${attempt.id}`)}
                                >
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h3 className="font-semibold text-foreground text-lg">
                                        {attempt.exam?.title || 'Unknown Exam'}
                                      </h3>
                                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {attempt.submittedAt
                                          ? new Date(attempt.submittedAt).toLocaleString()
                                          : new Date(attempt.startedAt).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {attempt.statusKey === 'StatusKey4' && (
                                        passed ? (
                                          <Badge className="bg-accent text-accent-foreground gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Passed
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="gap-1">
                                            <XCircle className="h-3 w-3" />
                                            Failed
                                          </Badge>
                                        )
                                      )}
                                      {attempt.statusKey === 'StatusKey3' && (
                                        <Badge variant="secondary">Grading</Badge>
                                      )}
                                      {attempt.statusKey === 'StatusKey2' && (
                                        <Badge variant="destructive">Cancelled</Badge>
                                      )}
                                      {attempt.statusKey === 'StatusKey0' && (
                                        <Badge variant="outline">In Progress</Badge>
                                      )}
                                      <Button variant="ghost" size="icon">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {attempt.statusKey === 'StatusKey4' && (
                                    <>
                                      <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="text-center p-3 rounded-lg bg-muted">
                                          <p className="text-2xl font-bold text-foreground">
                                            {percentage}%
                                          </p>
                                          <p className="text-xs text-muted-foreground">Score</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-muted">
                                          <p className="text-2xl font-bold text-foreground">
                                            {score}/{attempt.totalPossible}
                                          </p>
                                          <p className="text-xs text-muted-foreground">Points</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-muted">
                                          <p className="text-2xl font-bold text-foreground">
                                            {attempt.startedAt && attempt.submittedAt
                                              ? Math.round(
                                                  (new Date(attempt.submittedAt).getTime() -
                                                    new Date(attempt.startedAt).getTime()) /
                                                    (1000 * 60)
                                                )
                                              : 0}m
                                          </p>
                                          <p className="text-xs text-muted-foreground">Time Taken</p>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="text-muted-foreground">Progress</span>
                                          <span className="font-medium text-foreground">
                                            {percentage}% / 100%
                                          </span>
                                        </div>
                                        <Progress value={percentage} className="h-2" />
                                      </div>
                                    </>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No exam results yet</p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => navigate('/student/join')}
                            >
                              Take an Exam
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Category Performance */}
                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            Performance by Category
                          </CardTitle>
                          <CardDescription>
                            Your performance across different section types
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {categoryPerformance.length > 0 ? (
                            <ChartContainer config={categoryConfig} className="h-[300px] w-full">
                              <BarChart
                                data={categoryPerformance}
                                layout="vertical"
                                margin={{ left: 100 }}
                              >
                                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                                <YAxis
                                  dataKey="name"
                                  type="category"
                                  tickLine={false}
                                  axisLine={false}
                                  width={90}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="percentage" radius={4}>
                                  {categoryPerformance.map(
                                    (entry: { name: string; percentage: number }, idx: number) => (
                                      <Cell
                                        key={`cell-${idx}`}
                                        fill={
                                          entry.percentage >= 70
                                            ? 'var(--chart-1)'
                                            : entry.percentage >= 50
                                            ? 'var(--chart-2)'
                                            : 'var(--chart-3)'
                                        }
                                      />
                                    )
                                  )}
                                </Bar>
                              </BarChart>
                            </ChartContainer>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                              No category data available yet
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Strengths */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-accent-foreground">
                            <Medal className="h-5 w-5" />
                            Your Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {categoryPerformance.filter((c) => c.percentage >= 70).length > 0 ? (
                            <div className="space-y-3">
                              {categoryPerformance
                                .filter((c) => c.percentage >= 70)
                                .slice(0, 4)
                                .map((cat: { name: string; percentage: number }) => (
                                  <div
                                    key={cat.name}
                                    className="flex items-center justify-between p-3 rounded-lg bg-accent/10"
                                  >
                                    <span className="font-medium text-foreground">{cat.name}</span>
                                    <Badge className="bg-accent text-accent-foreground">
                                      {cat.percentage}%
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-6">
                              Complete more exams to identify strengths
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Areas for Improvement */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Areas to Improve
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {categoryPerformance.filter((c) => c.percentage < 70).length > 0 ? (
                            <div className="space-y-3">
                              {categoryPerformance
                                .filter((c) => c.percentage < 70)
                                .slice(-4)
                                .reverse()
                                .map((cat: { name: string; percentage: number }) => (
                                  <div
                                    key={cat.name}
                                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/10"
                                  >
                                    <span className="font-medium text-foreground">{cat.name}</span>
                                    <Badge variant="destructive">{cat.percentage}%</Badge>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-6">
                              Great job! No weak areas identified
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Score Distribution */}
                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Score Distribution
                          </CardTitle>
                          <CardDescription>How your scores are distributed</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {studentAttempts.filter((a: Attempt) => a.statusKey === 'StatusKey4').length > 0 ? (
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { range: '0-20', min: 0, max: 20, color: 'bg-destructive' },
                                { range: '21-40', min: 21, max: 40, color: 'bg-destructive/70' },
                                { range: '41-60', min: 41, max: 60, color: 'bg-chart-2' },
                                { range: '61-80', min: 61, max: 80, color: 'bg-chart-1' },
                                { range: '81-100', min: 81, max: 100, color: 'bg-accent' },
                              ].map((bucket) => {
                                const completedAttempts = studentAttempts.filter(
                                  (a: Attempt) => a.statusKey === 'StatusKey4'
                                );
                                const count = completedAttempts.filter(
                                  (a: Attempt) => {
                                    const percentage = getScorePercentage(a);
                                    return percentage >= bucket.min && percentage <= bucket.max;
                                  }
                                ).length;
                                const percentage =
                                  completedAttempts.length > 0
                                    ? Math.round((count / completedAttempts.length) * 100)
                                    : 0;

                                return (
                                  <div key={bucket.range} className="text-center">
                                    <div className="h-32 flex items-end justify-center mb-2">
                                      <div
                                        className={`w-full rounded-t-lg ${bucket.color}`}
                                        style={{ height: `${Math.max(percentage, 5)}%` }}
                                      />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{count}</p>
                                    <p className="text-xs text-muted-foreground">{bucket.range}%</p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                              No exam data to show distribution
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Bell className="h-5 w-5" />
                              Notifications
                            </CardTitle>
                            <CardDescription>
                              Your exam results and progress updates
                            </CardDescription>
                          </div>
                          {unreadCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => student && markAllRead(student.email)}
                            >
                              Mark all as read
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {studentNotifications.length > 0 ? (
                          <div className="space-y-4">
                            {studentNotifications.map((notification: StudentNotification, index: number) => (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-xl border ${
                                  notification.read
                                    ? 'border-border bg-card'
                                    : 'border-primary/30 bg-primary/5'
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    notification.passed === true
                                      ? 'bg-accent/10 text-accent-foreground'
                                      : notification.passed === false
                                      ? 'bg-destructive/10 text-destructive'
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {notification.passed === true ? (
                                      <Trophy className="w-6 h-6" />
                                    ) : notification.passed === false ? (
                                      <XCircle className="w-6 h-6" />
                                    ) : (
                                      <Award className="w-6 h-6" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-foreground">
                                        {notification.title}
                                      </h3>
                                      {!notification.read && (
                                        <Badge className="bg-primary text-primary-foreground text-xs">
                                          New
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {notification.message}
                                    </p>
                                    {notification.percentage !== undefined && (
                                      <div className="flex items-center gap-4 mb-3">
                                        <div className="flex-1">
                                          <div className="flex justify-between text-sm mb-1">
                                            <span className="text-muted-foreground">Score</span>
                                            <span className="font-medium text-foreground">
                                              {notification.score}/{notification.totalPossible} ({notification.percentage}%)
                                            </span>
                                          </div>
                                          <Progress value={notification.percentage} className="h-2" />
                                        </div>
                                        <Badge variant={notification.passed ? 'default' : 'destructive'}>
                                          {notification.passed ? 'Passed' : 'Failed'}
                                        </Badge>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                      </span>
                                      {notification.examTitle && (
                                        <Badge variant="outline" className="text-xs">
                                          {notification.examTitle}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="mb-2">No notifications yet</p>
                            <p className="text-sm">
                              You'll see your exam results and progress updates here
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
