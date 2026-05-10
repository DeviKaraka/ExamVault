import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy,
  Award,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  FileText,
  BarChart3,
  MessageSquare,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAttempt } from '@/generated/hooks/use-attempt';
import { useResponseList } from '@/generated/hooks/use-response';
import { useQuestionList } from '@/generated/hooks/use-question';
import { useExam } from '@/generated/hooks/use-exam';
import type { Response as ExamResponse } from '@/generated/models/response-model';
import type { Question, QuestionQuestionTypeKey } from '@/generated/models/question-model';
import { QuestionQuestionTypeKeyToLabel } from '@/generated/models/question-model';
import { AttemptStatusKeyToLabel, type AttemptStatusKey } from '@/generated/models/attempt-model';

export default function StudentResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data fetching
  const { data: attempt, isLoading: attemptLoading } = useAttempt(id || '');
  const { data: exam } = useExam(attempt?.exam?.id || '');
  const { data: allResponses = [] } = useResponseList();
  const { data: allQuestions = [] } = useQuestionList();

  // Filter responses for this attempt
  const responses = useMemo(
    () => allResponses.filter((r: ExamResponse) => r.attempt?.id === id),
    [allResponses, id]
  );

  const totalPossible = attempt?.totalPossible || 0;
  const totalScore = attempt?.totalScore ?? attempt?.autoScore ?? 0;
  const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const passingScore = exam?.passingScore || 60;
  const passed = percentage >= passingScore;

  const isCancelled = attempt?.statusKey === 'StatusKey2';
  const isPendingGrading = attempt?.statusKey === 'StatusKey3';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const calculateDuration = () => {
    if (!attempt?.startedAt || !attempt?.submittedAt) return '-';
    const start = new Date(attempt.startedAt).getTime();
    const end = new Date(attempt.submittedAt).getTime();
    const minutes = Math.round((end - start) / 60000);
    return `${minutes} minutes`;
  };

  if (attemptLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Result not found</p>
          <Button onClick={() => navigate('/student')}>
            <Home className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/student')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Exam Results</h1>
                  <p className="text-sm text-muted-foreground">{exam?.title}</p>
                </div>
              </div>
              <Badge
                variant={
                  isCancelled
                    ? 'destructive'
                    : isPendingGrading
                    ? 'secondary'
                    : passed
                    ? 'default'
                    : 'destructive'
                }
              >
                {AttemptStatusKeyToLabel[attempt.statusKey as AttemptStatusKey]}
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Cancelled State */}
          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="mb-8"
            >
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold text-destructive mb-2">Exam Cancelled</h2>
                  <p className="text-muted-foreground mb-4">
                    Your exam was cancelled due to {attempt.violationCount} violation(s).
                  </p>
                  <div className="p-4 bg-destructive/10 rounded-lg max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">
                        {attempt.violationCount} Violation(s) Detected
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tab switching, fullscreen exit, or other policy violations were detected.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Pending Grading State */}
          {isPendingGrading && !isCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="mb-8"
            >
              <Card className="border-primary/50">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Grading in Progress</h2>
                  <p className="text-muted-foreground mb-4">
                    Your exam has been submitted. Some questions require manual grading.
                  </p>
                  {attempt.autoScore !== undefined && (
                    <div className="p-4 bg-muted rounded-lg max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground">Auto-graded Score</p>
                      <p className="text-3xl font-bold text-foreground">{attempt.autoScore}</p>
                      <p className="text-xs text-muted-foreground">Points (partial)</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Score Display (Completed) */}
          {!isCancelled && !isPendingGrading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="mb-8"
            >
              <Card
                className={`border-2 ${
                  passed ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'
                }`}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      passed ? 'bg-primary' : 'bg-destructive'
                    }`}
                  >
                    {passed ? (
                      <Trophy className="w-12 h-12 text-primary-foreground" />
                    ) : (
                      <XCircle className="w-12 h-12 text-destructive-foreground" />
                    )}
                  </motion.div>

                  <h2 className={`text-3xl font-bold mb-2 ${passed ? 'text-primary' : 'text-destructive'}`}>
                    {passed ? 'Congratulations!' : 'Keep Trying!'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {passed
                      ? 'You have successfully passed the exam.'
                      : `You need ${passingScore}% to pass. Keep practicing!`}
                  </p>

                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <p className="text-3xl font-bold text-foreground">{percentage}%</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <p className="text-3xl font-bold text-foreground">{totalScore}</p>
                      <p className="text-xs text-muted-foreground">/ {totalPossible} pts</p>
                    </div>
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <p className="text-3xl font-bold text-foreground">{passingScore}%</p>
                      <p className="text-xs text-muted-foreground">Passing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Exam Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" as const }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Exam Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exam</span>
                  <span className="font-medium text-foreground">{exam?.title}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="text-foreground">{formatDate(attempt.startedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="text-foreground">{formatDate(attempt.submittedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-foreground">{calculateDuration()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Overall Score</span>
                    <span className="text-foreground">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="text-foreground">{responses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correct</span>
                  <span className="text-foreground">
                    {responses.filter((r: ExamResponse) => r.isCorrect).length}
                  </span>
                </div>
                {attempt.violationCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Violations</span>
                    <Badge variant="destructive">{attempt.violationCount}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Question Review (if allowed) */}
          {exam?.allowReview && !isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" as const }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Answer Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {responses.map((response: ExamResponse, index: number) => {
                      const question = allQuestions.find(
                        (q: Question) => q.id === response.question?.id
                      );
                      if (!question) return null;

                      return (
                        <div
                          key={response.id}
                          className={`p-4 rounded-lg border ${
                            response.isCorrect
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-destructive/30 bg-destructive/5'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <span className="font-medium text-foreground">
                                {question.questionTitle}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {QuestionQuestionTypeKeyToLabel[question.questionTypeKey as QuestionQuestionTypeKey]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {response.isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              ) : (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {response.pointsEarned ?? 0}/{question.points}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {question.questionText}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Your Answer:</p>
                              <p className="p-2 bg-card rounded text-foreground">
                                {response.answerText || (
                                  <span className="italic text-muted-foreground">No answer</span>
                                )}
                              </p>
                            </div>
                            {question.correctAnswer && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Correct Answer:</p>
                                <p className="p-2 bg-primary/10 rounded text-foreground">
                                  {question.correctAnswer}
                                </p>
                              </div>
                            )}
                          </div>

                          {response.graderFeedback && (
                            <div className="mt-3 p-3 bg-muted rounded">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Feedback:
                              </p>
                              <p className="text-sm text-foreground">{response.graderFeedback}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-8 text-center"
          >
            <Button onClick={() => navigate('/student')} size="lg">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
