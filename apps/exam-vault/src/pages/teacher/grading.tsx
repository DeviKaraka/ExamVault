import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  User,
  FileText,
  ChevronRight,
  AlertTriangle,
  Eye,
  Award,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAttemptList } from '@/generated/hooks/use-attempt';
import { useExamList } from '@/generated/hooks/use-exam';
import type { Attempt, AttemptStatusKey } from '@/generated/models/attempt-model';
import type { Exam } from '@/generated/models/exam-model';
import { AttemptStatusKeyToLabel } from '@/generated/models/attempt-model';

const statusIcons: Record<AttemptStatusKey, React.ReactNode> = {
  StatusKey0: <Clock className="w-4 h-4 text-primary" />,
  StatusKey1: <CheckCircle className="w-4 h-4 text-primary" />,
  StatusKey2: <XCircle className="w-4 h-4 text-destructive" />,
  StatusKey3: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  StatusKey4: <Award className="w-4 h-4 text-primary" />,
};

const statusVariants: Record<AttemptStatusKey, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  StatusKey0: 'secondary',
  StatusKey1: 'default',
  StatusKey2: 'destructive',
  StatusKey3: 'outline',
  StatusKey4: 'default',
};

export default function GradingQueue() {
  const navigate = useNavigate();
  const { data: attempts = [], isLoading: attemptsLoading } = useAttemptList();
  const { data: exams = [] } = useExamList();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt: Attempt) => {
      const matchesSearch =
        attempt.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.studentID.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesExam = selectedExam === 'all' || attempt.exam?.id === selectedExam;
      const matchesStatus = statusFilter === 'all' || attempt.statusKey === statusFilter;

      return matchesSearch && matchesExam && matchesStatus;
    });
  }, [attempts, searchQuery, selectedExam, statusFilter]);

  // Group by status
  const pendingGrading = filteredAttempts.filter(
    (a: Attempt) => a.statusKey === 'StatusKey3'
  );
  const completed = filteredAttempts.filter(
    (a: Attempt) => a.statusKey === 'StatusKey4'
  );
  const inProgress = filteredAttempts.filter(
    (a: Attempt) => a.statusKey === 'StatusKey0'
  );
  const cancelled = filteredAttempts.filter(
    (a: Attempt) => a.statusKey === 'StatusKey2'
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const calculateScore = (attempt: Attempt) => {
    if (attempt.totalScore !== undefined && attempt.totalPossible > 0) {
      return `${attempt.totalScore}/${attempt.totalPossible} (${Math.round(
        (attempt.totalScore / attempt.totalPossible) * 100
      )}%)`;
    }
    if (attempt.autoScore !== undefined) {
      return `Auto: ${attempt.autoScore}`;
    }
    return 'Pending';
  };

  const renderAttemptRow = (attempt: Attempt) => (
    <motion.tr
      key={attempt.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group cursor-pointer hover:bg-muted/50"
      onClick={() => navigate(`/teacher/grade/${attempt.id}`)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{attempt.studentName}</p>
            <p className="text-xs text-muted-foreground">{attempt.studentEmail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{attempt.studentID}</TableCell>
      <TableCell>
        <span className="text-foreground">{attempt.exam?.title || 'Unknown Exam'}</span>
      </TableCell>
      <TableCell>
        <Badge
          variant={statusVariants[attempt.statusKey]}
          className="gap-1"
        >
          {statusIcons[attempt.statusKey]}
          {AttemptStatusKeyToLabel[attempt.statusKey]}
        </Badge>
      </TableCell>
      <TableCell className="text-foreground">{calculateScore(attempt)}</TableCell>
      <TableCell>
        {attempt.violationCount > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {attempt.violationCount}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(attempt.submittedAt || attempt.startedAt)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100"
        >
          <Eye className="w-4 h-4 mr-1" />
          Review
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </TableCell>
    </motion.tr>
  );

  if (attemptsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading submissions...</div>
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
              <h1 className="text-lg font-bold text-foreground">Grading Queue</h1>
              <p className="text-sm text-muted-foreground">
                {pendingGrading.length} submissions need grading
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.3, ease: "easeOut" as const }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold text-foreground">{pendingGrading.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" as const }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-foreground">{inProgress.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" as const }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" as const }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                    <p className="text-2xl font-bold text-foreground">{cancelled.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((exam: Exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="StatusKey3">Grading Pending</SelectItem>
                  <SelectItem value="StatusKey4">Completed</SelectItem>
                  <SelectItem value="StatusKey0">In Progress</SelectItem>
                  <SelectItem value="StatusKey2">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Pending ({pendingGrading.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="w-4 h-4" />
              All ({filteredAttempts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {pendingGrading.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                    <p className="text-muted-foreground">All caught up! No submissions pending review.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Violations</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingGrading.map((attempt: Attempt) => renderAttemptRow(attempt))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                {filteredAttempts.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No submissions found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Violations</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttempts.map((attempt: Attempt) => renderAttemptRow(attempt))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
