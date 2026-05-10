import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { format, isAfter, isBefore } from 'date-fns';
import { KeyRound, User, Mail, ArrowRight, Shield, Clock, FileText, BarChart3, ArrowLeft, CalendarIcon, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useExamList } from '@/generated/hooks/use-exam';
import type { Exam } from '@/generated/models/exam-model';

export default function StudentJoin() {
  const navigate = useNavigate();
  const { data: exams = [] } = useExamList();

  const [form, setForm] = useState({
    accessCode: '',
    studentName: '',
    studentEmail: '',
    studentId: '',
  });

  const [isValidating, setIsValidating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Get published exams that are currently available
  const availableExams = exams.filter((e: Exam) => {
    if (e.statusKey !== 'StatusKey1') return false; // Only published
    const now = new Date();
    const endDateTime = e.endDateTime ? new Date(e.endDateTime) : null;
    // Show if not ended yet
    return !endDateTime || !isAfter(now, endDateTime);
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Access code copied to clipboard!');
    // Auto-fill the access code field
    setForm((prev) => ({ ...prev, accessCode: code }));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoin = async () => {
    if (!form.accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    if (!form.studentName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!form.studentEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!form.studentId.trim()) {
      toast.error('Please enter your student ID');
      return;
    }

    setIsValidating(true);

    // Find exam with matching access code (any status)
    const examByCode = exams.find(
      (e: Exam) => e.accessCode.toLowerCase() === form.accessCode.toLowerCase()
    );

    if (!examByCode) {
      setIsValidating(false);
      toast.error('Invalid access code. Please check and try again.');
      return;
    }

    // Check if exam is published
    if (examByCode.statusKey !== 'StatusKey1') {
      setIsValidating(false);
      toast.error('This exam is not published yet. Please contact your teacher.');
      return;
    }

    const exam = examByCode;

    // Check availability window
    const now = new Date();
    const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
    const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;

    // Only reject if exam hasn't started yet
    if (startDateTime && isBefore(now, startDateTime)) {
      setIsValidating(false);
      toast.error(`This exam is not available yet. It opens on ${format(startDateTime, "PPP 'at' p")}`);
      return;
    }

    // Access code remains valid until the END time - students can join anytime during the exam window
    // The exam duration will be adjusted based on remaining time if needed
    if (endDateTime && isAfter(now, endDateTime)) {
      setIsValidating(false);
      toast.error(`This exam has closed. It ended on ${format(endDateTime, "PPP 'at' p")}`);
      return;
    }

    // Store student info in session storage
    sessionStorage.setItem(
      'examStudent',
      JSON.stringify({
        name: form.studentName,
        email: form.studentEmail,
        studentId: form.studentId,
        examId: exam.id,
        examTitle: exam.title,
      })
    );

    setIsValidating(false);
    toast.success(`Welcome! Starting: ${exam.title}`);
    navigate(`/student/exam/${exam.id}`);
  };

  // Get exam info for preview (if access code matches)
  const matchingExam = exams.find(
    (e: Exam) =>
      form.accessCode.length >= 4 &&
      e.accessCode.toLowerCase() === form.accessCode.toLowerCase() &&
      e.statusKey === 'StatusKey1'
  );

  const getExamAvailabilityStatus = (exam: Exam | undefined) => {
    if (!exam) return null;
    const now = new Date();
    const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
    const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;

    if (startDateTime && isBefore(now, startDateTime)) {
      return {
        status: 'upcoming' as const,
        message: `Opens ${format(startDateTime, "PPP 'at' p")}`,
        canJoin: false,
      };
    }

    if (endDateTime && isAfter(now, endDateTime)) {
      return {
        status: 'closed' as const,
        message: `Closed ${format(endDateTime, "PPP 'at' p")}`,
        canJoin: false,
      };
    }

    if (endDateTime) {
      return {
        status: 'open' as const,
        message: `Open until ${format(endDateTime, "PPP 'at' p")}`,
        canJoin: true,
      };
    }

    return {
      status: 'open' as const,
      message: 'Always available',
      canJoin: true,
    };
  };

  const examStatus = getExamAvailabilityStatus(matchingExam);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Back to home button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" as const }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4"
            >
              <Shield className="w-8 h-8" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">ExamVault</h1>
            <p className="text-muted-foreground">Secure Assessment Platform</p>
          </div>

          {/* Join Card */}
          <Card className="border-2 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Join Examination</CardTitle>
              <CardDescription>
                Enter your details and access code to begin the exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Access Code
                </Label>
                <Input
                  id="accessCode"
                  value={form.accessCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, accessCode: e.target.value.toUpperCase() }))
                  }
                  placeholder="Enter exam code"
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={10}
                />
              </div>

              {/* Exam availability preview */}
              {matchingExam && examStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <Alert
                    className={
                      examStatus.status === 'open'
                        ? 'border-chart-3 bg-chart-3/10'
                        : examStatus.status === 'upcoming'
                        ? 'border-chart-4 bg-chart-4/10'
                        : 'border-destructive bg-destructive/10'
                    }
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{matchingExam.title}</span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {matchingExam.durationMinutes} minutes
                        </span>
                        <span
                          className={
                            examStatus.status === 'open'
                              ? 'text-chart-3'
                              : examStatus.status === 'upcoming'
                              ? 'text-chart-4'
                              : 'text-destructive'
                          }
                        >
                          {examStatus.status === 'upcoming' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {examStatus.status === 'closed' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {examStatus.message}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="studentName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="studentName"
                  value={form.studentName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, studentName: e.target.value }))
                  }
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={form.studentEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, studentEmail: e.target.value }))
                  }
                  placeholder="student@university.edu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Student ID
                </Label>
                <Input
                  id="studentId"
                  value={form.studentId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, studentId: e.target.value }))
                  }
                  placeholder="e.g., STU2024001"
                />
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleJoin}
                disabled={isValidating || (!!matchingExam && !!examStatus && !examStatus.canJoin)}
              >
                {isValidating ? (
                  'Validating...'
                ) : matchingExam && examStatus && !examStatus.canJoin ? (
                  examStatus.status === 'upcoming' ? 'Exam Not Open Yet' : 'Exam Closed'
                ) : (
                  <>
                    Start Exam
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <div className="text-center mt-4">
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (!form.studentName || !form.studentEmail || !form.studentId) {
                      toast.error('Please fill in your details first to view profile');
                      return;
                    }
                    sessionStorage.setItem(
                      'examStudent',
                      JSON.stringify({
                        name: form.studentName,
                        email: form.studentEmail,
                        studentId: form.studentId,
                      })
                    );
                    navigate('/student/profile');
                  }}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View My Progress & Results
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Exams Section */}
          {availableExams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6"
            >
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Available Exams
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click to copy access code and paste above
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {availableExams.map((exam: Exam) => {
                    const startDateTime = exam.startDateTime ? new Date(exam.startDateTime) : null;
                    const endDateTime = exam.endDateTime ? new Date(exam.endDateTime) : null;
                    const now = new Date();
                    const isUpcoming = startDateTime && isBefore(now, startDateTime);
                    const isCopied = copiedCode === exam.accessCode;

                    return (
                      <div
                        key={exam.id}
                        className={`
                          p-3 rounded-lg border transition-all cursor-pointer group
                          ${isCopied
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                          }
                        `}
                        onClick={() => handleCopyCode(exam.accessCode)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {exam.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {exam.durationMinutes} min
                              </span>
                              {isUpcoming && startDateTime && (
                                <span className="text-chart-4">
                                  Opens {format(startDateTime, 'MMM d')}
                                </span>
                              )}
                              {!isUpcoming && endDateTime && (
                                <span className="text-chart-3">
                                  Until {format(endDateTime, 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className={`
                              px-2 py-1 rounded text-xs font-mono font-bold
                              ${isCopied
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                              }
                            `}>
                              {exam.accessCode}
                            </code>
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center transition-all
                              ${isCopied
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-transparent text-muted-foreground group-hover:bg-accent group-hover:text-foreground'
                              }
                            `}>
                              {isCopied ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 grid grid-cols-2 gap-4"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Secure</p>
                <p className="text-xs text-muted-foreground">Proctored exam</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Timed</p>
                <p className="text-xs text-muted-foreground">Auto-submit</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
