import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Award,
  FileText,
  Code,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAttempt, useUpdateAttempt } from '@/generated/hooks/use-attempt';
import { useResponseList, useUpdateResponse } from '@/generated/hooks/use-response';
import { useQuestionList } from '@/generated/hooks/use-question';
import { useSectionList } from '@/generated/hooks/use-section';
import type { Response as ExamResponse, ResponseGradingStatusKey } from '@/generated/models/response-model';
import type { Question, QuestionQuestionTypeKey } from '@/generated/models/question-model';
import type { Section } from '@/generated/models/section-model';
import { QuestionQuestionTypeKeyToLabel } from '@/generated/models/question-model';
import { AttemptStatusKeyToLabel } from '@/generated/models/attempt-model';
import { ResponseGradingStatusKeyToLabel } from '@/generated/models/response-model';
import { useSetAtom } from 'jotai';
import { addNotificationAtom } from '@/lib/store';
import { sendGradeReleaseNotification } from '@/lib/email-service';
import { useExam } from '@/generated/hooks/use-exam';

const questionTypeIcons: Record<QuestionQuestionTypeKey, React.ReactNode> = {
  QuestionTypeKey0: <CheckCircle className="w-4 h-4" />,
  QuestionTypeKey1: <FileText className="w-4 h-4" />,
  QuestionTypeKey2: <Code className="w-4 h-4" />,
  QuestionTypeKey3: <Headphones className="w-4 h-4" />,
  QuestionTypeKey4: <BookOpen className="w-4 h-4" />,
  QuestionTypeKey5: <PenTool className="w-4 h-4" />,
  QuestionTypeKey6: <Mic className="w-4 h-4" />,
  QuestionTypeKey7: <User className="w-4 h-4" />,
};

export default function GradeAttempt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data fetching
  const { data: attempt, isLoading: attemptLoading } = useAttempt(id || '');
  const { data: allResponses = [] } = useResponseList();
  const { data: allQuestions = [] } = useQuestionList();
  const { data: allSections = [] } = useSectionList();
  const { data: exam } = useExam(attempt?.exam?.id || '');

  // Notification setter
  const addNotification = useSetAtom(addNotificationAtom);

  // Filter responses for this attempt
  const responses = useMemo(
    () => allResponses.filter((r: ExamResponse) => r.attempt?.id === id),
    [allResponses, id]
  );

  // Mutations
  const updateAttempt = useUpdateAttempt();
  const updateResponse = useUpdateResponse();

  // Local state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({});

  // Initialize grades from responses
  useMemo(() => {
    const initialGrades: Record<string, { points: number; feedback: string }> = {};
    responses.forEach((r: ExamResponse) => {
      initialGrades[r.id] = {
        points: r.pointsEarned ?? 0,
        feedback: r.graderFeedback || '',
      };
    });
    setGrades(initialGrades);
  }, [responses]);

  const currentResponse = responses[currentIndex];
  const currentQuestion = allQuestions.find(
    (q: Question) => q.id === currentResponse?.question?.id
  );
  const currentSection = allSections.find(
    (s: Section) => s.id === currentQuestion?.section?.id
  );

  const gradedCount = responses.filter(
    (r: ExamResponse) => r.gradingStatusKey !== 'GradingStatusKey0'
  ).length;

  const totalPoints = responses.reduce((sum: number, r: ExamResponse) => {
    const q = allQuestions.find((q: Question) => q.id === r.question?.id);
    return sum + (q?.points || 0);
  }, 0);

  const earnedPoints = Object.values(grades).reduce(
    (sum: number, g: { points: number; feedback: string }) => sum + g.points,
    0
  );

  const handleGradeChange = (responseId: string, points: number, feedback: string) => {
    setGrades((prev) => ({
      ...prev,
      [responseId]: { points, feedback },
    }));
  };

  const handleSaveGrade = async () => {
    if (!currentResponse || !currentQuestion) return;

    const grade = grades[currentResponse.id];
    if (!grade) return;

    try {
      await updateResponse.mutateAsync({
        id: currentResponse.id,
        changedFields: {
          pointsEarned: grade.points,
          graderFeedback: grade.feedback,
          gradingStatusKey: 'GradingStatusKey2' as ResponseGradingStatusKey, // ManuallyGraded
          isCorrect: grade.points >= currentQuestion.points * 0.5,
        },
      });
      toast.success('Grade saved!');

      // Move to next if available
      if (currentIndex < responses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (error: unknown) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFinalizeGrading = async () => {
    if (!attempt) return;

    const finalScore = Object.values(grades).reduce(
      (sum: number, g: { points: number; feedback: string }) => sum + g.points,
      0
    );

    const totalPossible = attempt.totalPossible || totalPoints;
    const percentage = totalPossible > 0 ? Math.round((finalScore / totalPossible) * 100) : 0;
    const passingScore = exam?.passingScore || 60;
    const passed = percentage >= passingScore;

    try {
      await updateAttempt.mutateAsync({
        id: attempt.id,
        changedFields: {
          manualScore: finalScore - (attempt.autoScore || 0),
          totalScore: finalScore,
          statusKey: 'StatusKey4', // Completed
        },
      });

      // Send notification to student automatically
      if (attempt.studentEmail) {
        addNotification({
          studentEmail: attempt.studentEmail,
          type: 'grade_released',
          title: 'Exam Results Available',
          message: passed
            ? `Great job! You scored ${percentage}% on ${exam?.title || 'your exam'}. You passed!`
            : `Your score for ${exam?.title || 'your exam'} is ${percentage}%. The passing score is ${passingScore}%.`,
          examTitle: exam?.title || attempt.exam?.title,
          score: finalScore,
          totalPossible: totalPossible,
          percentage: percentage,
          passed: passed,
        });

        // Send email notification
        sendGradeReleaseNotification(
          attempt.studentEmail,
          attempt.studentName || attempt.studentEmail,
          exam?.title || 'Exam',
          finalScore,
          totalPossible,
          passingScore,
          `You scored ${percentage}% on this exam.`
        );
      }

      toast.success('Grading completed! Student has been notified.');
      navigate('/teacher/grading');
    } catch (error: unknown) {
      toast.error(`Failed to finalize: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (attemptLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading submission...</div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Submission not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/grading')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Grade Submission</h1>
                <p className="text-sm text-muted-foreground">
                  {attempt.studentName} • {attempt.exam?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={attempt.statusKey === 'StatusKey4' ? 'default' : 'secondary'}>
                {AttemptStatusKeyToLabel[attempt.statusKey]}
              </Badge>
              <Button onClick={handleFinalizeGrading} disabled={updateAttempt.isPending}>
                <Award className="w-4 h-4 mr-2" />
                Finalize Grading
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info & Progress */}
          <div className="lg:col-span-1 space-y-6">
            {/* Student Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{attempt.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{attempt.studentEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium text-foreground">{attempt.studentID}</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="text-xs text-foreground">{formatDate(attempt.startedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="text-xs text-foreground">{formatDate(attempt.submittedAt)}</p>
                  </div>
                </div>
                {attempt.violationCount > 0 && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        {attempt.violationCount} Violation(s)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grading Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grading Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Questions Graded</span>
                    <span className="text-foreground">
                      {gradedCount}/{responses.length}
                    </span>
                  </div>
                  <Progress value={(gradedCount / responses.length) * 100} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto Score</span>
                    <span className="text-foreground">{attempt.autoScore ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Total</span>
                    <span className="text-foreground font-bold">
                      {earnedPoints}/{totalPoints}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="text-foreground font-bold">
                      {totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Navigator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {responses.map((r: ExamResponse, idx: number) => {
                    const q = allQuestions.find((q: Question) => q.id === r.question?.id);
                    const isGraded = r.gradingStatusKey !== 'GradingStatusKey0';
                    return (
                      <button
                        key={r.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`relative w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                          idx === currentIndex
                            ? 'bg-primary text-primary-foreground'
                            : isGraded
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {idx + 1}
                        {isGraded && (
                          <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grading Panel */}
          <div className="lg:col-span-2">
            {currentResponse && currentQuestion ? (
              <motion.div
                key={currentResponse.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" as const }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                          {currentIndex + 1}
                        </span>
                        <div>
                          <CardTitle className="text-lg">
                            {currentQuestion.questionTitle}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {questionTypeIcons[currentQuestion.questionTypeKey]}
                            <span className="text-sm text-muted-foreground">
                              {QuestionQuestionTypeKeyToLabel[currentQuestion.questionTypeKey]} •{' '}
                              {currentQuestion.points} points
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          currentResponse.gradingStatusKey === 'GradingStatusKey2'
                            ? 'default'
                            : currentResponse.gradingStatusKey === 'GradingStatusKey1'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {ResponseGradingStatusKeyToLabel[currentResponse.gradingStatusKey]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Question */}
                    <div>
                      <Label className="text-muted-foreground">Question</Label>
                      <p className="mt-1 p-4 bg-muted rounded-lg text-foreground">
                        {currentQuestion.questionText}
                      </p>
                    </div>

                    {/* Reading passage if applicable */}
                    {currentSection?.passageText && (
                      <div>
                        <Label className="text-muted-foreground">Reading Passage</Label>
                        <div className="mt-1 p-4 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                          <p className="text-sm text-foreground">{currentSection.passageText}</p>
                        </div>
                      </div>
                    )}

                    {/* Correct Answer (for reference) */}
                    {currentQuestion.correctAnswer && (
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          Expected Answer
                        </Label>
                        <p className="mt-1 p-4 bg-primary/10 border border-primary/20 rounded-lg text-foreground">
                          {currentQuestion.correctAnswer}
                        </p>
                      </div>
                    )}

                    {/* Keywords */}
                    {currentQuestion.keywords && (
                      <div>
                        <Label className="text-muted-foreground">Keywords to look for</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {currentQuestion.keywords.split(',').map((kw: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {kw.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Student Answer */}
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Student's Answer
                      </Label>
                      <div
                        className={`mt-1 p-4 rounded-lg border ${
                          currentQuestion.questionTypeKey === 'QuestionTypeKey2'
                            ? 'font-mono text-sm bg-muted'
                            : 'bg-card'
                        }`}
                      >
                        {currentResponse.answerText || (
                          <span className="text-muted-foreground italic">No answer provided</span>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Grading Input */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="points">Points Earned</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="points"
                            type="number"
                            min={0}
                            max={currentQuestion.points}
                            value={grades[currentResponse.id]?.points ?? 0}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              handleGradeChange(
                                currentResponse.id,
                                Math.min(
                                  parseInt(e.target.value) || 0,
                                  currentQuestion.points
                                ),
                                grades[currentResponse.id]?.feedback || ''
                              )
                            }
                          />
                          <span className="text-muted-foreground">/ {currentQuestion.points}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleGradeChange(
                                currentResponse.id,
                                currentQuestion.points,
                                grades[currentResponse.id]?.feedback || ''
                              )
                            }
                          >
                            Full
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleGradeChange(
                                currentResponse.id,
                                Math.floor(currentQuestion.points / 2),
                                grades[currentResponse.id]?.feedback || ''
                              )
                            }
                          >
                            Half
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleGradeChange(
                                currentResponse.id,
                                0,
                                grades[currentResponse.id]?.feedback || ''
                              )
                            }
                          >
                            Zero
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="feedback" className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Feedback (optional)
                        </Label>
                        <Textarea
                          id="feedback"
                          value={grades[currentResponse.id]?.feedback || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            handleGradeChange(
                              currentResponse.id,
                              grades[currentResponse.id]?.points ?? 0,
                              e.target.value
                            )
                          }
                          placeholder="Provide feedback for the student..."
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentIndex((prev) => prev - 1)}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>

                      <Button
                        onClick={handleSaveGrade}
                        disabled={updateResponse.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateResponse.isPending ? 'Saving...' : 'Save & Next'}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        disabled={currentIndex === responses.length - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">No responses to grade.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
