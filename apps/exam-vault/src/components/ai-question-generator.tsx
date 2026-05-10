import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Wand2,
  Loader2,
  CheckCircle,
  FileText,
  Code,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Users,
  Brain,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useCreateQuestion } from '@/generated/hooks/use-question';
import type { SectionSectionTypeKey } from '@/generated/models/section-model';
import type { QuestionQuestionTypeKey } from '@/generated/models/question-model';
import { SectionSectionTypeKeyToLabel } from '@/generated/models/section-model';

interface AIQuestionGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  sectionName: string;
  sectionType: SectionSectionTypeKey;
  existingQuestionCount: number;
}

interface GeneratedQuestion {
  questionTitle: string;
  questionText: string;
  questionTypeKey: QuestionQuestionTypeKey;
  points: number;
  correctAnswer?: string;
  optionsJSON?: string;
  keywords?: string;
  codeLanguage?: string;
}

const difficultyLevels = [
  { id: 'easy', label: 'Easy', description: 'Basic concepts, simple recall' },
  { id: 'medium', label: 'Medium', description: 'Application & understanding' },
  { id: 'hard', label: 'Hard', description: 'Analysis, synthesis & critical thinking' },
  { id: 'mixed', label: 'Mixed', description: 'Balanced mix of all levels' },
];

const questionCountPresets = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 75, label: '75' },
  { value: 100, label: '100' },
];

const sectionTypeIcons: Record<SectionSectionTypeKey, React.ReactNode> = {
  SectionTypeKey0: <CheckCircle className="w-5 h-5" />,
  SectionTypeKey1: <FileText className="w-5 h-5" />,
  SectionTypeKey2: <Code className="w-5 h-5" />,
  SectionTypeKey3: <Headphones className="w-5 h-5" />,
  SectionTypeKey4: <BookOpen className="w-5 h-5" />,
  SectionTypeKey5: <PenTool className="w-5 h-5" />,
  SectionTypeKey6: <Mic className="w-5 h-5" />,
  SectionTypeKey7: <Users className="w-5 h-5" />,
};

// Map section type to default question type
const sectionToQuestionType: Record<SectionSectionTypeKey, QuestionQuestionTypeKey> = {
  SectionTypeKey0: 'QuestionTypeKey0', // MCQ
  SectionTypeKey1: 'QuestionTypeKey1', // ShortText
  SectionTypeKey2: 'QuestionTypeKey2', // Code
  SectionTypeKey3: 'QuestionTypeKey3', // Listening
  SectionTypeKey4: 'QuestionTypeKey4', // Reading
  SectionTypeKey5: 'QuestionTypeKey5', // Writing
  SectionTypeKey6: 'QuestionTypeKey6', // Speaking
  SectionTypeKey7: 'QuestionTypeKey7', // Interview
};

// Expanded MCQ templates for variety
const mcqTemplates = [
  (topic: string, num: number, context: string) => ({
    title: `${topic} Concept ${num}`,
    text: `Which of the following best describes ${topic.toLowerCase()} in the context of ${context || 'general application'}?`,
    options: [
      `A primary characteristic of ${topic.toLowerCase()}`,
      `An advanced feature of ${topic.toLowerCase()}`,
      `A common misconception about ${topic.toLowerCase()}`,
      `None of the above`,
    ],
    correct: `A primary characteristic of ${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `Understanding ${topic} - Q${num}`,
    text: `What is the main purpose of ${topic.toLowerCase()}?`,
    options: [
      `To improve efficiency and performance`,
      `To reduce complexity in systems`,
      `To enhance user experience`,
      `All of the above`,
    ],
    correct: `All of the above`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Application ${num}`,
    text: `In which scenario would ${topic.toLowerCase()} be most applicable?`,
    options: [
      `When dealing with complex data structures`,
      `When optimizing for performance`,
      `When ensuring data integrity`,
      `When building user interfaces`,
    ],
    correct: `When dealing with complex data structures`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Fundamentals ${num}`,
    text: `Which statement about ${topic.toLowerCase()} is correct?`,
    options: [
      `It is essential for modern development`,
      `It has limited practical applications`,
      `It is only used in academic settings`,
      `It is becoming obsolete`,
    ],
    correct: `It is essential for modern development`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Analysis ${num}`,
    text: `What is a key advantage of using ${topic.toLowerCase()}?`,
    options: [
      `Improved scalability`,
      `Better maintainability`,
      `Enhanced security`,
      `All of the mentioned benefits`,
    ],
    correct: `All of the mentioned benefits`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Principles ${num}`,
    text: `Which principle is most closely associated with ${topic.toLowerCase()}?`,
    options: [
      `Abstraction and encapsulation`,
      `Modularity and reusability`,
      `Efficiency and optimization`,
      `Simplicity and clarity`,
    ],
    correct: `Modularity and reusability`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Best Practices ${num}`,
    text: `What is the recommended approach when implementing ${topic.toLowerCase()}?`,
    options: [
      `Start with a clear design`,
      `Test thoroughly at each stage`,
      `Document all decisions`,
      `All of the above practices`,
    ],
    correct: `All of the above practices`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Challenges ${num}`,
    text: `What is a common challenge when working with ${topic.toLowerCase()}?`,
    options: [
      `Complexity management`,
      `Resource constraints`,
      `Integration difficulties`,
      `Learning curve`,
    ],
    correct: `Complexity management`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Evolution ${num}`,
    text: `How has ${topic.toLowerCase()} evolved over time?`,
    options: [
      `Become more sophisticated`,
      `Gained wider adoption`,
      `Integrated with new technologies`,
      `All of the above`,
    ],
    correct: `All of the above`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Impact ${num}`,
    text: `What impact does ${topic.toLowerCase()} have on productivity?`,
    options: [
      `Significantly increases efficiency`,
      `Reduces development time`,
      `Minimizes errors`,
      `All mentioned impacts`,
    ],
    correct: `All mentioned impacts`,
  }),
];

// Expanded short text templates
const shortTextTemplates = [
  (topic: string, num: number) => ({
    title: `Define ${topic} - Q${num}`,
    text: `In your own words, briefly explain what ${topic.toLowerCase()} means and provide one example.`,
    keywords: `${topic.toLowerCase()},definition,example,concept`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Comparison ${num}`,
    text: `Compare and contrast ${topic.toLowerCase()} with a related concept. What are the key differences?`,
    keywords: `compare,contrast,difference,similarity,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Application ${num}`,
    text: `Describe a real-world scenario where ${topic.toLowerCase()} would be beneficial.`,
    keywords: `application,scenario,benefit,practical,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Benefits ${num}`,
    text: `List three key benefits of ${topic.toLowerCase()} and explain why each is important.`,
    keywords: `benefits,advantages,importance,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Limitations ${num}`,
    text: `What are the limitations or drawbacks of ${topic.toLowerCase()}? Explain briefly.`,
    keywords: `limitations,drawbacks,challenges,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} History ${num}`,
    text: `Briefly describe the origin and evolution of ${topic.toLowerCase()}.`,
    keywords: `history,origin,evolution,development,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Components ${num}`,
    text: `What are the main components or elements of ${topic.toLowerCase()}?`,
    keywords: `components,elements,parts,structure,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Process ${num}`,
    text: `Describe the process or steps involved in implementing ${topic.toLowerCase()}.`,
    keywords: `process,steps,implementation,procedure,${topic.toLowerCase()}`,
  }),
];

// Code templates
const codeTemplates = [
  (topic: string, num: number) => ({
    title: `${topic} Implementation ${num}`,
    text: `Write a function that demonstrates ${topic.toLowerCase()}. The function should:\n- Accept appropriate parameters\n- Return the expected result\n- Handle edge cases`,
    language: 'javascript',
    answer: `// Solution for ${topic.toLowerCase()}\nfunction solve(input) {\n  // Implementation here\n  return result;\n}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Algorithm ${num}`,
    text: `Implement an algorithm using ${topic.toLowerCase()}. Consider time and space complexity in your solution.`,
    language: 'python',
    answer: `# Solution using ${topic.toLowerCase()}\ndef solve(data):\n    # Implementation\n    pass`,
  }),
  (topic: string, num: number) => ({
    title: `Debug ${topic} Code ${num}`,
    text: `The following code has a bug related to ${topic.toLowerCase()}. Identify and fix the issue.`,
    language: 'javascript',
    answer: `// Fixed version\n// Bug was in the logic handling`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Class Design ${num}`,
    text: `Create a class that encapsulates ${topic.toLowerCase()} functionality with appropriate methods and properties.`,
    language: 'typescript',
    answer: `class ${topic.replace(/\s+/g, '')} {\n  constructor() {}\n  // Methods here\n}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Data Structure ${num}`,
    text: `Implement a data structure that efficiently handles ${topic.toLowerCase()} operations.`,
    language: 'javascript',
    answer: `// Data structure implementation\nconst dataStructure = {\n  // Implementation\n};`,
  }),
];

// Writing templates
const writingTemplates = [
  (topic: string, num: number) => ({
    title: `Essay on ${topic} ${num}`,
    text: `Write a well-structured essay (250-300 words) discussing the impact of ${topic.toLowerCase()} on modern society. Include:\n- An introduction with a clear thesis\n- At least two supporting arguments\n- A conclusion summarizing your points`,
    keywords: `essay,structure,thesis,argument,${topic.toLowerCase()},analysis`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Analysis ${num}`,
    text: `Critically analyze the advantages and disadvantages of ${topic.toLowerCase()}. Provide specific examples to support your arguments.`,
    keywords: `analysis,advantages,disadvantages,examples,critical thinking,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `Opinion Piece on ${topic} ${num}`,
    text: `To what extent do you agree that ${topic.toLowerCase()} is essential in today's world? Justify your opinion with relevant examples.`,
    keywords: `opinion,justify,agree,disagree,examples,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Report ${num}`,
    text: `Write a formal report summarizing the current state of ${topic.toLowerCase()} and its future prospects.`,
    keywords: `report,summary,current state,future,prospects,${topic.toLowerCase()}`,
  }),
  (topic: string, num: number) => ({
    title: `${topic} Proposal ${num}`,
    text: `Draft a proposal for implementing ${topic.toLowerCase()} in an organization. Include objectives, methods, and expected outcomes.`,
    keywords: `proposal,implementation,objectives,methods,outcomes,${topic.toLowerCase()}`,
  }),
];

// Mock AI generation function - generates up to 100 questions
const generateQuestionsWithAI = async (
  topic: string,
  sectionType: SectionSectionTypeKey,
  difficulty: string,
  count: number,
  instructions: string
): Promise<GeneratedQuestion[]> => {
  // Simulate API delay - longer for more questions
  const baseDelay = 1500;
  const perQuestionDelay = Math.min(count * 30, 2000);
  await new Promise((resolve) => setTimeout(resolve, baseDelay + perQuestionDelay));

  const questionType = sectionToQuestionType[sectionType];
  const questions: GeneratedQuestion[] = [];

  // Adjust base points based on difficulty
  const getPoints = (diff: string, index: number): number => {
    if (diff === 'mixed') {
      const levels = ['easy', 'medium', 'hard'];
      diff = levels[index % 3];
    }
    return diff === 'easy' ? 5 : diff === 'medium' ? 10 : 15;
  };

  // Generate questions based on section type
  for (let i = 0; i < count; i++) {
    const questionNumber = i + 1;
    const basePoints = getPoints(difficulty, i);

    if (sectionType === 'SectionTypeKey0') {
      // MCQ Questions
      const templateIndex = i % mcqTemplates.length;
      const template = mcqTemplates[templateIndex](topic, questionNumber, instructions);
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints,
        optionsJSON: JSON.stringify(template.options),
        correctAnswer: template.correct,
      });
    } else if (sectionType === 'SectionTypeKey1') {
      // Short Text Questions
      const templateIndex = i % shortTextTemplates.length;
      const template = shortTextTemplates[templateIndex](topic, questionNumber);
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints + 5,
        keywords: template.keywords,
      });
    } else if (sectionType === 'SectionTypeKey2') {
      // Code Questions
      const templateIndex = i % codeTemplates.length;
      const template = codeTemplates[templateIndex](topic, questionNumber);
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints + 10,
        codeLanguage: template.language,
        correctAnswer: template.answer,
      });
    } else if (sectionType === 'SectionTypeKey3') {
      // Listening Questions
      const listeningTemplates = [
        {
          title: `Listening Comprehension ${questionNumber}`,
          text: `After listening to the audio about ${topic.toLowerCase()}, what is the main point being discussed?`,
          options: [
            `The historical development of ${topic.toLowerCase()}`,
            `Current applications of ${topic.toLowerCase()}`,
            `Future predictions about ${topic.toLowerCase()}`,
            `Challenges faced in ${topic.toLowerCase()}`,
          ],
          correct: `Current applications of ${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Audio Analysis ${questionNumber}`,
          text: `Based on the audio, which statement best represents the speaker's view on ${topic.toLowerCase()}?`,
          options: [
            `It is essential for modern practice`,
            `It has limited applications`,
            `It requires further research`,
            `It is widely misunderstood`,
          ],
          correct: `It is essential for modern practice`,
        },
        {
          title: `${topic} Key Points ${questionNumber}`,
          text: `According to the audio, what are the key benefits of ${topic.toLowerCase()}?`,
          options: [
            `Improved efficiency`,
            `Cost reduction`,
            `Better outcomes`,
            `All of the above`,
          ],
          correct: `All of the above`,
        },
      ];
      const template = listeningTemplates[i % listeningTemplates.length];
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints,
        optionsJSON: JSON.stringify(template.options),
        correctAnswer: template.correct,
      });
    } else if (sectionType === 'SectionTypeKey4') {
      // Reading Questions
      const readingTemplates = [
        {
          title: `Reading Comprehension ${questionNumber}`,
          text: `Based on the passage about ${topic.toLowerCase()}, what is the author's main argument?`,
          options: [
            `${topic} has evolved significantly over time`,
            `${topic} remains unchanged in modern contexts`,
            `${topic} requires immediate attention`,
            `${topic} is less important than previously thought`,
          ],
          correct: `${topic} has evolved significantly over time`,
        },
        {
          title: `${topic} Inference ${questionNumber}`,
          text: `What can be inferred from the passage about the future of ${topic.toLowerCase()}?`,
          options: [
            `It will continue to grow in importance`,
            `It will become obsolete`,
            `It will remain stable`,
            `The passage does not discuss this`,
          ],
          correct: `It will continue to grow in importance`,
        },
        {
          title: `${topic} Detail ${questionNumber}`,
          text: `According to the passage, which factor contributes most to the success of ${topic.toLowerCase()}?`,
          options: [
            `Proper implementation`,
            `Adequate resources`,
            `Stakeholder support`,
            `Continuous improvement`,
          ],
          correct: `Proper implementation`,
        },
      ];
      const template = readingTemplates[i % readingTemplates.length];
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints,
        optionsJSON: JSON.stringify(template.options),
        correctAnswer: template.correct,
      });
    } else if (sectionType === 'SectionTypeKey5') {
      // Writing Questions
      const templateIndex = i % writingTemplates.length;
      const template = writingTemplates[templateIndex](topic, questionNumber);
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints + 10,
        keywords: template.keywords,
      });
    } else if (sectionType === 'SectionTypeKey6') {
      // Speaking Questions
      const speakingTemplates = [
        {
          title: `${topic} Discussion ${questionNumber}`,
          text: `Speak for 1-2 minutes about your experience with ${topic.toLowerCase()}. Describe:\n- When you first encountered it\n- How it has affected you\n- Your thoughts on its importance`,
          keywords: `personal experience,description,opinion,fluency,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Debate ${questionNumber}`,
          text: `Present an argument either for or against ${topic.toLowerCase()}. Support your position with at least three reasons.`,
          keywords: `argument,support,reasons,persuasion,${topic.toLowerCase()}`,
        },
        {
          title: `Explain ${topic} ${questionNumber}`,
          text: `Imagine you are explaining ${topic.toLowerCase()} to someone who has never heard of it. Provide a clear, simple explanation.`,
          keywords: `explanation,clarity,simplicity,teaching,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Presentation ${questionNumber}`,
          text: `Give a brief presentation on the future of ${topic.toLowerCase()}. What trends do you foresee?`,
          keywords: `presentation,future,trends,prediction,${topic.toLowerCase()}`,
        },
      ];
      const template = speakingTemplates[i % speakingTemplates.length];
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints + 5,
        keywords: template.keywords,
      });
    } else if (sectionType === 'SectionTypeKey7') {
      // Interview Questions
      const interviewTemplates = [
        {
          title: `${topic} Experience ${questionNumber}`,
          text: `Tell me about a time when you had to apply ${topic.toLowerCase()} in a challenging situation. What was the outcome?`,
          keywords: `STAR method,situation,task,action,result,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Problem Solving ${questionNumber}`,
          text: `Describe how you would approach a problem involving ${topic.toLowerCase()}. Walk me through your thought process.`,
          keywords: `problem solving,approach,methodology,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Leadership ${questionNumber}`,
          text: `Have you ever had to lead a project related to ${topic.toLowerCase()}? Describe your leadership style and the results.`,
          keywords: `leadership,project management,results,teamwork,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Future Goals ${questionNumber}`,
          text: `Where do you see ${topic.toLowerCase()} heading in the next 5 years, and how do you plan to stay relevant?`,
          keywords: `future trends,career development,continuous learning,${topic.toLowerCase()}`,
        },
        {
          title: `${topic} Collaboration ${questionNumber}`,
          text: `Describe a situation where you had to collaborate with others on a ${topic.toLowerCase()} related project.`,
          keywords: `collaboration,teamwork,communication,${topic.toLowerCase()}`,
        },
      ];
      const template = interviewTemplates[i % interviewTemplates.length];
      questions.push({
        questionTitle: template.title,
        questionText: template.text,
        questionTypeKey: questionType,
        points: basePoints + 5,
        keywords: template.keywords,
      });
    }
  }

  return questions;
};

export function AIQuestionGenerator({
  open,
  onOpenChange,
  sectionId,
  sectionName,
  sectionType,
  existingQuestionCount,
}: AIQuestionGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addingProgress, setAddingProgress] = useState(0);

  const createQuestion = useCreateQuestion();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const questions = await generateQuestionsWithAI(
        topic,
        sectionType,
        difficulty,
        questionCount,
        instructions
      );
      setGeneratedQuestions(questions);
      setSelectedQuestions(new Set(questions.map((_: GeneratedQuestion, i: number) => i)));
      setStep('preview');
      toast.success(`Generated ${questions.length} questions!`);
    } catch (error: unknown) {
      toast.error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestionSelection = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(generatedQuestions.map((_: GeneratedQuestion, i: number) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleAddSelectedQuestions = async () => {
    const questionsToAdd = generatedQuestions.filter((_: GeneratedQuestion, i: number) => selectedQuestions.has(i));
    
    if (questionsToAdd.length === 0) {
      toast.error('Please select at least one question');
      return;
    }

    setIsGenerating(true);
    setAddingProgress(0);
    
    try {
      // Add questions in batches for better UX
      const batchSize = 5;
      for (let i = 0; i < questionsToAdd.length; i += batchSize) {
        const batch = questionsToAdd.slice(i, i + batchSize);
        await Promise.all(
          batch.map((q: GeneratedQuestion, batchIndex: number) =>
            createQuestion.mutateAsync({
              ...q,
              section: { id: sectionId, name1: sectionName },
              orderIndex: existingQuestionCount + i + batchIndex,
            })
          )
        );
        setAddingProgress(Math.min(((i + batchSize) / questionsToAdd.length) * 100, 100));
      }
      toast.success(`Added ${questionsToAdd.length} questions to the section!`);
      handleClose();
    } catch (error: unknown) {
      toast.error(`Failed to add questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setAddingProgress(0);
    }
  };

  const handleClose = () => {
    setTopic('');
    setDifficulty('medium');
    setQuestionCount(10);
    setInstructions('');
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
    setStep('config');
    setShowAdvanced(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Generate up to 100 questions automatically for your {SectionSectionTypeKeyToLabel[sectionType]} section.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'config' ? (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              className="space-y-6 py-4"
            >
              {/* Section Type Badge */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {sectionTypeIcons[sectionType]}
                </div>
                <div>
                  <p className="font-medium text-foreground">{sectionName}</p>
                  <p className="text-sm text-muted-foreground">
                    {SectionSectionTypeKeyToLabel[sectionType]} Section • {existingQuestionCount} existing questions
                  </p>
                </div>
              </div>

              {/* Topic Input */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Topic / Subject *
                </Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                  placeholder="e.g., JavaScript Arrays, Climate Change, World War II"
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the main topic or subject for the questions
                </p>
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Difficulty Level
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setDifficulty(level.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        difficulty === level.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Number of Questions
                  </Label>
                  <Badge variant="secondary" className="text-sm font-mono">
                    {questionCount} questions
                  </Badge>
                </div>
                
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {questionCountPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant={questionCount === preset.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuestionCount(preset.value)}
                      className="min-w-[48px]"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {/* Fine-tune Slider */}
                <Slider
                  value={[questionCount]}
                  onValueChange={(value: number[]) => setQuestionCount(value[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Options
              </button>

              {/* Advanced Options */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Additional Instructions */}
                    <div className="space-y-2">
                      <Label htmlFor="instructions">Additional Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={instructions}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
                        placeholder="e.g., Focus on practical applications, include real-world examples, emphasize recent developments..."
                        rows={3}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating {questionCount} Questions...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate {questionCount} Questions
                  </>
                )}
              </Button>

              {questionCount >= 50 && (
                <p className="text-xs text-center text-muted-foreground">
                  Generating {questionCount} questions may take a moment. Please wait...
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              className="space-y-4 py-4"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {selectedQuestions.size} of {generatedQuestions.length} questions selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click to select/deselect questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('config')}
                  >
                    Back
                  </Button>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {generatedQuestions.map((question: GeneratedQuestion, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.2, ease: "easeOut" as const }}
                    onClick={() => toggleQuestionSelection(index)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedQuestions.has(index)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/50'
                        : 'border-border hover:border-muted-foreground/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedQuestions.has(index)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {selectedQuestions.has(index) ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {question.questionTitle}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {question.questionText}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {question.points} pts
                          </Badge>
                          {question.optionsJSON && (
                            <Badge variant="secondary" className="text-xs">
                              {JSON.parse(question.optionsJSON).length} options
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Progress indicator for adding */}
              {isGenerating && addingProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Adding questions...</span>
                    <span className="text-foreground font-medium">{Math.round(addingProgress)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${addingProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Add Questions Button */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleAddSelectedQuestions}
                  disabled={isGenerating || selectedQuestions.size === 0}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add {selectedQuestions.size} Questions
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
