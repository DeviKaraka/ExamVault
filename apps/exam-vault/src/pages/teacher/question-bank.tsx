import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Library,
  Code,
  FileText,
  MessageSquare,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Users,
  Trash2,
  Edit3,
  Copy,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
import { userRoleAtom } from '@/lib/store';
import { InMemoryDataBanner } from '@/generated/components/in-memory-data-banner';
import { HAS_IN_MEMORY_TABLES } from '@/generated/hooks';

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

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [, setUserRole] = useAtom(userRoleAtom);
  const { data: questions, isLoading } = useQuestionBankList();
  const createQuestion = useCreateQuestionBank();
  const updateQuestion = useUpdateQuestionBank();
  const deleteQuestion = useDeleteQuestionBank();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBank | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyFormData);

  // Get unique categories
  const categories = useMemo(() => {
    if (!questions) return [];
    const cats = new Set(questions.map((q: QuestionBank) => q.category));
    return Array.from(cats).sort();
  }, [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q: QuestionBank) => {
      const matchesSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.tags && q.tags.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;
      const matchesType = typeFilter === 'all' || q.questionTypeKey === typeFilter;
      const matchesDifficulty =
        difficultyFilter === 'all' || q.difficultyKey === difficultyFilter;

      return matchesSearch && matchesCategory && matchesType && matchesDifficulty;
    });
  }, [questions, searchQuery, categoryFilter, typeFilter, difficultyFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!questions) return { total: 0, categories: 0, avgUsage: 0 };
    const cats = new Set(questions.map((q: QuestionBank) => q.category));
    const totalUsage = questions.reduce((sum: number, q: QuestionBank) => sum + q.usageCount, 0);
    return {
      total: questions.length,
      categories: cats.size,
      avgUsage: questions.length > 0 ? Math.round(totalUsage / questions.length) : 0,
    };
  }, [questions]);

  const handleOpenCreate = () => {
    setFormData(emptyFormData);
    setEditingQuestion(null);
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (question: QuestionBank) => {
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
    setEditingQuestion(question);
    setShowCreateDialog(true);
  };

  const handleDuplicate = (question: QuestionBank) => {
    setFormData({
      title: `${question.title} (Copy)`,
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
    setEditingQuestion(null);
    setShowCreateDialog(true);
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
      setShowCreateDialog(false);
      setEditingQuestion(null);
    } catch (error: unknown) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteQuestion = () => {
    if (questionToDelete) {
      deleteQuestion.mutate(questionToDelete, {
        onSuccess: () => {
          toast.success('Question deleted');
          setDeleteDialogOpen(false);
          setQuestionToDelete(null);
        },
        onError: () => {
          toast.error('Failed to delete question');
        },
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setDifficultyFilter('all');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    difficultyFilter !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <InMemoryDataBanner
        show={HAS_IN_MEMORY_TABLES}
        message="This app uses draft tables for testing. Data entered won't be saved. Contact the app owner to enable storage."
        className="bg-accent/20 text-accent-foreground border-accent/30"
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
                navigate('/teacher/dashboard');
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Library className="h-6 w-6 text-primary" />
                Question Bank
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage reusable questions for your exams
              </p>
            </div>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Questions', value: stats.total, icon: Library },
            { label: 'Categories', value: stats.categories, icon: Tag },
            { label: 'Avg. Usage', value: stats.avgUsage, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }, index: number) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' as const }}
            >
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-3xl font-bold text-card-foreground">{value}</p>
                    </div>
                    <Icon className="h-8 w-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions, tags..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.keys(QuestionBankQuestionTypeKeyToLabel) as QuestionBankQuestionTypeKey[]).map(
                    (key: QuestionBankQuestionTypeKey) => (
                      <SelectItem key={key} value={key}>
                        {QuestionBankQuestionTypeKeyToLabel[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {(Object.keys(QuestionBankDifficultyKeyToLabel) as QuestionBankDifficultyKey[]).map(
                    (key: QuestionBankDifficultyKey) => (
                      <SelectItem key={key} value={key}>
                        {QuestionBankDifficultyKeyToLabel[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Questions ({filteredQuestions.length})</span>
            </CardTitle>
            <CardDescription>Click on a question to edit or use the action buttons</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4" aria-hidden="true">
                {[1, 2, 3].map((i: number) => (
                  <div key={i} className="h-24 bg-skeleton rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {hasActiveFilters ? (
                  <>
                    <p className="mb-4">No questions match your filters</p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-4">No questions in your bank yet</p>
                    <Button onClick={handleOpenCreate}>
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
                      onClick={() => handleOpenEdit(question)}
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
                          onClick={() => handleDuplicate(question)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(question)}
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setQuestionToDelete(question.id);
                            setDeleteDialogOpen(true);
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this question from your bank. This action cannot be
              undone.
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
    </div>
  );
}
