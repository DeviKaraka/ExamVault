import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, isBefore, formatDistanceToNow } from 'date-fns';
import { Plus, FileText, Users, CheckCircle, Clock, AlertTriangle, ArrowLeft, Pencil, Trash2, Eye, BarChart3, CalendarIcon, Library, Search, Code, MessageSquare, Headphones, BookOpen, PenTool, Mic, Tag, X, History, Send, UserCheck, Edit3, Mail, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useExamList, useDeleteExam } from '@/generated/hooks/use-exam';
import { useAttemptList } from '@/generated/hooks/use-attempt';
import { useResponseList } from '@/generated/hooks/use-response';
import {
  useQuestionBankList,
  useCreateQuestionBank,
  useUpdateQuestionBank,
  useDeleteQuestionBank,
} from '@/generated/hooks/use-question-bank';
import {
  QuestionBankQuestionTypeKeyToLabel,
  QuestionBankDifficultyKeyToLabel,
  type QuestionBank,
  type QuestionBankQuestionTypeKey,
  type QuestionBankDifficultyKey,
} from '@/generated/models/question-bank-model';
import { ExamStatusKeyToLabel, type Exam } from '@/generated/models/exam-model';
import { type Attempt } from '@/generated/models/attempt-model';
import { type Response } from '@/generated/models/response-model';
import { userRoleAtom, isAdminAtom } from '@/lib/store';
import { InMemoryDataBanner } from '@/generated/components/in-memory-data-banner';
import { HAS_IN_MEMORY_TABLES } from '@/generated/hooks';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const questionTypeIcons: Record<QuestionBankQuestionTypeKey, React.ReactNode> = {
  QuestionTypeKey0: <FileText className="h-4 w-4" />,
  QuestionTypeKey1: <MessageSquare className="h-4 w-4" />,
  QuestionTypeKey2: <Code className="h-4 w-4" />,
  QuestionTypeKey3: <Headphones className="h-4 w-4" />,
  QuestionTypeKey4: <BookOpen className="h-4 w-4" />,
  QuestionTypeKey5: <PenTool className="h-4 w-4" />,
  QuestionTypeKey6: <Mic className="h-4 w-4" />,
  QuestionTypeKey7: <Users className="h-4 w-4" />,
};

const difficultyColors: Record<QuestionBankDifficultyKey, string> = {
  DifficultyKey0: 'bg-chart-3/10 text-chart-3 border-chart-3/30',
  DifficultyKey1: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  DifficultyKey2: 'bg-destructive/10 text-destructive border-destructive/30',
};

interface QuestionFormData {
  title: string;
  questionText: string;
  questionTypeKey: QuestionBankQuestionTypeKey;
  category: string;
  difficultyKey: QuestionBankDifficultyKey;
  optionsJSON: string;
  correctAnswer: string;
  keywords: string;
  defaultPoints: number;
  codeLanguage: string;
  tags: string;
}

const emptyFormData: QuestionFormData = {
  title: '',
  questionText: '',
  questionTypeKey: 'QuestionTypeKey0',
  category: '',
  difficultyKey: 'DifficultyKey1',
  optionsJSON: '',
  correctAnswer: '',
  keywords: '',
  defaultPoints: 5,
  codeLanguage: '',
  tags: '',
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [, setUserRole] = useAtom(userRoleAtom);
  const isAdmin = useAtomValue(isAdminAtom);
  const { data: exams, isLoading: examsLoading } = useExamList();
  const { data: attempts } = useAttemptList();
  const { data: responses } = useResponseList();
  const deleteExam = useDeleteExam();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  // Question Bank state
  const { data: questions, isLoading: questionsLoading } = useQuestionBankList();
  const createQuestion = useCreateQuestionBank();
  const updateQuestion = useUpdateQuestionBank();
  const deleteQuestionBank = useDeleteQuestionBank();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBank | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyFormData);
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [examSearchQuery, setExamSearchQuery] = useState('');

  // Filter questions
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    if (!searchQuery) return questions;
    const query = searchQuery.toLowerCase();
    return questions.filter((q: QuestionBank) =>
      q.title.toLowerCase().includes(query) ||
      q.questionText.toLowerCase().includes(query) ||
      q.category.toLowerCase().includes(query) ||
      (q.tags && q.tags.toLowerCase().includes(query))
    );
  }, [questions, searchQuery]);

  const pendingGrading = responses?.filter((r) => r.gradingStatusKey === 'GradingStatusKey0').length || 0;
  const activeExams = exams?.filter((e) => e.statusKey === 'StatusKey1').length || 0;
  const totalAttempts = attempts?.length || 0;
  const completedAttempts = attempts?.filter((a) => a.statusKey === 'StatusKey4').length || 0;

  const handleDeleteExam = () => {
    if (examToDelete) {
      deleteExam.mutate(examToDelete, {
        onSuccess: () => {
          toast.success('Exam deleted successfully');
          setDeleteDialogOpen(false);
          setExamToDelete(null);
        },
        onError: () => {
          toast.error('Failed to delete exam');
        },
      });
    }
  };

  // Question Bank handlers
  const handleOpenQuestionDialog = (question?: QuestionBank) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        title: question.title,
        questionText: question.questionText,
        questionTypeKey: question.questionTypeKey,
        category: question.category,
        difficultyKey: question.difficultyKey,
        optionsJSON: question.optionsJSON || '',
        correctAnswer: question.correctAnswer || '',
        keywords: question.keywords || '',
        defaultPoints: question.defaultPoints,
        codeLanguage: question.codeLanguage || '',
        tags: question.tags || '',
      });
    } else {
      setEditingQuestion(null);
      setFormData(emptyFormData);
    }
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = async () => {
    if (!formData.title || !formData.questionText || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingQuestion) {
        await updateQuestion.mutateAsync({
          id: editingQuestion.id,
          changedFields: {
            title: formData.title,
            questionText: formData.questionText,
            questionTypeKey: formData.questionTypeKey,
            category: formData.category,
            difficultyKey: formData.difficultyKey,
            optionsJSON: formData.optionsJSON || undefined,
            correctAnswer: formData.correctAnswer || undefined,
            keywords: formData.keywords || undefined,
            defaultPoints: formData.defaultPoints,
            codeLanguage: formData.codeLanguage || undefined,
            tags: formData.tags || undefined,
          },
        });
        toast.success('Question updated successfully');
      } else {
        await createQuestion.mutateAsync({
          title: formData.title,
          questionText: formData.questionText,
          questionTypeKey: formData.questionTypeKey,
          category: formData.category,
          difficultyKey: formData.difficultyKey,
          optionsJSON: formData.optionsJSON || undefined,
          correctAnswer: formData.correctAnswer || undefined,
          keywords: formData.keywords || undefined,
          defaultPoints: formData.defaultPoints,
          codeLanguage: formData.codeLanguage || undefined,
          tags: formData.tags || undefined,
          createdBy: 'teacher_001',
          createdAt: new Date().toISOString(),
          usageCount: 0,
        });
        toast.success('Question added to bank');
      }
      setShowQuestionDialog(false);
      setEditingQuestion(null);
    } catch (error: unknown) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteQuestion = () => {
    if (questionToDelete) {
      deleteQuestionBank.mutate(questionToDelete, {
        onSuccess: () => {
          toast.success('Question deleted');
          setDeleteQuestionDialogOpen(false);
          setQuestionToDelete(null);
        },
        onError: () => {
          toast.error('Failed to delete question');
        },
      });
    }
  };

  // Generate activity log from exam data
  interface ActivityItem {
    id: string;
    type: 'created' | 'published' | 'graded' | 'submitted' | 'updated';
    title: string;
    examTitle: string;
    timestamp: Date;
    icon: React.ReactNode;
    color: string;
  }

  const activityLog = useMemo(() => {
    const activities: ActivityItem[] = [];
    
    // Add exam creation/publish events
    exams?.forEach((exam) => {
      if (exam.createdAt) {
        activities.push({
          id: `created-${exam.id}`,
          type: 'created',
          title: 'Exam created',
          examTitle: exam.title,
          timestamp: new Date(exam.createdAt),
          icon: <Plus className="h-4 w-4" />,
          color: 'text-chart-3',
        });
      }
      if (exam.statusKey === 'StatusKey1' && exam.createdAt) {
        activities.push({
          id: `published-${exam.id}`,
          type: 'published',
          title: 'Exam published',
          examTitle: exam.title,
          timestamp: new Date(exam.createdAt),
          icon: <Send className="h-4 w-4" />,
          color: 'text-primary',
        });
      }
    });
    
    // Add attempt submissions
    attempts?.forEach((attempt) => {
      if ((attempt.statusKey === 'StatusKey1' || attempt.statusKey === 'StatusKey3' || attempt.statusKey === 'StatusKey4') && attempt.submittedAt) {
        const exam = exams?.find((e: Exam) => e.id === attempt.exam.id);
        activities.push({
          id: `submitted-${attempt.id}`,
          type: 'submitted',
          title: `${attempt.studentName} submitted`,
          examTitle: exam?.title || 'Unknown exam',
          timestamp: new Date(attempt.submittedAt),
          icon: <UserCheck className="h-4 w-4" />,
          color: 'text-accent-foreground',
        });
      }
    });
    
    // Add grading events
    responses?.forEach((response: Response) => {
      if (response.gradingStatusKey === 'GradingStatusKey2') {
        const attempt = attempts?.find((a: Attempt) => a.id === response.attempt.id);
        const exam = exams?.find((e: Exam) => e.id === attempt?.exam.id);
        // Use the attempt's submittedAt as approximate grading time
        if (attempt?.submittedAt) {
          activities.push({
            id: `graded-${response.id}`,
            type: 'graded',
            title: 'Response graded',
            examTitle: exam?.title || 'Unknown exam',
            timestamp: new Date(attempt.submittedAt),
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'text-chart-4',
          });
        }
      }
    });
    
    // Sort by timestamp descending and take the most recent 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [exams, attempts, responses]);

  const stats = [
    { label: 'Active Exams', value: activeExams, icon: FileText, color: 'text-primary' },
    { label: 'Total Attempts', value: totalAttempts, icon: Users, color: 'text-accent-foreground' },
    { label: 'Completed', value: completedAttempts, icon: CheckCircle, color: 'text-chart-3' },
    { label: 'Pending Review', value: pendingGrading, icon: Clock, color: 'text-chart-4' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <InMemoryDataBanner 
        show={HAS_IN_MEMORY_TABLES} 
        message="⚠️ Demo Mode: Data will not persist after refresh. To enable permanent storage, an admin must provision Dataverse or SharePoint tables. See docs/storage-setup-guide.md for instructions."
        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setUserRole(null);
                navigate('/');
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your exams and review submissions</p>
            </div>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin/organization')} className="gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/teacher/email-settings')}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" onClick={() => navigate('/teacher/analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" onClick={() => navigate('/teacher/grading')}>
              <Clock className="h-4 w-4 mr-2" />
              Grading Queue
              {pendingGrading > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingGrading}</Badge>
              )}
            </Button>
            <Button onClick={() => navigate('/teacher/exam/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" as const }}
            >
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-3xl font-bold text-card-foreground">{value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Exams
                </CardTitle>
                <CardDescription>Manage and monitor your assessment library</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or code..."
                    value={examSearchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExamSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                  {examSearchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setExamSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex rounded-lg border border-border p-1 bg-muted/30">
                  <Button
                    variant={examFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setExamFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={examFilter === 'published' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setExamFilter('published')}
                  >
                    Published
                  </Button>
                  <Button
                    variant={examFilter === 'draft' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setExamFilter('draft')}
                  >
                    Drafts
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {examsLoading ? (
              <div className="space-y-4" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-skeleton rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !exams || exams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No exams created yet</p>
                <Button onClick={() => navigate('/teacher/exam/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Exam
                </Button>
              </div>
            ) : (() => {
              const searchLower = examSearchQuery.toLowerCase();
              const filteredExams = exams.filter((exam) => {
                // Apply status filter
                if (examFilter === 'published' && exam.statusKey !== 'StatusKey1') return false;
                if (examFilter === 'draft' && exam.statusKey !== 'StatusKey0') return false;
                // Apply search filter
                if (examSearchQuery) {
                  const matchesTitle = exam.title.toLowerCase().includes(searchLower);
                  const matchesCode = exam.accessCode.toLowerCase().includes(searchLower);
                  if (!matchesTitle && !matchesCode) return false;
                }
                return true;
              });
              
              if (filteredExams.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">
                      {examSearchQuery 
                        ? 'No exams match your search'
                        : examFilter === 'published' 
                          ? 'No published exams yet' 
                          : 'No draft exams'}
                    </p>
                    {examSearchQuery ? (
                      <Button variant="outline" onClick={() => setExamSearchQuery('')}>
                        Clear Search
                      </Button>
                    ) : examFilter === 'draft' && (
                      <Button onClick={() => navigate('/teacher/exam/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Exam
                      </Button>
                    )}
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                {filteredExams.map((exam, index) => {
                  const examAttempts = attempts?.filter((a) => a.exam.id === exam.id) || [];
                  const inProgress = examAttempts.filter((a) => a.statusKey === 'StatusKey0').length;
                  const examResponses = responses?.filter((r) => 
                    examAttempts.some((a) => a.id === r.attempt.id) && r.gradingStatusKey === 'GradingStatusKey0'
                  ).length || 0;

                  // Compute availability status
                  const now = new Date();
                  const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
                  const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
                  const isUpcoming = startDateTime && isBefore(now, startDateTime);
                  const isClosed = endDateTime && isAfter(now, endDateTime);
                  const isScheduled = startDateTime || endDateTime;

                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-card-foreground">{exam.title}</h3>
                          <Badge variant={
                            exam.statusKey === 'StatusKey1' ? 'default' :
                            exam.statusKey === 'StatusKey0' ? 'secondary' : 'outline'
                          }>
                            {ExamStatusKeyToLabel[exam.statusKey]}
                          </Badge>
                          {isUpcoming && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-chart-4">
                              <CalendarIcon className="h-3 w-3" />
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        {isClosed && (
                          <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Closed
                          </Badge>
                        )}
                        {examResponses > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {examResponses} pending
                          </Badge>
                        )}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            {exam.durationMinutes} mins • Code: <span className="font-mono bg-secondary px-2 py-0.5 rounded">{exam.accessCode}</span>
                            {inProgress > 0 && <span className="ml-3 text-chart-4">• {inProgress} in progress</span>}
                          </p>
                          {isScheduled && (
                            <p className="flex items-center gap-2 text-xs">
                              <CalendarIcon className="h-3 w-3" />
                              {startDateTime && (
                                <span>Opens: {format(startDateTime, "MMM d, yyyy 'at' h:mm a")}</span>
                              )}
                              {startDateTime && endDateTime && <span>•</span>}
                              {endDateTime && (
                                <span>Closes: {format(endDateTime, "MMM d, yyyy 'at' h:mm a")}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/exam/${exam.id}/results`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/exam/${exam.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setExamToDelete(exam.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              );
            })()
          }
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Log of recent exam actions and submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No recent activity yet</p>
                <p className="text-sm">Activity will appear here as you create exams and grade submissions</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLog.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center ${activity.color}`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.examTitle}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Bank Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Question Bank
                </CardTitle>
                <CardDescription>Create and manage reusable questions for your exams</CardDescription>
              </div>
              <Button onClick={() => handleOpenQuestionDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {questionsLoading ? (
              <div className="space-y-3" aria-hidden="true">
                {[1, 2, 3].map((i: number) => (
                  <div key={i} className="h-20 bg-skeleton rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !filteredQuestions || filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? (
                  <>
                    <p className="mb-4">No questions match your search</p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-4">No questions in your bank yet</p>
                    <Button onClick={() => handleOpenQuestionDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Question
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredQuestions.map((question: QuestionBank, index: number) => (
                    <motion.div
                      key={question.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenQuestionDialog(question)}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {questionTypeIcons[question.questionTypeKey]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-card-foreground truncate">
                            {question.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {question.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${difficultyColors[question.difficultyKey]}`}
                          >
                            {QuestionBankDifficultyKeyToLabel[question.difficultyKey]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {question.questionText}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {questionTypeIcons[question.questionTypeKey]}
                            {QuestionBankQuestionTypeKeyToLabel[question.questionTypeKey]}
                          </span>
                          <span>{question.defaultPoints} pts</span>
                          <span>Used {question.usageCount}×</span>
                          {question.tags && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {question.tags.split(',').slice(0, 2).join(', ')}
                              {question.tags.split(',').length > 2 && '...'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenQuestionDialog(question)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setQuestionToDelete(question.id);
                            setDeleteQuestionDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Exam Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this exam and all associated sections, questions, and student attempts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Delete Dialog */}
      <AlertDialog open={deleteQuestionDialogOpen} onOpenChange={setDeleteQuestionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this question from your bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Create/Edit Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Question to Bank'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? 'Update the question details'
                : 'Create a reusable question for your exams'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Variable Declaration"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., JavaScript"
                />
              </div>

              <div>
                <Label htmlFor="type">Question Type *</Label>
                <Select
                  value={formData.questionTypeKey}
                  onValueChange={(val: string) =>
                    setFormData({ ...formData, questionTypeKey: val as QuestionBankQuestionTypeKey })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QuestionBankQuestionTypeKeyToLabel) as QuestionBankQuestionTypeKey[]).map(
                      (key: QuestionBankQuestionTypeKey) => (
                        <SelectItem key={key} value={key}>
                          {QuestionBankQuestionTypeKeyToLabel[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty *</Label>
                <Select
                  value={formData.difficultyKey}
                  onValueChange={(val: string) =>
                    setFormData({ ...formData, difficultyKey: val as QuestionBankDifficultyKey })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QuestionBankDifficultyKeyToLabel) as QuestionBankDifficultyKey[]).map(
                      (key: QuestionBankDifficultyKey) => (
                        <SelectItem key={key} value={key}>
                          {QuestionBankDifficultyKeyToLabel[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points">Default Points *</Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  value={formData.defaultPoints}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, defaultPoints: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="questionText">Question Text *</Label>
                <Textarea
                  id="questionText"
                  value={formData.questionText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, questionText: e.target.value })
                  }
                  placeholder="Enter the full question..."
                  rows={3}
                />
              </div>

              {formData.questionTypeKey === 'QuestionTypeKey0' && (
                <div className="col-span-2">
                  <Label htmlFor="options">MCQ Options (JSON array)</Label>
                  <Textarea
                    id="options"
                    value={formData.optionsJSON}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, optionsJSON: e.target.value })
                    }
                    placeholder='["Option A", "Option B", "Option C", "Option D"]'
                    rows={2}
                  />
                </div>
              )}

              {(formData.questionTypeKey === 'QuestionTypeKey0' ||
                formData.questionTypeKey === 'QuestionTypeKey2') && (
                <div className="col-span-2">
                  <Label htmlFor="correctAnswer">Correct Answer</Label>
                  <Textarea
                    id="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, correctAnswer: e.target.value })
                    }
                    placeholder="Enter the correct answer..."
                    rows={2}
                  />
                </div>
              )}

              {formData.questionTypeKey === 'QuestionTypeKey2' && (
                <div>
                  <Label htmlFor="codeLanguage">Code Language</Label>
                  <Input
                    id="codeLanguage"
                    value={formData.codeLanguage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, codeLanguage: e.target.value })
                    }
                    placeholder="e.g., javascript, python"
                  />
                </div>
              )}

              {(formData.questionTypeKey === 'QuestionTypeKey1' ||
                formData.questionTypeKey === 'QuestionTypeKey5' ||
                formData.questionTypeKey === 'QuestionTypeKey6') && (
                <div className="col-span-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, keywords: e.target.value })
                    }
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              )}

              <div className="col-span-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="es6, fundamentals, beginner"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={createQuestion.isPending || updateQuestion.isPending}
            >
              {editingQuestion ? 'Save Changes' : 'Add to Bank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
