import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  FileText,
  Code,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Users,
  CheckCircle,
  MoreVertical,
  Copy,
  Settings,
  Sparkles,
  CalendarIcon,
  Clock,
  Library,
  Search,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AIQuestionGenerator } from '@/components/ai-question-generator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useExam,
  useCreateExam,
  useUpdateExam,
} from '@/generated/hooks/use-exam';
import {
  useSectionList,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
} from '@/generated/hooks/use-section';
import {
  useQuestionList,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '@/generated/hooks/use-question';
import {
  useQuestionBankList,
  useUpdateQuestionBank,
} from '@/generated/hooks/use-question-bank';
import type { QuestionBank, QuestionBankQuestionTypeKey } from '@/generated/models/question-bank-model';
import { QuestionBankQuestionTypeKeyToLabel, QuestionBankDifficultyKeyToLabel } from '@/generated/models/question-bank-model';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Exam, ExamStatusKey } from '@/generated/models/exam-model';
import type { Section, SectionSectionTypeKey } from '@/generated/models/section-model';
import type { Question, QuestionQuestionTypeKey } from '@/generated/models/question-model';
import { SectionSectionTypeKeyToLabel } from '@/generated/models/section-model';
import { QuestionQuestionTypeKeyToLabel } from '@/generated/models/question-model';
import { ExamStatusKeyToLabel } from '@/generated/models/exam-model';

const sectionTypeIcons: Record<SectionSectionTypeKey, React.ReactNode> = {
  SectionTypeKey0: <CheckCircle className="w-4 h-4" />,
  SectionTypeKey1: <FileText className="w-4 h-4" />,
  SectionTypeKey2: <Code className="w-4 h-4" />,
  SectionTypeKey3: <Headphones className="w-4 h-4" />,
  SectionTypeKey4: <BookOpen className="w-4 h-4" />,
  SectionTypeKey5: <PenTool className="w-4 h-4" />,
  SectionTypeKey6: <Mic className="w-4 h-4" />,
  SectionTypeKey7: <Users className="w-4 h-4" />,
};

const sectionTypeKeys = Object.keys(SectionSectionTypeKeyToLabel) as SectionSectionTypeKey[];
const questionTypeKeys = Object.keys(QuestionQuestionTypeKeyToLabel) as QuestionQuestionTypeKey[];
const statusKeys = Object.keys(ExamStatusKeyToLabel) as ExamStatusKey[];

export default function ExamBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Data fetching
  const { data: exam, isLoading: examLoading } = useExam(id || '');
  const { data: allSections = [] } = useSectionList();
  const { data: allQuestions = [] } = useQuestionList();

  // Filter sections and questions for this exam
  const sections = useMemo(
    () => allSections.filter((s: Section) => s.exam?.id === id).sort((a: Section, b: Section) => a.orderIndex - b.orderIndex),
    [allSections, id]
  );

  // Mutations
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  // Local state
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGeneratorSectionId, setAIGeneratorSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showQuestionSheet, setShowQuestionSheet] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Question bank import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSectionId, setImportSectionId] = useState<string | null>(null);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const { data: questionBankItems = [] } = useQuestionBankList();
  const updateQuestionBank = useUpdateQuestionBank();

  // Section edit state
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({
    name1: '',
    instructions: '',
    timeLimitMinutes: 30,
  });

  // Generate initial access code for new exams
  const initialAccessCode = useMemo(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  // Form state for exam
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    accessCode: isNew ? initialAccessCode : '',
    statusKey: 'StatusKey0' as ExamStatusKey,
    passingScore: 60,
    allowReview: true,
    showResultsImmediately: true,
    startDateTime: undefined as Date | undefined,
    endDateTime: undefined as Date | undefined,
  });

  // Time state for date pickers
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('23:59');

  // Update form when exam loads
  useMemo(() => {
    if (exam) {
      const startDt = exam.startDateTime ? new Date(exam.startDateTime) : undefined;
      const endDt = exam.endDateTime ? new Date(exam.endDateTime) : undefined;
      setExamForm({
        title: exam.title || '',
        description: exam.description || '',
        durationMinutes: exam.durationMinutes || 60,
        accessCode: exam.accessCode || '',
        statusKey: exam.statusKey || 'StatusKey0',
        passingScore: exam.passingScore || 60,
        allowReview: exam.allowReview ?? true,
        showResultsImmediately: exam.showResultsImmediately ?? true,
        startDateTime: startDt,
        endDateTime: endDt,
      });
      if (startDt) setStartTime(format(startDt, 'HH:mm'));
      if (endDt) setEndTime(format(endDt, 'HH:mm'));
    }
  }, [exam]);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    questionTitle: '',
    questionText: '',
    questionTypeKey: 'QuestionTypeKey0' as QuestionQuestionTypeKey,
    points: 1,
    correctAnswer: '',
    optionsJSON: '[]',
    codeLanguage: '',
    keywords: '',
  });

  const generateAccessCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setExamForm((prev) => ({ ...prev, accessCode: code }));
  };

  const copyAccessCode = () => {
    if (examForm.accessCode) {
      navigator.clipboard.writeText(examForm.accessCode);
      toast.success('Access code copied to clipboard!');
    } else {
      toast.error('No access code to copy');
    }
  };

  const handleSaveExam = async () => {
    if (!examForm.title.trim()) {
      toast.error('Please enter an exam title');
      return;
    }

    // Combine date and time for start/end datetime
    let startDateTimeISO: string | undefined;
    let endDateTimeISO: string | undefined;

    if (examForm.startDateTime) {
      const [hours, mins] = startTime.split(':').map(Number);
      const startCombined = new Date(examForm.startDateTime);
      startCombined.setHours(hours, mins, 0, 0);
      startDateTimeISO = startCombined.toISOString();
    }

    if (examForm.endDateTime) {
      const [hours, mins] = endTime.split(':').map(Number);
      const endCombined = new Date(examForm.endDateTime);
      endCombined.setHours(hours, mins, 0, 0);
      endDateTimeISO = endCombined.toISOString();
    }

    try {
      if (isNew) {
        const result = await createExam.mutateAsync({
          ...examForm,
          startDateTime: startDateTimeISO,
          endDateTime: endDateTimeISO,
          createdAt: new Date().toISOString(),
          createdBy: 'teacher@school.edu',
        });
        toast.success('Exam created successfully!');
        navigate(`/teacher/exam/${result.id}`);
      } else {
        await updateExam.mutateAsync({
          id: id!,
          changedFields: {
            ...examForm,
            startDateTime: startDateTimeISO,
            endDateTime: endDateTimeISO,
          },
        });
        toast.success('Exam saved successfully!');
      }
    } catch (error: unknown) {
      toast.error(`Failed to save exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSection = async (sectionType: SectionSectionTypeKey) => {
    // If new exam, save it first
    if (isNew) {
      if (!examForm.title.trim()) {
        toast.error('Please enter an exam title first');
        setActiveTab('details');
        return;
      }

      // Combine date and time for start/end datetime
      let startDateTimeISO: string | undefined;
      let endDateTimeISO: string | undefined;

      if (examForm.startDateTime) {
        const [hours, mins] = startTime.split(':').map(Number);
        const startCombined = new Date(examForm.startDateTime);
        startCombined.setHours(hours, mins, 0, 0);
        startDateTimeISO = startCombined.toISOString();
      }

      if (examForm.endDateTime) {
        const [hours, mins] = endTime.split(':').map(Number);
        const endCombined = new Date(examForm.endDateTime);
        endCombined.setHours(hours, mins, 0, 0);
        endDateTimeISO = endCombined.toISOString();
      }

      try {
        const result = await createExam.mutateAsync({
          ...examForm,
          startDateTime: startDateTimeISO,
          endDateTime: endDateTimeISO,
          createdAt: new Date().toISOString(),
          createdBy: 'teacher@school.edu',
        });
        toast.success('Exam created! Now adding section...');
        
        // Create section with new exam ID
        await createSection.mutateAsync({
          name1: `New ${SectionSectionTypeKeyToLabel[sectionType]} Section`,
          exam: { id: result.id, title: examForm.title },
          sectionTypeKey: sectionType,
          orderIndex: 0,
          instructions: '',
          timeLimitMinutes: 30,
        });
        toast.success('Section added!');
        navigate(`/teacher/exam/${result.id}`);
        return;
      } catch (error: unknown) {
        toast.error(`Failed to create exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }

    try {
      await createSection.mutateAsync({
        name1: `New ${SectionSectionTypeKeyToLabel[sectionType]} Section`,
        exam: { id: id!, title: examForm.title },
        sectionTypeKey: sectionType,
        orderIndex: sections.length,
        instructions: '',
        timeLimitMinutes: 30,
      });
      toast.success('Section added!');
    } catch (error: unknown) {
      toast.error(`Failed to add section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection.mutateAsync(sectionId);
      toast.success('Section deleted');
    } catch (error: unknown) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenSectionDialog = (section: Section) => {
    setEditingSection(section);
    setSectionForm({
      name1: section.name1,
      instructions: section.instructions || '',
      timeLimitMinutes: section.timeLimitMinutes || 30,
    });
    setShowSectionDialog(true);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;
    if (!sectionForm.name1.trim()) {
      toast.error('Section name is required');
      return;
    }
    try {
      await updateSection.mutateAsync({
        id: editingSection.id,
        changedFields: sectionForm,
      });
      toast.success('Section updated!');
      setShowSectionDialog(false);
    } catch (error: unknown) {
      toast.error(`Failed to update section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenQuestionSheet = (sectionId: string, question?: Question) => {
    setSelectedSectionId(sectionId);
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        questionTitle: question.questionTitle,
        questionText: question.questionText,
        questionTypeKey: question.questionTypeKey,
        points: question.points,
        correctAnswer: question.correctAnswer || '',
        optionsJSON: question.optionsJSON || '[]',
        codeLanguage: question.codeLanguage || '',
        keywords: question.keywords || '',
      });
    } else {
      setEditingQuestion(null);
      const section = sections.find((s: Section) => s.id === sectionId);
      const defaultType = section?.sectionTypeKey === 'SectionTypeKey0' ? 'QuestionTypeKey0' : 'QuestionTypeKey1';
      setQuestionForm({
        questionTitle: '',
        questionText: '',
        questionTypeKey: defaultType,
        points: 1,
        correctAnswer: '',
        optionsJSON: '[]',
        codeLanguage: '',
        keywords: '',
      });
    }
    setShowQuestionSheet(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.questionTitle.trim() || !questionForm.questionText.trim()) {
      toast.error('Please fill in question title and text');
      return;
    }

    const section = sections.find((s: Section) => s.id === selectedSectionId);
    if (!section) return;

    const sectionQuestions = allQuestions.filter((q: Question) => q.section?.id === selectedSectionId);

    try {
      if (editingQuestion) {
        await updateQuestion.mutateAsync({
          id: editingQuestion.id,
          changedFields: questionForm,
        });
        toast.success('Question updated!');
      } else {
        await createQuestion.mutateAsync({
          ...questionForm,
          section: { id: section.id, name1: section.name1 },
          orderIndex: sectionQuestions.length,
        });
        toast.success('Question added!');
      }
      setShowQuestionSheet(false);
    } catch (error: unknown) {
      toast.error(`Failed to save question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion.mutateAsync(questionId);
      toast.success('Question deleted');
    } catch (error: unknown) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Question Bank Import
  const handleOpenImportDialog = (sectionId: string) => {
    setImportSectionId(sectionId);
    setSelectedBankQuestions(new Set());
    setBankSearchQuery('');
    setShowImportDialog(true);
  };

  const filteredBankQuestions = useMemo(() => {
    return questionBankItems.filter((q: QuestionBank) => {
      if (!bankSearchQuery) return true;
      const query = bankSearchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(query) ||
        q.questionText.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query) ||
        (q.tags && q.tags.toLowerCase().includes(query))
      );
    });
  }, [questionBankItems, bankSearchQuery]);

  const toggleBankQuestion = (questionId: string) => {
    setSelectedBankQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const mapBankTypeToQuestionType = (bankType: QuestionBankQuestionTypeKey): QuestionQuestionTypeKey => {
    // Both use the same enum structure
    return bankType.replace('QuestionTypeKey', 'QuestionTypeKey') as QuestionQuestionTypeKey;
  };

  const handleImportQuestions = async () => {
    if (!importSectionId || selectedBankQuestions.size === 0) return;

    const section = sections.find((s: Section) => s.id === importSectionId);
    if (!section) return;

    const existingQuestions = allQuestions.filter((q: Question) => q.section?.id === importSectionId);
    let orderIndex = existingQuestions.length;
    let importedCount = 0;

    for (const bankQuestionId of selectedBankQuestions) {
      const bankQuestion = questionBankItems.find((q: QuestionBank) => q.id === bankQuestionId);
      if (!bankQuestion) continue;

      try {
        await createQuestion.mutateAsync({
          questionTitle: bankQuestion.title,
          questionText: bankQuestion.questionText,
          questionTypeKey: mapBankTypeToQuestionType(bankQuestion.questionTypeKey),
          points: bankQuestion.defaultPoints,
          correctAnswer: bankQuestion.correctAnswer || '',
          optionsJSON: bankQuestion.optionsJSON || '[]',
          codeLanguage: bankQuestion.codeLanguage || '',
          keywords: bankQuestion.keywords || '',
          section: { id: section.id, name1: section.name1 },
          orderIndex: orderIndex++,
        });

        // Update usage count
        await updateQuestionBank.mutateAsync({
          id: bankQuestion.id,
          changedFields: { usageCount: bankQuestion.usageCount + 1 },
        });

        importedCount++;
      } catch (error) {
        console.error('Failed to import question:', error);
      }
    }

    toast.success(`Imported ${importedCount} question${importedCount !== 1 ? 's' : ''} from bank`);
    setShowImportDialog(false);
    setSelectedBankQuestions(new Set());
  };

  const handleOpenAIGenerator = (sectionId: string) => {
    setAIGeneratorSectionId(sectionId);
    setShowAIGenerator(true);
  };

  const getAIGeneratorSection = () => {
    return sections.find((s: Section) => s.id === aiGeneratorSectionId);
  };

  // MCQ options handling
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);

  useMemo(() => {
    try {
      const parsed = JSON.parse(questionForm.optionsJSON);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMcqOptions(parsed as string[]);
      } else {
        setMcqOptions(['', '', '', '']);
      }
    } catch {
      setMcqOptions(['', '', '', '']);
    }
  }, [questionForm.optionsJSON]);

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
    setQuestionForm((prev) => ({ ...prev, optionsJSON: JSON.stringify(newOptions) }));
  };

  const addMcqOption = () => {
    const newOptions = [...mcqOptions, ''];
    setMcqOptions(newOptions);
    setQuestionForm((prev) => ({ ...prev, optionsJSON: JSON.stringify(newOptions) }));
  };

  if (examLoading && !isNew) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading exam...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {isNew ? 'Create New Exam' : examForm.title || 'Untitled Exam'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isNew ? 'Configure your assessment' : `Access Code: ${examForm.accessCode || 'Not set'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={examForm.statusKey === 'StatusKey1' ? 'default' : 'secondary'}>
              {ExamStatusKeyToLabel[examForm.statusKey]}
            </Badge>
            <Button onClick={handleSaveExam} disabled={createExam.isPending || updateExam.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createExam.isPending || updateExam.isPending ? 'Saving...' : 'Save Exam'}
            </Button>
          </div>
        </div>
      </header>

      {/* Draft Status Warning */}
      {examForm.statusKey === 'StatusKey0' && !isNew && (
        <div className="bg-chart-4/10 border-b border-chart-4/30">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <p className="text-sm text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-4" />
              This exam is in <strong>Draft</strong> mode. Students cannot access it until you publish it.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setExamForm((prev) => ({ ...prev, statusKey: 'StatusKey1' }));
                toast.info('Status changed to Published. Click Save to apply.');
              }}
            >
              Publish Now
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="details">Exam Details</TabsTrigger>
            <TabsTrigger value="sections">
              Sections & Questions
            </TabsTrigger>
            <TabsTrigger value="settings">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Exam Details Tab */}
          <TabsContent value="details">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Exam Title *</Label>
                      <Input
                        id="title"
                        value={examForm.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setExamForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g., Midterm Examination"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessCode">Access Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accessCode"
                          value={examForm.accessCode}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setExamForm((prev) => ({ ...prev, accessCode: e.target.value }))
                          }
                          placeholder="EXAM123"
                        />
                        <Button variant="outline" size="icon" onClick={copyAccessCode} title="Copy access code">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={generateAccessCode} title="Generate new code">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Scheduling Section */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Exam Availability Window
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Set when students can access this exam. Leave empty for always available once published.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Start Date & Time */}
                      <div className="space-y-3">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !examForm.startDateTime && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {examForm.startDateTime ? format(examForm.startDateTime, "PPP") : "Pick start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={examForm.startDateTime}
                              onSelect={(date: Date | undefined) =>
                                setExamForm((prev) => ({ ...prev, startDateTime: date }))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="space-y-2">
                          <Label htmlFor="startTime" className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Start Time
                          </Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                            disabled={!examForm.startDateTime}
                          />
                        </div>
                      </div>

                      {/* End Date & Time */}
                      <div className="space-y-3">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !examForm.endDateTime && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {examForm.endDateTime ? format(examForm.endDateTime, "PPP") : "Pick end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={examForm.endDateTime}
                              onSelect={(date: Date | undefined) =>
                                setExamForm((prev) => ({ ...prev, endDateTime: date }))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="space-y-2">
                          <Label htmlFor="endTime" className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            End Time
                          </Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                            disabled={!examForm.endDateTime}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clear scheduling button */}
                    {(examForm.startDateTime || examForm.endDateTime) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-muted-foreground"
                        onClick={() => {
                          setExamForm((prev) => ({ ...prev, startDateTime: undefined, endDateTime: undefined }));
                          setStartTime('09:00');
                          setEndTime('23:59');
                        }}
                      >
                        Clear scheduling (make always available)
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={examForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setExamForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Provide instructions and details about this exam..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={examForm.durationMinutes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setExamForm((prev) => ({
                            ...prev,
                            durationMinutes: parseInt(e.target.value) || 60,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passingScore">Passing Score (%)</Label>
                      <Input
                        id="passingScore"
                        type="number"
                        min={0}
                        max={100}
                        value={examForm.passingScore}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setExamForm((prev) => ({
                            ...prev,
                            passingScore: parseInt(e.target.value) || 60,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={examForm.statusKey}
                        onValueChange={(val: string) =>
                          setExamForm((prev) => ({ ...prev, statusKey: val as ExamStatusKey }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusKeys.map((key: ExamStatusKey) => (
                            <SelectItem key={key} value={key}>
                              {ExamStatusKeyToLabel[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Sections & Questions Tab */}
          <TabsContent value="sections">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
              className="space-y-6"
            >
              {/* Add Section Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sectionTypeKeys.map((typeKey: SectionSectionTypeKey) => (
                      <Button
                        key={typeKey}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSection(typeKey)}
                        className="gap-2"
                      >
                        {sectionTypeIcons[typeKey]}
                        {SectionSectionTypeKeyToLabel[typeKey]}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sections List */}
              <AnimatePresence mode="popLayout">
                {sections.map((section: Section, sectionIndex: number) => {
                  const sectionQuestions = allQuestions
                    .filter((q: Question) => q.section?.id === section.id)
                    .sort((a: Question, b: Question) => a.orderIndex - b.orderIndex);

                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, ease: "easeOut" as const }}
                    >
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                            <div className="flex items-center gap-2">
                              {sectionTypeIcons[section.sectionTypeKey]}
                              <CardTitle className="text-base">
                                {section.name1}
                              </CardTitle>
                            </div>
                            <Badge variant="outline">
                              {SectionSectionTypeKeyToLabel[section.sectionTypeKey]}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenSectionDialog(section)}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Edit Section
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteSection(section.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Section
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                          {/* Section Instructions */}
                          {section.instructions && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {section.instructions}
                            </p>
                          )}

                          {/* Questions */}
                          <div className="space-y-3">
                            {sectionQuestions.map((question: Question, qIndex: number) => (
                              <motion.div
                                key={question.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                    {qIndex + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {question.questionTitle}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {QuestionQuestionTypeKeyToLabel[question.questionTypeKey]} •{' '}
                                      {question.points} pts
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenQuestionSheet(section.id, question)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Add Question Button */}
                          {/* Add Question Buttons */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenQuestionSheet(section.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Manually
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenImportDialog(section.id)}
                            >
                              <Library className="w-4 h-4 mr-2" />
                              From Bank
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAIGenerator(section.id)}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              AI Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {sections.length === 0 && (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">No sections yet. Add a section above to get started.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Exam Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Review</Label>
                      <p className="text-sm text-muted-foreground">
                        Let students review their answers before submitting
                      </p>
                    </div>
                    <Switch
                      checked={examForm.allowReview}
                      onCheckedChange={(checked: boolean) =>
                        setExamForm((prev) => ({ ...prev, allowReview: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Results Immediately</Label>
                      <p className="text-sm text-muted-foreground">
                        Show auto-graded results right after submission
                      </p>
                    </div>
                    <Switch
                      checked={examForm.showResultsImmediately}
                      onCheckedChange={(checked: boolean) =>
                        setExamForm((prev) => ({ ...prev, showResultsImmediately: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Question Sheet */}
      <Sheet open={showQuestionSheet} onOpenChange={setShowQuestionSheet}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="qTitle">Question Title *</Label>
              <Input
                id="qTitle"
                value={questionForm.questionTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuestionForm((prev) => ({ ...prev, questionTitle: e.target.value }))
                }
                placeholder="e.g., Question 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qText">Question Text *</Label>
              <Textarea
                id="qText"
                value={questionForm.questionText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setQuestionForm((prev) => ({ ...prev, questionText: e.target.value }))
                }
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={questionForm.questionTypeKey}
                  onValueChange={(val: string) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      questionTypeKey: val as QuestionQuestionTypeKey,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypeKeys.map((key: QuestionQuestionTypeKey) => (
                      <SelectItem key={key} value={key}>
                        {QuestionQuestionTypeKeyToLabel[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  value={questionForm.points}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      points: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>

            {/* MCQ Options */}
            {questionForm.questionTypeKey === 'QuestionTypeKey0' && (
              <div className="space-y-3">
                <Label>Answer Options</Label>
                {mcqOptions.map((opt: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateMcqOption(index, e.target.value)
                      }
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMcqOption}>
                  <Plus className="w-4 h-4 mr-2" /> Add Option
                </Button>
              </div>
            )}

            {/* Correct Answer */}
            <div className="space-y-2">
              <Label htmlFor="correctAnswer">Correct Answer</Label>
              {questionForm.questionTypeKey === 'QuestionTypeKey0' ? (
                <Select
                  value={questionForm.correctAnswer}
                  onValueChange={(val: string) =>
                    setQuestionForm((prev) => ({ ...prev, correctAnswer: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {mcqOptions.filter((opt: string) => opt.trim()).map((opt: string, index: number) => (
                      <SelectItem key={index} value={opt}>
                        {String.fromCharCode(65 + index)}: {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Textarea
                  id="correctAnswer"
                  value={questionForm.correctAnswer}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setQuestionForm((prev) => ({ ...prev, correctAnswer: e.target.value }))
                  }
                  placeholder="Enter the expected answer or keywords..."
                  rows={3}
                />
              )}
            </div>

            {/* Code-specific fields */}
            {questionForm.questionTypeKey === 'QuestionTypeKey2' && (
              <div className="space-y-2">
                <Label htmlFor="codeLanguage">Programming Language</Label>
                <Select
                  value={questionForm.codeLanguage || 'javascript'}
                  onValueChange={(val: string) =>
                    setQuestionForm((prev) => ({ ...prev, codeLanguage: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="csharp">C#</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Keywords for grading */}
            {(questionForm.questionTypeKey === 'QuestionTypeKey1' ||
              questionForm.questionTypeKey === 'QuestionTypeKey5') && (
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (for auto-grading hints)</Label>
                <Input
                  id="keywords"
                  value={questionForm.keywords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQuestionForm((prev) => ({ ...prev, keywords: e.target.value }))
                  }
                  placeholder="Comma-separated keywords..."
                />
              </div>
            )}

            <Button className="w-full" onClick={handleSaveQuestion}>
              <Save className="w-4 h-4 mr-2" />
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Question Generator Dialog */}
      {aiGeneratorSectionId && getAIGeneratorSection() && (
        <AIQuestionGenerator
          open={showAIGenerator}
          onOpenChange={setShowAIGenerator}
          sectionId={aiGeneratorSectionId}
          sectionName={getAIGeneratorSection()!.name1}
          sectionType={getAIGeneratorSection()!.sectionTypeKey}
          existingQuestionCount={allQuestions.filter((q: Question) => q.section?.id === aiGeneratorSectionId).length}
        />
      )}

      {/* Import from Question Bank Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" />
              Import from Question Bank
            </DialogTitle>
            <DialogDescription>
              Select questions to import into this section
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={bankSearchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
            {filteredBankQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No questions in your bank{bankSearchQuery && ' match your search'}</p>
              </div>
            ) : (
              filteredBankQuestions.map((question: QuestionBank) => (
                <div
                  key={question.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBankQuestions.has(question.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/30'
                  }`}
                  onClick={() => toggleBankQuestion(question.id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedBankQuestions.has(question.id)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    }`}>
                      {selectedBankQuestions.has(question.id) && (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-foreground">{question.title}</span>
                      <Badge variant="outline" className="text-xs">{question.category}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {QuestionBankDifficultyKeyToLabel[question.difficultyKey]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {question.questionText}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {QuestionBankQuestionTypeKeyToLabel[question.questionTypeKey]} • {question.defaultPoints} pts
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedBankQuestions.size} question{selectedBankQuestions.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImportQuestions}
                  disabled={selectedBankQuestions.size === 0 || createQuestion.isPending}
                >
                  {createQuestion.isPending ? 'Importing...' : 'Import Selected'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Edit Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update section name, instructions, and time limit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name</Label>
              <Input
                id="section-name"
                value={sectionForm.name1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSectionForm({ ...sectionForm, name1: e.target.value })
                }
                placeholder="e.g., Reading Comprehension"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-instructions">Instructions</Label>
              <Textarea
                id="section-instructions"
                value={sectionForm.instructions}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setSectionForm({ ...sectionForm, instructions: e.target.value })
                }
                placeholder="Instructions shown to students before starting this section..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-time">Time Limit (minutes)</Label>
              <Input
                id="section-time"
                type="number"
                min={1}
                value={sectionForm.timeLimitMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSectionForm({ ...sectionForm, timeLimitMinutes: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={updateSection.isPending}>
              {updateSection.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
