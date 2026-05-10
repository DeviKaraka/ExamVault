import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  Circle,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Flag,
  Eye,
  Maximize,
  Volume2,
  Play,
  Pause,
  Code,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { toast } from 'sonner';
import { useExam } from '@/generated/hooks/use-exam';
import { useSectionList } from '@/generated/hooks/use-section';
import { useQuestionList } from '@/generated/hooks/use-question';
import { useCreateAttempt, useUpdateAttempt } from '@/generated/hooks/use-attempt';
import { useCreateResponse } from '@/generated/hooks/use-response';
import { useSetAtom } from 'jotai';
import { addNotificationAtom } from '@/lib/store';
import { sendSubmissionNotification } from '@/lib/email-service';
import type { Section } from '@/generated/models/section-model';
import type { Question, QuestionQuestionTypeKey } from '@/generated/models/question-model';
import { SectionSectionTypeKeyToLabel } from '@/generated/models/section-model';
import { QuestionQuestionTypeKeyToLabel } from '@/generated/models/question-model';

const MAX_VIOLATIONS = 3;

interface StudentInfo {
  name: string;
  email: string;
  studentId: string;
  examId: string;
  examTitle: string;
}

export default function StudentExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Get student info from session
  const studentInfo: StudentInfo | null = useMemo(() => {
    const stored = sessionStorage.getItem('examStudent');
    return stored ? JSON.parse(stored) : null;
  }, []);

  // Data fetching
  const { data: exam, isLoading: examLoading } = useExam(id || '');
  const { data: allSections = [] } = useSectionList();
  const { data: allQuestions = [] } = useQuestionList();

  // Filter for this exam
  const sections = useMemo(
    () => allSections.filter((s: Section) => s.exam?.id === id).sort((a: Section, b: Section) => a.orderIndex - b.orderIndex),
    [allSections, id]
  );

  const questions = useMemo(
    () =>
      allQuestions
        .filter((q: Question) => sections.some((s: Section) => s.id === q.section?.id))
        .sort((a: Question, b: Question) => {
          const sectionA = sections.findIndex((s: Section) => s.id === a.section?.id);
          const sectionB = sections.findIndex((s: Section) => s.id === b.section?.id);
          if (sectionA !== sectionB) return sectionA - sectionB;
          return a.orderIndex - b.orderIndex;
        }),
    [allQuestions, sections]
  );

  // Mutations
  const createAttempt = useCreateAttempt();
  const updateAttempt = useUpdateAttempt();
  const createResponse = useCreateResponse();

  // Notification setter
  const addNotification = useSetAtom(addNotificationAtom);

  // State
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceDetectionActive, setVoiceDetectionActive] = useState(false);
  const [lastSpeechWarningTime, setLastSpeechWarningTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceDetectionIntervalRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalPoints = questions.reduce((sum: number, q: Question) => sum + q.points, 0);
  const answeredCount = Object.keys(answers).length;

  // Redirect if no student info
  useEffect(() => {
    if (!studentInfo) {
      navigate('/student');
    }
  }, [studentInfo, navigate]);

  // Initialize exam attempt - calculate time based on end time if set
  useEffect(() => {
    if (exam && studentInfo && !attemptId && !examStarted) {
      // If exam has an end time, calculate remaining time until end
      // This allows late joiners to still take the exam with reduced time
      if (exam.endDateTime) {
        const endTime = new Date(exam.endDateTime).getTime();
        const now = Date.now();
        const remainingSeconds = Math.floor((endTime - now) / 1000);
        
        // Use the minimum of full duration or remaining time until end
        const fullDuration = exam.durationMinutes * 60;
        const effectiveTime = Math.min(fullDuration, Math.max(0, remainingSeconds));
        setTimeLeft(effectiveTime);
      } else {
        // No end time set - use full duration
        setTimeLeft(exam.durationMinutes * 60);
      }
    }
  }, [exam, studentInfo, attemptId, examStarted]);

  // Timer countdown
  useEffect(() => {
    if (!examStarted || examEnded || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, examEnded, timeLeft]);

  // Tab visibility detection
  useEffect(() => {
    if (!examStarted || examEnded) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Tab switching detected! Please stay on this page.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examStarted, examEnded]);

  // Fullscreen exit detection
  useEffect(() => {
    if (!examStarted || examEnded) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        handleViolation('Fullscreen mode exited! Please return to fullscreen.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted, examEnded, isFullscreen]);

  // Keyboard shortcuts prevention AND navigation
  useEffect(() => {
    if (!examStarted || examEnded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation shortcuts (only when not typing in textarea)
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT';
      
      if (!isTyping) {
        // Arrow key navigation
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex((prev) => prev - 1);
          return;
        }
        if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
          e.preventDefault();
          setCurrentIndex((prev) => prev + 1);
          return;
        }
        // Number keys to jump to question (1-9)
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= questions.length) {
          e.preventDefault();
          setCurrentIndex(num - 1);
          return;
        }
        // F key to flag current question
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          if (currentQuestion) toggleFlag(currentQuestion.id);
          return;
        }
      }

      // Prevent common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'v' || e.key === 'p')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I')
      ) {
        e.preventDefault();
        handleViolation('Keyboard shortcut blocked!');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [examStarted, examEnded, currentIndex, questions.length, currentQuestion]);

  const handleViolation = useCallback(
    (message: string) => {
      setViolations((prev) => {
        const newCount = prev + 1;
        if (newCount >= MAX_VIOLATIONS) {
          handleAutoCancelExam();
          return newCount;
        }
        setWarningMessage(message);
        setShowWarning(true);
        toast.warning(`Warning ${newCount}/${MAX_VIOLATIONS}: ${message}`);
        return newCount;
      });
    },
    []
  );

  const handleAutoCancelExam = async () => {
    setExamEnded(true);
    stopCamera();
    toast.error('Exam cancelled due to too many violations!');

    if (attemptId) {
      await updateAttempt.mutateAsync({
        id: attemptId,
        changedFields: {
          statusKey: 'StatusKey2', // AutoCancelled
          submittedAt: new Date().toISOString(),
          violationCount: violations + 1,
        },
      });
    }

    setTimeout(() => navigate('/student/result/' + attemptId), 2000);
  };

  const stopCamera = () => {
    // Stop voice detection
    if (voiceDetectionIntervalRef.current) {
      clearInterval(voiceDetectionIntervalRef.current);
      voiceDetectionIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVoiceDetectionActive(false);

    // Stop camera/mic stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setMicEnabled(false);
  };

  const startVoiceDetection = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setVoiceDetectionActive(true);
    } catch (error) {
      console.error('Failed to start voice detection:', error);
    }
  };

  // Voice detection monitoring during exam
  useEffect(() => {
    if (!examStarted || examEnded || !voiceDetectionActive || !analyserRef.current) return;

    const SPEECH_THRESHOLD = 30; // Volume threshold to detect speech
    const COOLDOWN_MS = 10000; // 10 second cooldown between speech warnings

    const checkForSpeech = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((sum: number, value: number) => sum + value, 0) / dataArray.length;

      // Check if volume exceeds threshold (speech detected)
      if (average > SPEECH_THRESHOLD) {
        const now = Date.now();
        if (now - lastSpeechWarningTime > COOLDOWN_MS) {
          setLastSpeechWarningTime(now);
          handleViolation('Speech detected! Talking during the exam is not allowed.');
        }
      }
    };

    voiceDetectionIntervalRef.current = window.setInterval(checkForSpeech, 200);

    return () => {
      if (voiceDetectionIntervalRef.current) {
        clearInterval(voiceDetectionIntervalRef.current);
        voiceDetectionIntervalRef.current = null;
      }
    };
  }, [examStarted, examEnded, voiceDetectionActive, lastSpeechWarningTime]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setMicEnabled(true);
      
      // Start voice detection for proctoring
      startVoiceDetection(stream);
    } catch (error) {
      toast.error('Camera/microphone access denied');
    }
  };

  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      toast.error('Failed to enter fullscreen');
    }
  };

  const handleStartExam = async () => {
    if (!studentInfo || !exam) return;

    // Create attempt record
    try {
      const attempt = await createAttempt.mutateAsync({
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        studentID: studentInfo.studentId,
        exam: { id: exam.id, title: exam.title },
        statusKey: 'StatusKey0', // InProgress
        startedAt: new Date().toISOString(),
        violationCount: 0,
        totalPossible: totalPoints,
      });
      setAttemptId(attempt.id);
      setExamStarted(true);
      toast.success('Exam started! Good luck!');
    } catch (error: unknown) {
      toast.error(`Failed to start exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleAutoSubmit = () => {
    toast.warning('Time\'s up! Auto-submitting your exam...');
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!attemptId || !exam) return;

    setExamEnded(true);
    stopCamera();
    let autoScore = 0;
    let needsManualGrading = false;

    // Save all responses and calculate auto-score
    for (const question of questions) {
      const answer = answers[question.id] || '';
      let isCorrect: boolean | undefined = undefined;
      let pointsEarned: number | undefined = undefined;
      let gradingStatus: 'GradingStatusKey0' | 'GradingStatusKey1' | 'GradingStatusKey2' = 'GradingStatusKey0';

      // Auto-grade MCQ and short text
      if (question.questionTypeKey === 'QuestionTypeKey0') {
        // MCQ - exact match
        isCorrect = answer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
        pointsEarned = isCorrect ? question.points : 0;
        autoScore += pointsEarned;
        gradingStatus = 'GradingStatusKey1'; // AutoGraded
      } else if (question.questionTypeKey === 'QuestionTypeKey1') {
        // ShortText - check keywords
        const keywords = (question.keywords || '').split(',').map((k: string) => k.trim().toLowerCase());
        const answerLower = answer.toLowerCase();
        const matchCount = keywords.filter((k: string) => k && answerLower.includes(k)).length;
        if (keywords.length > 0 && matchCount > 0) {
          const ratio = matchCount / keywords.length;
          pointsEarned = Math.round(question.points * ratio);
          isCorrect = ratio >= 0.5;
          autoScore += pointsEarned;
          gradingStatus = 'GradingStatusKey1';
        } else {
          needsManualGrading = true;
        }
      } else {
        // Code, Writing, Speaking, Listening, Reading - manual grading
        needsManualGrading = true;
      }

      try {
        await createResponse.mutateAsync({
          attempt: { id: attemptId, studentName: studentInfo?.name || '' },
          question: { id: question.id, questionTitle: question.questionTitle },
          answerText: answer,
          responseSummary: `${QuestionQuestionTypeKeyToLabel[question.questionTypeKey]}: ${answer.substring(0, 50)}...`,
          gradingStatusKey: gradingStatus,
          isCorrect,
          pointsEarned,
        });

      } catch (error) {
        console.error('Failed to save response:', error);
      }
    }

    // Update attempt
    try {
      await updateAttempt.mutateAsync({
        id: attemptId,
        changedFields: {
          statusKey: needsManualGrading ? 'StatusKey3' : 'StatusKey4', // GradingPending or Completed
          submittedAt: new Date().toISOString(),
          autoScore,
          totalScore: needsManualGrading ? undefined : autoScore,
          violationCount: violations,
        },
      });

      // Send notification to student about submission
      const maxScore = questions.reduce((sum: number, q: Question) => sum + q.points, 0);
      const percentage = maxScore > 0 ? Math.round((autoScore / maxScore) * 100) : 0;

      if (studentInfo?.email) {
        addNotification({
          studentEmail: studentInfo.email,
          type: 'exam_submitted',
          title: needsManualGrading ? 'Exam Submitted - Pending Review' : 'Exam Submitted & Graded',
          message: needsManualGrading
            ? `Your exam "${exam.title}" has been submitted. Some questions require manual grading. Auto-graded score so far: ${autoScore}/${maxScore} (${percentage}%)`
            : `Your exam "${exam.title}" has been automatically graded. Score: ${autoScore}/${maxScore} (${percentage}%)`,
          examTitle: exam.title,
          score: autoScore,
          totalPossible: maxScore,
          percentage,
          passed: percentage >= (exam.passingScore || 60),
        });

        // Send email notification
        sendSubmissionNotification(
          studentInfo.email,
          studentInfo.name,
          exam.title,
          autoScore,
          maxScore,
          exam.passingScore || 60
        );
      }

      toast.success('Exam submitted successfully!');
      navigate(`/student/result/${attemptId}`);
    } catch (error: unknown) {
      toast.error(`Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    const answer = answers[currentQuestion.id] || '';

    switch (currentQuestion.questionTypeKey as QuestionQuestionTypeKey) {
      case 'QuestionTypeKey0': // MCQ
        const options: string[] = (() => {
          try {
            return JSON.parse(currentQuestion.optionsJSON || '[]');
          } catch {
            return [];
          }
        })();
        return (
          <div className="space-y-3">
            {options.map((opt: string, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.2, ease: "easeOut" as const }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  answer === opt
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
                onClick={() => handleAnswer(currentQuestion.id, opt)}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground mr-3">
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </motion.button>
            ))}
          </div>
        );

      case 'QuestionTypeKey2': // Code
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code className="w-4 h-4" />
              Language: {currentQuestion.codeLanguage || 'Any'}
            </div>
            <Textarea
              value={answer}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleAnswer(currentQuestion.id, e.target.value)
              }
              placeholder="Write your code here..."
              className="font-mono text-sm min-h-[300px] bg-muted/50"
            />
          </div>
        );

      case 'QuestionTypeKey3': // Listening
        const currentSection = sections.find((s: Section) => s.id === currentQuestion.section?.id);
        return (
          <div className="space-y-4">
            {currentSection?.mediaURL && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <audio ref={audioRef} src={currentSection.mediaURL} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (audioRef.current) {
                      if (isPlaying) {
                        audioRef.current.pause();
                      } else {
                        audioRef.current.play();
                      }
                      setIsPlaying(!isPlaying);
                    }
                  }}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Audio Track</span>
                </div>
              </div>
            )}
            <Textarea
              value={answer}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleAnswer(currentQuestion.id, e.target.value)
              }
              placeholder="Type your answer..."
              rows={4}
            />
          </div>
        );

      case 'QuestionTypeKey4': // Reading
        const readingSection = sections.find((s: Section) => s.id === currentQuestion.section?.id);
        return (
          <div className="space-y-4">
            {readingSection?.passageText && (
              <div className="p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Reading Passage
                </div>
                <p className="text-foreground whitespace-pre-wrap">{readingSection.passageText}</p>
              </div>
            )}
            <Textarea
              value={answer}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleAnswer(currentQuestion.id, e.target.value)
              }
              placeholder="Type your answer..."
              rows={4}
            />
          </div>
        );

      case 'QuestionTypeKey6': // Speaking
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <Mic className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Speaking question - Your audio is being recorded
              </p>
            </div>
            <Textarea
              value={answer}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleAnswer(currentQuestion.id, e.target.value)
              }
              placeholder="You may also type your answer here..."
              rows={4}
            />
          </div>
        );

      default: // ShortText, Writing
        return (
          <Textarea
            value={answer}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleAnswer(currentQuestion.id, e.target.value)
            }
            placeholder="Type your answer here..."
            rows={6}
          />
        );
    }
  };

  if (!studentInfo) {
    return null;
  }

  if (examLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading exam...</div>
      </div>
    );
  }

  // Pre-exam setup screen
  if (!examStarted) {
    return (
      <div ref={containerRef} className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
          >
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{exam?.title}</CardTitle>
                <p className="text-muted-foreground mt-2">{exam?.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Exam Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-semibold text-foreground">{exam?.durationMinutes} min</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-lg font-semibold text-foreground">{questions.length}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                </div>

                {/* Proctoring Setup */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Proctoring Setup
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        {cameraEnabled ? (
                          <Video className="w-5 h-5 text-primary" />
                        ) : (
                          <VideoOff className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="text-foreground">Camera</span>
                      </div>
                      <Badge variant={cameraEnabled ? 'default' : 'secondary'}>
                        {cameraEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        {micEnabled ? (
                          <Mic className="w-5 h-5 text-primary" />
                        ) : (
                          <MicOff className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="text-foreground">Microphone</span>
                      </div>
                      <Badge variant={micEnabled ? 'default' : 'secondary'}>
                        {micEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Maximize className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Fullscreen Mode</span>
                      </div>
                      <Badge variant={isFullscreen ? 'default' : 'secondary'}>
                        {isFullscreen ? 'Active' : 'Required'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={startCamera}>
                      Enable Camera & Mic
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={enterFullscreen}>
                      Enter Fullscreen
                    </Button>
                  </div>
                </div>

                {/* Camera Preview */}
                {cameraEnabled && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Warning */}
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Important Rules</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>• Do not switch tabs or windows</li>
                        <li>• Stay in fullscreen mode</li>
                        <li>• No copying or pasting</li>
                        <li>• No talking or speaking during the exam</li>
                        <li>• {MAX_VIOLATIONS} violations = auto-cancellation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleStartExam}
                  disabled={createAttempt.isPending}
                >
                  {createAttempt.isPending ? 'Starting...' : 'Start Exam'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold text-foreground">{exam?.title}</h1>
              <Badge
                variant={violations > 0 ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                {violations}/{MAX_VIOLATIONS}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Student Video Preview */}
              {cameraEnabled && (
                <div className="relative">
                  <div className="w-24 h-18 rounded-lg bg-black overflow-hidden border-2 border-primary shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover mirror"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
                  </div>
                  {voiceDetectionActive && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                      <Mic className="w-2.5 h-2.5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              )}

              {/* Timer */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono ${
                  timeLeft < 300
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
                            {currentQuestion?.questionTitle}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {QuestionQuestionTypeKeyToLabel[currentQuestion?.questionTypeKey as QuestionQuestionTypeKey]} •{' '}
                            {currentQuestion?.points} points
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={flagged.has(currentQuestion?.id || '') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => currentQuestion && toggleFlag(currentQuestion.id)}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        {flagged.has(currentQuestion?.id || '') ? 'Flagged' : 'Flag'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-foreground whitespace-pre-wrap">
                      {currentQuestion?.questionText}
                    </p>
                    {renderQuestionInput()}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                {currentIndex + 1} of {questions.length}
              </div>

              {currentIndex === questions.length - 1 ? (
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Exam
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Video & Navigator */}
          <div className="lg:col-span-1 space-y-4">
            {/* Live Camera Feed */}
            {cameraEnabled && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    Live Proctoring
                    <span className="ml-auto flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground">Recording</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border">
                    <video
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                      ref={(el) => {
                        if (el && mediaStreamRef.current) {
                          el.srcObject = mediaStreamRef.current;
                        }
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                          cameraEnabled ? 'bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Video className="w-3 h-3" />
                          CAM
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                          voiceDetectionActive ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Mic className="w-3 h-3" />
                          MIC
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded bg-black/60 text-white text-xs">
                        {studentInfo?.name}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Your video is being monitored for exam integrity
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Question Navigator */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Questions</CardTitle>
                <Progress
                  value={(answeredCount / questions.length) * 100}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {answeredCount}/{questions.length} answered
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: Question, idx: number) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                        idx === currentIndex
                          ? 'bg-primary text-primary-foreground'
                          : answers[q.id]
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {idx + 1}
                      {flagged.has(q.id) && (
                        <Flag className="absolute -top-1 -right-1 w-3 h-3 text-destructive" />
                      )}
                      {answers[q.id] ? (
                        <CheckCircle className="absolute bottom-0.5 right-0.5 w-3 h-3" />
                      ) : (
                        <Circle className="absolute bottom-0.5 right-0.5 w-3 h-3 opacity-30" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Section Legend */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">Sections:</p>
                  {sections.map((section: Section) => (
                    <div
                      key={section.id}
                      className="text-xs text-muted-foreground flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {SectionSectionTypeKeyToLabel[section.sectionTypeKey]}
                    </div>
                  ))}
                </div>

                {/* Keyboard Shortcuts */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">Keyboard Shortcuts:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">←</kbd>
                      <span>Previous</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">→</kbd>
                      <span>Next</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">1-9</kbd>
                      <span>Go to Q#</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">F</kbd>
                      <span>Flag</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Warning!
            </AlertDialogTitle>
            <AlertDialogDescription>
              {warningMessage}
              <br />
              <br />
              <strong>
                Violations: {violations}/{MAX_VIOLATIONS}
              </strong>
              {violations === MAX_VIOLATIONS - 1 && (
                <span className="block mt-2 text-destructive">
                  One more violation will cancel your exam!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarning(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {questions.length - answeredCount > 0 && (
                <span className="block mt-2 text-destructive">
                  {questions.length - answeredCount} questions are unanswered!
                </span>
              )}
              {flagged.size > 0 && (
                <span className="block mt-1 text-muted-foreground">
                  {flagged.size} questions are flagged for review.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
